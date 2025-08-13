// Yeni: patient_doctors tablosundan bir hastanın tüm doktorlarını getirir
const { executeQuery } = require('../utils/queryExecutor');

async function getDoctorsByPatientId(patientId) {
  const query = `
    SELECT u.* FROM patient_doctors pd
    JOIN users u ON pd.doctor_id = u.user_id
    WHERE pd.patient_id = $1
  `;
  return executeQuery(query, [patientId]);
}

module.exports = { getDoctorsByPatientId };
