const fs = require('fs');
const path = require('path');
const pool = require('../utils/dbClient');

async function runMigrations() {
  try {
    console.log('Starting migrations...');

    // Dinamik olarak migrations klasöründeki tüm .sql dosyalarını sırala
    const migrationDir = path.join(__dirname, '../migrations');
    const allFiles = fs.readdirSync(migrationDir)
      .filter((f) => f.endsWith('.sql'))
      .sort(); // isimlere göre kronolojik sıralama varsayılır

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