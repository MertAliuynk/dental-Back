// Tüm hastaları şube adı ve oluşturma tarihiyle birlikte dönen fonksiyon
const { executeQuery } = require("../helpers/db/utils/queryExecutor");
async function getAllPatientsWithBranch(req, res) {
  try {
  const limit = parseInt(req.query.limit) || 20;
  const offset = parseInt(req.query.offset) || 0;
  const search = req.query.search ? req.query.search.trim() : "";
  const branch_id = req.query.branch_id ? req.query.branch_id : null;
  // Sıralama parametreleri
  const allowedOrderBy = ["first_name", "last_name", "created_at", "tc_number", "phone", "branch_name"];
  const orderBy = allowedOrderBy.includes(req.query.orderBy) ? req.query.orderBy : "created_at";
  const order = req.query.order === "asc" ? "ASC" : "DESC";
    let query = `
      SELECT p.*, b.name AS branch_name
      FROM patients p
      LEFT JOIN branches b ON p.branch_id = b.branch_id
    `;
    let params = [];
    let whereClause = "";
    let whereParts = [];
    if (search) {
      whereParts.push(`(p.first_name ILIKE $${params.length+1} OR p.last_name ILIKE $${params.length+1} OR p.tc_number ILIKE $${params.length+1} OR p.phone ILIKE $${params.length+1})`);
      params.push(`%${search}%`);
    }
    if (branch_id) {
      whereParts.push(`p.branch_id = $${params.length+1}`);
      params.push(branch_id);
    }
    if (whereParts.length > 0) {
      query += ' WHERE ' + whereParts.join(' AND ');
    }
    // Dinamik ve Türkçe/boşluk duyarlı sıralama
    let orderBySql;
    if (orderBy === "first_name" || orderBy === "last_name") {
  orderBySql = `TRIM(LOWER(p.${orderBy}))`;
    } else if (orderBy === "branch_name") {
  orderBySql = `TRIM(LOWER(b.name))`;
    } else {
      orderBySql = `p.${orderBy}`;
    }
    query += ` ORDER BY ${orderBySql} ${order} LIMIT $${params.length+1} OFFSET $${params.length+2}`;
    params.push(limit, offset);
    const patients = await executeQuery(query, params);
    // Toplam kayıt sayısı için ek sorgu
    let countQuery = 'SELECT COUNT(*) FROM patients';
    let countParams = [];
    let countWhereParts = [];
    if (search) {
      countWhereParts.push(`(first_name ILIKE $${countParams.length+1} OR last_name ILIKE $${countParams.length+1} OR tc_number ILIKE $${countParams.length+1} OR phone ILIKE $${countParams.length+1})`);
      countParams.push(`%${search}%`);
    }
    if (branch_id) {
      countWhereParts.push(`branch_id = $${countParams.length+1}`);
      countParams.push(branch_id);
    }
    if (countWhereParts.length > 0) {
      countQuery += ' WHERE ' + countWhereParts.join(' AND ');
    }
    const countResult = await executeQuery(countQuery, countParams);
    const total = parseInt(countResult[0].count, 10);
    res.json({ success: true, data: patients, total });
  } catch (err) {
    res.status(500).json({ success: false, message: "Hasta listesi alınırken hata oluştu.", error: err.message });
  }
}
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
    const errorList = [];
    for (let i = 0; i < patients.length; i++) {
      const p = patients[i];
      const { firstName, lastName, tc, phone, birthDate, doctors } = p;
      // doctors: dizi beklenir (zorunlu)
      if (!firstName || !lastName || !tc || !phone || !birthDate || !Array.isArray(doctors) || doctors.length === 0) {
        errorList.push({ index: i + 1, tc, error: "Eksik veya hatalı bilgi" });
        continue;
      }
      try {
        const created = await createPatient({
          branchId: userBranchId || null,
          firstName,
          lastName,
          tcNumber: tc,
          phone,
          birthDate,
          doctorIds: doctors.map(Number),
          notes: null
        });
        results.push(created);
      } catch (err) {
        errorList.push({ index: i + 1, tc, error: err.message });
      }
    }
    if (results.length === 0) {
      return res.status(400).json({ success: false, message: "En az bir geçerli hasta bilgisi girilmelidir.", errors: errorList });
    }
    res.status(201).json({ success: true, data: results, errors: errorList });
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
      doctors,
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
    if (!firstName || !lastName || !phone || !tc || !Array.isArray(doctors) || doctors.length === 0 || !birthDate) {
      return res.status(400).json({ success: false, message: "Tüm hasta bilgileri ve en az bir doktor zorunludur." });
    }

    // createPatient fonksiyonu branchId ve notes opsiyonel, diğerleri zorunlu
    const patient = await createPatient({
      branchId: userBranchId || null,
      firstName,
      lastName,
      tcNumber: tc,
      phone,
      birthDate,
      doctorIds: doctors.map(Number),
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

      // hastaliklar (çoklu seçim) için her birini ayrı kaydet
      if (Array.isArray(anamnez.hastaliklar) && anamnez.hastaliklar.length > 0) {
        for (const disease of anamnez.hastaliklar) {
          await createAnamnesis({
            patientId: patient.patient_id,
            question: "Hastalık (listeden seçilen)",
            answerType: "text",
            answerText: disease,
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

const { deletePatient } = require("../helpers/db/queries/patientQueries");
const { deleteTreatment } = require("../helpers/db/queries/treatmentQueries");
const { deleteAppointment } = require("../helpers/db/queries/appointmentQueries");

// DELETE /api/patient/:id
// Hasta silinince ilişkili tedavi ve randeviler de silinir
async function deletePatientAndRelations(req, res) {
  try {
    const patientId = req.params.id;
    // Tedavileri sil
    const { executeQuery } = require("../helpers/db/utils/queryExecutor");
    // Tüm tedavileri bul
    const treatments = await executeQuery('SELECT treatment_id FROM treatments WHERE patient_id = $1', [patientId]);
    for (const t of treatments) {
      await deleteTreatment(t.treatment_id);
    }
    // Tüm randevuları bul
    const appointments = await executeQuery('SELECT appointment_id FROM appointments WHERE patient_id = $1', [patientId]);
    for (const a of appointments) {
      await deleteAppointment(a.appointment_id);
    }
    // Hastayı sil
    const deleted = await deletePatient(patientId);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Hasta bulunamadı." });
    }
    res.json({ success: true, message: "Hasta ve ilişkili veriler silindi." });
  } catch (err) {
    console.error('Hasta silme hatası:', err);
    res.status(500).json({ success: false, message: "Hasta silinirken hata oluştu.", error: err.message });
  }
}

module.exports = { createPatientWithAnamnesis, bulkAddPatients, deletePatientAndRelations, getAllPatientsWithBranch };