const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');
const { authenticateToken, requireAdmin } = require('../middlewares/auth');

// Rota pública de envio de mensagem institucional
router.post('/', contactController.submitContact);

// Rotas administrativas protegidas
router.get('/', authenticateToken, requireAdmin, contactController.getMessages);
router.patch('/:id/read', authenticateToken, requireAdmin, contactController.toggleRead);
router.delete('/:id', authenticateToken, requireAdmin, contactController.deleteMessage);

module.exports = router;
