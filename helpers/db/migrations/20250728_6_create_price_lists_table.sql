CREATE TABLE IF NOT EXISTS price_lists (
    price_list_id SERIAL PRIMARY KEY,
    branch_id INT REFERENCES branches(branch_id) ON DELETE RESTRICT,
    name VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_price_lists_branch_id ON price_lists (branch_id);
CREATE INDEX IF NOT EXISTS idx_price_lists_is_active ON price_lists (is_active);