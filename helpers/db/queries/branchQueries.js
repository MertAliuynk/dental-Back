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
  const { name, address } = data;
  const query = `
    UPDATE branches
  SET name = $1, address = $2
    WHERE branch_id = $3
    RETURNING *
  `;
  return executeQuery(query, [name, address, branchId], { returnSingle: true });
}

async function deleteBranch(branchId) {
  const query = 'DELETE FROM branches WHERE branch_id = $1 RETURNING *';
  return executeQuery(query, [branchId], { returnSingle: true });
}

module.exports = { getBranchById, getAllBranches, createBranch, updateBranch, deleteBranch };