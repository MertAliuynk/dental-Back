-- Şube tablosuna devamlı doktor sayısı için kolon ekler
ALTER TABLE branches ADD COLUMN permanent_doctor_count INTEGER DEFAULT 3;

-- Açıklama: Bu kolon, randevu takviminde ilk ekranda kaç doktorun gösterileceğini belirler.