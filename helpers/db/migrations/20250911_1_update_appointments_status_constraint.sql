

-- Önce mevcut status constraint'ini kaldırıyoruz
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_status_check;

-- Sonra yeni constraint'i ekliyoruz (tüm eski ve yeni değerlerle birlikte)
ALTER TABLE appointments ADD CONSTRAINT appointments_status_check 
CHECK (status IN ('scheduled', 'attended', 'missed', 'completed', 'ertelendi', 'saatkapatildi'));
