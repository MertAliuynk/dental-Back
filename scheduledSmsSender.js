// Bayram günleri ve mesajları
const BAYRAM_DATES = [
	{ month: 4, day: 23, message: '23 Nisan Ulusal Egemenlik ve Çocuk Bayramınız kutlu olsun! Karadeniz Diş Poliklinikleri ailesi olarak nice sağlıklı günler dileriz.' },
	{ month: 5, day: 19, message: '19 Mayıs Atatürk\'ü Anma, Gençlik ve Spor Bayramınız kutlu olsun! Karadeniz Diş Poliklinikleri ailesi olarak nice sağlıklı günler dileriz.' },
	{ month: 8, day: 30, message: '30 Ağustos Zafer Bayramınız kutlu olsun! Karadeniz Diş Poliklinikleri ailesi olarak nice sağlıklı günler dileriz.' },
	{ month: 10, day: 29, message: '29 Ekim Cumhuriyet Bayramınız kutlu olsun! Karadeniz Diş Poliklinikleri ailesi olarak nice sağlıklı günler dileriz.' }
];

async function getAllPatients() {
	const query = 'SELECT * FROM patients';
	return executeQuery(query);
}

async function sendBayramSmsToAllPatients(message) {
	const patients = await getAllPatients();
	for (const patient of patients) {
		try {
			await sendSmsNetgsm({ phone: patient.phone, message });
			console.log(`Bayram SMS gönderildi: ${patient.first_name} ${patient.last_name}`);
		} catch (err) {
			console.error(`Bayram SMS gönderilemedi: ${patient.first_name} ${patient.last_name} - ${err.message}`);
		}
	}
}

function isTodayBayram() {
	const today = new Date();
	const month = today.getMonth() + 1;
	const day = today.getDate();
	return BAYRAM_DATES.find(b => b.month === month && b.day === day);
}
const cron = require('node-cron');
// Karadeniz Diş Poliklinikleri - Doğum Günü Otomatik SMS Scripti
const { executeQuery } = require('./helpers/db/utils/queryExecutor');
const { sendSmsNetgsm } = require('./helpers/netgsm');

async function getTodayBirthdayPatients() {
	// Bugünün ay ve günü
	const today = new Date();
	const month = today.getMonth() + 1; // 1-12
	const day = today.getDate(); // 1-31
	// Doğum günü bugün olan hastalar
	const query = `SELECT * FROM patients WHERE EXTRACT(MONTH FROM birth_date) = $1 AND EXTRACT(DAY FROM birth_date) = $2`;
	return executeQuery(query, [month, day]);
}


async function sendBirthdaySmsToPatient(patient) {
	const message = `Sayın ${patient.first_name} ${patient.last_name}, Karadeniz Diş Poliklinikleri ailesi olarak doğum gününüzü kutlarız.`;
	try {
		await sendSmsNetgsm({ phone: patient.phone, message });
		console.log(`Doğum günü SMS gönderildi: ${patient.first_name} ${patient.last_name}`);
	} catch (err) {
		console.error(`SMS gönderilemedi: ${patient.first_name} ${patient.last_name} - ${err.message}`);
	}
}

async function runBirthdaySmsJob() {
		// Doğum günü SMS'leri
		const patients = await getTodayBirthdayPatients();
		for (const patient of patients) {
			await sendBirthdaySmsToPatient(patient);
		}
		// Bayram SMS'leri
		const bayram = isTodayBayram();
		if (bayram) {
			await sendBayramSmsToAllPatients(bayram.message);
			console.log('Bayram SMS işlemi tamamlandı.');
		}
		console.log('Doğum günü SMS işlemi tamamlandı.');
}

// Doğum günü SMS fonksiyonunu bir cron job ile günde bir kez (her sabah 09:00'da) çalıştır:
cron.schedule('0 9 * * *', () => {
	runBirthdaySmsJob()
		.then(() => console.log('Doğum günü SMS cron ile gönderildi.'))
		.catch(err => console.error('Cron SMS hatası:', err));
});

// Script doğrudan çalıştırılırsa tetikle
if (require.main === module) {
	runBirthdaySmsJob().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
}
