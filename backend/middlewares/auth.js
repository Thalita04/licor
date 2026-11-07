const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
  let token = null;

  // 1. Verifica header Authorization
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  // 2. Verifica cookies se disponível
  if (!token && req.cookies && req.cookies.dose_certa_token) {
    token = req.cookies.dose_certa_token;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Acesso não autorizado. Faça login para continuar.'
    });
  }

  const secret = process.env.JWT_SECRET || 'dose_certa_super_secret_jwt_key_2026_artesanal';

  jwt.verify(token, secret, (err, decodedUser) => {
    if (err) {
      return res.status(403).json({
        success: false,
        message: 'Sessão expirada ou token inválido. Por favor, autentique-se novamente.'
      });
    }

    req.user = decodedUser;
    next();
  });
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Acesso restrito a administradores autorizados.'
    });
  }
  next();
}

module.exports = {
  authenticateToken,
  requireAdmin
};
