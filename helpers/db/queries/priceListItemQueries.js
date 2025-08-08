const { executeQuery } = require('../utils/queryExecutor');

async function getPriceListItemById(priceListItemId) {
  const query = 'SELECT * FROM price_list_items WHERE price_list_item_id = $1';
  return executeQuery(query, [priceListItemId], { returnSingle: true });
}

async function getPriceListItemsByPriceList(priceListId) {
  const query = 'SELECT * FROM price_list_items WHERE price_list_id = $1';
  return executeQuery(query, [priceListId]);
}

async function createPriceListItem(data) {
  const { priceListId, treatmentTypeId, basePrice, lowerJawPrice, upperJawPrice } = data;
  const query = `
    INSERT INTO price_list_items (price_list_id, treatment_type_id, base_price, lower_jaw_price, upper_jaw_price)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `;
  return executeQuery(query, [priceListId, treatmentTypeId, basePrice, lowerJawPrice, upperJawPrice], { returnSingle: true });
}

async function updatePriceListItem(priceListItemId, data) {
  const { basePrice, lowerJawPrice, upperJawPrice } = data;
  const query = `
    UPDATE price_list_items
    SET base_price = $1, lower_jaw_price = $2, upper_jaw_price = $3
    WHERE price_list_item_id = $4
    RETURNING *
  `;
  return executeQuery(query, [basePrice, lowerJawPrice, upperJawPrice, priceListItemId], { returnSingle: true });
}

async function deletePriceListItem(priceListItemId) {
  const query = 'DELETE FROM price_list_items WHERE price_list_item_id = $1 RETURNING *';
  return executeQuery(query, [priceListItemId], { returnSingle: true });
}

module.exports = { getPriceListItemById, getPriceListItemsByPriceList, createPriceListItem, updatePriceListItem, deletePriceListItem };