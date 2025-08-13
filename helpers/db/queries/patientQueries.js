const { executeQuery } = require('../utils/queryExecutor');

async function getPatientById(patientId) {
  const query = 'SELECT * FROM patients WHERE patient_id = $1';
  return executeQuery(query, [patientId], { returnSingle: true });
}

async function getPatientsByBranch(branchId) {
  const query = 'SELECT * FROM patients WHERE branch_id = $1 ORDER BY first_name';
  return executeQuery(query, [branchId]);
}

async function createPatient(data) {
  const { branchId, firstName, lastName, tcNumber, phone, birthDate, doctorIds, notes } = data;
  // doctorIds: dizi beklenir (çoklu doktor)
  const query = `
    INSERT INTO patients (branch_id, first_name, last_name, tc_number, phone, birth_date, notes)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `;
  const patient = await executeQuery(query, [branchId, firstName, lastName, tcNumber, phone, birthDate, notes], { returnSingle: true });
  if (patient && Array.isArray(doctorIds)) {
    for (const doctorId of doctorIds) {
      await executeQuery(
        'INSERT INTO patient_doctors (patient_id, doctor_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [patient.patient_id, doctorId]
      );
    }
  }
  return patient;
}

async function updatePatient(patientId, data) {
  const { branchId, firstName, lastName, tcNumber, phone, birthDate, doctorIds, notes } = data;
  const query = `
    UPDATE patients
    SET branch_id = $1, first_name = $2, last_name = $3, tc_number = $4, phone = $5, birth_date = $6, notes = $7, updated_at = CURRENT_TIMESTAMP
    WHERE patient_id = $8
    RETURNING *
  `;
  const patient = await executeQuery(query, [branchId, firstName, lastName, tcNumber, phone, birthDate, notes, patientId], { returnSingle: true });
  if (patient && Array.isArray(doctorIds)) {
    // Önce eski ilişkileri sil
    await executeQuery('DELETE FROM patient_doctors WHERE patient_id = $1', [patientId]);
    // Sonra yeni doktorları ekle
    for (const doctorId of doctorIds) {
      await executeQuery(
        'INSERT INTO patient_doctors (patient_id, doctor_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [patientId, doctorId]
      );
    }
  }
  return patient;
}

async function deletePatient(patientId) {
  const query = 'DELETE FROM patients WHERE patient_id = $1 RETURNING *';
  return executeQuery(query, [patientId], { returnSingle: true });
}

async function getAllPatients() {
  const query = 'SELECT * FROM patients';
  return executeQuery(query);
}

module.exports = { getPatientById, getPatientsByBranch, createPatient, updatePatient, deletePatient, getAllPatients };