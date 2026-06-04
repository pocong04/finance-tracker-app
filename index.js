// index.js
// Entry point utama - Catatan Keuangan Pocong
// Menjalankan: Telegram Bot + WhatsApp Bot + Web Dashboard
// =========================================================

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { initTelegramBot } = require('./src/services/telegramBot');
const { initWhatsAppBot } = require('./src/services/whatsappBot');
const { initDashboard } = require('./src/services/dashboard');

console.log('');
console.log('================================================');
console.log('  💰 Catatan Keuangan Pocong - Starting Up...');
console.log('================================================');
console.log('');

// Peringatan jika credentials.json belum ada (Google Sheets belum aktif)
const credPath = path.resolve(__dirname, 'credentials.json');
if (!fs.existsSync(credPath)) {
  console.log('⚠️  PERHATIAN: credentials.json belum ditemukan!');
  console.log('   → Bot tetap berjalan & bisa membalas chat,');
  console.log('     TAPI transaksi belum bisa tersimpan ke Google Sheets.');
  console.log('   → Ikuti panduan di SETUP_CREDENTIALS.md untuk mengaktifkannya.');
  console.log('');
}

// 1. Jalankan Web Dashboard
const port = process.env.PORT || 3000;
initDashboard(port);

// 2. Jalankan Telegram Bot
const telegramToken = process.env.TELEGRAM_TOKEN;
if (telegramToken && telegramToken !== 'masukkan_token_telegram_disini') {
  initTelegramBot(telegramToken);
} else {
  console.log('⏭️  Telegram bot dilewati (token belum dikonfigurasi)');
}

// 3. Jalankan WhatsApp Bot
if (process.env.WHATSAPP_ENABLED === 'true') {
  initWhatsAppBot();
} else {
  console.log('⏭️  WhatsApp bot dilewati (WHATSAPP_ENABLED=false)');
}

console.log('');
console.log('================================================');
console.log('  📊 Semua service berjalan!');
console.log('  🌐 Dashboard: http://localhost:' + port);
console.log('================================================');
console.log('');
