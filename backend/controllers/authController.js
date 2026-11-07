const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Por favor, forneça o e-mail e a senha de acesso.'
      });
    }

    const result = await db.query(
      'SELECT id, name, email, password_hash, role FROM users WHERE LOWER(email) = LOWER($1)',
      [email.trim()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Credenciais inválidas. Verifique o e-mail e a senha.'
      });
    }

    const user = result.rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Credenciais inválidas. Verifique o e-mail e a senha.'
      });
    }

    const secret = process.env.JWT_SECRET || 'dose_certa_super_secret_jwt_key_2026_artesanal';
    const token = jwt.sign(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      secret,
      { expiresIn: '8h' }
    );

    // Registra auditoria de login
    try {
      await db.query(
        'INSERT INTO audit_logs (user_email, action, details) VALUES ($1, $2, $3)',
        [user.email, 'LOGIN', `Login realizado com sucesso em ${new Date().toISOString()}`]
      );
    } catch (e) {
      // Falha silenciosa em auditoria para não travar o login
    }

    // Configura cookie httpOnly para conveniência e segurança
    res.cookie('dose_certa_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 8 * 60 * 60 * 1000 // 8 horas
    });

    return res.json({
      success: true,
      message: 'Autenticação realizada com sucesso!',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('[AuthController.login]', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno ao processar a autenticação.'
    });
  }
};

exports.me = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, name, email, role, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
    }

    return res.json({
      success: true,
      user: result.rows[0]
    });
  } catch (error) {
    console.error('[AuthController.me]', error);
    return res.status(500).json({ success: false, message: 'Erro ao obter dados do usuário.' });
  }
};

exports.logout = (req, res) => {
  res.clearCookie('dose_certa_token');
  return res.json({
    success: true,
    message: 'Sessão encerrada com sucesso.'
  });
};
