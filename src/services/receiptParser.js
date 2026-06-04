// src/services/receiptParser.js
// Advanced receipt parsing dari OCR text
// Ekstrak: toko, alamat, tanggal, items, total, dll

/**
 * Parse detailed receipt information dari OCR text
 * Returns: {store, address, date, time, items[], subtotal, total, payment_method, cashier}
 */
function parseReceiptDetails(ocrText) {
  const lines = ocrText.split('\n').map(l => l.trim()).filter(l => l);

  const receipt = {
    store_name: 'Belanja',
    address: '',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().split(' ')[0],
    items: [],
    subtotal: 0,
    total: 0,
    payment_method: 'Cash',
    cashier: 'Unknown',
    original_text: ocrText
  };

  // Ekstrak nama toko (biasanya di awal, uppercase atau bold)
  const storeMatch = lines[0];
  if (storeMatch && storeMatch.length > 3 && storeMatch.length < 50) {
    receipt.store_name = storeMatch;
  }

  // Ekstrak tanggal (format: YYYY-MM-DD atau DD/MM/YYYY atau 2023-08-02)
  const dateRegex = /(\d{4}[-\/]\d{2}[-\/]\d{2}|\d{2}[-\/]\d{2}[-\/]\d{4}|\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4})/i;
  const dateMatch = ocrText.match(dateRegex);
  if (dateMatch) receipt.date = dateMatch[1];

  // Ekstrak waktu (HH:MM:SS atau HH:MM)
  const timeRegex = /(\d{2}:\d{2}(?::\d{2})?)/;
  const timeMatch = ocrText.match(timeRegex);
  if (timeMatch) receipt.time = timeMatch[1];

  // Ekstrak items (pattern: "deskripsi ... harga" atau "qty x harga")
  const itemPattern = /(.+?)\s{2,}(\d+\.?\d*(?:[,\.]\d{3})*)\s*$/gm;
  let match;
  while ((match = itemPattern.exec(ocrText)) !== null) {
    const description = match[1].trim();
    const priceStr = match[2].replace(/[.,]/g, '');
    const price = parseInt(priceStr);

    if (price > 0 && description.length > 2 && description.length < 100) {
      receipt.items.push({
        description,
        price,
        formatted_price: formatCurrency(price)
      });
      receipt.total += price;
    }
  }

  // Jika item kosong, cari angka terbesar sebagai total
  if (receipt.items.length === 0) {
    const numberPattern = /(\d+[\.,]\d+)/g;
    const numbers = [];
    let numMatch;
    while ((numMatch = numberPattern.exec(ocrText)) !== null) {
      const num = parseInt(numMatch[1].replace(/[.,]/g, ''));
      if (num > 1000) numbers.push(num);
    }
    if (numbers.length > 0) {
      receipt.total = Math.max(...numbers);
      receipt.items.push({
        description: 'Belanja',
        price: receipt.total,
        formatted_price: formatCurrency(receipt.total)
      });
    }
  }

  receipt.subtotal = receipt.total;

  // Ekstrak payment method
  if (ocrText.toLowerCase().includes('debit') || ocrText.toLowerCase().includes('kartu')) {
    receipt.payment_method = 'Debit';
  } else if (ocrText.toLowerCase().includes('transfer') || ocrText.toLowerCase().includes('bca')) {
    receipt.payment_method = 'Transfer';
  }

  // Ekstrak alamat
  const addressPatterns = [
    /(?:Jl\.|Jalan|Jln)\s+([^,\n]+)/,
    /(?:Kota|Kab\.?|Bandung|Jakarta|Surabaya)\s+([^,\n]+)/,
  ];
  for (const pattern of addressPatterns) {
    const addrMatch = ocrText.match(pattern);
    if (addrMatch) {
      receipt.address = addrMatch[1].substring(0, 80);
      break;
    }
  }

  return receipt;
}

/**
 * Format currency ke Rupiah
 */
function formatCurrency(amount) {
  return 'Rp ' + Number(amount).toLocaleString('id-ID');
}

module.exports = { parseReceiptDetails, formatCurrency };
