const db = require('../config/database');

// Envio de mensagem pelo formulário público institucional
exports.submitContact = async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        message: 'Por favor, preencha os campos obrigatórios (Nome, E-mail e Mensagem).'
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Por favor, informe um endereço de e-mail válido.'
      });
    }

    await db.query(
      `INSERT INTO contact_messages (name, email, phone, subject, message)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        name.trim(),
        email.trim().toLowerCase(),
        phone ? phone.trim() : '',
        subject ? subject.trim() : 'Contato Institucional',
        message.trim()
      ]
    );

    return res.status(201).json({
      success: true,
      message: 'Sua mensagem institucional foi enviada com sucesso! A equipe Dose Certa agradece o contato.'
    });
  } catch (error) {
    console.error('[ContactController.submitContact]', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno ao registrar a mensagem institucional. Tente novamente mais tarde.'
    });
  }
};

// Listar mensagens institucionais (Admin)
exports.getMessages = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, name, email, phone, subject, message, is_read, created_at FROM contact_messages ORDER BY id DESC'
    );

    return res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('[ContactController.getMessages]', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao listar mensagens de contato.'
    });
  }
};

// Alternar status de lida / não lida
exports.toggleRead = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_read } = req.body;

    const readVal = (is_read === true || is_read === 'true' || is_read === 1 || is_read === '1');

    await db.query(
      'UPDATE contact_messages SET is_read = $1 WHERE id = $2',
      [readVal, id]
    );

    return res.json({
      success: true,
      message: 'Status da mensagem atualizado.'
    });
  } catch (error) {
    console.error('[ContactController.toggleRead]', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao atualizar status da mensagem.'
    });
  }
};

// Excluir mensagem
exports.deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM contact_messages WHERE id = $1', [id]);

    return res.json({
      success: true,
      message: 'Mensagem removida com sucesso.'
    });
  } catch (error) {
    console.error('[ContactController.deleteMessage]', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao excluir a mensagem.'
    });
  }
};
