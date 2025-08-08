CREATE TABLE IF NOT EXISTS treatment_types (
    treatment_type_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    is_per_tooth BOOLEAN DEFAULT FALSE,
    is_jaw_specific BOOLEAN DEFAULT FALSE,
    feedback_intervals TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_treatment_types_name ON treatment_types (name);