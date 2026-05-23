# Betr API — Documentación técnica

## ¿Qué es este proyecto?

API REST construida en Node.js que actúa como intermediario entre el dashboard
ejecutivo de Betr Media y la base de datos PostgreSQL alojada en Railway.

Existe porque el dashboard está construido en React — una aplicación que corre
en el navegador del usuario — y los navegadores no pueden conectarse directamente
a bases de datos por razones de seguridad. Esta API recibe las peticiones del
dashboard, consulta la base de datos y devuelve los datos en formato JSON.

la base de datos PostgreSQL alojada en railway fue construida por la necesidad del 
proyecto yt-analytics, el cuál es el proyecto principal que toma cada cuenta y 
extrae las métricas de YouTube.

---

## Arquitectura
Usuario (navegador)
↓
Dashboard React 
↓ fetch HTTP
betr-api Node.js (Railway)   ← este proyecto
↓ SQL
PostgreSQL (Railway)

---

## Stack tecnológico

| Tecnología | Versión | Uso |
|---|---|---|
| Node.js | 18+ | Entorno de ejecución |
| Express | 4.x | Servidor web y rutas |
| pg | 8.x | Cliente PostgreSQL para Node.js |
| cors | 2.x | Permite peticiones desde el dashboard |
| dotenv | 16.x | Variables de entorno |
| nodemon | 3.x | Reinicio automático en desarrollo |

---

## Estructura del proyecto
betr-api-comercial/
├── src/
│   ├── db.js              ← Conexión a PostgreSQL via pool de conexiones
│   ├── routes/
│   │   └── youtube.js     ← Endpoints de métricas de YouTube
│   └── index.js           ← Servidor principal, configuración de Express
├── .env                   ← Variables de entorno locales (no se sube a Git)
├── .env.example           ← Plantilla de variables de entorno
├── .gitignore
├── package.json
└── README.md

---

## Variables de entorno

crea un `.env` en la ráiz del proyecto y completa los valores:
DB_HOST=       Host de PostgreSQL en Railway
DB_PORT=       Puerto (generalmente 5432)
DB_NAME=       Nombre de la base de datos
DB_USER=       Usuario de la base de datos
DB_PASSWORD=   Contraseña
PORT=          Puerto del servidor (4000 por defecto)

Los valores de producción se encuentran en Railway →
servicio PostgreSQL → pestaña Connect → Available Variables.

---

## Cómo correr el proyecto localmente

### Requisitos
- Node.js 18 o superior
- npm
- Acceso a la base de datos en Railway o una copia local

### Instalación

```bash
git clone https://github.com/TU_USUARIO/betr-api-comercial.git
cd betr-api-comercial
npm install
cp .env.example .env
# Completar las variables en .env
npm run dev
```

El servidor queda corriendo en `http://localhost:4000`

---

## Endpoints disponibles

### GET /health
Verifica que la API está funcionando.
GET /health
Respuesta:
{
"status": "ok",
"timestamp": "2026-05-23T16:30:59.218Z"
}

---

### GET /api/youtube/cuentas
Devuelve la lista de todas las cuentas de YouTube.
GET /api/youtube/cuentas
Respuesta:
[
{ "id_cuenta": 1, "nombre_cuenta": "TELEMUNDO" },
{ "id_cuenta": 2, "nombre_cuenta": "SONY" },
...
]

---

### GET /api/youtube/subcuentas
Devuelve todos los canales con su cuenta padre.
GET /api/youtube/subcuentas
Respuesta:
[
{
"id_subcuenta": 28,
"canal": "Al Rojo Vivo",
"id_cuenta": 1,
"cuenta": "TELEMUNDO"
},
...
]

---

### GET /api/youtube/revenue/mensual
Revenue total agrupado por mes y cuenta.
GET /api/youtube/revenue/mensual
GET /api/youtube/revenue/mensual?anio=2024
GET /api/youtube/revenue/mensual?anio=2024&id_cuenta=1
Parámetros opcionales:
anio       Filtra por año (ej: 2024)
id_cuenta  Filtra por cuenta (ej: 1 = TELEMUNDO)
Respuesta:
[
{
"anio": 2024,
"mes": 1,
"nombre_mes": "Enero",
"id_cuenta": 1,
"cuenta": "TELEMUNDO",
"revenue_total": "649897.02",
"views_total": "411842836",
"cpm_promedio": "3.04"
},
...
]

---

### GET /api/youtube/revenue/canales
Revenue desglosado por canal individual agrupado por mes.
GET /api/youtube/revenue/canales
GET /api/youtube/revenue/canales?anio=2024
GET /api/youtube/revenue/canales?anio=2024&id_cuenta=2
Parámetros opcionales:
anio       Filtra por año
id_cuenta  Filtra por cuenta
Respuesta:
[
{
"anio": 2024,
"mes": 1,
"nombre_mes": "Enero",
"id_subcuenta": 40,
"canal": "Telemundo",
"id_cuenta": 1,
"cuenta": "TELEMUNDO",
"revenue_total": "320450.11",
"views_total": "198234567",
"cpm_promedio": "3.21"
},
...
]

---

## Cómo hacer pruebas

### Opción 1 — Navegador
Para endpoints GET puedes pegar la URL directamente en el navegador:
https://betr-api-comercial-production.up.railway.app/api/youtube/cuentas

### Opción 2 — Thunder Client (extensión de VS Code)
1. Instala Thunder Client en VS Code
2. Crea una nueva petición GET
3. Pega la URL del endpoint
4. Clic en Send

### Opción 3 — Postman
1. Abre Postman
2. Nueva petición GET
3. Pega la URL
4. Send

---

## Base de datos — estructura relevante

Las tablas que usa esta API son:
dim_cuenta
id_cuenta     PK
nombre_cuenta Nombre de la cuenta (SONY, TELEMUNDO, etc.)
dim_subcuenta
id_subcuenta  PK
nombre        Nombre del canal
id_cuenta     FK → dim_cuenta
dim_fecha
id_fecha      PK
fecha         Fecha completa
anio          Año
mes           Número del mes
nombre_mes    Nombre del mes en español
trimestre     Número del trimestre
hechos_metricas
id_hecho           PK
id_subcuenta       FK → dim_subcuenta
id_fecha           FK → dim_fecha
views_total        Total de vistas
watch_time_total   Tiempo de reproducción
revenue_total      Ingresos en USD
cpm_promedio       CPM promedio
likes_total        Likes
suscriptores_total Suscriptores ganados
views_videos       Vistas de videos largos
views_shorts       Vistas de Shorts
views_lives        Vistas de Lives

---

## Cómo agregar nuevas métricas

Si en el futuro se necesita exponer más datos de la base de datos:

### 1. Agregar un nuevo endpoint en una ruta existente

Abre `src/routes/youtube.js` y agrega una nueva ruta siguiendo el patrón:

```js
router.get('/nueva-metrica', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT ...
      FROM hechos_metricas hm
      JOIN ...
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});
```

### 2. Crear una nueva ruta para un tema diferente

Si las métricas son de un tema distinto (por ejemplo redes sociales):

1. Crea `src/routes/redes.js` siguiendo la misma estructura de `youtube.js`
2. Regístrala en `src/index.js`:

```js
const redesRoutes = require('./routes/redes');
app.use('/api/redes', redesRoutes);
```

### 3. Desplegar los cambios

```bash
git add .
git commit -m "descripcion del cambio"
git push origin main
```

Railway detecta el push y redespliegue automáticamente en 1-2 minutos.

---

## Despliegue en Railway

El proyecto está configurado para desplegarse automáticamente desde GitHub.
Cualquier push a la rama `main` activa un nuevo despliegue.


Para ver los logs en tiempo real ve a Railway →
servicio betr-api-comercial → pestaña **Logs**.