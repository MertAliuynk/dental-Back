const { executeQuery } = require("../helpers/db/utils/queryExecutor");
const CustomError = require('../helpers/err/CustomError');

// Tüm tedavi türlerini getir
async function getAllTreatmentTypes(req, res) {
  try {
    const treatmentTypes = await executeQuery(`
      SELECT 
        treatment_type_id,
        name,
        category,
        is_per_tooth,
        is_jaw_specific,
        feedback_intervals,
        created_at,
        updated_at
      FROM treatment_types 
      ORDER BY category, name
    `);
    
    res.json({ success: true, data: treatmentTypes });
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      message: "Tedavi türleri alınamadı", 
      error: err.message 
    });
  }
}

// Yeni tedavi türü oluştur
async function createTreatmentType(req, res) {
  try {
    const { name, category, isPerTooth, isJawSpecific, feedbackIntervals } = req.body;
    
    // Validasyon
    if (!name || !category) {
      return res.status(400).json({ 
        success: false, 
        message: "Tedavi adı ve kategori zorunludur" 
      });
    }

    // Aynı isimde tedavi var mı kontrol et
    const existingTreatment = await executeQuery(
      "SELECT treatment_type_id FROM treatment_types WHERE name = $1", 
      [name]
    );
    
    if (existingTreatment.length > 0) {
      return res.status(409).json({ 
        success: false, 
        message: "Bu tedavi türü zaten mevcut" 
      });
    }

    // Tedavi türü oluştur
    const newTreatment = await executeQuery(`
      INSERT INTO treatment_types (name, category, is_per_tooth, is_jaw_specific, feedback_intervals)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING treatment_type_id, name, category, is_per_tooth, is_jaw_specific, feedback_intervals, created_at
    `, [
      name, 
      category, 
      isPerTooth || false, 
      isJawSpecific || false, 
      feedbackIntervals || []
    ]);

    res.status(201).json({ 
      success: true, 
      data: newTreatment[0],
      message: "Tedavi türü başarıyla oluşturuldu" 
    });
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      message: "Tedavi türü oluşturulamadı", 
      error: err.message 
    });
  }
}

// Tedavi türünü güncelle
async function updateTreatmentType(req, res) {
  try {
    const { id } = req.params;
    const { name, category, isPerTooth, isJawSpecific, feedbackIntervals } = req.body;
    
    const updatedTreatment = await executeQuery(`
      UPDATE treatment_types 
      SET 
        name = $1, 
        category = $2, 
        is_per_tooth = $3, 
        is_jaw_specific = $4, 
        feedback_intervals = $5,
        updated_at = CURRENT_TIMESTAMP
      WHERE treatment_type_id = $6
      RETURNING treatment_type_id, name, category, is_per_tooth, is_jaw_specific, feedback_intervals
    `, [name, category, isPerTooth, isJawSpecific, feedbackIntervals || [], id]);
    
    if (updatedTreatment.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "Tedavi türü bulunamadı" 
      });
    }

    res.json({ 
      success: true, 
      data: updatedTreatment[0],
      message: "Tedavi türü başarıyla güncellendi" 
    });
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      message: "Tedavi türü güncellenemedi", 
      error: err.message 
    });
  }
}

// Tedavi türünü sil
async function deleteTreatmentType(req, res) {
  try {
    const { id } = req.params;
    
    // Önce bu tedavi türünün kullanıldığı yerler var mı kontrol et
    const usageCheck = await executeQuery(
      "SELECT COUNT(*) as count FROM treatments WHERE treatment_type_id = $1", 
      [id]
    );
    
    if (parseInt(usageCheck[0].count) > 0) {
      return res.status(400).json({ 
        success: false, 
        message: "Bu tedavi türü kullanımda olduğu için silinemez" 
      });
    }
    
    const result = await executeQuery(
      "DELETE FROM treatment_types WHERE treatment_type_id = $1 RETURNING treatment_type_id", 
      [id]
    );
    
    if (result.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "Tedavi türü bulunamadı" 
      });
    }

    res.json({ 
      success: true, 
      message: "Tedavi türü başarıyla silindi" 
    });
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      message: "Tedavi türü silinemedi", 
      error: err.message 
    });
  }
}

module.exports = { 
  getAllTreatmentTypes, 
  createTreatmentType, 
  updateTreatmentType, 
  deleteTreatmentType 
};
