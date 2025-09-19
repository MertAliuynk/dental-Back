const asyncErrorWrapper = require("express-async-handler");
const { executeQuery } = require('../helpers/db/utils/queryExecutor');
const CustomError = require('../helpers/err/CustomError');
const logger = require('../helpers/logger');
const branchQueries = require('../helpers/db/queries/branchQueries');

// Tüm şubeleri getir
const getAllBranches = asyncErrorWrapper(async (req, res, next) => {
  const branches = await branchQueries.getAllBranches();
  res.json({ success: true, data: branches });
});

// Şube ID'sine göre doktorları getir
const getDoctorsByBranch = asyncErrorWrapper(async (req, res, next) => {
  const { branchId } = req.params;
  const doctors = await executeQuery(`
    SELECT user_id, first_name, last_name, branch_id 
    FROM users 
    WHERE branch_id = $1 AND role = 'doctor' 
    ORDER BY first_name, last_name
  `, [branchId]);
  res.json({ success: true, data: doctors });
});

module.exports = { getAllBranches, getDoctorsByBranch };
// Şube oluştur
const createBranch = asyncErrorWrapper(async (req, res, next) => {
  try {
    const { name, address } = req.body || {};
    if (!name || String(name).trim() === "") {
      return res.status(400).json({ success: false, message: "Şube adı zorunludur" });
    }
    const branch = await branchQueries.createBranch({ name: String(name).trim(), address: address || null });
    res.status(201).json({ success: true, data: branch, message: "Şube oluşturuldu" });
  } catch (err) {
    logger.error('Create branch error:', err);
    res.status(500).json({ success: false, message: 'Şube oluşturulamadı', error: err.message });
  }
});

// Şube güncelle
const updateBranch = asyncErrorWrapper(async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, address, permanent_doctor_count } = req.body || {};
    if (!id) return res.status(400).json({ success: false, message: 'Geçersiz şube ID' });
    if (!name || String(name).trim() === "") {
      return res.status(400).json({ success: false, message: "Şube adı zorunludur" });
    }
    const updated = await branchQueries.updateBranch(id, {
      name: String(name).trim(),
      address: address || null,
      permanent_doctor_count: typeof permanent_doctor_count !== 'undefined' ? Number(permanent_doctor_count) : undefined
    });
    if (!updated) return res.status(404).json({ success: false, message: 'Şube bulunamadı' });
    res.json({ success: true, data: updated, message: 'Şube güncellendi' });
  } catch (err) {
    logger.error('Update branch error:', err);
    res.status(500).json({ success: false, message: 'Şube güncellenemedi', error: err.message });
  }
});

// Şube sil
const deleteBranch = asyncErrorWrapper(async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ success: false, message: 'Geçersiz şube ID' });
    const deleted = await branchQueries.deleteBranch(id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Şube bulunamadı' });
    res.json({ success: true, message: 'Şube silindi' });
  } catch (err) {
    logger.error('Delete branch error:', err);
    res.status(500).json({ success: false, message: 'Şube silinemedi', error: err.message });
  }
});

module.exports = { getAllBranches, getDoctorsByBranch, createBranch, updateBranch, deleteBranch };