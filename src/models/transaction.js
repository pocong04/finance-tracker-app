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

// Kamus kata kunci → kategori. Membantu bot mengerti bahasa sehari-hari.
// Contoh: "makan", "kopi", "bensin", "billiard", dll otomatis terdeteksi kategorinya.
const KEYWORD_MAP = {
  makanan: ['makan', 'makanan', 'nasi', 'ayam', 'bakso', 'mie', 'soto', 'sate', 'gorengan', 'sarapan', 'lunch', 'dinner', 'jajan', 'snack', 'roti', 'kfc', 'mcd', 'warteg', 'padang', 'seblak', 'pizza', 'burger'],
  minuman: ['minum', 'minuman', 'kopi', 'coffee', 'teh', 'jus', 'soda', 'air', 'boba', 'es', 'starbucks', 'milkshake'],
  transport: ['transport', 'transportasi', 'bensin', 'pertamax', 'pertalite', 'solar', 'ojek', 'ojol', 'grab', 'gojek', 'gocar', 'grabcar', 'taksi', 'taxi', 'bus', 'kereta', 'krl', 'mrt', 'parkir', 'tol', 'angkot', 'busway'],
  belanja: ['belanja', 'beli', 'baju', 'celana', 'sepatu', 'tas', 'kosmetik', 'skincare', 'elektronik', 'shopee', 'tokopedia', 'lazada', 'mall', 'supermarket', 'indomaret', 'alfamart'],
  tagihan: ['tagihan', 'listrik', 'pln', 'air', 'pdam', 'internet', 'wifi', 'pulsa', 'paket', 'kuota', 'token', 'bpjs', 'asuransi', 'cicilan', 'kredit', 'sewa', 'kos', 'kontrakan'],
  hiburan: ['hiburan', 'nonton', 'bioskop', 'film', 'game', 'gaming', 'billiard', 'biliar', 'karaoke', 'wisata', 'liburan', 'konser', 'netflix', 'spotify', 'youtube', 'main', 'rekreasi', 'pijat', 'spa'],
  kesehatan: ['kesehatan', 'obat', 'dokter', 'rumah sakit', 'rs', 'klinik', 'apotek', 'vitamin', 'periksa', 'medis', 'gigi'],
  pendidikan: ['pendidikan', 'sekolah', 'kuliah', 'kursus', 'les', 'buku', 'spp', 'ujian', 'seminar', 'pelatihan', 'training'],
  gaji: ['gaji', 'salary', 'upah', 'thr', 'bonus'],
  freelance: ['freelance', 'project', 'proyek', 'fee', 'honor', 'komisi'],
  investasi: ['investasi', 'saham', 'reksadana', 'crypto', 'dividen', 'bunga', 'profit', 'emas'],
  tabungan: ['tabungan', 'nabung', 'menabung', 'simpanan'],
};

/**
 * Deteksi kategori dari sebuah teks berdasarkan kata kunci.
 * Mengembalikan {category, matchedWord} atau {category: 'lainnya', matchedWord: null}
 */
function detectCategory(text) {
  const lower = text.toLowerCase();
  // Cek exact category name dulu (prioritas tertinggi)
  for (const cat of CATEGORIES) {
    const re = new RegExp(`\\b${cat}\\b`, 'i');
    if (re.test(lower)) return { category: cat, matchedWord: cat };
  }
  // Lalu cek keyword map
  for (const [cat, keywords] of Object.entries(KEYWORD_MAP)) {
    for (const kw of keywords) {
      const re = new RegExp(`\\b${kw}\\b`, 'i');
      if (re.test(lower)) return { category: cat, matchedWord: kw };
    }
  }
  return { category: 'lainnya', matchedWord: null };
}

/**
 * Smart parser yang bisa membaca berbagai format input
 * Format yang didukung:
 * - "50k makanan" (standar)
 * - "saya makan 50k" (natural language)
 * - "50k untuk makan" (natural language dengan preposisi)
 * - "makan 50k" (kategori + jumlah)
 * - "50k makanan nasi goreng" (jumlah + kategori + deskripsi)
 */
function parseTransactionSmart(text) {
  const originalText = text;
  text = text.trim().toLowerCase();

  // Cari semua jumlah yang mungkin (50k, 2jt, 100rb, atau angka biasa)
  const amountPatterns = [
    /\+?(\d+\.?\d*)\s*(jt|juta|m)/gi,      // 2jt, 2juta, 2m
    /(\d+\.?\d*)\s*rb/gi,                   // 100rb
    /(\d+\.?\d*)\s*k/gi,                    // 50k
    /(\d+[\.,]\d+)/g,                       // 1.000.000 atau 1,000,000
    /(\d+)/g                                // 50000
  ];

  let foundAmount = 0;
  let amountMatch = null;

  // Cari jumlah dari paling spesifik ke umum
  for (const pattern of amountPatterns) {
    amountMatch = text.match(pattern);
    if (amountMatch) {
      break;
    }
  }

  if (!amountMatch) {
    return { error: '❌ Tidak menemukan jumlah!\n\nContoh format:\n• 50k makanan\n• saya makan 50k\n• 50k untuk makan nasi goreng' };
  }

  // Parse jumlah
  let amountStr = amountMatch[0].toLowerCase();
  let type = 'pengeluaran';

  if (amountStr.startsWith('+')) {
    type = 'pemasukan';
    amountStr = amountStr.slice(1);
  }

  if (amountStr.includes('jt') || amountStr.includes('juta') || amountStr.includes('m')) {
    const num = parseFloat(amountStr.match(/\d+\.?\d*/)[0]);
    foundAmount = Math.round(num * 1000000);
  } else if (amountStr.includes('rb')) {
    const num = parseFloat(amountStr.match(/\d+\.?\d*/)[0]);
    foundAmount = Math.round(num * 1000);
  } else if (amountStr.includes('k')) {
    const num = parseFloat(amountStr.match(/\d+\.?\d*/)[0]);
    foundAmount = Math.round(num * 1000);
  } else {
    const numStr = amountStr.replace(/[.,]/g, '');
    foundAmount = parseInt(numStr, 10);
  }

  if (isNaN(foundAmount) || foundAmount <= 0) {
    return { error: '❌ Jumlah tidak valid!' };
  }

  // Deteksi kategori dari text menggunakan kamus kata kunci
  const { category: detectedCategory } = detectCategory(text);

  // Auto-detect type dari kategori
  if (INCOME_CATEGORIES.includes(detectedCategory) || detectedCategory === 'tabungan') {
    if (detectedCategory !== 'tabungan') type = 'pemasukan';
  }

  // Ekstrak deskripsi/catatan: buang jumlah & kata sambung, sisakan teks bermakna
  const stopWords = ['untuk', 'buat', 'bayar', 'beli', 'saya', 'aku', 'gue', 'gw', 'ke', 'di', 'dari', 'dengan', 'dan', 'yang', 'sudah', 'habis', 'tadi', 'barusan'];
  let note = originalText
    .replace(new RegExp(amountMatch[0].replace(/[+]/g, '\\+'), 'i'), ' ')  // buang jumlah
    .replace(/[^\w\s\-]/g, ' ')                                            // buang simbol
    .split(/\s+/)
    .filter(w => w && !stopWords.includes(w.toLowerCase()))                // buang stop words
    .join(' ')
    .trim();

  // Jika note kosong, pakai nama kategori sebagai catatan
  if (!note) note = detectedCategory;
  note = note.substring(0, 100);

  return {
    data: {
      timestamp: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      date: dayjs().format('YYYY-MM-DD'),
      month: dayjs().format('YYYY-MM'),
      type,
      amount: foundAmount,
      category: detectedCategory,
      note,
      formattedAmount: formatCurrency(foundAmount)
    }
  };
}

/**
 * Parse input text dari user menjadi objek transaksi
 * Format: <jumlah> <kategori> <catatan>
 * Contoh: "50000 makanan nasi goreng spesial"
 *         "+2000000 gaji gaji bulan juni"
 *         "-150000 belanja beli baju"
 */
function parseTransaction(text) {
  // Gunakan smart parser yang fleksibel (bisa baca natural language)
  // Contoh: "saya makan 50k", "50k billiard", "bensin 100rb", dll
  return parseTransactionSmart(text);
}

// Fungsi parser lama (legacy) - disimpan untuk referensi, tidak dipakai lagi
function parseTransactionLegacy(text) {
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
