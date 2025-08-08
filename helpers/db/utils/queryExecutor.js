const pool = require('./dbClient');
const logger = require('../../logger');

// Genel sorgu çalıştırma fonksiyonu
async function executeQuery(query, params = [], options = {}) {
  const { returnSingle = false } = options;

  try {
    const result = await pool.query(query, params);
    if (returnSingle) {
      return result.rows[0] || null; // Tek satır döndür
    }
    return result.rows; // Birden fazla satır döndür
  } catch (error) {
    logger.error('Query execution error:', {
      query,
      params,
      error: error.message,
      stack: error.stack,
    });
    throw new Error(`Database query failed: ${error.message}`);
  }
}

module.exports = { executeQuery };