const express = require('express');
const cors    = require('cors');
require('dotenv').config();

const youtubeRoutes = require('./routes/youtube');

const app  = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Ruta de salud
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Rutas
app.use('/api/youtube', youtubeRoutes);

app.listen(PORT, () => {
  console.log(`API corriendo en http://localhost:${PORT}`);
});