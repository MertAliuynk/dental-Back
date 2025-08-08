module.exports = {
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:123mert123@localhost:5000/deneme',
  maxConnections: 20,
  minConnections: 5,
  idleTimeoutMillis: 30000,
};