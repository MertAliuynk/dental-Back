const pool = require('../utils/dbClient');
const bcrypt = require('bcrypt');

async function ensureAdminUser() {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  const firstName = process.env.ADMIN_FIRST_NAME || 'Admin';
  const lastName = process.env.ADMIN_LAST_NAME || 'User';
  const role = 'admin';

  try {
    // users tablosu var mı yok mu kontrol etmek yerine, hata durumunda yakalayıp geçeceğiz
    const { rows } = await pool.query('SELECT user_id FROM users WHERE role = $1 LIMIT 1', [role]);
    if (rows && rows.length > 0) {
      console.log('Admin user already exists. Skipping seeding.');
      return;
    }

    console.log('No admin found. Creating default admin user...');

    const hashed = await bcrypt.hash(password, 10);
    // branch_id opsiyonel (NULL) bırakılabilir; gerekiyorsa ENV ile verilebilir
    const branchId = process.env.ADMIN_BRANCH_ID ? Number(process.env.ADMIN_BRANCH_ID) : null;

    const insertSQL = `
      INSERT INTO users (username, password, role, branch_id, first_name, last_name)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING user_id, username, role
    `;

    const result = await pool.query(insertSQL, [username, hashed, role, branchId, firstName, lastName]);
    console.log('Default admin created:', result.rows[0]);
  } catch (err) {
    console.error('ensureAdminUser error:', err.message);
    throw err;
  }
}

module.exports = ensureAdminUser;

if (require.main === module) {
  ensureAdminUser()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
