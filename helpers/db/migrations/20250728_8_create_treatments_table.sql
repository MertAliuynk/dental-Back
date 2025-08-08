CREATE TABLE IF NOT EXISTS treatments (
    treatment_id SERIAL PRIMARY KEY,
    patient_id INT REFERENCES patients(patient_id) ON DELETE CASCADE,
    treatment_type_id INT REFERENCES treatment_types(treatment_type_id) ON DELETE RESTRICT,
    doctor_id INT REFERENCES users(user_id) ON DELETE RESTRICT,
    status VARCHAR(20) NOT NULL CHECK (status IN ('suggested', 'approved', 'completed')),
    tooth_count INT DEFAULT 1,
    tooth_numbers INT[],
    is_lower_jaw BOOLEAN DEFAULT FALSE,
    is_upper_jaw BOOLEAN DEFAULT FALSE,
    suggested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_treatments_patient_id ON treatments (patient_id);
CREATE INDEX IF NOT EXISTS idx_treatments_doctor_id ON treatments (doctor_id);
CREATE INDEX IF NOT EXISTS idx_treatments_treatment_type_id ON treatments (treatment_type_id);
CREATE INDEX IF NOT EXISTS idx_treatments_status ON treatments (status);