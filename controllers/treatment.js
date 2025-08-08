const asyncErrorWrapper = require("express-async-handler");
const { executeQuery } = require('../helpers/db/utils/queryExecutor');
const CustomError = require('../helpers/err/CustomError');
const logger = require('../helpers/logger');

// Tüm tedavileri getir (opsiyonel hasta ID filtresi ile)
const getAllTreatments = asyncErrorWrapper(async (req, res) => {
  try {
    const { patient_id } = req.query;
    
    let query = `
      SELECT 
        t.treatment_id,
        t.patient_id,
        t.treatment_type_id,
        t.doctor_id,
        t.status,
        t.tooth_count,
        t.tooth_numbers,
        t.is_lower_jaw,
        t.is_upper_jaw,
        t.suggested_at,
        t.approved_at,
        t.completed_at,
        t.notes,
        t.created_at,
        p.first_name || ' ' || p.last_name as patient_name,
        tt.name as treatment_name,
        tt.category as treatment_category,
        u.first_name || ' ' || u.last_name as doctor_name
      FROM treatments t
      LEFT JOIN patients p ON t.patient_id = p.patient_id
      LEFT JOIN treatment_types tt ON t.treatment_type_id = tt.treatment_type_id
      LEFT JOIN users u ON t.doctor_id = u.user_id
    `;
    
    const params = [];
    
    if (patient_id) {
      query += ' WHERE t.patient_id = $1';
      params.push(patient_id);
    }
    
    query += ' ORDER BY t.created_at DESC';
    
    const treatments = await executeQuery(query, params);
    
    res.json({ success: true, data: treatments });
  } catch (error) {
    logger.error('Get treatments error:', error);
    res.status(500).json({ 
      success: false, 
      message: "Tedaviler alınamadı", 
      error: error.message 
    });
  }
});

// Belirli bir tedavi detayını getir
const getTreatmentById = asyncErrorWrapper(async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT 
        t.*,
        p.first_name || ' ' || p.last_name as patient_name,
        tt.name as treatment_name,
        tt.category as treatment_category,
        tt.is_per_tooth,
        tt.is_jaw_specific,
        u.first_name || ' ' || u.last_name as doctor_name
      FROM treatments t
      LEFT JOIN patients p ON t.patient_id = p.patient_id
      LEFT JOIN treatment_types tt ON t.treatment_type_id = tt.treatment_type_id
      LEFT JOIN users u ON t.doctor_id = u.user_id
      WHERE t.treatment_id = $1
    `;
    
    const treatment = await executeQuery(query, [id]);
    
    if (treatment.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "Tedavi bulunamadı" 
      });
    }
    
    res.json({ success: true, data: treatment[0] });
  } catch (error) {
    logger.error('Get treatment by ID error:', error);
    res.status(500).json({ 
      success: false, 
      message: "Tedavi detayı alınamadı", 
      error: error.message 
    });
  }
});

// Yeni tedavi öner
const createTreatment = asyncErrorWrapper(async (req, res) => {
  try {
    const {
      patientId,
      treatmentTypeId,
      doctorId,
      status = 'önerilen',
      toothCount = 1,
      toothNumbers = [],
      isLowerJaw = false,
      isUpperJaw = false,
      notes,
      priceCalculation
    } = req.body;

    // Validasyon
    if (!patientId || !treatmentTypeId || !doctorId) {
      return res.status(400).json({
        success: false,
        message: "Hasta ID, tedavi türü ID ve doktor ID zorunludur"
      });
    }

    // Status validasyonu
    const validStatuses = ['önerilen', 'onaylanan', 'tamamlanan'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Geçersiz tedavi durumu"
      });
    }

    // Hasta var mı kontrol et
    const patientCheck = await executeQuery(
      'SELECT patient_id FROM patients WHERE patient_id = $1',
      [patientId]
    );

    if (patientCheck.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Hasta bulunamadı"
      });
    }

    // Tedavi türü var mı kontrol et
    const treatmentTypeCheck = await executeQuery(
      'SELECT treatment_type_id, name FROM treatment_types WHERE treatment_type_id = $1',
      [treatmentTypeId]
    );

    if (treatmentTypeCheck.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Tedavi türü bulunamadı"
      });
    }

    // Doktor var mı kontrol et
    const doctorCheck = await executeQuery(
      'SELECT user_id FROM users WHERE user_id = $1',
      [doctorId]
    );

    if (doctorCheck.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Doktor bulunamadı"
      });
    }

    // Tedavi oluştur
    // toothNumbers'ı düzgün integer array'e çevir
    let validToothNumbers = [];
    if (Array.isArray(toothNumbers) && toothNumbers.length > 0) {
      validToothNumbers = toothNumbers
        .map(n => parseInt(String(n)))
        .filter(n => Number.isInteger(n) && !isNaN(n) && n > 0);
    }

    const treatmentData = {
      patientId,
      treatmentTypeId,
      doctorId,
      status,
      toothCount: validToothNumbers.length || 1,
      toothNumbers: validToothNumbers.length > 0 ? validToothNumbers : null,
      isLowerJaw: Boolean(isLowerJaw),
      isUpperJaw: Boolean(isUpperJaw),
      notes: notes || null
    };

    const query = `
      INSERT INTO treatments (
        patient_id, 
        treatment_type_id, 
        doctor_id, 
        status, 
        tooth_count, 
        tooth_numbers, 
        is_lower_jaw, 
        is_upper_jaw,
        notes,
        suggested_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
      RETURNING treatment_id, patient_id, treatment_type_id, doctor_id, status, tooth_count, tooth_numbers, is_lower_jaw, is_upper_jaw, notes, suggested_at, created_at
    `;

    const newTreatment = await executeQuery(query, [
      treatmentData.patientId,
      treatmentData.treatmentTypeId,
      treatmentData.doctorId,
      treatmentData.status,
      treatmentData.toothCount,
      treatmentData.toothNumbers,
      treatmentData.isLowerJaw,
      treatmentData.isUpperJaw,
      treatmentData.notes
    ]);

    logger.info(`Yeni tedavi önerisi oluşturuldu: ${newTreatment[0].treatment_id}`);

    res.status(201).json({
      success: true,
      data: newTreatment[0],
      message: `${treatmentTypeCheck[0].name} tedavisi başarıyla önerildi`
    });

  } catch (error) {
    logger.error('Create treatment error:', error);
    res.status(500).json({
      success: false,
      message: "Tedavi önerilirken hata oluştu",
      error: error.message
    });
  }
});

// Tedavi durumunu güncelle (önerilen -> onaylanan -> tamamlanan)
const updateTreatmentStatus = asyncErrorWrapper(async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const validStatuses = ['önerilen', 'onaylanan', 'tamamlanan'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Geçersiz tedavi durumu"
      });
    }

    // Mevcut tedavi var mı kontrol et
    const existingTreatment = await executeQuery(
      'SELECT treatment_id, status FROM treatments WHERE treatment_id = $1',
      [id]
    );

    if (existingTreatment.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Tedavi bulunamadı"
      });
    }

    // Durum geçişine göre timestamp'i ayarla
    let updateQuery;
    let params;

    if (status === 'onaylanan') {
      updateQuery = `
        UPDATE treatments 
        SET status = $1, approved_at = CURRENT_TIMESTAMP, notes = $2, updated_at = CURRENT_TIMESTAMP
        WHERE treatment_id = $3
        RETURNING *
      `;
      params = [status, notes || null, id];
    } else if (status === 'tamamlanan') {
      updateQuery = `
        UPDATE treatments 
        SET status = $1, completed_at = CURRENT_TIMESTAMP, notes = $2, updated_at = CURRENT_TIMESTAMP
        WHERE treatment_id = $3
        RETURNING *
      `;
      params = [status, notes || null, id];
    } else {
      updateQuery = `
        UPDATE treatments 
        SET status = $1, notes = $2, updated_at = CURRENT_TIMESTAMP
        WHERE treatment_id = $3
        RETURNING *
      `;
      params = [status, notes || null, id];
    }

    const updatedTreatment = await executeQuery(updateQuery, params);

    logger.info(`Tedavi durumu güncellendi: ${id} -> ${status}`);

    res.json({
      success: true,
      data: updatedTreatment[0],
      message: `Tedavi durumu ${status === 'onaylanan' ? 'onaylandı' : status === 'tamamlanan' ? 'tamamlandı' : 'güncellendi'}`
    });

  } catch (error) {
    logger.error('Update treatment status error:', error);
    res.status(500).json({
      success: false,
      message: "Tedavi durumu güncellenirken hata oluştu",
      error: error.message
    });
  }
});

// Tedavi sil
const deleteTreatment = asyncErrorWrapper(async (req, res) => {
  try {
    const { id } = req.params;

    // Tedavi var mı kontrol et
    const existingTreatment = await executeQuery(
      'SELECT treatment_id FROM treatments WHERE treatment_id = $1',
      [id]
    );

    if (existingTreatment.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Tedavi bulunamadı"
      });
    }

    // Tedaviyi sil
    const deletedTreatment = await executeQuery(
      'DELETE FROM treatments WHERE treatment_id = $1 RETURNING treatment_id',
      [id]
    );

    logger.info(`Tedavi silindi: ${id}`);

    res.json({
      success: true,
      message: "Tedavi başarıyla silindi"
    });

  } catch (error) {
    logger.error('Delete treatment error:', error);
    res.status(500).json({
      success: false,
      message: "Tedavi silinirken hata oluştu",
      error: error.message
    });
  }
});

module.exports = {
  getAllTreatments,
  getTreatmentById,
  createTreatment,
  updateTreatmentStatus,
  deleteTreatment
};