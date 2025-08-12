const axios = require('axios');

const NETGSM_API_URL = 'https://api.netgsm.com.tr/sms/send/otp';
const NETGSM_USERNAME = process.env.NETGSM_USERNAME || '8503465190';
const NETGSM_PASSWORD = process.env.NETGSM_PASSWORD || 'B879#34';
const NETGSM_HEADER = process.env.NETGSM_HEADER || 'KARADENZDiS';

// Telefon numarasını Netgsm formatına çevir
function normalizePhone(phone) {
	// Sadece rakamları al
	let digits = phone.replace(/\D/g, '');
	// 0 ile başlıyorsa baştaki 0'ı kaldır
	if (digits.startsWith('0')) digits = digits.substring(1);
	// 10 haneli ise başına 90 ekle
	if (digits.length === 10) digits = '90' + digits;
	// 11 haneli ve 90 ile başlamıyorsa başına 90 ekle
	if (digits.length === 11 && !digits.startsWith('90')) digits = '90' + digits.substring(1);
	// 12 haneli ve 90 ile başlıyorsa tamam
	if (digits.length === 12 && digits.startsWith('90')) return digits;
	// Diğer durumlarda olduğu gibi döndür
	return digits;
}

// Netgsm ile SMS gönder
async function sendSmsNetgsm({ phone, message }) {
	const gsm = normalizePhone(phone);
	const xml = `<?xml version="1.0" encoding="UTF-8"?>
		<mainbody>
			<header>
				<company>Netgsm</company>
				<usercode>${NETGSM_USERNAME}</usercode>
				<password>${NETGSM_PASSWORD}</password>
				<type>1:n</type>
				<msgheader>${NETGSM_HEADER}</msgheader>
			</header>
			<body>
				<msg><![CDATA[${message}]]></msg>
				<no>${gsm}</no>
			</body>
		</mainbody>`;
	try {
		const response = await axios.post('https://api.netgsm.com.tr/sms/send/xml', xml, {
			headers: { 'Content-Type': 'application/xml' }
		});
		return response.data;
	} catch (err) {
		throw new Error('Netgsm SMS gönderim hatası: ' + err.message);
	}
}

module.exports = {
	sendSmsNetgsm,
	normalizePhone
};
