CREATE TABLE IF NOT EXISTS appointments (
    appointment_id SERIAL PRIMARY KEY,
    patient_id INT REFERENCES patients(patient_id) ON DELETE CASCADE,
    doctor_id INT REFERENCES users(user_id) ON DELETE RESTRICT,
    branch_id INT REFERENCES branches(branch_id) ON DELETE RESTRICT,
    appointment_time TIMESTAMP NOT NULL,
    duration_minutes INT NOT NULL CHECK (duration_minutes % 15 = 0 AND duration_minutes >= 15),
    status VARCHAR(20) NOT NULL CHECK (status IN ('scheduled', 'attended', 'missed')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_appointments_patient_id ON appointments (patient_id);
CREATE INDEX idx_appointments_doctor_id ON appointments (doctor_id);
CREATE INDEX idx_appointments_branch_id ON appointments (branch_id);
CREATE INDEX idx_appointments_appointment_time ON appointments (appointment_time);
CREATE INDEX idx_appointments_status ON appointments (status);