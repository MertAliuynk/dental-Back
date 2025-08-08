// Toplu hasta ekle (Hasta Bilgileri zorunlu, Anamnez yok)
const { createPatient } = require("../helpers/db/queries/patientQueries");
const { verifyToken } = require("../helpers/auth/jwtHelper");
async function bulkAddPatients(req, res) {
  try {
    const { patients } = req.body;
    console.log('Gelen toplu hasta verisi:', patients);
    if (!Array.isArray(patients) || patients.length === 0) {
      return res.status(400).json({ success: false, message: "Hasta listesi boş olamaz." });
    }

    // JWT token'dan kullanıcı bilgisini al
    let userBranchId = null;
    try {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const decoded = verifyToken(token);
        userBranchId = decoded.branch_id || decoded.branchId;
        console.log('Toplu ekleme için JWT token\'dan branch ID alındı:', userBranchId);
      }
    } catch (jwtError) {
      console.log('JWT decode hatası (devam ediliyor):', jwtError.message);
    }

    const results = [];
    for (const p of patients) {
      const { firstName, lastName, tc, phone, birthDate, doctor } = p;
      // Sadece eksiksiz satırları ekle
      if (!firstName || !lastName || !tc || !phone || !birthDate || !doctor) {
        continue;
      }
      const created = await createPatient({
        branchId: userBranchId || null,
        firstName,
        lastName,
        tcNumber: tc,
        phone,
        birthDate,
        doctorId: Number(doctor),
        notes: null
      });
      results.push(created);
    }
    if (results.length === 0) {
      return res.status(400).json({ success: false, message: "En az bir geçerli hasta bilgisi girilmelidir." });
    }
    res.status(201).json({ success: true, data: results });
  } catch (err) {
    console.error('Toplu hasta ekleme hatası:', err);
    res.status(500).json({ success: false, message: "Toplu hasta ekleme sırasında hata oluştu.", error: err.message });
  }
}

const { createAnamnesis } = require("../helpers/db/queries/patientAnamnesisQueries");

// POST /api/patient
// Hasta Bilgileri zorunlu, Anamnez Bilgileri opsiyonel
async function createPatientWithAnamnesis(req, res) {
  try {
    const {
      firstName,
      lastName,
      phone,
      tc,
      doctor,
      birthDate,
      branchId, // opsiyonel, ileride kullanılabilir
      notes,
      anamnez
    } = req.body;

    // JWT token'dan kullanıcı bilgisini al
    let userBranchId = branchId; // Eğer branchId zaten gönderilmişse onu kullan
    
    if (!userBranchId) {
      try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
          const token = authHeader.substring(7);
          const decoded = verifyToken(token);
          userBranchId = decoded.branch_id || decoded.branchId;
          console.log('JWT token\'dan branch ID alındı:', userBranchId);
        }
      } catch (jwtError) {
        console.log('JWT decode hatası (devam ediliyor):', jwtError.message);
        // JWT hatası olsa bile hasta oluşturmaya devam et
      }
    }

    // Zorunlu alan kontrolü
    if (!firstName || !lastName || !phone || !tc || !doctor || !birthDate) {
      return res.status(400).json({ success: false, message: "Tüm hasta bilgileri zorunludur." });
    }

    // createPatient fonksiyonu branchId ve notes opsiyonel, diğerleri zorunlu
    const patient = await createPatient({
      branchId: userBranchId || null,
      firstName,
      lastName,
      tcNumber: tc,
      phone,
      birthDate,
      doctorId: doctor,
      notes: notes || null
    });

    if (anamnez && typeof anamnez === "object") {
      // Her bir anamnez alanını kaydet (sadece dolu olanlar)
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
          await createAnamnesis({
            patientId: patient.patient_id,
            question: q.label,
            answerType: "boolean",
            answerText: null,
            answerBoolean: val
          });
        } else if (q.type === "text" && val && String(val).trim() !== "") {
          await createAnamnesis({
            patientId: patient.patient_id,
            question: q.label,
            answerType: "text",
            answerText: val,
            answerBoolean: null
          });
        }
      }
    }

    res.status(201).json({ success: true, data: patient });
  } catch (err) {
    res.status(500).json({ success: false, message: "Hasta kaydı sırasında hata oluştu.", error: err.message });
  }
}

module.exports = { createPatientWithAnamnesis, bulkAddPatients };