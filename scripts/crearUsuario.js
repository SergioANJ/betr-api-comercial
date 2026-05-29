const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const pool =  new Pool({
    host:       process.env.AUTH_DB_HOST,
    port:       process.env.AUTH_DB_PORT,
    database:   process.env.AUTH_DB_NAME,
    user:       process.env.AUTH_DB_USER,
    password:   process.env.AUTH_DB_PASSWORD,
    ssl: {rejectUnauthorized: false},
});

async function crearUsuarios(nombre, email, password, rol) {
    // Convertir la contraseña a hash antes de guardarla
    const hash = await bcrypt.hash(password, 10);

    const result = await pool.query(
    `INSERT INTO usuarios (nombre, email, password, rol)
     VALUES ($1, $2, $3, $4)
     RETURNING id, nombre, email, rol`,
    [nombre, email, hash, rol]
  );

  console.log('Usuario creado:', result.rows[0]);
  await pool.end();
}

//Asignamos los datos para el usuario Real
crearUsuarios(
    'Data Betr',
    'sergiojimenez@betrmedia.com',
    '895578',
    'Data'
)