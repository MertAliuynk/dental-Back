const asyncErrorWrapper = require("express-async-handler");
const { executeQuery } = require('../helpers/db/utils/queryExecutor');
const CustomError = require('../helpers/err/CustomError');
const logger = require('../helpers/logger');

// Geri dönüş bekleyen hastaları getir (hasta bazında gruplu)
const getPendingFeedbacks = asyncErrorWrapper(async (req, res) => {
  try {
    const query = `
      WITH patient_feedback_data AS (
        SELECT 
          fp.id as planning_id,
          fp.treatment_id,
          fp.interval,
          fp.planned_date,
          t.patient_id,
          p.first_name || ' ' || p.last_name as patient_name,
          p.phone,
          tt.name as treatment_name,
          t.completed_at,
          CASE 
            WHEN fp.interval = '1_week' THEN '1 Hafta'
            WHEN fp.interval = '1_month' THEN '1 Ay'
            WHEN fp.interval = '3_months' THEN '3 Ay'
            WHEN fp.interval = '6_months' THEN '6 Ay'
          END as interval_display,
          CASE 
            WHEN fp.planned_date <= CURRENT_TIMESTAMP THEN 'due'
            WHEN fp.planned_date <= CURRENT_TIMESTAMP + INTERVAL '3 days' THEN 'upcoming'
            ELSE 'future'
          END as status,
          EXTRACT(EPOCH FROM (fp.planned_date - CURRENT_TIMESTAMP)) / 86400 as days_until_due,
          ROW_NUMBER() OVER (
            PARTITION BY t.patient_id, fp.interval 
            ORDER BY fp.planned_date ASC
          ) as rn
        FROM feedback_planning fp
        JOIN treatments t ON fp.treatment_id = t.treatment_id
        JOIN patients p ON t.patient_id = p.patient_id
        JOIN treatment_types tt ON t.treatment_type_id = tt.treatment_type_id
        WHERE fp.is_completed = FALSE
      ),
      deduplicated_feedback AS (
        SELECT * FROM patient_feedback_data WHERE rn = 1
      )
      SELECT 
        patient_id,
        patient_name,
        phone,
        MIN(planned_date) as earliest_feedback_date,
        JSON_AGG(
          JSON_BUILD_OBJECT(
            'planning_id', planning_id,
            'treatment_id', treatment_id,
            'interval', interval,
            'interval_display', interval_display,
            'planned_date', planned_date,
            'treatment_name', treatment_name,
            'completed_at', completed_at,
            'status', status,
            'days_until_due', days_until_due
          ) ORDER BY planned_date ASC
        ) as feedback_items
      FROM deduplicated_feedback
      GROUP BY patient_id, patient_name, phone
      ORDER BY MIN(planned_date) ASC;
    `;
    
    const result = await executeQuery(query);
    
    res.json({ 
      success: true, 
      data: result,
      count: result.length 
    });
  } catch (error) {
    logger.error('Get pending feedbacks error:', error);
    res.status(500).json({ 
      success: false, 
      message: "Bekleyen geri dönüşler alınamadı", 
      error: error.message 
    });
  }
});

// Geri dönüş geçmişini getir (hasta bazında gruplu)
const getFeedbackHistory = asyncErrorWrapper(async (req, res) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    
    let whereClause = '';
    let params = [];
    let paramIndex = 1;
    
    if (search && search.trim()) {
      whereClause = `WHERE (p.first_name ILIKE $${paramIndex} OR p.last_name ILIKE $${paramIndex} OR p.phone ILIKE $${paramIndex})`;
      params.push(`%${search.trim()}%`);
      paramIndex++;
    }
    
    const query = `
      WITH patient_feedbacks AS (
        SELECT 
          f.feedback_id,
          f.treatment_id,
          f.interval,
          f.feedback_date,
          f.notes,
          f.created_at,
          t.patient_id,
          p.first_name || ' ' || p.last_name as patient_name,
          p.phone,
          tt.name as treatment_name,
          t.completed_at,
          CASE 
            WHEN f.interval = '1_week' THEN '1 Hafta'
            WHEN f.interval = '1_month' THEN '1 Ay'
            WHEN f.interval = '3_months' THEN '3 Ay'
            WHEN f.interval = '6_months' THEN '6 Ay'
          END as interval_display
        FROM feedbacks f
        JOIN treatments t ON f.treatment_id = t.treatment_id
        JOIN patients p ON t.patient_id = p.patient_id
        JOIN treatment_types tt ON t.treatment_type_id = tt.treatment_type_id
        ${whereClause}
      )
      SELECT 
        patient_id,
        patient_name,
        phone,
        COUNT(*) as total_feedbacks,
        MAX(created_at) as last_feedback_date,
        JSON_AGG(
          JSON_BUILD_OBJECT(
            'feedback_id', feedback_id,
            'treatment_id', treatment_id,
            'interval', interval,
            'interval_display', interval_display,
            'feedback_date', feedback_date,
            'notes', notes,
            'created_at', created_at,
            'treatment_name', treatment_name,
            'completed_at', completed_at
          ) ORDER BY created_at DESC
        ) as feedback_items
      FROM patient_feedbacks
      GROUP BY patient_id, patient_name, phone
      ORDER BY MAX(created_at) DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    params.push(limit, offset);
    
    const feedbacks = await executeQuery(query, params);
    
    // Toplam hasta sayısı için ayrı sorgu
    const countQuery = `
      SELECT COUNT(DISTINCT t.patient_id) as total
      FROM feedbacks f
      JOIN treatments t ON f.treatment_id = t.treatment_id
      JOIN patients p ON t.patient_id = p.patient_id
      ${whereClause}
    `;
    
    const countResult = await executeQuery(countQuery, search ? [`%${search.trim()}%`] : []);
    const total = parseInt(countResult[0].total);
    
    res.json({ 
      success: true, 
      data: feedbacks,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Get feedback history error:', error);
    res.status(500).json({ 
      success: false, 
      message: "Geri dönüş geçmişi alınamadı", 
      error: error.message 
    });
  }
});

// Geri dönüş kaydet
const createFeedback = asyncErrorWrapper(async (req, res) => {
  try {
    const { planning_id, notes } = req.body;
    
    if (!planning_id) {
      return res.status(400).json({
        success: false,
        message: "Planning ID gerekli"
      });
    }
    
    // Planning kaydını bul
    const planningQuery = `
      SELECT fp.*, t.patient_id
      FROM feedback_planning fp
      JOIN treatments t ON fp.treatment_id = t.treatment_id
      WHERE fp.id = $1 AND fp.is_completed = FALSE
    `;
    
    const planningResult = await executeQuery(planningQuery, [planning_id]);
    
    if (planningResult.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Planlanan geri dönüş bulunamadı veya zaten tamamlandı"
      });
    }
    
    const planning = planningResult[0];
    
    // Geri dönüş kaydını oluştur
    const insertQuery = `
      INSERT INTO feedbacks (treatment_id, interval, feedback_date, notes)
      VALUES ($1, $2, CURRENT_TIMESTAMP, $3)
      RETURNING feedback_id, treatment_id, interval, feedback_date, notes, created_at
    `;
    
    const newFeedback = await executeQuery(insertQuery, [
      planning.treatment_id, 
      planning.interval, 
      notes || null
    ]);
    
    // Planning kaydını tamamlandı olarak işaretle
    await executeQuery(
      'UPDATE feedback_planning SET is_completed = TRUE WHERE id = $1',
      [planning_id]
    );
    
    logger.info(`Yeni geri dönüş kaydedildi: Planning ID ${planning_id}, Interval: ${planning.interval}`);
    
    res.status(201).json({
      success: true,
      data: newFeedback[0],
      message: "Geri dönüş başarıyla kaydedildi"
    });
    
  } catch (error) {
    logger.error('Create feedback error:', error);
    res.status(500).json({
      success: false,
      message: "Geri dönüş kaydedilirken hata oluştu",
      error: error.message
    });
  }
});

// Geri dönüş güncelle
const updateFeedback = asyncErrorWrapper(async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    
    // Geri dönüş var mı kontrol et
    const existingFeedback = await executeQuery(
      'SELECT feedback_id FROM feedbacks WHERE feedback_id = $1',
      [id]
    );
    
    if (existingFeedback.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Geri dönüş bulunamadı"
      });
    }
    
    // Geri dönüşü güncelle
    const updateQuery = `
      UPDATE feedbacks 
      SET notes = $1
      WHERE feedback_id = $2
      RETURNING feedback_id, treatment_id, interval, feedback_date, notes, created_at
    `;
    
    const updatedFeedback = await executeQuery(updateQuery, [notes || null, id]);
    
    logger.info(`Geri dönüş güncellendi: ${id}`);
    
    res.json({
      success: true,
      data: updatedFeedback[0],
      message: "Geri dönüş başarıyla güncellendi"
    });
    
  } catch (error) {
    logger.error('Update feedback error:', error);
    res.status(500).json({
      success: false,
      message: "Geri dönüş güncellenirken hata oluştu",
      error: error.message
    });
  }
});

module.exports = {
  getPendingFeedbacks,
  getFeedbackHistory,
  createFeedback,
  updateFeedback
};