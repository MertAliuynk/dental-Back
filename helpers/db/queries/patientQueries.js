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
  const { branchId, firstName, lastName, tcNumber, phone, birthDate, doctorId, notes } = data;
  const query = `
    INSERT INTO patients (branch_id, first_name, last_name, tc_number, phone, birth_date, doctor_id, notes)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `;
  return executeQuery(query, [branchId, firstName, lastName, tcNumber, phone, birthDate, doctorId, notes], { returnSingle: true });
}

async function updatePatient(patientId, data) {
  const { branchId, firstName, lastName, tcNumber, phone, birthDate, doctorId, notes } = data;
  const query = `
    UPDATE patients
    SET branch_id = $1, first_name = $2, last_name = $3, tc_number = $4, phone = $5, birth_date = $6, doctor_id = $7, notes = $8, updated_at = CURRENT_TIMESTAMP
    WHERE patient_id = $9
    RETURNING *
  `;
  return executeQuery(query, [branchId, firstName, lastName, tcNumber, phone, birthDate, doctorId, notes, patientId], { returnSingle: true });
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