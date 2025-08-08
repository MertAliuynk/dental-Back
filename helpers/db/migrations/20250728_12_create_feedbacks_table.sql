CREATE TABLE IF NOT EXISTS feedbacks (
    feedback_id SERIAL PRIMARY KEY,
    treatment_id INT REFERENCES treatments(treatment_id) ON DELETE CASCADE,
    interval VARCHAR(20) NOT NULL CHECK (interval IN ('1_week', '1_month', '3_months', '6_months')),
    feedback_date TIMESTAMP NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_feedbacks_treatment_id ON feedbacks (treatment_id);
CREATE INDEX IF NOT EXISTS idx_feedbacks_interval ON feedbacks (interval);