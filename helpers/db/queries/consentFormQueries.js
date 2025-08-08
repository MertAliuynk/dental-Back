const { executeQuery } = require('../utils/queryExecutor');

async function getConsentFormById(consentFormId) {
  const query = 'SELECT * FROM consent_forms WHERE consent_form_id = $1';
  return executeQuery(query, [consentFormId], { returnSingle: true });
}

async function getConsentFormsByPatient(patientId) {
  const query = 'SELECT * FROM consent_forms WHERE patient_id = $1 ORDER BY created_at';
  return executeQuery(query, [patientId]);
}

async function createConsentForm(data) {
  const { patientId, name } = data;
  const query = `
    INSERT INTO consent_forms (patient_id, name)
    VALUES ($1, $2)
    RETURNING *
  `;
  return executeQuery(query, [patientId, name], { returnSingle: true });
}

async function updateConsentForm(consentFormId, data) {
  const { name } = data;
  const query = `
    UPDATE consent_forms
    SET name = $1
    WHERE consent_form_id = $2
    RETURNING *
  `;
  return executeQuery(query, [name, consentFormId], { returnSingle: true });
}

async function deleteConsentForm(consentFormId) {
  const query = 'DELETE FROM consent_forms WHERE consent_form_id = $1 RETURNING *';
  return executeQuery(query, [consentFormId], { returnSingle: true });
}

module.exports = { getConsentFormById, getConsentFormsByPatient, createConsentForm, updateConsentForm, deleteConsentForm };