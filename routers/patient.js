const express = require("express");
const { createPatientWithAnamnesis, bulkAddPatients, getAllPatientsWithBranch } = require("../controllers/patient");

const router = express.Router();

// Toplu hasta ekle (Hasta Bilgileri zorunlu, Anamnez yok)
router.post("/bulk", bulkAddPatients);

// Tüm hastaları getir (şube adı ve oluşturma tarihiyle)
router.get("/", getAllPatientsWithBranch);


// Belirli hastayı getir
const { getPatientById, updatePatient } = require("../helpers/db/queries/patientQueries");
const { getAnamnesisByPatientId, createAnamnesis, deleteAnamnesisByPatientId } = require("../helpers/db/queries/patientAnamnesisQueries");
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