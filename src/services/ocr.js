// src/services/ocr.js
// OCR Service untuk membaca struk/gambar
// Menggunakan Tesseract.js dari browser/Node.js

const Tesseract = require('tesseract.js');

/**
 * Extract text dari gambar menggunakan Tesseract OCR
 * @param {string} imagePath - Path ke file gambar
 * @returns {Promise<string>} - Text hasil OCR
 */
async function extractTextFromImage(imagePath) {
  try {
    console.log('🔍 Memproses OCR untuk:', imagePath);
    const result = await Tesseract.recognize(imagePath, 'eng');
    return result.data.text;
  } catch (err) {
    console.error('❌ Error OCR:', err.message);
    throw new Error(`Gagal membaca gambar: ${err.message}`);
  }
}

/**
 * Parse struk dari teks OCR
 * Coba cari pattern: "Rp X.XXX" atau "Jumlah: X"
 * @param {string} text - Teks hasil OCR
 * @returns {Object} - {amount, note, confidence}
 */
function parseReceiptText(text) {
  // Hapus whitespace berlebih
  const cleaned = text.replace(/\n+/g, ' ').trim();

  // Pattern 1: Cari "Rp XXXX" atau "Rp X.XXX"
  const rpPattern = /Rp\s*[\.\,]?(\d+[\.\,]\d+|\d+)/gi;
  const matches = cleaned.match(rpPattern);

  let amount = 0;
  if (matches && matches.length > 0) {
    // Ambil jumlah terbesar (biasanya total)
    const amounts = matches.map(m => {
      const num = m.replace(/[Rp\s\.\,]/g, '');
      return parseInt(num);
    });
    amount = Math.max(...amounts);
  }

  // Jika tidak ketemu, coba pattern angka biasa
  if (!amount) {
    const numberPattern = /(\d+[\.\,]\d+|\d{4,})/;
    const match = cleaned.match(numberPattern);
    if (match) {
      amount = parseInt(match[1].replace(/[\.\,]/g, ''));
    }
  }

  // Coba ekstrak kategori
  const categories = ['makanan', 'minuman', 'belanja', 'transport', 'tagihan', 'hiburan', 'kesehatan'];
  let category = 'lainnya';
  for (const cat of categories) {
    if (cleaned.toLowerCase().includes(cat)) {
      category = cat;
      break;
    }
  }

  // Ambil sebagian teks sebagai note
  const note = cleaned.substring(0, 100).trim();

  return {
    amount,
    category,
    note,
    confidence: amount > 0 ? 'high' : 'low',
    fullText: cleaned
  };
}

module.exports = {
  extractTextFromImage,
  parseReceiptText
};

