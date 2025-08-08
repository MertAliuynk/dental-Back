CREATE TABLE IF NOT EXISTS sms_schedules (
    sms_schedule_id SERIAL PRIMARY KEY,
    patient_id INT REFERENCES patients(patient_id) ON DELETE CASCADE,
    template_id INT REFERENCES sms_templates(template_id) ON DELETE RESTRICT,
    send_time TIMESTAMP NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'sent')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sms_schedules_patient_id ON sms_schedules (patient_id);
CREATE INDEX IF NOT EXISTS idx_sms_schedules_template_id ON sms_schedules (template_id);
CREATE INDEX IF NOT EXISTS idx_sms_schedules_send_time ON sms_schedules (send_time);
CREATE INDEX IF NOT EXISTS idx_sms_schedules_status ON sms_schedules (status);