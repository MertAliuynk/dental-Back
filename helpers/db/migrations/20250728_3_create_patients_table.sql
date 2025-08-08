CREATE TABLE IF NOT EXISTS patients (
    patient_id SERIAL PRIMARY KEY,
    branch_id INT REFERENCES branches(branch_id) ON DELETE RESTRICT,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    tc_number VARCHAR(11) UNIQUE,
    phone VARCHAR(15),
    birth_date DATE,
    doctor_id INT REFERENCES users(user_id) ON DELETE RESTRICT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_patients_branch_id ON patients (branch_id);
CREATE INDEX IF NOT EXISTS idx_patients_doctor_id ON patients (doctor_id);
CREATE INDEX IF NOT EXISTS idx_patients_tc_number ON patients (tc_number);