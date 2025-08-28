// Sadece süre güncelleyen fonksiyon
async function updateAppointmentDuration(appointmentId, durationMinutes) {
  if (durationMinutes % 15 !== 0 || durationMinutes < 15) {
    throw new Error('Duration must be a multiple of 15 and at least 15 minutes');
  }
  const query = `
    UPDATE appointments
    SET duration_minutes = $1, updated_at = CURRENT_TIMESTAMP
    WHERE appointment_id = $2
    RETURNING *
  `;
  return executeQuery(query, [durationMinutes, appointmentId], { returnSingle: true });
}
const { executeQuery } = require('../utils/queryExecutor');

async function getAppointmentById(appointmentId) {
  const query = 'SELECT * FROM appointments WHERE appointment_id = $1';
  return executeQuery(query, [appointmentId], { returnSingle: true });
}

async function getAppointmentsByDoctor(doctorId, date) {
  const query = `
    SELECT * FROM appointments 
    WHERE doctor_id = $1 AND DATE(appointment_time) = $2
    ORDER BY appointment_time
  `;
  return executeQuery(query, [doctorId, date]);
}

async function createAppointment(data) {
  const { patientId, doctorId, branchId, appointmentTime, durationMinutes, status, notes } = data;
  if (durationMinutes % 15 !== 0 || durationMinutes < 15) {
    throw new Error('Duration must be a multiple of 15 and at least 15 minutes');
  }
  const query = `
    INSERT INTO appointments (patient_id, doctor_id, branch_id, appointment_time, duration_minutes, status, notes)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `;
  return executeQuery(query, [patientId, doctorId, branchId, appointmentTime, durationMinutes, status, notes], { returnSingle: true });
}

// Esnek güncelleme fonksiyonu: sadece verilen alanları günceller
async function updateAppointment(appointmentId, data) {
  try {
    // Önce mevcut randevuyu getir
    const current = await executeQuery('SELECT * FROM appointments WHERE appointment_id = $1', [appointmentId], { returnSingle: true });
    if (!current) return null;

    // Güncelleme verisini hazırla - mevcut değerler ile birleştir
    const updatedData = {
      patient_id: data.patientId || current.patient_id,
      doctor_id: data.doctorId || current.doctor_id, 
      branch_id: data.branchId || current.branch_id,
      appointment_time: data.appointmentTime || current.appointment_time,
      duration_minutes: data.duration || current.duration_minutes,
      status: data.status || current.status,
      notes: data.notes !== undefined ? data.notes : current.notes
    };

    // Duration validation
    if (updatedData.duration_minutes && (updatedData.duration_minutes % 15 !== 0 || updatedData.duration_minutes < 15)) {
      throw new Error('Duration must be a multiple of 15 and at least 15 minutes');
    }

    const query = `
      UPDATE appointments
      SET patient_id = $1, doctor_id = $2, branch_id = $3, appointment_time = $4, duration_minutes = $5, status = $6, notes = $7, updated_at = CURRENT_TIMESTAMP
      WHERE appointment_id = $8
      RETURNING *
    `;
    
    return executeQuery(query, [
      updatedData.patient_id,
      updatedData.doctor_id,
      updatedData.branch_id,
      updatedData.appointment_time,
      updatedData.duration_minutes,
      updatedData.status,
      updatedData.notes,
      appointmentId
    ], { returnSingle: true });
  } catch (error) {
    console.error('updateAppointment error:', error);
    throw error;
  }
}

async function deleteAppointment(appointmentId) {
  const query = 'DELETE FROM appointments WHERE appointment_id = $1 RETURNING *';
  return executeQuery(query, [appointmentId], { returnSingle: true });
}

async function getAllAppointments() {
  // Doktor adını da döndür
  const query = `
    SELECT a.*, u.first_name AS doctor_first_name, u.last_name AS doctor_last_name,
           p.first_name || ' ' || p.last_name as patient_name,
           p.phone as patient_phone
    FROM appointments a
    LEFT JOIN users u ON a.doctor_id = u.user_id
    LEFT JOIN patients p ON a.patient_id = p.patient_id
  `;
  return executeQuery(query);
}

module.exports = { getAppointmentById, getAppointmentsByDoctor, createAppointment, updateAppointment, deleteAppointment, getAllAppointments, updateAppointmentDuration };