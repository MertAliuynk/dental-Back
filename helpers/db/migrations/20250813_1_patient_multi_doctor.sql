-- Çoklu doktor atama için migration

-- 1. Yeni ilişki tablosu: patient_doctors
CREATE TABLE IF NOT EXISTS patient_doctors (
	patient_id INT REFERENCES patients(patient_id) ON DELETE CASCADE,
	doctor_id INT REFERENCES users(user_id) ON DELETE RESTRICT,
	PRIMARY KEY (patient_id, doctor_id)
);

-- 2. patients tablosundan doctor_id kaldırılıyor (varsa)
ALTER TABLE patients DROP COLUMN IF EXISTS doctor_id;

-- 3. Eski hastaların doctor_id ilişkisini yeni tabloya taşı (opsiyonel, veri kaybı olmaması için)
INSERT INTO patient_doctors (patient_id, doctor_id)
SELECT patient_id, doctor_id FROM patients WHERE doctor_id IS NOT NULL;

-- 4. (Opsiyonel) Eski index'i kaldır
DROP INDEX IF EXISTS idx_patients_doctor_id;
