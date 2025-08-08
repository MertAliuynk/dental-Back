const { executeQuery } = require('../utils/queryExecutor');

async function getSmsScheduleById(smsScheduleId) {
  const query = 'SELECT * FROM sms_schedules WHERE sms_schedule_id = $1';
  return executeQuery(query, [smsScheduleId], { returnSingle: true });
}

async function getPendingSmsSchedules() {
  const query = 'SELECT * FROM sms_schedules WHERE status = $1 AND send_time <= CURRENT_TIMESTAMP';
  return executeQuery(query, ['pending']);
}

async function createSmsSchedule(data) {
  const { patientId, templateId, sendTime, status } = data;
  const query = `
    INSERT INTO sms_schedules (patient_id, template_id, send_time, status)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `;
  return executeQuery(query, [patientId, templateId, sendTime, status], { returnSingle: true });
}

async function updateSmsSchedule(smsScheduleId, data) {
  const { sendTime, status } = data;
  const query = `
    UPDATE sms_schedules
    SET send_time = $1, status = $2
    WHERE sms_schedule_id = $3
    RETURNING *
  `;
  return executeQuery(query, [sendTime, status, smsScheduleId], { returnSingle: true });
}

async function deleteSmsSchedule(smsScheduleId) {
  const query = 'DELETE FROM sms_schedules WHERE sms_schedule_id = $1 RETURNING *';
  return executeQuery(query, [smsScheduleId], { returnSingle: true });
}

module.exports = { getSmsScheduleById, getPendingSmsSchedules, createSmsSchedule, updateSmsSchedule, deleteSmsSchedule };