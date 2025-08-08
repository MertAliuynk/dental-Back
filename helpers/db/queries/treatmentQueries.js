const { executeQuery } = require('../utils/queryExecutor');

async function getTreatmentById(treatmentId) {
  const query = 'SELECT * FROM treatments WHERE treatment_id = $1';
  return executeQuery(query, [treatmentId], { returnSingle: true });
}

async function getTreatmentsByPatient(patientId) {
  const query = `
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
      tt.name as treatment_type_name,
      tt.category as treatment_category,
      tt.is_per_tooth,
      tt.is_jaw_specific,
      u.first_name || ' ' || u.last_name as doctor_name
    FROM treatments t
    LEFT JOIN patients p ON t.patient_id = p.patient_id
    LEFT JOIN treatment_types tt ON t.treatment_type_id = tt.treatment_type_id
    LEFT JOIN users u ON t.doctor_id = u.user_id
    WHERE t.patient_id = $1
    ORDER BY t.suggested_at DESC
  `;
  return executeQuery(query, [patientId]);
}

async function createTreatment(data) {
  const { patientId, treatmentTypeId, doctorId, status, toothCount, toothNumbers, isLowerJaw, isUpperJaw } = data;
  const query = `
    INSERT INTO treatments (patient_id, treatment_type_id, doctor_id, status, tooth_count, tooth_numbers, is_lower_jaw, is_upper_jaw, suggested_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
    RETURNING *
  `;
  return executeQuery(query, [patientId, treatmentTypeId, doctorId, status, toothCount, toothNumbers, isLowerJaw, isUpperJaw], { returnSingle: true });
}

async function updateTreatment(treatmentId, data) {
  const { status, toothCount, toothNumbers, isLowerJaw, isUpperJaw } = data;
  const query = `
    UPDATE treatments
    SET status = $1, tooth_count = $2, tooth_numbers = $3, is_lower_jaw = $4, is_upper_jaw = $5, updated_at = CURRENT_TIMESTAMP
    WHERE treatment_id = $6
    RETURNING *
  `;
  return executeQuery(query, [status, toothCount, toothNumbers, isLowerJaw, isUpperJaw, treatmentId], { returnSingle: true });
}

async function deleteTreatment(treatmentId) {
  const query = 'DELETE FROM treatments WHERE treatment_id = $1 RETURNING *';
  return executeQuery(query, [treatmentId], { returnSingle: true });
}

async function getAllTreatments(startDate, endDate) {
  const query = `
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
      tt.name as treatment_type_name,
      tt.category as treatment_category,
      tt.is_per_tooth,
      tt.is_jaw_specific,
      u.first_name || ' ' || u.last_name as doctor_name,
      b.name as branch_name,
      u.branch_id
    FROM treatments t
    LEFT JOIN patients p ON t.patient_id = p.patient_id
    LEFT JOIN treatment_types tt ON t.treatment_type_id = tt.treatment_type_id
    LEFT JOIN users u ON t.doctor_id = u.user_id
    LEFT JOIN branches b ON u.branch_id = b.branch_id
    WHERE t.suggested_at >= $1 AND t.suggested_at <= $2
    ORDER BY t.suggested_at DESC
  `;
  return executeQuery(query, [startDate, endDate]);
}

module.exports = { 
  getTreatmentById, 
  getTreatmentsByPatient, 
  createTreatment, 
  updateTreatment, 
  deleteTreatment,
  getAllTreatments
};