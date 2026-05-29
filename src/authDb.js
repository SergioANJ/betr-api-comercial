const {Pool} = require('pg');
require('dotenv').config();

const authPool = new Pool({
  host:     process.env.AUTH_DB_HOST,
  port:     process.env.AUTH_DB_PORT,
  database: process.env.AUTH_DB_NAME,
  user:     process.env.AUTH_DB_USER,
  password: process.env.AUTH_DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
});

authPool.connect((err, client, release) => {
  if (err) {
    console.error('Error conectando a DB de usuarios:', err.message);
  } else {
    console.log('Conectado a DB de usuarios en Railway');
    release();
  }
});

module.exports = authPool