const asyncErrorWrapper = require("express-async-handler");
const { executeQuery } = require('../helpers/db/utils/queryExecutor');
const CustomError = require('../helpers/err/CustomError');
const logger = require('../helpers/logger');

// SMS içeriğindeki placeholder'ları gerçek verilerle değiştir
const replacePlaceholders = (content, patient, additionalData = {}) => {
  const currentDate = new Date().toLocaleDateString('tr-TR');
  const currentTime = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  
  return content
    .replace(/{HASTA_ADI}/g, patient.first_name || '')
    .replace(/{HASTA_SOYADI}/g, patient.last_name || '')
    .replace(/{HASTA_TAM_ADI}/g, `${patient.first_name || ''} ${patient.last_name || ''}`.trim())
    .replace(/{TELEFON}/g, patient.phone || '')
    .replace(/{TARIH}/g, currentDate)  // Bugünün tarihi (SMS gönderim tarihi)
    .replace(/{SAAT}/g, currentTime)   // Şu anki saat
    .replace(/{RANDEVU_TARIHI}/g, additionalData.appointmentDate || 'Randevu tarihiniz')
    .replace(/{RANDEVU_SAATI}/g, additionalData.appointmentTime || 'Randevu saatiniz')
    .replace(/{DOKTOR_ADI}/g, additionalData.doctorName || 'Doktorunuz')
    .replace(/{KLINIK_ADI}/g, additionalData.branchName || 'Kliniğimiz')
    .replace(/{SUBE_ADI}/g, additionalData.branchName || 'Şubemiz');
};

// SMS şablonlarını getir
const getSmsTemplates = asyncErrorWrapper(async (req, res, next) => {
  try {
    const query = 'SELECT * FROM sms_templates ORDER BY name';
    const templates = await executeQuery(query);
    
    res.status(200).json(templates);
  } catch (error) {
    logger.error('SMS şablonları getirme hatası:', error);
    return next(new CustomError("SMS şablonları getirilemedi", 500));
  }
});

// SMS şablonu oluştur
const createSmsTemplate = asyncErrorWrapper(async (req, res, next) => {
  const { name, content } = req.body;
  
  if (!name || !content) {
    return next(new CustomError("Şablon adı ve içeriği zorunludur", 400));
  }
  
  try {
    const query = `
      INSERT INTO sms_templates (name, content)
      VALUES ($1, $2)
      RETURNING *
    `;
    const template = await executeQuery(query, [name, content], { returnSingle: true });
    
    logger.info(`Yeni SMS şablonu oluşturuldu: ${template.template_id}`);
    res.status(201).json(template);
  } catch (error) {
    logger.error('SMS şablonu oluşturma hatası:', error);
    return next(new CustomError("SMS şablonu oluşturulamadı", 500));
  }
});

// SMS şablonu güncelle
const updateSmsTemplate = asyncErrorWrapper(async (req, res, next) => {
  const { id } = req.params;
  const { name, content } = req.body;
  
  if (!name || !content) {
    return next(new CustomError("Şablon adı ve içeriği zorunludur", 400));
  }
  
  try {
    const query = `
      UPDATE sms_templates
      SET name = $1, content = $2
      WHERE template_id = $3
      RETURNING *
    `;
    const template = await executeQuery(query, [name, content, id], { returnSingle: true });
    
    if (!template) {
      return next(new CustomError("SMS şablonu bulunamadı", 404));
    }
    
    logger.info(`SMS şablonu güncellendi: ${id}`);
    res.status(200).json(template);
  } catch (error) {
    logger.error('SMS şablonu güncelleme hatası:', error);
    return next(new CustomError("SMS şablonu güncellenemedi", 500));
  }
});

// SMS şablonu sil
const deleteSmsTemplate = asyncErrorWrapper(async (req, res, next) => {
  const { id } = req.params;
  
  try {
    const query = 'DELETE FROM sms_templates WHERE template_id = $1 RETURNING *';
    const template = await executeQuery(query, [id], { returnSingle: true });
    
    if (!template) {
      return next(new CustomError("SMS şablonu bulunamadı", 404));
    }
    
    logger.info(`SMS şablonu silindi: ${id}`);
    res.status(200).json({ message: "SMS şablonu başarıyla silindi" });
  } catch (error) {
    logger.error('SMS şablonu silme hatası:', error);
    return next(new CustomError("SMS şablonu silinemedi", 500));
  }
});

// Hızlı SMS gönder (şablonlu veya custom mesaj destekli)
const sendQuickSms = asyncErrorWrapper(async (req, res, next) => {
  const { patientIds, templateId, customMessage, phone } = req.body;
  if (!patientIds || !Array.isArray(patientIds) || patientIds.length === 0) {
    return next(new CustomError("En az bir hasta seçilmelidir", 400));
  }

  // Eğer customMessage varsa, serbest metin SMS gönder
  if (customMessage) {
    try {
      const { sendSmsNetgsm } = require('../helpers/netgsm');
      const sentMessages = [];
      for (let i = 0; i < patientIds.length; i++) {
        // Eğer phone parametresi varsa onu kullan, yoksa hastayı DB'den çek
        let targetPhone = phone;
        let patient = null;
        if (!targetPhone) {
          const patientQuery = 'SELECT * FROM patients WHERE patient_id = $1';
          const patientData = await executeQuery(patientQuery, [patientIds[i]], { returnSingle: true });
          if (!patientData || !patientData.phone) continue;
          targetPhone = patientData.phone;
          patient = patientData;
        }
        let netgsmResult = null;
        try {
          netgsmResult = await sendSmsNetgsm({ phone: targetPhone, message: customMessage });
          logger.info(`Netgsm SMS gönderildi (custom):`, {
            patient: patient ? `${patient.first_name} ${patient.last_name}` : patientIds[i],
            phone: targetPhone,
            netgsmResult
          });
        } catch (err) {
          logger.error('Netgsm SMS gönderim hatası:', err);
          netgsmResult = { error: err.message };
        }
        sentMessages.push({
          patientId: patientIds[i],
          phone: targetPhone,
          content: customMessage,
          netgsmResult
        });
      }
      res.status(200).json({
        message: "SMS başarıyla gönderildi (custom)",
        sentCount: sentMessages.length,
        sentMessages
      });
    } catch (error) {
      logger.error('Custom SMS gönderme hatası:', error);
      return next(new CustomError("Custom SMS gönderilemedi", 500));
    }
    return;
  }

  // Şablonlu SMS gönder (orijinal mantık)
  if (!templateId) {
    return next(new CustomError("SMS şablonu seçilmelidir", 400));
  }
  try {
    // Şablonu getir
    const templateQuery = 'SELECT * FROM sms_templates WHERE template_id = $1';
    const template = await executeQuery(templateQuery, [templateId], { returnSingle: true });
    if (!template) {
      return next(new CustomError("SMS şablonu bulunamadı", 404));
    }
    // Hastaları ve randevu bilgilerini getir
    const patientsQuery = `
      SELECT 
        p.patient_id, p.first_name, p.last_name, p.phone,
        a.appointment_time, a.appointment_id,
        u.first_name as doctor_first_name, u.last_name as doctor_last_name,
        b.name as branch_name
      FROM patients p
      LEFT JOIN appointments a ON p.patient_id = a.patient_id 
        AND a.status = 'scheduled' 
        AND a.appointment_time >= NOW()
      LEFT JOIN users u ON a.doctor_id = u.user_id
      LEFT JOIN branches b ON a.branch_id = b.branch_id
      WHERE p.patient_id = ANY($1) AND p.phone IS NOT NULL AND p.phone != ''
      ORDER BY p.patient_id, a.appointment_time ASC
    `;
    const patientsWithAppointments = await executeQuery(patientsQuery, [patientIds]);
    if (patientsWithAppointments.length === 0) {
      return next(new CustomError("Geçerli telefon numarası olan hasta bulunamadı", 400));
    }
    // Her hasta için en yakın randevuyu al (eğer varsa)
    const uniquePatients = [];
    const seenPatients = new Set();
    for (const row of patientsWithAppointments) {
      if (!seenPatients.has(row.patient_id)) {
        seenPatients.add(row.patient_id);
        uniquePatients.push({
          patient_id: row.patient_id,
          first_name: row.first_name,
          last_name: row.last_name,
          phone: row.phone,
          appointment_time: row.appointment_time,
          doctor_name: row.doctor_first_name && row.doctor_last_name 
            ? `Dr. ${row.doctor_first_name} ${row.doctor_last_name}`
            : null,
          branch_name: row.branch_name
        });
      }
    }
    // Netgsm ile SMS gönderimi
    const { sendSmsNetgsm } = require('../helpers/netgsm');
    const sentMessages = [];
    for (const patient of uniquePatients) {
      let appointmentDate = null;
      let appointmentTime = null;
      if (patient.appointment_time) {
        const appointmentDateTime = new Date(patient.appointment_time);
        appointmentDate = appointmentDateTime.toLocaleDateString('tr-TR');
        appointmentTime = appointmentDateTime.toLocaleTimeString('tr-TR', {
          hour: '2-digit',
          minute: '2-digit'
        });
      }
      const personalizedContent = replacePlaceholders(template.content, patient, {
        appointmentDate: appointmentDate,
        appointmentTime: appointmentTime,
        doctorName: patient.doctor_name,
        branchName: patient.branch_name
      });
      let netgsmResult = null;
      try {
        netgsmResult = await sendSmsNetgsm({ phone: patient.phone, message: personalizedContent });
        logger.info(`Netgsm SMS gönderildi:`, {
          patient: `${patient.first_name} ${patient.last_name}`,
          phone: patient.phone,
          netgsmResult
        });
      } catch (err) {
        logger.error('Netgsm SMS gönderim hatası:', err);
        netgsmResult = { error: err.message };
      }
      sentMessages.push({
        patientId: patient.patient_id,
        patientName: `${patient.first_name} ${patient.last_name}`,
        phone: patient.phone,
        content: personalizedContent,
        appointmentInfo: {
          date: appointmentDate,
          time: appointmentTime,
          doctor: patient.doctor_name,
          branch: patient.branch_name
        },
        netgsmResult
      });
    }
    res.status(200).json({
      message: "SMS başarıyla gönderildi",
      sentCount: uniquePatients.length,
      template: template.name,
      sentMessages: sentMessages
    });
  } catch (error) {
    logger.error('SMS gönderme hatası:', error);
    return next(new CustomError("SMS gönderilemedi", 500));
  }
});

// İleri tarihli SMS planla
const scheduleSms = asyncErrorWrapper(async (req, res, next) => {
  const { patientIds, templateId, sendTime } = req.body;
  
  if (!patientIds || !Array.isArray(patientIds) || patientIds.length === 0) {
    return next(new CustomError("En az bir hasta seçilmelidir", 400));
  }
  
  if (!templateId) {
    return next(new CustomError("SMS şablonu seçilmelidir", 400));
  }
  
  if (!sendTime) {
    return next(new CustomError("Gönderim zamanı belirtilmelidir", 400));
  }
  
  const sendDateTime = new Date(sendTime);
  if (sendDateTime <= new Date()) {
    return next(new CustomError("Gönderim zamanı gelecekte olmalıdır", 400));
  }
  
  try {
    // Şablonu kontrol et
    const templateQuery = 'SELECT * FROM sms_templates WHERE template_id = $1';
    const template = await executeQuery(templateQuery, [templateId], { returnSingle: true });
    
    if (!template) {
      return next(new CustomError("SMS şablonu bulunamadı", 404));
    }
    
    // Hastaları kontrol et
    const patientsQuery = `
      SELECT patient_id, first_name, last_name, phone 
      FROM patients 
      WHERE patient_id = ANY($1) AND phone IS NOT NULL AND phone != ''
    `;
    const patients = await executeQuery(patientsQuery, [patientIds]);
    
    if (patients.length === 0) {
      return next(new CustomError("Geçerli telefon numarası olan hasta bulunamadı", 400));
    }
    
    // Her hasta için planlama kaydı oluştur
    const insertPromises = patients.map(patient => {
      const insertQuery = `
        INSERT INTO sms_schedules (patient_id, template_id, send_time, status)
        VALUES ($1, $2, $3, 'pending')
        RETURNING *
      `;
      return executeQuery(insertQuery, [patient.patient_id, templateId, sendDateTime], { returnSingle: true });
    });
    
    await Promise.all(insertPromises);
    
    logger.info(`${patients.length} hasta için SMS planlandı:`, {
      template: template.name,
      sendTime: sendDateTime,
      patients: patients.map(p => ({ id: p.patient_id, name: `${p.first_name} ${p.last_name}` }))
    });
    
    res.status(201).json({ 
      message: "SMS başarıyla planlandı",
      scheduledCount: patients.length,
      template: template.name,
      sendTime: sendDateTime
    });
  } catch (error) {
    logger.error('SMS planlama hatası:', error);
    return next(new CustomError("SMS planlanamadı", 500));
  }
});

// Planlanmış SMS'leri getir
const getScheduledSms = asyncErrorWrapper(async (req, res, next) => {
  try {
    const query = `
      SELECT 
        ss.sms_schedule_id,
        ss.send_time,
        ss.status,
        ss.created_at,
        p.first_name,
        p.last_name,
        p.phone,
        st.name as template_name,
        st.content as template_content
      FROM sms_schedules ss
      JOIN patients p ON ss.patient_id = p.patient_id
      JOIN sms_templates st ON ss.template_id = st.template_id
      ORDER BY ss.send_time DESC
    `;
    const scheduledSms = await executeQuery(query);
    
    res.status(200).json(scheduledSms);
  } catch (error) {
    logger.error('Planlanmış SMS getirme hatası:', error);
    return next(new CustomError("Planlanmış SMS'ler getirilemedi", 500));
  }
});

module.exports = {
  getSmsTemplates,
  createSmsTemplate,
  updateSmsTemplate,
  deleteSmsTemplate,
  sendQuickSms,
  scheduleSms,
  getScheduledSms
};
