const { executeQuery } = require('../utils/queryExecutor');
const bcrypt = require('bcrypt');

async function getUserById(userId) {
  const query = 'SELECT * FROM users WHERE user_id = $1';
  return executeQuery(query, [userId], { returnSingle: true });
}

async function getUserByUsername(username) {
  const query = 'SELECT * FROM users WHERE username = $1';
  return executeQuery(query, [username], { returnSingle: true });
}

async function getUsersByBranch(branchId) {
  if (branchId) {
    const query = 'SELECT * FROM users WHERE branch_id = $1 ORDER BY first_name';
    return executeQuery(query, [branchId]);
  } else {
    const query = 'SELECT * FROM users ORDER BY first_name';
    return executeQuery(query);
  }
}

async function createUser(data) {
  const { username, password, role, branchId, firstName, lastName } = data;
  const hashedPassword = await bcrypt.hash(password, 10);
  const query = `
    INSERT INTO users (username, password, role, branch_id, first_name, last_name)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `;
  return executeQuery(query, [username, hashedPassword, role, branchId, firstName, lastName], { returnSingle: true });
}

async function updateUser(userId, data) {
  const { username, password, role, branchId, firstName, lastName } = data;
  const hashedPassword = password ? await bcrypt.hash(password, 10) : null;
  const query = `
    UPDATE users
    SET 
      username = $1,
      ${password ? 'password = $2,' : ''} 
      role = $3,
      branch_id = $4,
      first_name = $5,
      last_name = $6,
      updated_at = CURRENT_TIMESTAMP
    WHERE user_id = $7
    RETURNING *
  `;
  const params = password
    ? [username, hashedPassword, role, branchId, firstName, lastName, userId]
    : [username, role, branchId, firstName, lastName, userId];
  return executeQuery(query, params, { returnSingle: true });
}

async function deleteUser(userId) {
  const query = 'DELETE FROM users WHERE user_id = $1 RETURNING *';
  return executeQuery(query, [userId], { returnSingle: true });
}

module.exports = { getUserById, getUserByUsername, getUsersByBranch, createUser, updateUser, deleteUser };