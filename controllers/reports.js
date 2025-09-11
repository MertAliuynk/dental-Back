const branchQueries = require("../helpers/db/queries/branchQueries");
const appointmentQueries = require("../helpers/db/queries/appointmentQueries");
const userQueries = require("../helpers/db/queries/userQueries");
const { startOfDay, endOfDay, subDays, format } = require("date-fns");

// Muayene raporu: Şube ve doktor bazında, seçilen tarih aralığında hasta kayıt sayıları
exports.getExaminationReport = async (req, res) => {
  try {
    const { start, end } = req.query;
    const startDate = start ? new Date(start) : subDays(new Date(), 6);
    const endDate = end ? new Date(end) : new Date();
    
    // Gerekli veriler
    const branches = await branchQueries.getAllBranches();
    const users = await userQueries.getUsersByBranch(); // Tüm kullanıcılar
    const doctors = users.filter(u => u.role === "doctor");
    const allPatients = await require("../helpers/db/queries/patientQueries").getAllPatients();
    
    // Seçilen aralıkta günler
    const days = [];
    let d = new Date(startDate);
    while (d <= endDate) {
      days.push(format(new Date(d), "yyyy-MM-dd"));
      d.setDate(d.getDate() + 1);
    }
    
    // Şube bazında sonuçlar
    const branchResults = branches.map(branch => {
      const counts = days.map(day => {
        const patientCount = allPatients.filter(p =>
          p.branch_id === branch.branch_id &&
          format(new Date(p.created_at), "yyyy-MM-dd") === day
        ).length;
        return patientCount;
      });
      
      const totalPatients = allPatients.filter(p =>
        p.branch_id === branch.branch_id &&
        new Date(p.created_at) >= startDate &&
        new Date(p.created_at) <= endDate
      ).length;
      
      return {
        branch_id: branch.branch_id,
        branch_name: branch.name,
        counts,
        total: totalPatients
      };
    });
    
    // Çoklu doktor desteği: patient_doctors tablosu üzerinden
    const patientDoctorMap = {};
    const { getDoctorsByPatientId } = require("../helpers/db/queries/patientDoctorQueries");
    for (const patient of allPatients) {
      // Her hasta için doktorları çek (asenkron toplu çekmek için Promise.all kullanılabilir)
      const doctorsForPatient = await getDoctorsByPatientId(patient.patient_id);
      patientDoctorMap[patient.patient_id] = doctorsForPatient.map(d => d.user_id);
    }

    const doctorResults = doctors.map(doctor => {
      const counts = days.map(day => {
        const patientCount = allPatients.filter(p =>
          patientDoctorMap[p.patient_id] && patientDoctorMap[p.patient_id].includes(doctor.user_id) &&
          format(new Date(p.created_at), "yyyy-MM-dd") === day
        ).length;
        return patientCount;
      });
      const totalPatients = allPatients.filter(p =>
        patientDoctorMap[p.patient_id] && patientDoctorMap[p.patient_id].includes(doctor.user_id) &&
        new Date(p.created_at) >= startDate &&
        new Date(p.created_at) <= endDate
      ).length;
      // Doktorun şubesini bul
      const doctorBranch = branches.find(b => b.branch_id === doctor.branch_id);
      return {
        doctor_id: doctor.user_id,
        doctor_name: `${doctor.first_name} ${doctor.last_name}`,
        branch_id: doctor.branch_id,
        branch_name: doctorBranch ? doctorBranch.name : 'Bilinmeyen Şube',
        counts,
        total: totalPatients
      };
    });
    
    res.json({ 
      success: true, 
      days, 
      branches: branchResults,
      doctors: doctorResults,
      summary: {
        totalPatients: allPatients.filter(p =>
          new Date(p.created_at) >= startDate &&
          new Date(p.created_at) <= endDate
        ).length,
        totalBranches: branches.length,
        totalDoctors: doctors.length
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Hekim başı randevu raporu: Detaylı doktor analizi
exports.getDoctorAppointmentReport = async (req, res) => {
  try {
    const { start, end } = req.query;
    const startDate = start ? new Date(start) : subDays(new Date(), 6);
    const endDate = end ? new Date(end) : new Date();
    
    const appointments = await appointmentQueries.getAllAppointments();
    const users = await userQueries.getUsersByBranch();
    const branches = await branchQueries.getAllBranches();
    const doctors = users.filter(u => u.role === "doctor");
    
    // Filtrelenmiş randevular
    const filteredAppointments = appointments.filter(a => {
      const apptDate = new Date(a.appointment_time);
      if (startDate && apptDate < startDate) return false;
      if (endDate) {
        const endD = new Date(endDate);
        endD.setHours(23, 59, 59, 999);
        if (apptDate > endD) return false;
      }
      return true;
    });

    // Günlük analiz için tarih aralığı
    const days = [];
    let d = new Date(startDate);
    while (d <= endDate) {
      days.push(format(new Date(d), "yyyy-MM-dd"));
      d.setDate(d.getDate() + 1);
    }

    // Doktor bazında detaylı analiz
    // Çoklu doktor desteği: patient_doctors tablosu üzerinden
    const { getDoctorsByPatientId } = require("../helpers/db/queries/patientDoctorQueries");
    const appointmentPatientDoctorMap = {};
    for (const appt of filteredAppointments) {
      const doctorsForPatient = await getDoctorsByPatientId(appt.patient_id);
      appointmentPatientDoctorMap[appt.appointment_id] = doctorsForPatient.map(d => d.user_id);
    }
    const doctorResults = doctors.map(doc => {
      const docAppointments = filteredAppointments.filter(a => appointmentPatientDoctorMap[a.appointment_id] && appointmentPatientDoctorMap[a.appointment_id].includes(doc.user_id));
      // Status bazında analiz
      const scheduled = docAppointments.filter(a => a.status === 'scheduled').length;
      const attended = docAppointments.filter(a => a.status === 'attended').length;
      const missed = docAppointments.filter(a => a.status === 'missed').length;
      // Günlük dağılım
      const dailyCounts = days.map(day => {
        return docAppointments.filter(a => 
          format(new Date(a.appointment_time), "yyyy-MM-dd") === day
        ).length;
      });
      // Doktorun şubesini bul
      const doctorBranch = branches.find(b => b.branch_id === doc.branch_id);
      return {
        doctor_id: doc.user_id,
        doctor_name: `${doc.first_name} ${doc.last_name}`,
        branch_id: doc.branch_id,
        branch_name: doctorBranch ? doctorBranch.name : 'Bilinmeyen Şube',
        total_appointments: docAppointments.length,
        scheduled_appointments: scheduled,
        attended_appointments: attended,
        missed_appointments: missed,
        attendance_rate: docAppointments.length > 0 ? ((attended / docAppointments.length) * 100).toFixed(1) : "0",
        daily_counts: dailyCounts,
        avg_daily: docAppointments.length > 0 ? (docAppointments.length / days.length).toFixed(1) : "0"
      };
    });

    // Şube bazında özet
    const branchSummary = branches.map(branch => {
      const branchDoctors = doctors.filter(d => d.branch_id === branch.branch_id);
      const branchAppointments = filteredAppointments.filter(a => 
        branchDoctors.some(d => d.user_id === a.doctor_id)
      );

      const dailyCounts = days.map(day => {
        return branchAppointments.filter(a => 
          format(new Date(a.appointment_time), "yyyy-MM-dd") === day
        ).length;
      });

      return {
        branch_id: branch.branch_id,
        branch_name: branch.name,
        doctor_count: branchDoctors.length,
        total_appointments: branchAppointments.length,
        attended_appointments: branchAppointments.filter(a => a.status === 'attended').length,
        missed_appointments: branchAppointments.filter(a => a.status === 'missed').length,
        daily_counts: dailyCounts
      };
    });

    // Genel özet
    const summary = {
      total_doctors: doctors.length,
      total_appointments: filteredAppointments.length,
      total_attended: filteredAppointments.filter(a => a.status === 'attended').length,
      total_missed: filteredAppointments.filter(a => a.status === 'missed').length,
      overall_attendance_rate: filteredAppointments.length > 0 
        ? ((filteredAppointments.filter(a => a.status === 'attended').length / filteredAppointments.length) * 100).toFixed(1)
        : "0"
    };

    res.json({ 
      success: true, 
      days,
      doctors: doctorResults,
      branches: branchSummary,
      summary
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Tedavi raporları: Önerilen ve onaylanan tedaviler analizi
exports.getTreatmentReport = async (req, res) => {
  try {
    const { start, end } = req.query;
    const startDate = start ? new Date(start) : subDays(new Date(), 6);
    const endDate = end ? new Date(end) : new Date();
    
    // Gerekli veriler
    const treatmentQueries = require("../helpers/db/queries/treatmentQueries");
    const allTreatments = await treatmentQueries.getAllTreatments(startDate, endDate);
    const users = await userQueries.getUsersByBranch();
    const doctors = users.filter(u => u.role === "doctor");
    const branches = await branchQueries.getAllBranches();
    
    // Status bazında analiz
    const suggestedTreatments = allTreatments.filter(t => t.status === 'suggested');
    const approvedTreatments = allTreatments.filter(t => t.status === 'approved');
    const completedTreatments = allTreatments.filter(t => t.status === 'completed');

    // Tedavi türleri bazında analiz
    const treatmentTypeAnalysis = {};
    allTreatments.forEach(treatment => {
      const typeName = treatment.treatment_type_name || treatment.treatment_name || 'Bilinmeyen Tedavi';
      if (!treatmentTypeAnalysis[typeName]) {
        treatmentTypeAnalysis[typeName] = {
          suggested: 0,
          approved: 0,
          completed: 0,
          total: 0
        };
      }
      
      treatmentTypeAnalysis[typeName].total++;
      if (treatment.status === 'suggested') treatmentTypeAnalysis[typeName].suggested++;
      if (treatment.status === 'approved') treatmentTypeAnalysis[typeName].approved++;
      if (treatment.status === 'completed') treatmentTypeAnalysis[typeName].completed++;
    });

    // En çok uygulanan tedaviler (top 10)
    const popularTreatments = Object.entries(treatmentTypeAnalysis)
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    // Doktor bazında analiz
    // Çoklu doktor desteği: patient_doctors tablosu üzerinden
    const treatmentPatientDoctorMap = {};
    for (const t of allTreatments) {
      const doctorsForPatient = await getDoctorsByPatientId(t.patient_id);
      treatmentPatientDoctorMap[t.treatment_id] = doctorsForPatient.map(d => d.user_id);
    }
    const doctorAnalysis = doctors.map(doctor => {
      const doctorTreatments = allTreatments.filter(t => treatmentPatientDoctorMap[t.treatment_id] && treatmentPatientDoctorMap[t.treatment_id].includes(doctor.user_id));
      // Doktorun şubesini bul
      const doctorBranch = branches.find(b => b.branch_id === doctor.branch_id);
      // Doktorun tedavi türleri
      const doctorTreatmentTypes = {};
      doctorTreatments.forEach(treatment => {
        const typeName = treatment.treatment_type_name || treatment.treatment_name || 'Bilinmeyen Tedavi';
        doctorTreatmentTypes[typeName] = (doctorTreatmentTypes[typeName] || 0) + 1;
      });
      const topTreatment = Object.entries(doctorTreatmentTypes)
        .sort(([,a], [,b]) => b - a)[0];
      return {
        doctor_id: doctor.user_id,
        doctor_name: `${doctor.first_name} ${doctor.last_name}`,
        branch_id: doctor.branch_id,
        branch_name: doctorBranch ? doctorBranch.name : 'Bilinmeyen Şube',
        total_treatments: doctorTreatments.length,
        suggested_treatments: doctorTreatments.filter(t => t.status === 'suggested').length,
        approved_treatments: doctorTreatments.filter(t => t.status === 'approved').length,
        completed_treatments: doctorTreatments.filter(t => t.status === 'completed').length,
        approval_rate: doctorTreatments.length > 0
          ? ((doctorTreatments.filter(t => t.status === 'approved' || t.status === 'completed').length / doctorTreatments.length) * 100).toFixed(1)
          : "0",
        completion_rate: doctorTreatments.filter(t => t.status === 'approved' || t.status === 'completed').length > 0
          ? ((doctorTreatments.filter(t => t.status === 'completed').length / doctorTreatments.filter(t => t.status === 'approved' || t.status === 'completed').length) * 100).toFixed(1)
          : "0",
        most_used_treatment: topTreatment ? topTreatment[0] : 'Yok',
        most_used_count: topTreatment ? topTreatment[1] : 0
      };
    });

    // Şube bazında analiz
    const branchAnalysis = branches.map(branch => {
      const branchTreatments = allTreatments.filter(t => {
        const treatmentDoctor = doctors.find(d => d.user_id === t.doctor_id);
        return treatmentDoctor && treatmentDoctor.branch_id === branch.branch_id;
      });

      return {
        branch_id: branch.branch_id,
        branch_name: branch.name,
        total_treatments: branchTreatments.length,
        suggested_treatments: branchTreatments.filter(t => t.status === 'suggested').length,
        approved_treatments: branchTreatments.filter(t => t.status === 'approved').length,
        completed_treatments: branchTreatments.filter(t => t.status === 'completed').length,
        doctor_count: doctors.filter(d => d.branch_id === branch.branch_id).length
      };
    });

    // Günlük analiz
    const days = [];
    let d = new Date(startDate);
    while (d <= endDate) {
      days.push(format(new Date(d), "yyyy-MM-dd"));
      d.setDate(d.getDate() + 1);
    }

    const dailyTreatments = days.map(day => {
      const dayTreatments = allTreatments.filter(t => 
        format(new Date(t.suggested_at), "yyyy-MM-dd") === day
      );
      
      return {
        date: day,
        suggested: dayTreatments.filter(t => t.status === 'suggested').length,
        approved: dayTreatments.filter(t => t.status === 'approved').length,
        completed: dayTreatments.filter(t => t.status === 'completed').length,
        total: dayTreatments.length
      };
    });

    // Genel özet
    const summary = {
      total_treatments: allTreatments.length,
      suggested_treatments: suggestedTreatments.length,
      approved_treatments: approvedTreatments.length,
      completed_treatments: completedTreatments.length,
      total_doctors: doctors.length,
      total_branches: branches.length,
      approval_rate: allTreatments.length > 0 
        ? (((approvedTreatments.length + completedTreatments.length) / allTreatments.length) * 100).toFixed(1)
        : "0",
      completion_rate: (approvedTreatments.length + completedTreatments.length) > 0
        ? ((completedTreatments.length / (approvedTreatments.length + completedTreatments.length)) * 100).toFixed(1)
        : "0"
    };

    res.json({
      success: true,
      days,
      summary,
      popular_treatments: popularTreatments,
      doctors: doctorAnalysis,
      branches: branchAnalysis,
      daily_treatments: dailyTreatments,
      treatment_types: treatmentTypeAnalysis
    });

  } catch (err) {
    console.error('Treatment report error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};
