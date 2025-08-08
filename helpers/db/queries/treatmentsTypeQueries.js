const { executeQuery } = require('../utils/queryExecutor');

async function getTreatmentTypeById(treatmentTypeId) {
  const query = 'SELECT * FROM treatment_types WHERE treatment_type_id = $1';
  return executeQuery(query, [treatmentTypeId], { returnSingle: true });
}

async function getAllTreatmentTypes() {
  const query = 'SELECT * FROM treatment_types ORDER BY name';
  return executeQuery(query);
}

async function createTreatmentType(data) {
  const { name, category, isPerTooth, isJawSpecific, feedbackIntervals } = data;
  const query = `
    INSERT INTO treatment_types (name, category, is_per_tooth, is_jaw_specific, feedback_intervals)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `;
  return executeQuery(query, [name, category, isPerTooth, isJawSpecific, feedbackIntervals], { returnSingle: true });
}

async function updateTreatmentType(treatmentTypeId, data) {
  const { name, category, isPerTooth, isJawSpecific, feedbackIntervals } = data;
  const query = `
    UPDATE treatment_types
    SET name = $1, category = $2, is_per_tooth = $3, is_jaw_specific = $4, feedback_intervals = $5
    WHERE treatment_type_id = $6
    RETURNING *
  `;
  return executeQuery(query, [name, category, isPerTooth, isJawSpecific, feedbackIntervals, treatmentTypeId], { returnSingle: true });
}

async function deleteTreatmentType(treatmentTypeId) {
  const query = 'DELETE FROM treatment_types WHERE treatment_type_id = $1 RETURNING *';
  return executeQuery(query, [treatmentTypeId], { returnSingle: true });
}

module.exports = { getTreatmentTypeById, getAllTreatmentTypes, createTreatmentType, updateTreatmentType, deleteTreatmentType };