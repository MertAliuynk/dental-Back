CREATE TABLE IF NOT EXISTS patient_anamnesis (
    anamnesis_id SERIAL PRIMARY KEY,
    patient_id INT REFERENCES patients(patient_id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    answer_type VARCHAR(20) NOT NULL CHECK (answer_type IN ('text', 'boolean')),
    answer_text TEXT,
    answer_boolean BOOLEAN,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_patient_anamnesis_patient_id ON patient_anamnesis (patient_id);