const { executeQuery } = require('../utils/queryExecutor');

async function getSmsTemplateById(templateId) {
  const query = 'SELECT * FROM sms_templates WHERE template_id = $1';
  return executeQuery(query, [templateId], { returnSingle: true });
}

async function getAllSmsTemplates() {
  const query = 'SELECT * FROM sms_templates ORDER BY name';
  return executeQuery(query);
}

async function createSmsTemplate(data) {
  const { name, content } = data;
  const query = `
    INSERT INTO sms_templates (name, content)
    VALUES ($1, $2)
    RETURNING *
  `;
  return executeQuery(query, [name, content], { returnSingle: true });
}

async function updateSmsTemplate(templateId, data) {
  const { name, content } = data;
  const query = `
    UPDATE sms_templates
    SET name = $1, content = $2
    WHERE template_id = $3
    RETURNING *
  `;
  return executeQuery(query, [name, content, templateId], { returnSingle: true });
}

async function deleteSmsTemplate(templateId) {
  const query = 'DELETE FROM sms_templates WHERE template_id = $1 RETURNING *';
  return executeQuery(query, [templateId], { returnSingle: true });
}

module.exports = { getSmsTemplateById, getAllSmsTemplates, createSmsTemplate, updateSmsTemplate, deleteSmsTemplate };