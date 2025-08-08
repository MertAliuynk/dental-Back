const pool = require('../utils/dbClient');
const bcrypt = require('bcrypt');

async function seedDatabase() {
  try {
    console.log('Seeding database...');

    // 1. Şubeler
    await pool.query(`
      INSERT INTO branches (name, address)
      VALUES 
        ('İstanbul Şubesi', 'Kadıköy, İstanbul'),
        ('Ankara Şubesi', 'Çankaya, Ankara')
    `);

    // 2. Kullanıcılar (admin, doktor, şube yöneticisi, bankocu)
    const hashedPassword = await bcrypt.hash('password123', 10);
    await pool.query(`
      INSERT INTO users (username, password, role, branch_id, first_name, last_name)
      VALUES 
        ('admin', $1, 'admin', NULL, 'Admin', 'User'),
        ('doktor1', $1, 'doctor', 1, 'Ayşe', 'Doktor'),
        ('manager1', $1, 'branch_manager', 1, 'Mehmet', 'Yönetici'),
        ('receptionist1', $1, 'receptionist', 1, 'Zeynep', 'Resepsiyonist')
    `, [hashedPassword]);

    // 3. Hastalar
    await pool.query(`
      INSERT INTO patients (branch_id, first_name, last_name, tc_number, phone, birth_date, doctor_id, notes)
      VALUES 
        (1, 'Ahmet', 'Yılmaz', '12345678901', '905555555555', '1990-01-01', 2, 'Test hastası'),
        (1, 'Fatma', 'Kaya', '12345678902', '905555555556', '1985-05-15', 2, 'Alerji notu: Penisilin')
    `);

    // 4. Hasta Anamnez
    await pool.query(`
      INSERT INTO patient_anamnesis (patient_id, question, answer_type, answer_text, answer_boolean)
      VALUES 
        (1, 'Alerjiniz var mı?', 'text', 'Yok', NULL),
        (1, 'Kronik hastalığınız var mı?', 'boolean', NULL, FALSE),
        (2, 'Alerjiniz var mı?', 'text', 'Penisilin', NULL)
    `);

    // 5. Tedavi Türleri
    await pool.query(`
      INSERT INTO treatment_types (name, category, is_per_tooth, is_jaw_specific, feedback_intervals)
      VALUES 
        ('Dolgu', 'Restoratif', TRUE, FALSE, ARRAY['1_week', '1_month']),
        ('Kanal Tedavisi', 'Endodonti', FALSE, TRUE, ARRAY['1_month', '3_months']),
        ('Diş Teli', 'Ortodonti', FALSE, TRUE, ARRAY['1_month', '3_months', '6_months'])
    `);

    // 6. Fiyat Listeleri
    await pool.query(`
      INSERT INTO price_lists (branch_id, name, is_active)
      VALUES 
        (1, '2025 İstanbul Fiyat Listesi', TRUE),
        (2, '2025 Ankara Fiyat Listesi', TRUE)
    `);

    // 7. Fiyat Listesi Kalemleri
    await pool.query(`
      INSERT INTO price_list_items (price_list_id, treatment_type_id, base_price, lower_jaw_price, upper_jaw_price)
      VALUES 
        (1, 1, 500.00, NULL, NULL), -- Dolgu
        (1, 2, 1500.00, 1600.00, 1600.00), -- Kanal Tedavisi
        (2, 1, 550.00, NULL, NULL) -- Dolgu (Ankara)
    `);

    // 8. Tedaviler
    await pool.query(`
      INSERT INTO treatments (patient_id, treatment_type_id, doctor_id, status, tooth_count, tooth_numbers, is_lower_jaw, is_upper_jaw, suggested_at)
      VALUES 
        (1, 1, 2, 'suggested', 2, ARRAY[11, 12], FALSE, FALSE, '2025-07-28 10:00:00'),
        (2, 2, 2, 'approved', 1, NULL, TRUE, FALSE, '2025-07-28 11:00:00')
    `);

    // 9. Randevular (15’in katı sürelerle)
    await pool.query(`
      INSERT INTO appointments (patient_id, doctor_id, branch_id, appointment_time, duration_minutes, status, notes)
      VALUES 
        (1, 2, 1, '2025-07-30 10:00:00', 30, 'scheduled', 'İlk muayene'),
        (2, 2, 1, '2025-07-30 11:00:00', 45, 'scheduled', 'Kanal tedavisi kontrol')
    `);

    // 10. SMS Şablonları
    await pool.query(`
      INSERT INTO sms_templates (name, content)
      VALUES 
        ('Randevu Hatırlatma', 'Sayın {patient_name}, randevunuz {date} tarihinde saat {time}’dadır.'),
        ('Tedavi Geri Dönüş', 'Sayın {patient_name}, {treatment_name} tedaviniz için {interval} kontrolünüz yaklaşıyor.')
    `);

    // 11. SMS Planları
    await pool.query(`
      INSERT INTO sms_schedules (patient_id, template_id, send_time, status)
      VALUES 
        (1, 1, '2025-07-29 09:00:00', 'pending'),
        (2, 2, '2025-08-01 09:00:00', 'pending')
    `);

    // 12. Geri Dönüşler
    await pool.query(`
      INSERT INTO feedbacks (treatment_id, interval, feedback_date, notes)
      VALUES 
        (1, '1_week', '2025-08-04 10:00:00', 'Hasta memnun, ağrı yok'),
        (2, '1_month', '2025-08-28 11:00:00', 'Kontrol gerekli')
    `);

    // 13. Onam Formları
    await pool.query(`
      INSERT INTO consent_forms (patient_id, name)
      VALUES 
        (1, 'Tedavi Onam Formu'),
        (2, 'Kanal Tedavisi Onam Formu')
    `);

    console.log('Seeding completed.');
  } catch (error) {
    console.error('Seed error:', error);
    throw error;
  } finally {
    await pool.end(); // Bağlantıyı kapat
  }
}

module.exports = seedDatabase;

if (require.main === module) {
  seedDatabase().catch((err) => {
    console.error('Seed error:', err);
    process.exit(1);
  });
}