-- Doktor sıralama tablosu
CREATE TABLE IF NOT EXISTS doctor_order (
    id SERIAL PRIMARY KEY,
    doctor_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    order_num INTEGER NOT NULL
);
-- Sıra numarası indexi
CREATE INDEX IF NOT EXISTS idx_doctor_order_num ON doctor_order(order_num);
