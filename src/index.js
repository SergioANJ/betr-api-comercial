const express       = require('express');
const cors          = require('cors');
require('dotenv').config();

const youtubeRoutes = require('./routes/youtube');
const authRoutes    = require('./routes/auth');    // ← nuevo

const app  = express();
const PORT = process.env.PORT || 4000;

app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://tu-dashboard.vercel.app',
  ],
}));

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

app.use('/api/youtube', youtubeRoutes);
app.use('/api/auth',    authRoutes);    // ← nuevo

app.listen(PORT, () => {
  console.log(`API corriendo en http://localhost:${PORT}`);
});