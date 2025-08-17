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
  // Dinamik sorgu: tcNumber varsa güncelle, yoksa dokunma
  let setParts = [
    'branch_id = $1',
    'first_name = $2',
    'last_name = $3',
    'phone = $4',
    'birth_date = $5',
    'notes = $6',
    'updated_at = CURRENT_TIMESTAMP'
  ];
  let params = [branchId, firstName, lastName, phone, birthDate, notes];
  let tcIndex = null;
  if (typeof tcNumber === 'string' && tcNumber.length > 0) {
    setParts.splice(3, 0, 'tc_number = $' + (params.length + 1));
    params.splice(3, 0, tcNumber);
    tcIndex = params.length; // Sadece debug için
  }
  const query = `
    UPDATE patients
    SET ${setParts.join(', ')}
    WHERE patient_id = $${params.length + 1}
    RETURNING *
  `;
  params.push(patientId);
  const patient = await executeQuery(query, params, { returnSingle: true });
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