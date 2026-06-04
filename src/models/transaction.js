// ============================================
// Transaction Model - Catatan Keuangan Pocong
// ============================================
const dayjs = require('dayjs');

const CATEGORIES = [
  'makanan', 'minuman', 'transport', 'belanja', 'tagihan',
  'hiburan', 'kesehatan', 'pendidikan', 'tabungan', 'gaji',
  'freelance', 'investasi', 'lainnya'
];

const INCOME_CATEGORIES = ['gaji', 'freelance', 'investasi'];

/**
 * Parse input text dari user menjadi objek transaksi
 * Format: <jumlah> <kategori> <catatan>
 * Contoh: "50000 makanan nasi goreng spesial"
 *         "+2000000 gaji gaji bulan juni"
 *         "-150000 belanja beli baju"
 */
function parseTransaction(text) {
  const parts = text.trim().split(/\s+/);
  if (parts.length < 2) {
    return { error: '❌ Format salah!\n\nGunakan: <jumlah> <kategori> <catatan>\nContoh: 50000 makanan nasi goreng' };
  }

  // Parse amount dengan support format singkat: 50k, 2jt, 100rb, 1.5jt, dll
  let amountStr = parts[0].toLowerCase();
  let type = 'pengeluaran';

  // Detect tipe transaksi (+ untuk pemasukan, - untuk pengeluaran)
  if (amountStr.startsWith('+')) {
    type = 'pemasukan';
    amountStr = amountStr.slice(1);
  } else if (amountStr.startsWith('-')) {
    type = 'pengeluaran';
    amountStr = amountStr.slice(1);
  }

  // Konversi format singkat ke angka penuh
  // Contoh: 50k → 50000, 2jt → 2000000, 100rb → 100000, 1.5jt → 1500000
  let amount = 0;

  if (amountStr.includes('jt')) {
    // Format: XYZ juta (contoh: 2jt, 1.5jt)
    const numStr = amountStr.replace('jt', '').trim();
    amount = Math.round(parseFloat(numStr) * 1000000);
  } else if (amountStr.includes('rb')) {
    // Format: XYZ ribu (contoh: 50rb, 100rb)
    const numStr = amountStr.replace('rb', '').trim();
    amount = Math.round(parseFloat(numStr) * 1000);
  } else if (amountStr.includes('k')) {
    // Format: XYZ k (contoh: 50k)
    const numStr = amountStr.replace('k', '').trim();
    amount = Math.round(parseFloat(numStr) * 1000);
  } else {
    // Format normal: angka biasa (dengan atau tanpa titik/koma)
    const numStr = amountStr.replace(/[.,]/g, '');
    amount = parseInt(numStr, 10);
  }

  if (isNaN(amount) || amount <= 0) {
    return { error: '❌ Jumlah tidak valid! Masukkan angka positif.\n\nFormat yang didukung:\n• 50000 atau 50k (50 ribu)\n• 1000000 atau 1jt (1 juta)\n• 1.5jt (1.5 juta)\n• 100rb (100 ribu)\n\nContoh: 50k makanan makan siang' };
  }

  // Parse category
  const category = parts[1].toLowerCase();
  if (!CATEGORIES.includes(category)) {
    return {
      error: `❌ Kategori "${category}" tidak dikenali!\n\nKategori tersedia:\n📤 Pengeluaran: makanan, minuman, transport, belanja, tagihan, hiburan, kesehatan, pendidikan\n📥 Pemasukan: gaji, freelance, investasi, tabungan\n📎 Lainnya: lainnya`
    };
  }

  // Auto-detect type from category
  if (INCOME_CATEGORIES.includes(category)) {
    type = 'pemasukan';
  }

  // Parse note (rest of the text)
  const note = parts.slice(2).join(' ') || '-';

  return {
    data: {
      timestamp: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      date: dayjs().format('YYYY-MM-DD'),
      month: dayjs().format('YYYY-MM'),
      type,
      amount,
      category,
      note,
      formattedAmount: formatCurrency(amount)
    }
  };
}

/**
 * Format angka ke Rupiah
 */
function formatCurrency(amount) {
  return 'Rp ' + amount.toLocaleString('id-ID');
}

/**
 * Generate pesan ringkasan transaksi
 */
function transactionSummaryMessage(tx) {
  const emoji = tx.type === 'pemasukan' ? '💰' : '💸';
  return `${emoji} *Transaksi Tercatat!*\n\n` +
    `📅 Tanggal: ${tx.date}\n` +
    `📁 Tipe: ${tx.type.toUpperCase()}\n` +
    `💵 Jumlah: ${tx.formattedAmount}\n` +
    `🏷️ Kategori: ${tx.category}\n` +
    `📝 Catatan: ${tx.note}`;
}

/**
 * Generate pesan help
 */
function helpMessage() {
  return `📊 *Catatan Keuangan Pocong*\n\n` +
    `📌 *Perintah yang tersedia:*\n\n` +
    `1️⃣ *Catat Pengeluaran (Format Baru)*\n` +
    `   50k makanan nasi goreng\n` +
    `   2jt belanja baju\n` +
    `   100rb transport ojol\n` +
    `   atau format lama: 50000 makanan nasi goreng\n\n` +
    `2️⃣ *Catat Pemasukan*\n` +
    `   +2jt gaji gaji bulan ini\n` +
    `   +500rb freelance project\n\n` +
    `3️⃣ *Kirim Foto Struk (OCR)*\n` +
    `   [Kirim gambar kwitansi]\n` +
    `   Bot akan membaca otomatis\n\n` +
    `4️⃣ *Ringkasan Bulan Ini*\n` +
    `   /summary\n\n` +
    `5️⃣ *Ringkasan Bulan Tertentu*\n` +
    `   /summary 2026-06\n\n` +
    `6️⃣ *Lihat Kategori*\n` +
    `   /categories\n\n` +
    `7️⃣ *Hapus Transaksi Terakhir*\n` +
    `   /undo\n\n` +
    `📎 *Kategori:*\n` +
    `📤 Pengeluaran: makanan, minuman, transport, belanja, tagihan, hiburan, kesehatan, pendidikan\n` +
    `📥 Pemasukan: gaji, freelance, investasi, tabungan\n` +
    `📎 Lainnya: lainnya\n\n` +
    `💡 *Format Jumlah yang Didukung:*\n` +
    `• 50000 atau 50k (50 ribu)\n` +
    `• 1000000 atau 1jt (1 juta)\n` +
    `• 1.5jt (1.5 juta)\n` +
    `• 100rb (100 ribu)`;
}

module.exports = {
  CATEGORIES,
  INCOME_CATEGORIES,
  parseTransaction,
  formatCurrency,
  transactionSummaryMessage,
  helpMessage
};
