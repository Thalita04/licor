const db = require('../config/database');
const fs = require('fs');
const path = require('path');

// Listar imagens para a galeria pública
exports.getGallery = async (req, res) => {
  try {
    const { category, featured } = req.query;
    let sql = 'SELECT * FROM gallery_images';
    const params = [];
    const conditions = [];

    if (category) {
      params.push(category);
      conditions.push(`category = $${params.length}`);
    }

    if (featured === 'true' || featured === '1') {
      conditions.push('(is_featured = TRUE OR is_featured = 1)');
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY display_order ASC, id DESC';

    const result = await db.query(sql, params);

    return res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('[GalleryController.getGallery]', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao carregar a galeria de imagens.'
    });
  }
};

// Adicionar nova imagem institucional (Admin)
exports.addImage = async (req, res) => {
  try {
    const { title, category, description, volume, is_featured, display_order } = req.body;
    let imageUrl = req.body.image_url;

    // Se houve upload via multer
    if (req.file) {
      imageUrl = `/assets/uploads/${req.file.filename}`;
    }

    if (!title || !imageUrl) {
      return res.status(400).json({
        success: false,
        message: 'Título e imagem são obrigatórios.'
      });
    }

    const featuredVal = (is_featured === true || is_featured === 'true' || is_featured === '1' || is_featured === 1);
    const orderVal = parseInt(display_order, 10) || 0;

    const insertResult = await db.query(
      `INSERT INTO gallery_images (title, category, image_url, description, volume, is_featured, display_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [
        title.trim(),
        category ? category.trim().toLowerCase() : 'geral',
        imageUrl.trim(),
        description ? description.trim() : '',
        volume ? volume.trim() : '375 ml',
        featuredVal,
        orderVal
      ]
    );

    // Auditoria
    try {
      await db.query(
        'INSERT INTO audit_logs (user_email, action, details) VALUES ($1, $2, $3)',
        [req.user.email, 'ADD_GALLERY_IMAGE', `Nova imagem adicionada: ${title}`]
      );
    } catch (e) {}

    return res.status(201).json({
      success: true,
      message: 'Fotografia institucional adicionada com sucesso!',
      id: insertResult.rows[0]?.id
    });
  } catch (error) {
    console.error('[GalleryController.addImage]', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao salvar a fotografia na galeria.'
    });
  }
};

// Atualizar dados de uma imagem da galeria
exports.updateImage = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, category, description, volume, is_featured, display_order } = req.body;

    const existing = await db.query('SELECT * FROM gallery_images WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Imagem não encontrada.' });
    }

    let imageUrl = existing.rows[0].image_url;
    if (req.file) {
      imageUrl = `/assets/uploads/${req.file.filename}`;
    } else if (req.body.image_url) {
      imageUrl = req.body.image_url.trim();
    }

    const featuredVal = (is_featured === true || is_featured === 'true' || is_featured === '1' || is_featured === 1);
    const orderVal = display_order !== undefined ? parseInt(display_order, 10) : existing.rows[0].display_order;

    await db.query(
      `UPDATE gallery_images
       SET title = $1, category = $2, image_url = $3, description = $4, volume = $5, is_featured = $6, display_order = $7
       WHERE id = $8`,
      [
        title || existing.rows[0].title,
        category ? category.toLowerCase() : existing.rows[0].category,
        imageUrl,
        description !== undefined ? description : existing.rows[0].description,
        volume || existing.rows[0].volume,
        featuredVal,
        orderVal,
        id
      ]
    );

    return res.json({
      success: true,
      message: 'Fotografia atualizada com sucesso!'
    });
  } catch (error) {
    console.error('[GalleryController.updateImage]', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao atualizar a imagem.'
    });
  }
};

// Remover imagem institucional
exports.deleteImage = async (req, res) => {
  try {
    const { id } = req.params;

    const findResult = await db.query('SELECT * FROM gallery_images WHERE id = $1', [id]);
    if (findResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Imagem não encontrada.' });
    }

    const item = findResult.rows[0];

    // Se o arquivo estiver em /assets/uploads/, opcionalmente remove do disco
    if (item.image_url && item.image_url.startsWith('/assets/uploads/')) {
      const filePath = path.join(__dirname, '../../frontend', item.image_url);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (err) {}
      }
    }

    await db.query('DELETE FROM gallery_images WHERE id = $1', [id]);

    // Auditoria
    try {
      await db.query(
        'INSERT INTO audit_logs (user_email, action, details) VALUES ($1, $2, $3)',
        [req.user.email, 'DELETE_GALLERY_IMAGE', `Imagem ID ${id} (${item.title}) removida.`]
      );
    } catch (e) {}

    return res.json({
      success: true,
      message: 'Fotografia removida com sucesso da galeria!'
    });
  } catch (error) {
    console.error('[GalleryController.deleteImage]', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao excluir a fotografia.'
    });
  }
};
