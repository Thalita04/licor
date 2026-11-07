const express = require('express');
const router = express.Router();
const galleryController = require('../controllers/galleryController');
const { authenticateToken, requireAdmin } = require('../middlewares/auth');
const upload = require('../middlewares/upload');

// Rota pública para visualização da galeria
router.get('/', galleryController.getGallery);

// Rotas protegidas para administração da galeria
router.post('/', authenticateToken, requireAdmin, upload.single('image'), galleryController.addImage);
router.put('/:id', authenticateToken, requireAdmin, upload.single('image'), galleryController.updateImage);
router.delete('/:id', authenticateToken, requireAdmin, galleryController.deleteImage);

module.exports = router;
