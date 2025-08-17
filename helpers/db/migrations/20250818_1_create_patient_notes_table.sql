CREATE TABLE IF NOT EXISTS patient_notes (
    note_id SERIAL PRIMARY KEY,
    patient_id INT REFERENCES patients(patient_id) ON DELETE CASCADE,
    note TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_patient_notes_patient_id ON patient_notes (patient_id);
