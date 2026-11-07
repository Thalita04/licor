const db = require('../config/database');

// Obter todo o conteúdo institucional para a área pública
exports.getPublicContent = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT key, section, label, value, field_type, updated_at FROM site_content ORDER BY section, key'
    );

    // Mapeia tanto lista detalhada quanto objeto chave-valor
    const contentMap = {};
    result.rows.forEach(item => {
      contentMap[item.key] = item.value;
    });

    return res.json({
      success: true,
      data: contentMap,
      items: result.rows
    });
  } catch (error) {
    console.error('[ContentController.getPublicContent]', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao carregar os dados institucionais do site.'
    });
  }
};

// Obter conteúdo institucional agrupado para o painel administrativo
exports.getAdminContent = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT key, section, label, value, field_type, updated_at FROM site_content ORDER BY section, key'
    );

    return res.json({
      success: true,
      items: result.rows
    });
  } catch (error) {
    console.error('[ContentController.getAdminContent]', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao carregar configurações do site.'
    });
  }
};

// Atualizar múltiplos campos ou campo individual
exports.updateContent = async (req, res) => {
  try {
    const updates = req.body; // pode ser objeto { key: value, ... } ou array [{ key, value }]

    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Nenhum dado informado para atualização.'
      });
    }

    const entries = Array.isArray(updates)
      ? updates
      : Object.entries(updates).map(([k, v]) => ({ key: k, value: v }));

    for (const item of entries) {
      if (item.key && item.value !== undefined) {
        await db.query(
          'UPDATE site_content SET value = $1, updated_at = CURRENT_TIMESTAMP WHERE key = $2',
          [String(item.value), item.key]
        );
      }
    }

    // Registra auditoria
    try {
      await db.query(
        'INSERT INTO audit_logs (user_email, action, details) VALUES ($1, $2, $3)',
        [req.user.email, 'UPDATE_CONTENT', `Conteúdos atualizados: ${entries.map(e => e.key).join(', ')}`]
      );
    } catch (e) {}

    return res.json({
      success: true,
      message: 'Informações institucionais atualizadas com sucesso!'
    });
  } catch (error) {
    console.error('[ContentController.updateContent]', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao atualizar informações no banco de dados.'
    });
  }
};
