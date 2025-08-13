const fs = require('fs');
const path = require('path');
const pool = require('../utils/dbClient');

async function runMigrations() {
  try {
    console.log('Starting migrations...');

    // Elle belirlenmiş migration sırası (bağımlılıklara göre)
    const migrationDir = path.join(__dirname, '../migrations');
  const allFiles = [
      '20250728_1_create_branches_table.sql',
      '20250728_2_create_users_table.sql',
      '20250728_3_create_patients_table.sql',
      '20250728_4_create_patient_anamnesis_table.sql',
      '20250728_5_create_treatment_types_table.sql',
      '20250728_6_create_price_lists_table.sql',
      '20250728_7_create_price_list_items_table.sql',
      '20250728_8_create_treatments_table.sql',
      '20250728_9_create_appointments_table.sql',
      '20250728_10_create_sms_templates_table.sql',
      '20250728_11_create_sms_schedules_table.sql',
      '20250728_12_create_feedbacks_table.sql',
      '20250728_13_create_consent_forms_table.sql',
      '20250728_14_add_notes_to_treatments.sql',
      '20250728_15_update_treatment_status_turkish.sql',
      '20250807_1_update_appointments_status_constraint.sql',
      '20250807_2_update_tc_number_length.sql',
      '20250807_3_create_feedback_planning.sql',
      '20250808_1_fix_feedback_trigger.sql',
  '20250810_1_add_price_to_treatments.sql',
  '20250810_2_appointments_time_to_timestamptz.sql',
  `20250813_1_patient_multi_doctor.sql`
    ];

    // Migrations tablosunu önce oluştur (eğer yoksa)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_migrations_name ON migrations (name);
    `);

    // Uygulanmış migrasyonları al
    const appliedMigrations = await pool.query('SELECT name FROM migrations');
    const appliedNames = appliedMigrations.rows.map((row) => row.name);

    // Migrasyon dosyalarını sırayla çalıştır
  for (const file of allFiles) {
      if (!appliedNames.includes(file)) {
        console.log(`Running migration: ${file}`);
        if (!fs.existsSync(path.join(migrationDir, file))) {
          console.error(`File not found: ${file}`);
          throw new Error(`Migration file ${file} does not exist`);
        }
        const sql = fs.readFileSync(path.join(migrationDir, file), 'utf-8');
        await pool.query(sql);
        await pool.query('INSERT INTO migrations (name) VALUES ($1)', [file]);
        console.log(`Completed migration: ${file}`);
      } else {
        console.log(`Skipping already applied migration: ${file}`);
      }
    }

    console.log('All migrations completed.');
  } catch (error) {
    console.error('Migration error:', error);
    throw error;
  }
}

module.exports = runMigrations;

if (require.main === module) {
  runMigrations().catch((err) => {
    console.error('Migration error:', err);
    process.exit(1);
  });
}