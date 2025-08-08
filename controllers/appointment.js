
const asyncErrorWrapper = require("express-async-handler");
const { getAllAppointments, updateAppointmentDuration: updateAppointmentDurationQuery, updateAppointment } = require('../helpers/db/queries/appointmentQueries');
const { executeQuery } = require('../helpers/db/utils/queryExecutor');

// Yeni randevu oluştur
const createAppointment = asyncErrorWrapper(async (req, res, next) => {
  const { patientId, doctorId, appointmentTime, duration = 30, notes = '', branchId } = req.body;

  // Validasyon
  if (!patientId || !doctorId || !appointmentTime) {
    return res.status(400).json({
      success: false,
      message: "Hasta, doktor ve randevu zamanı gereklidir"
    });
  }

  try {
    // Randevu çakışma kontrolü
    const conflictCheck = await executeQuery(`
      SELECT appointment_id 
      FROM appointments 
      WHERE doctor_id = $1 
      AND (
        (appointment_time <= $2 AND appointment_time + INTERVAL '1 minute' * duration_minutes > $2)
        OR 
        (appointment_time < $3 AND appointment_time + INTERVAL '1 minute' * duration_minutes >= $3)
        OR
        (appointment_time >= $2 AND appointment_time < $3)
      )
    `, [doctorId, appointmentTime, new Date(new Date(appointmentTime).getTime() + duration * 60000).toISOString()]);

    if (conflictCheck.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Bu zaman diliminde doktorun başka bir randevusu bulunmaktadır"
      });
    }

    // Hasta branch_id'sini al (eğer branchId gönderilmediyse)
    let finalBranchId = branchId;
    if (!finalBranchId) {
      const patientBranch = await executeQuery(
        "SELECT branch_id FROM patients WHERE patient_id = $1", 
        [patientId]
      );
      if (patientBranch.length > 0) {
        finalBranchId = patientBranch[0].branch_id;
      }
    }

    // Randevu oluştur
    const newAppointment = await executeQuery(`
      INSERT INTO appointments (patient_id, doctor_id, branch_id, appointment_time, duration_minutes, status, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING appointment_id, patient_id, doctor_id, branch_id, appointment_time, duration_minutes, status, notes, created_at
    `, [patientId, doctorId, finalBranchId, appointmentTime, duration, 'scheduled', notes]);

    res.status(201).json({
      success: true,
      data: newAppointment[0],
      message: "Randevu başarıyla oluşturuldu"
    });
  } catch (err) {
    console.error('Randevu oluşturma hatası:', err);
    res.status(500).json({
      success: false,
      message: "Randevu oluşturulurken hata oluştu",
      error: err.message
    });
  }
});


const getAppointments = asyncErrorWrapper(async (req, res, next) => {
  const { patient_id, branch_id, doctor_id, date, start_date, end_date } = req.query;
  let appointments;
  
  if (patient_id) {
    // Sadece ilgili hastanın randevuları
    appointments = await executeQuery(`
      SELECT a.*, u.first_name AS doctor_first_name, u.last_name AS doctor_last_name
      FROM appointments a
      LEFT JOIN users u ON a.doctor_id = u.user_id
      WHERE a.patient_id = $1
      ORDER BY a.appointment_time DESC
    `, [patient_id]);
  } else if (start_date && end_date) {
    // Tarih aralığına göre randevular - doktor filtresi ile
    let query = `
      SELECT a.*, u.first_name AS doctor_first_name, u.last_name AS doctor_last_name,
             p.first_name AS patient_first_name, p.last_name AS patient_last_name
      FROM appointments a
      LEFT JOIN users u ON a.doctor_id = u.user_id
      LEFT JOIN patients p ON a.patient_id = p.patient_id
      WHERE DATE(a.appointment_time) >= $1 AND DATE(a.appointment_time) <= $2
    `;
    let params = [start_date, end_date];
    
    // Doktor filtresi ekle
    if (doctor_id) {
      query += ` AND a.doctor_id = $3`;
      params.push(doctor_id);
    }
    
    query += ` ORDER BY a.appointment_time ASC`;
    
    appointments = await executeQuery(query, params);
  } else if (branch_id && doctor_id && date) {
    // Belirli şube, doktor ve tarih için randevular
    appointments = await executeQuery(`
      SELECT a.*, u.first_name AS doctor_first_name, u.last_name AS doctor_last_name,
             p.first_name AS patient_first_name, p.last_name AS patient_last_name
      FROM appointments a
      LEFT JOIN users u ON a.doctor_id = u.user_id
      LEFT JOIN patients p ON a.patient_id = p.patient_id
      WHERE a.branch_id = $1 AND a.doctor_id = $2 AND DATE(a.appointment_time) = $3
      ORDER BY a.appointment_time ASC
    `, [branch_id, doctor_id, date]);
  } else if (branch_id && date) {
    // Belirli şube ve tarih için tüm randevular
    appointments = await executeQuery(`
      SELECT a.*, u.first_name AS doctor_first_name, u.last_name AS doctor_last_name,
             p.first_name AS patient_first_name, p.last_name AS patient_last_name
      FROM appointments a
      LEFT JOIN users u ON a.doctor_id = u.user_id
      LEFT JOIN patients p ON a.patient_id = p.patient_id
      WHERE a.branch_id = $1 AND DATE(a.appointment_time) = $2
      ORDER BY a.appointment_time ASC
    `, [branch_id, date]);
  } else if (doctor_id) {
    // Sadece belirli doktorun randevuları (tarih filtresi olmadan)
    appointments = await executeQuery(`
      SELECT a.*, u.first_name AS doctor_first_name, u.last_name AS doctor_last_name,
             p.first_name AS patient_first_name, p.last_name AS patient_last_name
      FROM appointments a
      LEFT JOIN users u ON a.doctor_id = u.user_id
      LEFT JOIN patients p ON a.patient_id = p.patient_id
      WHERE a.doctor_id = $1
      ORDER BY a.appointment_time ASC
    `, [doctor_id]);
  } else {
    // Tüm randevular (eski davranış)
    appointments = await getAllAppointments();
  }
  
  res.json({ success: true, data: appointments });
});


// Süre güncelleme
const updateAppointmentDuration = asyncErrorWrapper(async (req, res, next) => {
  let appointmentId = req.params.id;
  const { duration_minutes } = req.body;
  appointmentId = parseInt(appointmentId, 10);
  if (!appointmentId || isNaN(appointmentId)) {
    return res.status(400).json({ success: false, message: "Geçersiz randevu ID" });
  }
  if (!duration_minutes || duration_minutes < 15 || duration_minutes % 15 !== 0) {
    return res.status(400).json({ success: false, message: "Süre 15'in katı ve en az 15 olmalı" });
  }
  const updated = await updateAppointmentDurationQuery(appointmentId, duration_minutes);
  if (!updated) {
    return res.status(404).json({ success: false, message: "Randevu bulunamadı" });
  }
  res.json({ success: true, data: updated });
});

// Saat güncelleme (drag & drop)
const updateAppointmentTime = asyncErrorWrapper(async (req, res, next) => {
  let appointmentId = req.params.id;
  const { appointment_time } = req.body;
  appointmentId = parseInt(appointmentId, 10);
  if (!appointmentId || isNaN(appointmentId)) {
    return res.status(400).json({ success: false, message: "Geçersiz randevu ID" });
  }
  if (!appointment_time) {
    return res.status(400).json({ success: false, message: "Geçersiz randevu saati" });
  }
  // Sadece appointment_time güncelle
  const updated = await updateAppointment(appointmentId, { appointmentTime: appointment_time });
  if (!updated) {
    return res.status(404).json({ success: false, message: "Randevu bulunamadı" });
  }
  res.json({ success: true, data: updated });
});

// Drag & Drop için hem saat hem süre güncelleme
const updateAppointmentTimeAndDuration = asyncErrorWrapper(async (req, res, next) => {
  let appointmentId = req.params.id;
  const { appointmentTime, duration } = req.body;
  appointmentId = parseInt(appointmentId, 10);
  
  console.log('Update request received:', {
    appointmentId,
    appointmentTime,
    duration,
    body: req.body
  });
  
  if (!appointmentId || isNaN(appointmentId)) {
    console.log('Invalid appointment ID:', appointmentId);
    return res.status(400).json({ success: false, message: "Geçersiz randevu ID" });
  }
  
  if (!appointmentTime) {
    console.log('Invalid appointment time:', appointmentTime);
    return res.status(400).json({ success: false, message: "Geçersiz randevu saati" });
  }
  
  if (duration && (duration < 15 || duration % 15 !== 0)) {
    console.log('Invalid duration:', duration);
    return res.status(400).json({ success: false, message: "Süre 15'in katı ve en az 15 olmalı" });
  }

  try {
    // Hem appointment_time hem de duration güncelle
    const updateData = { appointmentTime };
    if (duration) {
      updateData.duration = duration;
    }
    
    console.log('Calling updateAppointment with:', { appointmentId, updateData });
    const updated = await updateAppointment(appointmentId, updateData);
    
    if (!updated) {
      console.log('Appointment not found:', appointmentId);
      return res.status(404).json({ success: false, message: "Randevu bulunamadı" });
    }
    
    console.log('Appointment updated successfully:', updated);
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Update appointment error:', error);
    res.status(500).json({ success: false, message: error.message || "Randevu güncellenirken hata oluştu" });
  }
});

// Randevu silme
const deleteAppointment = asyncErrorWrapper(async (req, res, next) => {
  const appointmentId = parseInt(req.params.id);
  
  if (!appointmentId || isNaN(appointmentId)) {
    return res.status(400).json({ success: false, message: "Geçersiz randevu ID" });
  }

  try {
    const result = await executeQuery(
      "DELETE FROM appointments WHERE appointment_id = $1 RETURNING appointment_id", 
      [appointmentId]
    );
    
    if (result.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "Randevu bulunamadı" 
      });
    }

    res.json({ 
      success: true, 
      message: "Randevu başarıyla silindi" 
    });
  } catch (error) {
    console.error('Delete appointment error:', error);
    res.status(500).json({ success: false, message: error.message || "Randevu silinirken hata oluştu" });
  }
});

// Randevu notu güncelleme
const updateAppointmentNotes = asyncErrorWrapper(async (req, res, next) => {
  const appointmentId = parseInt(req.params.id);
  const { notes } = req.body;
  
  if (!appointmentId || isNaN(appointmentId)) {
    return res.status(400).json({ success: false, message: "Geçersiz randevu ID" });
  }

  try {
    const result = await executeQuery(
      "UPDATE appointments SET notes = $1 WHERE appointment_id = $2 RETURNING appointment_id, notes", 
      [notes || null, appointmentId]
    );
    
    if (result.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "Randevu bulunamadı" 
      });
    }

    res.json({ 
      success: true, 
      data: result[0],
      message: "Randevu notu güncellendi" 
    });
  } catch (error) {
    console.error('Update appointment notes error:', error);
    res.status(500).json({ success: false, message: error.message || "Randevu notu güncellenirken hata oluştu" });
  }
});

// Randevu durumu ve notu güncelleme
const updateAppointmentStatus = asyncErrorWrapper(async (req, res, next) => {
  const appointmentId = parseInt(req.params.id);
  const { status, notes } = req.body;
  
  if (!appointmentId || isNaN(appointmentId)) {
    return res.status(400).json({ success: false, message: "Geçersiz randevu ID" });
  }

  if (!status) {
    return res.status(400).json({ success: false, message: "Durum bilgisi gereklidir" });
  }

  // Geçerli durum değerleri
  const validStatuses = ['scheduled', 'attended', 'missed', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: "Geçersiz durum değeri" });
  }

  try {
    const result = await executeQuery(
      `UPDATE appointments 
       SET status = $1, notes = $2, updated_at = CURRENT_TIMESTAMP 
       WHERE appointment_id = $3 
       RETURNING appointment_id, status, notes, updated_at`, 
      [status, notes || null, appointmentId]
    );
    
    if (result.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "Randevu bulunamadı" 
      });
    }

    res.json({ 
      success: true, 
      data: result[0],
      message: "Randevu durumu güncellendi" 
    });
  } catch (error) {
    console.error('Update appointment status error:', error);
    res.status(500).json({ success: false, message: error.message || "Randevu durumu güncellenirken hata oluştu" });
  }
});

module.exports = { 
  getAppointments, 
  createAppointment,
  updateAppointmentDuration, 
  updateAppointmentTime, 
  updateAppointmentTimeAndDuration, 
  deleteAppointment, 
  updateAppointmentNotes,
  updateAppointmentStatus
};