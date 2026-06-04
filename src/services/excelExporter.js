// src/services/excelExporter.js
// Export transaksi ke Excel dengan format profesional dan detail item struk

const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

const EXPORT_DIR = path.resolve(__dirname, '../../exports');
if (!fs.existsSync(EXPORT_DIR)) fs.mkdirSync(EXPORT_DIR, { recursive: true });

const COLORS = {
  primary: 'FF1F4E78',
  secondary: 'FF4472C4',
  lightBlue: 'FFD9EAF7',
  green: 'FF00B050',
  lightGreen: 'FFE2EFDA',
  red: 'FFC00000',
  lightRed: 'FFFCE4D6',
  gold: 'FFFFC000',
  gray: 'FFF2F2F2',
  white: 'FFFFFFFF',
};

function rupiah(numFmt = true) {
  return numFmt ? 'Rp #,##0' : '#,##0';
}

function applyTitle(worksheet, title, subtitle, endColumn = 'H') {
  worksheet.mergeCells(`A1:${endColumn}1`);
  worksheet.getCell('A1').value = title;
  worksheet.getCell('A1').font = { bold: true, size: 18, color: { argb: COLORS.white } };
  worksheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.primary } };
  worksheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'center' };
  worksheet.getRow(1).height = 30;

  worksheet.mergeCells(`A2:${endColumn}2`);
  worksheet.getCell('A2').value = subtitle;
  worksheet.getCell('A2').font = { italic: true, color: { argb: 'FF666666' } };
  worksheet.getCell('A2').alignment = { horizontal: 'center' };
}

function styleHeader(row) {
  row.font = { bold: true, color: { argb: COLORS.white } };
  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.secondary } };
  row.alignment = { horizontal: 'center', vertical: 'center', wrapText: true };
  row.height = 24;
}

function addBorders(row, columnKeys) {
  columnKeys.forEach(key => {
    row.getCell(key).border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
  });
}

function buildCategoryStats(transactions) {
  const stats = {};
  transactions.forEach(tx => {
    const category = tx.category || 'Lainnya';
    const amount = Number(tx.amount) || 0;
    if (!stats[category]) stats[category] = { category, income: 0, expense: 0, count: 0 };
    if (tx.type === 'pemasukan') stats[category].income += amount;
    else stats[category].expense += amount;
    stats[category].count += 1;
  });
  return Object.values(stats).map(s => ({ ...s, net: s.income - s.expense }));
}

function addSummarySheet(workbook, transactions, month, receiptItems) {
  const worksheet = workbook.addWorksheet('Ringkasan');
  applyTitle(worksheet, `Laporan Keuangan - ${month || 'Semua Data'}`, `Dibuat otomatis: ${new Date().toLocaleString('id-ID')}`, 'H');

  const totalIncome = transactions.filter(t => t.type === 'pemasukan').reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const totalExpense = transactions.filter(t => t.type !== 'pemasukan').reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const balance = totalIncome - totalExpense;

  worksheet.columns = [
    { key: 'label', width: 24 },
    { key: 'value', width: 18 },
    { key: 'space1', width: 4 },
    { key: 'category', width: 20 },
    { key: 'income', width: 18 },
    { key: 'expense', width: 18 },
    { key: 'net', width: 18 },
    { key: 'count', width: 12 },
  ];

  const cards = [
    ['Total Pemasukan', totalIncome, COLORS.lightGreen, COLORS.green],
    ['Total Pengeluaran', totalExpense, COLORS.lightRed, COLORS.red],
    ['Saldo Bersih', balance, COLORS.lightBlue, COLORS.primary],
    ['Total Transaksi', transactions.length, COLORS.gray, COLORS.primary],
    ['Total Item Struk', receiptItems.length, COLORS.gray, COLORS.primary],
  ];

  let rowNum = 4;
  cards.forEach(([label, value, fill, font]) => {
    const row = worksheet.getRow(rowNum++);
    row.getCell('label').value = label;
    row.getCell('value').value = value;
    row.getCell('label').font = { bold: true };
    row.getCell('value').font = { bold: true, color: { argb: font } };
    row.getCell('label').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } };
    row.getCell('value').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } };
    if (['Total Pemasukan', 'Total Pengeluaran', 'Saldo Bersih'].includes(label)) row.getCell('value').numFmt = rupiah();
    addBorders(row, ['label', 'value']);
  });

  worksheet.getCell('D4').value = 'Ringkasan Kategori';
  worksheet.getCell('D4').font = { bold: true, size: 14, color: { argb: COLORS.primary } };
  const header = worksheet.getRow(5);
  header.values = { category: 'Kategori', income: 'Pemasukan', expense: 'Pengeluaran', net: 'Net', count: 'Transaksi' };
  styleHeader(header);
  addBorders(header, ['category', 'income', 'expense', 'net', 'count']);

  buildCategoryStats(transactions).forEach((stat, index) => {
    const row = worksheet.getRow(6 + index);
    row.values = {
      category: stat.category,
      income: stat.income,
      expense: stat.expense,
      net: stat.net,
      count: stat.count,
    };
    ['income', 'expense', 'net'].forEach(key => row.getCell(key).numFmt = rupiah());
    addBorders(row, ['category', 'income', 'expense', 'net', 'count']);
  });

  worksheet.views = [{ state: 'frozen', ySplit: 5 }];
  return worksheet;
}

function addTransactionsSheet(workbook, transactions) {
  const worksheet = workbook.addWorksheet('Transaksi');
  worksheet.columns = [
    { header: 'No', key: 'no', width: 6 },
    { header: 'Tanggal', key: 'date', width: 14 },
    { header: 'Jam', key: 'time', width: 10 },
    { header: 'Tipe', key: 'type', width: 14 },
    { header: 'Kategori', key: 'category', width: 16 },
    { header: 'Deskripsi', key: 'description', width: 48 },
    { header: 'Jumlah', key: 'amount', width: 18 },
  ];

  styleHeader(worksheet.getRow(1));
  worksheet.autoFilter = 'A1:G1';

  transactions.forEach((tx, idx) => {
    const [dateStr, timeStr] = (tx.timestamp || '').split(' ');
    const row = worksheet.addRow({
      no: idx + 1,
      date: dateStr || tx.date || '',
      time: timeStr || '',
      type: tx.type === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran',
      category: tx.category || 'Lainnya',
      description: tx.note || '-',
      amount: Number(tx.amount) || 0,
    });

    row.getCell('amount').numFmt = rupiah();
    row.getCell('amount').font = { bold: true, color: { argb: tx.type === 'pemasukan' ? COLORS.green : COLORS.red } };
    row.getCell('type').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: tx.type === 'pemasukan' ? COLORS.lightGreen : COLORS.lightRed } };
    addBorders(row, ['no', 'date', 'time', 'type', 'category', 'description', 'amount']);
  });

  worksheet.views = [{ state: 'frozen', ySplit: 1 }];
  return worksheet;
}

function addReceiptItemsSheet(workbook, receiptItems) {
  if (!receiptItems.length) return null;

  const worksheet = workbook.addWorksheet('Detail Struk');
  worksheet.columns = [
    { header: 'No', key: 'no', width: 6 },
    { header: 'Receipt ID', key: 'receipt_id', width: 24 },
    { header: 'Tanggal', key: 'date', width: 14 },
    { header: 'Toko', key: 'store_name', width: 24 },
    { header: 'Metode Bayar', key: 'payment_method', width: 16 },
    { header: 'Item', key: 'description', width: 36 },
    { header: 'Qty', key: 'quantity', width: 8 },
    { header: 'Harga Satuan', key: 'unit_price', width: 16 },
    { header: 'Total Item', key: 'total_price', width: 16 },
    { header: 'Kategori', key: 'category', width: 16 },
    { header: 'Parent Timestamp', key: 'transaction_timestamp', width: 22 },
  ];

  styleHeader(worksheet.getRow(1));
  worksheet.autoFilter = 'A1:K1';

  receiptItems.forEach((item, idx) => {
    const row = worksheet.addRow({
      no: idx + 1,
      receipt_id: item.receipt_id,
      date: item.date,
      store_name: item.store_name,
      payment_method: item.payment_method,
      description: item.description,
      quantity: Number(item.quantity) || 1,
      unit_price: Number(item.unit_price) || 0,
      total_price: Number(item.total_price) || 0,
      category: item.category,
      transaction_timestamp: item.transaction_timestamp,
    });

    row.getCell('unit_price').numFmt = rupiah();
    row.getCell('total_price').numFmt = rupiah();
    addBorders(row, ['no', 'receipt_id', 'date', 'store_name', 'payment_method', 'description', 'quantity', 'unit_price', 'total_price', 'category', 'transaction_timestamp']);
  });

  worksheet.views = [{ state: 'frozen', ySplit: 1 }];
  return worksheet;
}

function addCategorySheet(workbook, transactions) {
  const worksheet = workbook.addWorksheet('Kategori');
  worksheet.columns = [
    { header: 'Kategori', key: 'category', width: 22 },
    { header: 'Total Pemasukan', key: 'income', width: 18 },
    { header: 'Total Pengeluaran', key: 'expense', width: 18 },
    { header: 'Net', key: 'net', width: 18 },
    { header: 'Jumlah Transaksi', key: 'count', width: 16 },
  ];

  styleHeader(worksheet.getRow(1));
  worksheet.autoFilter = 'A1:E1';

  buildCategoryStats(transactions).forEach(stat => {
    const row = worksheet.addRow(stat);
    ['income', 'expense', 'net'].forEach(key => row.getCell(key).numFmt = rupiah());
    addBorders(row, ['category', 'income', 'expense', 'net', 'count']);
  });

  worksheet.views = [{ state: 'frozen', ySplit: 1 }];
  return worksheet;
}

async function exportToExcel(transactions, month = null, receiptItems = []) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Catatan Keuangan Pocong';
  workbook.created = new Date();

  addSummarySheet(workbook, transactions, month, receiptItems);
  addTransactionsSheet(workbook, transactions);
  addReceiptItemsSheet(workbook, receiptItems);
  addCategorySheet(workbook, transactions);

  const filename = `Keuangan_${month || new Date().toISOString().split('T')[0]}.xlsx`;
  const filepath = path.join(EXPORT_DIR, filename);

  await workbook.xlsx.writeFile(filepath);
  return filepath;
}

module.exports = { exportToExcel };
