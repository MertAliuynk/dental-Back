CREATE TABLE IF NOT EXISTS price_list_items (
    price_list_item_id SERIAL PRIMARY KEY,
    price_list_id INT REFERENCES price_lists(price_list_id) ON DELETE CASCADE,
    treatment_type_id INT REFERENCES treatment_types(treatment_type_id) ON DELETE RESTRICT,
    base_price DECIMAL(10, 2) NOT NULL,
    lower_jaw_price DECIMAL(10, 2),
    upper_jaw_price DECIMAL(10, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_price_list_items_price_list_id ON price_list_items (price_list_id);
CREATE INDEX IF NOT EXISTS idx_price_list_items_treatment_type_id ON price_list_items (treatment_type_id);