const express = require('express');
const router = express.Router();
const contentController = require('../controllers/contentController');
const { authenticateToken, requireAdmin } = require('../middlewares/auth');

// Rota pública para carregar textos no site
router.get('/', contentController.getPublicContent);

// Rotas administrativas protegidas
router.get('/admin', authenticateToken, requireAdmin, contentController.getAdminContent);
router.put('/admin', authenticateToken, requireAdmin, contentController.updateContent);

module.exports = router;
