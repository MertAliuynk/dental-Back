// Basit bir JWT doğrulama middleware'i örneği
const jwt = require('jsonwebtoken');

/**
 * JWT doğrulama ve kullanıcı bilgisi ekleme middleware'i
 * req.user = { user_id, username, role, branch_id, ... }
 *
 * Ekstra: req.user.role ve req.user.branch_id ile yetki/şube kontrolü yapılabilir
 */
module.exports = function jwtAuth(req, res, next) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Token bulunamadı.' });
  }
  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'gizli_anahtar');
    // Kullanıcı bilgilerini req.user'a ekle
    req.user = {
      user_id: decoded.user_id,
      username: decoded.username,
      role: decoded.role,
      branch_id: decoded.branch_id,
      ...decoded // Diğer claim'ler de eklenir
    };
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Geçersiz token.' });
  }
};
