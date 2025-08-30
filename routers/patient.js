
const express = require("express");
const { createPatientWithAnamnesis, bulkAddPatients, getAllPatientsWithBranch } = require("../controllers/patient");

const router = express.Router();
// Sadece hasta notunu güncelle
router.patch('/:id/notes', async (req, res) => {
  try {
    const patientId = req.params.id;
    const { notes } = req.body;
    if (typeof notes !== 'string') {
      return res.status(400).json({ success: false, message: 'Not alanı zorunludur.' });
    }
    const updated = await executeQuery(
      'UPDATE patients SET notes = $1, updated_at = CURRENT_TIMESTAMP WHERE patient_id = $2 RETURNING *',
      [notes, patientId],
      { returnSingle: true }
    );
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Hasta bulunamadı.' });
    }
    res.json({ success: true, data: updated, message: 'Not güncellendi.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Sunucu hatası.' });
  }
});
// Hasta doktor ilişkilerini sil
router.delete('/:id/doctors', async (req, res) => {
  try {
    const patientId = req.params.id;
    await executeQuery('DELETE FROM patient_doctors WHERE patient_id = $1', [patientId]);
    res.json({ success: true, message: 'Hasta doktor ilişkileri silindi.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Doktor ilişkileri silinemedi.', error: err.message });
  }
});

// Hasta doktor ilişkilerini ekle
router.post('/:id/doctors', async (req, res) => {
  try {
    const patientId = req.params.id;
    const { doctorIds } = req.body;
    if (!Array.isArray(doctorIds) || doctorIds.length === 0) {
      return res.status(400).json({ success: false, message: 'En az bir doktor ID gerekli.' });
    }
    // Önce sil, sonra ekle
    await executeQuery('DELETE FROM patient_doctors WHERE patient_id = $1', [patientId]);
    for (const doctorId of doctorIds) {
      await executeQuery('INSERT INTO patient_doctors (patient_id, doctor_id) VALUES ($1, $2)', [patientId, doctorId]);
    }
    res.json({ success: true, message: 'Hasta doktor ilişkileri güncellendi.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Doktor ilişkileri eklenemedi.', error: err.message });
  }
});


// Toplu hasta ekle (Hasta Bilgileri zorunlu, Anamnez yok)
router.post("/bulk", bulkAddPatients);

// Tüm hastaları getir (şube adı ve oluşturma tarihiyle)
router.get("/", getAllPatientsWithBranch);


// Belirli hastayı getir
const { getPatientById, updatePatient } = require("../helpers/db/queries/patientQueries");
const { getAnamnesisByPatientId, createAnamnesis, deleteAnamnesisByPatientId } = require("../helpers/db/queries/patientAnamnesisQueries");

// Tüm hasta-doktor ilişkilerini getir
const { executeQuery } = require("../helpers/db/utils/queryExecutor");
router.get("/all-doctors-relations", async (req, res) => {
  try {
    const rows = await executeQuery("SELECT * FROM patient_doctors");
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: "Hasta-doktor ilişkileri alınamadı.", error: err.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const patient = await getPatientById(req.params.id);
    if (!patient) return res.status(404).json({ success: false, message: "Hasta bulunamadı" });
    res.json({ success: true, data: patient });
  } catch (err) {
    res.status(500).json({ success: false, message: "Hasta bilgisi alınamadı." });
  }
});

// Belirli hastanın anamnez kayıtlarını getir
router.get("/:id/anamnesis", async (req, res) => {
  try {
    const rows = await getAnamnesisByPatientId(req.params.id);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: "Anamnez bilgisi alınamadı." });
  }
});

// Hasta güncelle
router.put("/:id", async (req, res) => {
  try {
    const patientId = req.params.id;
  const { branchId, firstName, lastName, tcNumber, phone, birthDate, doctorId, notes, anamnez } = req.body;
    
    if (!firstName || !lastName) {
      return res.status(400).json({ success: false, message: "Ad ve soyad zorunludur." });
    }

    const updatedPatient = await updatePatient(patientId, {
      branchId, firstName, lastName, tcNumber, phone, birthDate, doctorId, notes
    });

    if (!updatedPatient) {
      return res.status(404).json({ success: false, message: "Hasta bulunamadı." });
    }

    // Anamnez güncelle (varsa gönderilmiş)
    if (anamnez && typeof anamnez === 'object') {
      // Önce mevcutları sil
      await deleteAnamnesisByPatientId(patientId);
      // Sonra yeni kayıtları oluştur
      const questions = [
        { key: "tedavi", label: "Şu anda herhangi bir tedavi görüyor musunuz? İlaç kullanıyor musunuz?", type: "text" },
        { key: "hastalik", label: "Herhangi bir hastalığınız var mı? Geçirdiniz mi?", type: "text" },
        { key: "hastalikList", label: "Hastalık Listesini Göster", type: "boolean" },
        { key: "radyoterapi", label: "Baş ve boyun bölgesinde radyoterapi gördünüz mü?", type: "text" },
        { key: "kanama", label: "Cerrahi müdahale veya yaralanma sonrası kanama uzun sürer mi?", type: "text" },
        { key: "ilacAlerji", label: "İlaç alerjiniz var mı?", type: "text" },
        { key: "digerSorun", label: "Bunların dışında herhangi bir tıbbi sorununuz var mı?", type: "text" },
        { key: "kadinBilgi", label: "Kadınlarda hamilelik, düşük, adet ve menapoz bilgileri", type: "text" },
        { key: "kotuAliskanlik", label: "Kötü alışkanlıklarınız var mı?", type: "text" },
        { key: "disMuayene", label: "En son dişhekimi muayenesi, tedavisi?", type: "text" },
      ];
      for (const q of questions) {
        const val = anamnez[q.key];
        if (q.type === "boolean" && typeof val === "boolean") {
          await createAnamnesis({ patientId, question: q.label, answerType: "boolean", answerText: null, answerBoolean: val });
        } else if (q.type === "text" && val && String(val).trim() !== "") {
          await createAnamnesis({ patientId, question: q.label, answerType: "text", answerText: val, answerBoolean: null });
        }
      }
    }

    res.json({ success: true, data: updatedPatient, message: "Hasta bilgileri güncellendi." });
  } catch (err) {
    console.error('Hasta güncelleme hatası:', err);
    res.status(500).json({ success: false, message: "Hasta güncellenirken hata oluştu." });
  }
});


// Yeni hasta ekle (Hasta Bilgileri zorunlu, Anamnez Bilgileri opsiyonel)
router.post("/", createPatientWithAnamnesis);

// Hasta sil (ilişkili tedavi ve randeviler de silinir)
const { deletePatientAndRelations } = require("../controllers/patient");
router.delete("/:id", deletePatientAndRelations);

// Test endpoint
router.get("/test", (req, res) => {
  res.send("Patient router çalışıyor");
});

module.exports = router;