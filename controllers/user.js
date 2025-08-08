const { executeQuery } = require("../helpers/db/utils/queryExecutor");
const bcrypt = require('bcrypt');
const CustomError = require('../helpers/err/CustomError');

// Sadece doktorları getir (ör: role = 'doctor')
async function getAllDoctors(req, res) {
  try {
    const doctors = await executeQuery("SELECT user_id, first_name, last_name FROM users WHERE role = 'doctor' ORDER BY first_name, last_name");
    res.json({ success: true, data: doctors });
  } catch (err) {
    res.status(500).json({ success: false, message: "Doktorlar alınamadı.", error: err.message });
  }
}

// Tüm kullanıcıları getir (admin için)
async function getAllUsers(req, res) {
  try {
    const users = await executeQuery(`
      SELECT 
        u.user_id, 
        u.username, 
        u.role, 
        u.branch_id,
        u.first_name, 
        u.last_name,
        u.created_at,
        b.name as branch_name
      FROM users u 
      LEFT JOIN branches b ON u.branch_id = b.branch_id 
      ORDER BY u.created_at DESC
    `);
    res.json({ success: true, data: users });
  } catch (err) {
    res.status(500).json({ success: false, message: "Kullanıcılar alınamadı.", error: err.message });
  }
}

// Yeni kullanıcı oluştur (admin için)
async function createUser(req, res) {
  try {
    const { username, password, role, branchId, firstName, lastName } = req.body;
    
    // Validasyon
    if (!username || !password || !role || !firstName || !lastName) {
      return res.status(400).json({ 
        success: false, 
        message: "Tüm zorunlu alanları doldurun" 
      });
    }

    // Role kontrolü
    const validRoles = ['admin', 'branch_manager', 'doctor', 'receptionist'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ 
        success: false, 
        message: "Geçersiz rol" 
      });
    }

    // Kullanıcı adı kontrolü
    const existingUser = await executeQuery(
      "SELECT user_id FROM users WHERE username = $1", 
      [username]
    );
    
    if (existingUser.length > 0) {
      return res.status(409).json({ 
        success: false, 
        message: "Bu kullanıcı adı zaten mevcut" 
      });
    }

    // Şifre hashleme
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Kullanıcı oluştur
    const newUser = await executeQuery(`
      INSERT INTO users (username, password, role, branch_id, first_name, last_name)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING user_id, username, role, branch_id, first_name, last_name, created_at
    `, [username, hashedPassword, role, branchId || null, firstName, lastName]);

    res.status(201).json({ 
      success: true, 
      data: newUser[0],
      message: "Kullanıcı başarıyla oluşturuldu" 
    });
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      message: "Kullanıcı oluşturulamadı", 
      error: err.message 
    });
  }
}

// Kullanıcı güncelle (admin için)
async function updateUser(req, res) {
  try {
    const { id } = req.params;
    const { username, role, branchId, firstName, lastName, password } = req.body;
    
    let query = `
      UPDATE users 
      SET username = $1, role = $2, branch_id = $3, first_name = $4, last_name = $5, updated_at = CURRENT_TIMESTAMP
    `;
    let params = [username, role, branchId || null, firstName, lastName];
    
    // Şifre güncellenecekse
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      query += `, password = $6 WHERE user_id = $7`;
      params.push(hashedPassword, id);
    } else {
      query += ` WHERE user_id = $6`;
      params.push(id);
    }
    
    query += ` RETURNING user_id, username, role, branch_id, first_name, last_name`;
    
    const updatedUser = await executeQuery(query, params);
    
    if (updatedUser.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "Kullanıcı bulunamadı" 
      });
    }

    res.json({ 
      success: true, 
      data: updatedUser[0],
      message: "Kullanıcı başarıyla güncellendi" 
    });
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      message: "Kullanıcı güncellenemedi", 
      error: err.message 
    });
  }
}

// Kullanıcı sil (admin için)
async function deleteUser(req, res) {
  try {
    const { id } = req.params;
    
    const result = await executeQuery(
      "DELETE FROM users WHERE user_id = $1 RETURNING user_id", 
      [id]
    );
    
    if (result.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "Kullanıcı bulunamadı" 
      });
    }

    res.json({ 
      success: true, 
      message: "Kullanıcı başarıyla silindi" 
    });
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      message: "Kullanıcı silinemedi", 
      error: err.message 
    });
  }
}

module.exports = { 
  getAllDoctors, 
  getAllUsers, 
  createUser, 
  updateUser, 
  deleteUser 
};
