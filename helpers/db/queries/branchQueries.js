const { executeQuery } = require('../utils/queryExecutor');

async function getBranchById(branchId) {
  const query = 'SELECT * FROM branches WHERE branch_id = $1';
  return executeQuery(query, [branchId], { returnSingle: true });
}

async function getAllBranches() {
  const query = 'SELECT * FROM branches ORDER BY name';
  return executeQuery(query);
}

async function createBranch(data) {
  const { name, address } = data;
  const query = `
    INSERT INTO branches (name, address)
    VALUES ($1, $2)
    RETURNING *
  `;
  return executeQuery(query, [name, address], { returnSingle: true });
}

async function updateBranch(branchId, data) {
  const { name, address, permanent_doctor_count } = data;
  let setParts = ['name = $1', 'address = $2'];
  let params = [name, address];
  let paramIndex = params.length + 1;
  if (typeof permanent_doctor_count !== 'undefined' && permanent_doctor_count !== null) {
    setParts.push(`permanent_doctor_count = $${paramIndex}`);
    params.push(permanent_doctor_count);
    paramIndex++;
  }
  const query = `
    UPDATE branches
    SET ${setParts.join(', ')}
    WHERE branch_id = $${paramIndex}
    RETURNING *
  `;
  params.push(branchId);
  return executeQuery(query, params, { returnSingle: true });
}

async function deleteBranch(branchId) {
  const query = 'DELETE FROM branches WHERE branch_id = $1 RETURNING *';
  return executeQuery(query, [branchId], { returnSingle: true });
}

module.exports = { getBranchById, getAllBranches, createBranch, updateBranch, deleteBranch };