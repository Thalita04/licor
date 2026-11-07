const express = require('express');
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { initDatabase, getEngine } = require('./config/database');
const authRoutes = require('./routes/authRoutes');
const contentRoutes = require('./routes/contentRoutes');
const galleryRoutes = require('./routes/galleryRoutes');
const contactRoutes = require('./routes/contactRoutes');
const userRoutes = require('./routes/userRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares essenciais
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Servir arquivos estáticos do Front-End
const frontendPath = path.join(__dirname, '../frontend');
app.use(express.static(frontendPath));

// Rotas da API REST
app.use('/api/auth', authRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/admin/users', userRoutes);

// Rota de status do sistema e banco de dados
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    brand: 'Dose Certa Licores Artesanais',
    database_engine: getEngine(),
    timestamp: new Date().toISOString()
  });
});

// Middleware para tratamento de rotas não encontradas da API
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint da API não encontrado.'
  });
});

// Tratamento de erros globais
app.use((err, req, res, next) => {
  console.error('[Servidor Error]', err);
  res.status(500).json({
    success: false,
    message: err.message || 'Ocorreu um erro interno no servidor.'
  });
});

// Inicialização e Inicialização do Banco
async function startServer() {
  try {
    console.log('----------------------------------------------------');
    console.log('  DOSE CERTA LICORES ARTESANAIS — SERVIDOR INICIAL');
    console.log('----------------------------------------------------');
    await initDatabase();

    app.listen(PORT, () => {
      console.log(`[Servidor] Ativo em http://localhost:${PORT}`);
      console.log(`[Servidor] Site Público: http://localhost:${PORT}/index.html`);
      console.log(`[Servidor] Painel Administrativo: http://localhost:${PORT}/admin/index.html`);
      console.log(`[Servidor] Banco em operação via driver: ${getEngine().toUpperCase()}`);
      console.log('----------------------------------------------------');
    });
  } catch (err) {
    console.error('Falha crítica ao iniciar o servidor:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = app;
