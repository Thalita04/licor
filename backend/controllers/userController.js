const db = require('../config/database');
const bcrypt = require('bcryptjs');

// Listar todos os usuários administradores
exports.listUsers = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, name, email, role, created_at, updated_at FROM users ORDER BY id ASC'
    );
    return res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('[UserController.listUsers]', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao listar administradores.'
    });
  }
};

// Criar novo administrador
exports.createUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Nome, e-mail e senha são obrigatórios.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'A senha deve conter no mínimo 6 caracteres.'
      });
    }

    const emailClean = email.trim().toLowerCase();
    const existing = await db.query('SELECT id FROM users WHERE LOWER(email) = $1', [emailClean]);
    if (existing.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Já existe um usuário cadastrado com este e-mail.'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const result = await db.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4) RETURNING id, name, email, role, created_at`,
      [name.trim(), emailClean, passwordHash, role || 'admin']
    );

    // Auditoria
    try {
      await db.query(
        'INSERT INTO audit_logs (user_email, action, details) VALUES ($1, $2, $3)',
        [req.user.email, 'CREATE_USER', `Novo administrador criado: ${emailClean}`]
      );
    } catch (e) {}

    return res.status(201).json({
      success: true,
      message: 'Novo administrador cadastrado com sucesso!',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('[UserController.createUser]', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao criar usuário administrador.'
    });
  }
};

// Atualizar usuário
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password, role } = req.body;

    const existing = await db.query('SELECT * FROM users WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
    }

    const emailClean = email ? email.trim().toLowerCase() : existing.rows[0].email;
    const nameClean = name ? name.trim() : existing.rows[0].name;
    const roleClean = role ? role.trim() : existing.rows[0].role;

    // Se mudou email, verifica duplicidade
    if (emailClean !== existing.rows[0].email) {
      const dup = await db.query('SELECT id FROM users WHERE LOWER(email) = $1 AND id != $2', [emailClean, id]);
      if (dup.rows.length > 0) {
        return res.status(409).json({ success: false, message: 'Este e-mail já está em uso por outro usuário.' });
      }
    }

    let passwordHash = existing.rows[0].password_hash;
    if (password && password.trim() !== '') {
      if (password.length < 6) {
        return res.status(400).json({ success: false, message: 'A nova senha deve ter no mínimo 6 caracteres.' });
      }
      const salt = await bcrypt.genSalt(10);
      passwordHash = await bcrypt.hash(password, salt);
    }

    await db.query(
      `UPDATE users
       SET name = $1, email = $2, password_hash = $3, role = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5`,
      [nameClean, emailClean, passwordHash, roleClean, id]
    );

    // Auditoria
    try {
      await db.query(
        'INSERT INTO audit_logs (user_email, action, details) VALUES ($1, $2, $3)',
        [req.user.email, 'UPDATE_USER', `Usuário ${id} (${emailClean}) atualizado.`]
      );
    } catch (e) {}

    return res.json({
      success: true,
      message: 'Dados do administrador atualizados com sucesso!'
    });
  } catch (error) {
    console.error('[UserController.updateUser]', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao atualizar dados do usuário.'
    });
  }
};

// Excluir usuário
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (parseInt(id, 10) === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Você não pode excluir a sua própria conta enquanto estiver logado nela.'
      });
    }

    const totalUsers = await db.query('SELECT COUNT(*) as count FROM users');
    const count = parseInt(totalUsers.rows[0].count, 10);
    if (count <= 1) {
      return res.status(400).json({
        success: false,
        message: 'Não é possível excluir o único administrador do sistema.'
      });
    }

    const userToRemove = await db.query('SELECT email FROM users WHERE id = $1', [id]);
    if (userToRemove.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
    }

    await db.query('DELETE FROM users WHERE id = $1', [id]);

    // Auditoria
    try {
      await db.query(
        'INSERT INTO audit_logs (user_email, action, details) VALUES ($1, $2, $3)',
        [req.user.email, 'DELETE_USER', `Administrador ${userToRemove.rows[0].email} excluído.`]
      );
    } catch (e) {}

    return res.json({
      success: true,
      message: 'Administrador removido com sucesso.'
    });
  } catch (error) {
    console.error('[UserController.deleteUser]', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao excluir usuário.'
    });
  }
};
