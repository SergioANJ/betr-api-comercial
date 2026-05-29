const express   = require('express');
const bcrypt    = require('bcryptjs');
const jwt       = require('jsonwebtoken');
const router    = express.Router();
const authPool  =  require('../authDb');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES = '8h'; // el tojen dura 8 horas.


// ─────────────────────────────────────────
// Middleware — verifica que el token sea válido
// Se usa en rutas que requieren estar logueado
// ─────────────────────────────────────────
function verificarToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.usuario   = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido o vencido' });
  }
}
// ─────────────────────────────────────────
// POST /api/auth/login
// Recibe email + password, devuelve token
// ─────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña requeridos' });
  }

  try {
    // Buscar usuario por email
    const result = await authPool.query(
      'SELECT * FROM usuarios WHERE email = $1 AND activo = TRUE',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const usuario = result.rows[0];

    // Verificar contraseña
    const passwordValida = await bcrypt.compare(password, usuario.password);

    if (!passwordValida) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    // Crear token JWT con la info del usuario
    const token = jwt.sign(
      {
        id:     usuario.id,
        nombre: usuario.nombre,
        email:  usuario.email,
        rol:    usuario.rol,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );

    res.json({
      token,
      usuario: {
        id:     usuario.id,
        nombre: usuario.nombre,
        email:  usuario.email,
        rol:    usuario.rol,
      },
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────
// GET /api/auth/me
// Devuelve el usuario del token actual
// ─────────────────────────────────────────
router.get('/me', verificarToken, async (req, res) => {
  try {
    const result = await authPool.query(
      'SELECT id, nombre, email, rol FROM usuarios WHERE id = $1',
      [req.usuario.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────
// GET /api/auth/usuarios
// Lista todos los usuarios — solo jefes
// ─────────────────────────────────────────
router.get('/usuarios', verificarToken, async (req, res) => {
  if (req.usuario.rol !== 'jefe') {
    return res.status(403).json({ error: 'Sin permisos' });
  }

  try {
    const result = await authPool.query(
      'SELECT id, nombre, email, rol, activo, created_at FROM usuarios ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────
// POST /api/auth/usuarios
// Crear nuevo usuario — solo jefes
// ─────────────────────────────────────────
router.post('/usuarios', verificarToken, async (req, res) => {
  if (req.usuario.rol !== 'jefe') {
    return res.status(403).json({ error: 'Sin permisos' });
  }

  const { nombre, email, password, rol } = req.body;

  if (!nombre || !email || !password || !rol) {
    return res.status(400).json({ error: 'Todos los campos son requeridos' });
  }

  try {
    const hash   = await bcrypt.hash(password, 10);
    const result = await authPool.query(
      `INSERT INTO usuarios (nombre, email, password, rol)
       VALUES ($1, $2, $3, $4)
       RETURNING id, nombre, email, rol`,
      [nombre, email, hash, rol]
    );
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Ese email ya está registrado' });
    }
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────
// Exportamos también el middleware
// para usarlo en otras rutas
// ─────────────────────────────────────────
module.exports = router;
module.exports.verificarToken = verificarToken;

// ─────────────────────────────────────────
// GET /api/auth/notas
// Trae las notas según el rol:
// data → todas las notas
// jefe/ejecutiva → solo sus notas
// ─────────────────────────────────────────
router.get('/notas', verificarToken, async (req, res) => {
  const { id, rol } = req.usuario;

  try {
    let result;

    if (rol === 'data') {
      // data ve todas las notas con el nombre del autor
      result = await authPool.query(`
        SELECT
          n.id,
          n.contenido,
          n.seccion,
          n.created_at,
          u.nombre   AS autor,
          u.rol      AS rol_autor,
          n.id_usuario
        FROM notas n
        JOIN usuarios u ON n.id_usuario = u.id
        ORDER BY n.created_at DESC
      `);
    } else {
      // jefe y ejecutiva solo ven sus propias notas
      result = await authPool.query(`
        SELECT
          n.id,
          n.contenido,
          n.seccion,
          n.created_at,
          u.nombre   AS autor,
          u.rol      AS rol_autor,
          n.id_usuario
        FROM notas n
        JOIN usuarios u ON n.id_usuario = u.id
        WHERE n.id_usuario = $1
        ORDER BY n.created_at DESC
      `, [id]);
    }

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────
// POST /api/auth/notas
// Crear una nota nueva
// ─────────────────────────────────────────
router.post('/notas', verificarToken, async (req, res) => {
  const { id, rol } = req.usuario;

  // contadora no puede crear notas
  if (rol === 'contadora') {
    return res.status(403).json({ error: 'Sin permisos para crear notas' });
  }

  const { contenido, seccion } = req.body;

  if (!contenido || !seccion) {
    return res.status(400).json({ error: 'Contenido y sección son requeridos' });
  }

  try {
    const result = await authPool.query(`
      INSERT INTO notas (id_usuario, contenido, seccion)
      VALUES ($1, $2, $3)
      RETURNING id, contenido, seccion, created_at
    `, [id, contenido, seccion]);

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────
// DELETE /api/auth/notas/:id
// Eliminar una nota — solo el autor
// ─────────────────────────────────────────
router.delete('/notas/:id', verificarToken, async (req, res) => {
  const { id: userId, rol } = req.usuario;
  const { id: notaId }      = req.params;

  try {
    // Verificar que la nota pertenece al usuario
    // data puede eliminar cualquier nota
    const check = await authPool.query(
      'SELECT id_usuario FROM notas WHERE id = $1',
      [notaId]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Nota no encontrada' });
    }

    const esAutor    = check.rows[0].id_usuario === userId;
    const esData     = rol === 'data';

    if (!esAutor && !esData) {
      return res.status(403).json({ error: 'Solo puedes eliminar tus propias notas' });
    }

    await authPool.query('DELETE FROM notas WHERE id = $1', [notaId]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});