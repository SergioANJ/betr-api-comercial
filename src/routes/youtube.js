const express = require('express');
const router  = express.Router();
const pool    = require('../db');

// ─────────────────────────────────────────
// GET /api/youtube/cuentas
// ─────────────────────────────────────────
router.get('/cuentas', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id_cuenta, nombre_cuenta FROM dim_cuenta ORDER BY nombre_cuenta'
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────
// GET /api/youtube/subcuentas
// ─────────────────────────────────────────
router.get('/subcuentas', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        s.id_subcuenta,
        s.nombre_subcuenta   AS canal,
        c.id_cuenta,
        c.nombre_cuenta    AS cuenta
      FROM dim_subcuenta s
      JOIN dim_cuenta    c ON s.id_cuenta = c.id_cuenta
      ORDER BY c.nombre_cuenta, s.nombre_subcuenta
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────
// GET /api/youtube/revenue/mensual
// Parámetros opcionales: ?anio=2024&id_cuenta=1
// ─────────────────────────────────────────
router.get('/revenue/mensual', async (req, res) => {
  const { anio, id_cuenta } = req.query;
  try {
    const result = await pool.query(`
      SELECT
        df.anio,
        df.mes,
        df.nombre_mes,
        dc.id_cuenta,
        dc.nombre_cuenta                               AS cuenta,
        ROUND(SUM(hm.revenue_total)::numeric, 2) AS revenue_total,
        SUM(hm.views_total)                      AS views_total,
        ROUND(AVG(hm.cpm_promedio)::numeric, 2)  AS cpm_promedio
      FROM hechos_metricas hm
      JOIN dim_fecha     df ON hm.id_fecha     = df.id_fecha
      JOIN dim_subcuenta ds ON hm.id_subcuenta = ds.id_subcuenta
      JOIN dim_cuenta    dc ON ds.id_cuenta    = dc.id_cuenta
      WHERE ($1::int IS NULL OR df.anio      = $1::int)
        AND ($2::int IS NULL OR dc.id_cuenta  = $2::int)
      GROUP BY df.anio, df.mes, df.nombre_mes, dc.id_cuenta, dc.nombre_cuenta
      ORDER BY df.anio, df.mes, dc.nombre_cuenta
    `, [anio || null, id_cuenta || null]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/youtube/anios
router.get('/anios', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT df.anio
      FROM hechos_metricas hm
      JOIN dim_fecha df ON hm.id_fecha = df.id_fecha
      ORDER BY df.anio DESC
    `);
    // Devolver array de números, no array de objetos
    res.json(result.rows.map(r => r.anio));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────
// GET /api/youtube/revenue/canales
// Parámetros opcionales: ?anio=2024&id_cuenta=1
// ─────────────────────────────────────────
router.get('/revenue/canales', async (req, res) => {
  const { anio, id_cuenta } = req.query;
  try {
    const result = await pool.query(`
      SELECT
        df.anio,
        df.mes,
        df.nombre_mes,
        ds.id_subcuenta,
        ds.nombre_subcuenta                              AS canal,
        dc.id_cuenta,
        dc.nombre_cuenta                                AS cuenta,
        ROUND(SUM(hm.revenue_total)::numeric, 2) AS revenue_total,
        SUM(hm.views_total)                      AS views_total,
        ROUND(AVG(hm.cpm_promedio)::numeric, 2)  AS cpm_promedio
      FROM hechos_metricas hm
      JOIN dim_fecha     df ON hm.id_fecha     = df.id_fecha
      JOIN dim_subcuenta ds ON hm.id_subcuenta = ds.id_subcuenta
      JOIN dim_cuenta    dc ON ds.id_cuenta    = dc.id_cuenta
      WHERE ($1::int IS NULL OR df.anio      = $1::int)
        AND ($2::int IS NULL OR dc.id_cuenta  = $2::int)
      GROUP BY df.anio, df.mes, df.nombre_mes,
               ds.id_subcuenta, ds.nombre_subcuenta,
               dc.id_cuenta, dc.nombre_cuenta
      ORDER BY df.anio, df.mes, dc.nombre_cuenta, ds.id_subcuenta
    `, [anio || null, id_cuenta || null]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

