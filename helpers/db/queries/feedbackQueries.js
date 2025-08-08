const { executeQuery } = require('../utils/queryExecutor');

async function getFeedbackById(feedbackId) {
  const query = 'SELECT * FROM feedbacks WHERE feedback_id = $1';
  return executeQuery(query, [feedbackId], { returnSingle: true });
}

async function getFeedbacksByTreatment(treatmentId) {
  const query = 'SELECT * FROM feedbacks WHERE treatment_id = $1 ORDER BY feedback_date';
  return executeQuery(query, [treatmentId]);
}

async function createFeedback(data) {
  const { treatmentId, interval, feedbackDate, notes } = data;
  const query = `
    INSERT INTO feedbacks (treatment_id, interval, feedback_date, notes)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `;
  return executeQuery(query, [treatmentId, interval, feedbackDate, notes], { returnSingle: true });
}

async function updateFeedback(feedbackId, data) {
  const { interval, feedbackDate, notes } = data;
  const query = `
    UPDATE feedbacks
    SET interval = $1, feedback_date = $2, notes = $3
    WHERE feedback_id = $4
    RETURNING *
  `;
  return executeQuery(query, [interval, feedbackDate, notes, feedbackId], { returnSingle: true });
}

async function deleteFeedback(feedbackId) {
  const query = 'DELETE FROM feedbacks WHERE feedback_id = $1 RETURNING *';
  return executeQuery(query, [feedbackId], { returnSingle: true });
}

module.exports = { getFeedbackById, getFeedbacksByTreatment, createFeedback, updateFeedback, deleteFeedback };