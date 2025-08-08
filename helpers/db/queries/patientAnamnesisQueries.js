const { executeQuery } = require('../utils/queryExecutor');

async function getAnamnesisByPatientId(patientId) {
  const query = 'SELECT * FROM patient_anamnesis WHERE patient_id = $1 ORDER BY created_at';
  return executeQuery(query, [patientId]);
}

async function createAnamnesis(data) {
  const { patientId, question, answerType, answerText, answerBoolean } = data;
  const query = `
    INSERT INTO patient_anamnesis (patient_id, question, answer_type, answer_text, answer_boolean)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `;
  return executeQuery(query, [patientId, question, answerType, answerText, answerBoolean], { returnSingle: true });
}

async function updateAnamnesis(anamnesisId, data) {
  const { question, answerType, answerText, answerBoolean } = data;
  const query = `
    UPDATE patient_anamnesis
    SET question = $1, answer_type = $2, answer_text = $3, answer_boolean = $4
    WHERE anamnesis_id = $5
    RETURNING *
  `;
  return executeQuery(query, [question, answerType, answerText, answerBoolean, anamnesisId], { returnSingle: true });
}

async function deleteAnamnesis(anamnesisId) {
  const query = 'DELETE FROM patient_anamnesis WHERE anamnesis_id = $1 RETURNING *';
  return executeQuery(query, [anamnesisId], { returnSingle: true });
}

async function deleteAnamnesisByPatientId(patientId) {
  const query = 'DELETE FROM patient_anamnesis WHERE patient_id = $1';
  return executeQuery(query, [patientId]);
}

module.exports = { getAnamnesisByPatientId, createAnamnesis, updateAnamnesis, deleteAnamnesis, deleteAnamnesisByPatientId };