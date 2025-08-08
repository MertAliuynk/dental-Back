const { executeQuery } = require('../utils/queryExecutor');

async function getPriceListById(priceListId) {
  const query = 'SELECT * FROM price_lists WHERE price_list_id = $1';
  return executeQuery(query, [priceListId], { returnSingle: true });
}

async function getActivePriceLists(branchId) {
  const query = 'SELECT * FROM price_lists WHERE branch_id = $1 AND is_active = TRUE';
  return executeQuery(query, [branchId]);
}

async function createPriceList(data) {
  const { branchId, name, isActive } = data;
  const query = `
    INSERT INTO price_lists (branch_id, name, is_active)
    VALUES ($1, $2, $3)
    RETURNING *
  `;
  return executeQuery(query, [branchId, name, isActive], { returnSingle: true });
}

async function updatePriceList(priceListId, data) {
  const { name, isActive } = data;
  const query = `
    UPDATE price_lists
    SET name = $1, is_active = $2
    WHERE price_list_id = $3
    RETURNING *
  `;
  return executeQuery(query, [name, isActive, priceListId], { returnSingle: true });
}

async function deletePriceList(priceListId) {
  const query = 'DELETE FROM price_lists WHERE price_list_id = $1 RETURNING *';
  return executeQuery(query, [priceListId], { returnSingle: true });
}

module.exports = { getPriceListById, getActivePriceLists, createPriceList, updatePriceList, deletePriceList };