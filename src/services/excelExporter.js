// src/services/excelExporter.js (Part 1: Setup & Helper Functions)
// Export transaksi ke Excel dengan format professional & advanced

const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

// Folder untuk export Excel
const EXPORT_DIR = path.resolve(__dirname, '../../exports');
if (!fs.existsSync(EXPORT_DIR)) fs.mkdirSync(EXPORT_DIR, { recursive: true });

/**
 * Generate Excel file dengan semua transaksi dan formatting advanced
 * @param {Array} transactions - Array transaksi dari Google Sheets
 * @param {String} month - Bulan untuk filename (YYYY-MM)
 * @returns {Promise<String>} - Path ke file Excel yang dibuat
 */
async function exportToExcel(transactions, month = null) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Transaksi Keuangan');

  // Setup columns dengan lebar custom
  worksheet.columns = [
    { header: 'No', key: 'no', width: 5, alignment: { horizontal: 'center' } },
    { header: 'Tanggal', key: 'date', width: 12, alignment: { horizontal: 'center' } },
    { header: 'Jam', key: 'time', width: 10, alignment: { horizontal: 'center' } },
    { header: 'Tipe', key: 'type', width: 12, alignment: { horizontal: 'center' } },
    { header: 'Kategori', key: 'category', width: 15 },
    { header: 'Deskripsi', key: 'description', width: 35 },
    { header: 'Jumlah', key: 'amount', width: 15, alignment: { horizontal: 'right' } },
    { header: 'Keterangan', key: 'note', width: 25 }
  ];

  // Style header row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
  headerRow.alignment = { horizontal: 'center', vertical: 'center', wrapText: true };
  headerRow.height = 25;

  // Populate data
  let rowNum = 2;
  let totalIncome = 0, totalExpense = 0;
  const categoryTotals = {};

  transactions.forEach((tx, idx) => {
    const row = worksheet.getRow(rowNum);

    // Parse timestamp & date
    const [dateStr, timeStr] = (tx.timestamp || '').split(' ');
    const description = tx.note || '-';
    const amount = Number(tx.amount) || 0;

    row.values = {
      no: idx + 1,
      date: dateStr || tx.date || '',
      time: timeStr || '',
      type: tx.type === 'pemasukan' ? '📥 Masuk' : '📤 Keluar',
      category: tx.category || 'Lainnya',
      description: description,
      amount: amount,
      note: ''
    };

    // Color rows berdasarkan tipe
    if (tx.type === 'pemasukan') {
      row.getCell('type').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2EFDA' } };
      row.getCell('amount').font = { color: { argb: 'FF00B050' }, bold: true };
      totalIncome += amount;
    } else {
      row.getCell('type').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCE4D6' } };
      row.getCell('amount').font = { color: { argb: 'FFC00000' }, bold: true };
      totalExpense += amount;
    }

    // Format number sebagai currency
    row.getCell('amount').numFmt = '#,##0';

    // Border untuk semua cell
    ['no', 'date', 'time', 'type', 'category', 'description', 'amount', 'note'].forEach(key => {
      row.getCell(key).border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // Track category totals
    const cat = tx.category || 'Lainnya';
    categoryTotals[cat] = (categoryTotals[cat] || 0) + (tx.type === 'pemasukan' ? amount : -amount);

    rowNum++;
  });

  // Add summary rows
  const summaryRow1 = rowNum + 1;
  worksheet.getRow(summaryRow1).getCell('category').value = 'TOTAL PEMASUKAN';
  worksheet.getRow(summaryRow1).getCell('category').font = { bold: true };
  worksheet.getRow(summaryRow1).getCell('amount').value = totalIncome;
  worksheet.getRow(summaryRow1).getCell('amount').font = { bold: true, color: { argb: 'FF00B050' } };
  worksheet.getRow(summaryRow1).getCell('amount').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEB9C' } };

  const summaryRow2 = summaryRow1 + 1;
  worksheet.getRow(summaryRow2).getCell('category').value = 'TOTAL PENGELUARAN';
  worksheet.getRow(summaryRow2).getCell('category').font = { bold: true };
  worksheet.getRow(summaryRow2).getCell('amount').value = totalExpense;
  worksheet.getRow(summaryRow2).getCell('amount').font = { bold: true, color: { argb: 'FFC00000' } };
  worksheet.getRow(summaryRow2).getCell('amount').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEB9C' } };

  const summaryRow3 = summaryRow2 + 1;
  worksheet.getRow(summaryRow3).getCell('category').value = 'SALDO BERSIH';
  worksheet.getRow(summaryRow3).getCell('category').font = { bold: true, size: 12 };
  worksheet.getRow(summaryRow3).getCell('amount').value = totalIncome - totalExpense;
  worksheet.getRow(summaryRow3).getCell('amount').font = { bold: true, size: 12, color: { argb: 'FF0070C0' } };
  worksheet.getRow(summaryRow3).getCell('amount').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC000' } };

  // Format currency untuk summary
  [summaryRow1, summaryRow2, summaryRow3].forEach(r => {
    worksheet.getRow(r).getCell('amount').numFmt = '#,##0';
  });

  // Freeze header row
  worksheet.views = [{ state: 'frozen', ySplit: 1 }];

  // Save file
  const filename = `Keuangan_${month || new Date().toISOString().split('T')[0]}.xlsx`;
  const filepath = path.join(EXPORT_DIR, filename);

  await workbook.xlsx.writeFile(filepath);
  return filepath;
}

module.exports = { exportToExcel };
