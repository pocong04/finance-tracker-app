// src/services/googleSheets.js
// Service for interacting with Google Sheets to store, retrieve, and format finance data.
// ------------------------------------------------------------

require('dotenv').config();
const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

const TRANSACTIONS_SHEET = 'Transactions';
const RECEIPT_ITEMS_SHEET = 'ReceiptItems';
const DASHBOARD_SHEET = 'Dashboard';

const TRANSACTION_HEADERS = [
  'timestamp',
  'date',
  'month',
  'type',
  'amount',
  'category',
  'note',
  'formatted_amount',
];

const RECEIPT_ITEM_HEADERS = [
  'receipt_id',
  'transaction_timestamp',
  'date',
  'month',
  'store_name',
  'payment_method',
  'item_index',
  'description',
  'quantity',
  'unit_price',
  'total_price',
  'category',
  'transaction_type',
  'raw_note',
  'created_at',
];

const COLORS = {
  primary: { red: 0.12, green: 0.31, blue: 0.47 },
  secondary: { red: 0.27, green: 0.45, blue: 0.77 },
  white: { red: 1, green: 1, blue: 1 },
  lightGreen: { red: 0.89, green: 0.96, blue: 0.86 },
  lightRed: { red: 0.99, green: 0.89, blue: 0.84 },
  lightBlue: { red: 0.85, green: 0.93, blue: 0.97 },
  gold: { red: 1, green: 0.75, blue: 0 },
  gray: { red: 0.95, green: 0.95, blue: 0.95 },
};

function buildAuth() {
  const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

  if (process.env.GOOGLE_CREDENTIALS_JSON) {
    try {
      const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
      return new google.auth.GoogleAuth({ credentials, scopes: SCOPES });
    } catch (err) {
      console.error('❌ GOOGLE_CREDENTIALS_JSON tidak valid:', err.message);
    }
  }

  const CREDENTIALS_PATH = path.resolve(__dirname, '../../credentials.json');
  if (fs.existsSync(CREDENTIALS_PATH)) {
    return new google.auth.GoogleAuth({ keyFile: CREDENTIALS_PATH, scopes: SCOPES });
  }

  console.error('❌ Tidak ada credentials! Set GOOGLE_CREDENTIALS_JSON atau letakkan credentials.json');
  return new google.auth.GoogleAuth({ keyFile: CREDENTIALS_PATH, scopes: SCOPES });
}

const auth = buildAuth();

async function getSheets() {
  const client = await auth.getClient();
  return google.sheets({ version: 'v4', auth: client });
}

function columnLetter(index) {
  let letter = '';
  let num = index;
  while (num > 0) {
    const mod = (num - 1) % 26;
    letter = String.fromCharCode(65 + mod) + letter;
    num = Math.floor((num - mod) / 26);
  }
  return letter;
}

async function getSpreadsheetMetadata(sheets, spreadsheetId) {
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
  return spreadsheet.data;
}

function getSheetByTitle(metadata, title) {
  return (metadata.sheets || []).find(s => s.properties.title === title);
}

async function ensureSheetExists(title, headers = []) {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  if (!spreadsheetId) throw new Error('Missing GOOGLE_SHEET_ID in .env');

  const sheets = await getSheets();
  let metadata = await getSpreadsheetMetadata(sheets, spreadsheetId);
  let sheet = getSheetByTitle(metadata, title);

  if (!sheet) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: [{ addSheet: { properties: { title } } }] },
    });
    metadata = await getSpreadsheetMetadata(sheets, spreadsheetId);
    sheet = getSheetByTitle(metadata, title);
  }

  if (headers.length) {
    const endColumn = columnLetter(headers.length);
    const resp = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${title}!A1:${endColumn}1`,
    }).catch(() => ({ data: { values: [] } }));

    const firstRow = resp.data.values && resp.data.values[0] ? resp.data.values[0] : [];
    if (!firstRow.length) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${title}!A1:${endColumn}1`,
        valueInputOption: 'RAW',
        requestBody: { values: [headers] },
      });
    }
  }

  return sheet.properties;
}

function headerStyleRequest(sheetId, endColumnIndex) {
  return {
    repeatCell: {
      range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex },
      cell: {
        userEnteredFormat: {
          backgroundColor: COLORS.primary,
          horizontalAlignment: 'CENTER',
          verticalAlignment: 'MIDDLE',
          textFormat: { bold: true, foregroundColor: COLORS.white },
          wrapStrategy: 'WRAP',
        },
      },
      fields: 'userEnteredFormat(backgroundColor,horizontalAlignment,verticalAlignment,textFormat,wrapStrategy)',
    },
  };
}

function freezeAndFilterRequests(sheetId, endColumnIndex) {
  return [
    {
      updateSheetProperties: {
        properties: { sheetId, gridProperties: { frozenRowCount: 1 } },
        fields: 'gridProperties.frozenRowCount',
      },
    },
    { clearBasicFilter: { sheetId } },
    {
      setBasicFilter: {
        filter: { range: { sheetId, startRowIndex: 0, startColumnIndex: 0, endColumnIndex } },
      },
    },
    {
      autoResizeDimensions: {
        dimensions: { sheetId, dimension: 'COLUMNS', startIndex: 0, endIndex: endColumnIndex },
      },
    },
  ];
}

function numberFormatRequest(sheetId, columnIndex, pattern) {
  return {
    repeatCell: {
      range: { sheetId, startRowIndex: 1, startColumnIndex: columnIndex, endColumnIndex: columnIndex + 1 },
      cell: { userEnteredFormat: { numberFormat: { type: 'NUMBER', pattern }, horizontalAlignment: 'RIGHT' } },
      fields: 'userEnteredFormat(numberFormat,horizontalAlignment)',
    },
  };
}

function wrapColumnRequest(sheetId, columnIndex) {
  return {
    repeatCell: {
      range: { sheetId, startRowIndex: 1, startColumnIndex: columnIndex, endColumnIndex: columnIndex + 1 },
      cell: { userEnteredFormat: { wrapStrategy: 'WRAP', verticalAlignment: 'TOP' } },
      fields: 'userEnteredFormat(wrapStrategy,verticalAlignment)',
    },
  };
}

function conditionalTypeRequests(sheetId, endColumnIndex) {
  return [
    {
      addConditionalFormatRule: {
        rule: {
          ranges: [{ sheetId, startRowIndex: 1, startColumnIndex: 0, endColumnIndex }],
          booleanRule: {
            condition: { type: 'CUSTOM_FORMULA', values: [{ userEnteredValue: '=$D2="pemasukan"' }] },
            format: { backgroundColor: COLORS.lightGreen },
          },
        },
        index: 0,
      },
    },
    {
      addConditionalFormatRule: {
        rule: {
          ranges: [{ sheetId, startRowIndex: 1, startColumnIndex: 0, endColumnIndex }],
          booleanRule: {
            condition: { type: 'CUSTOM_FORMULA', values: [{ userEnteredValue: '=$D2="pengeluaran"' }] },
            format: { backgroundColor: COLORS.lightRed },
          },
        },
        index: 0,
      },
    },
  ];
}

function buildTransactionsFormatRequests(sheetId) {
  return [
    ...freezeAndFilterRequests(sheetId, TRANSACTION_HEADERS.length),
    headerStyleRequest(sheetId, TRANSACTION_HEADERS.length),
    numberFormatRequest(sheetId, 4, 'Rp #,##0'),
    wrapColumnRequest(sheetId, 6),
    ...conditionalTypeRequests(sheetId, TRANSACTION_HEADERS.length),
  ];
}

function buildReceiptItemsFormatRequests(sheetId) {
  return [
    ...freezeAndFilterRequests(sheetId, RECEIPT_ITEM_HEADERS.length),
    headerStyleRequest(sheetId, RECEIPT_ITEM_HEADERS.length),
    numberFormatRequest(sheetId, 8, '#,##0'),
    numberFormatRequest(sheetId, 9, 'Rp #,##0'),
    numberFormatRequest(sheetId, 10, 'Rp #,##0'),
    wrapColumnRequest(sheetId, 7),
    wrapColumnRequest(sheetId, 13),
  ];
}

function dashboardFormatRequests(sheetId) {
  return [
    {
      updateSheetProperties: {
        properties: { sheetId, gridProperties: { frozenRowCount: 2 } },
        fields: 'gridProperties.frozenRowCount',
      },
    },
    { unmergeCells: { range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 4 } } },
    { mergeCells: { range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 4 }, mergeType: 'MERGE_ALL' } },
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 4 },
        cell: {
          userEnteredFormat: {
            backgroundColor: COLORS.primary,
            horizontalAlignment: 'CENTER',
            textFormat: { bold: true, fontSize: 18, foregroundColor: COLORS.white },
          },
        },
        fields: 'userEnteredFormat(backgroundColor,horizontalAlignment,textFormat)',
      },
    },
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 3, endRowIndex: 9, startColumnIndex: 0, endColumnIndex: 2 },
        cell: { userEnteredFormat: { backgroundColor: COLORS.lightBlue, textFormat: { bold: true } } },
        fields: 'userEnteredFormat(backgroundColor,textFormat)',
      },
    },
    numberFormatRequest(sheetId, 1, 'Rp #,##0'),
    {
      autoResizeDimensions: {
        dimensions: { sheetId, dimension: 'COLUMNS', startIndex: 0, endIndex: 4 },
      },
    },
  ];
}

async function setupDashboardSheet(sheets, spreadsheetId) {
  await ensureSheetExists(DASHBOARD_SHEET, []);
  const values = [
    ['Finance Tracker Dashboard'],
    [`Update terakhir: ${new Date().toLocaleString('id-ID')}`],
    [],
    ['Metric', 'Nilai'],
    ['Total Pemasukan', `=SUMIF(${TRANSACTIONS_SHEET}!D:D,"pemasukan",${TRANSACTIONS_SHEET}!E:E)`],
    ['Total Pengeluaran', `=SUMIF(${TRANSACTIONS_SHEET}!D:D,"pengeluaran",${TRANSACTIONS_SHEET}!E:E)`],
    ['Saldo Bersih', '=B5-B6'],
    ['Total Transaksi', `=MAX(COUNTA(${TRANSACTIONS_SHEET}!A:A)-1,0)`],
    ['Total Item Struk', `=MAX(COUNTA(${RECEIPT_ITEMS_SHEET}!A:A)-1,0)`],
    [],
    ['Tips', 'Gunakan filter di tab Transactions dan ReceiptItems untuk analisis detail.'],
  ];

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${DASHBOARD_SHEET}!A1:D20`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values },
  });
}

async function setupGoogleSheetsFormatting() {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  if (!spreadsheetId) throw new Error('Missing GOOGLE_SHEET_ID in .env');

  const sheets = await getSheets();
  const txSheet = await ensureSheetExists(TRANSACTIONS_SHEET, TRANSACTION_HEADERS);
  const receiptSheet = await ensureSheetExists(RECEIPT_ITEMS_SHEET, RECEIPT_ITEM_HEADERS);
  await setupDashboardSheet(sheets, spreadsheetId);
  const metadata = await getSpreadsheetMetadata(sheets, spreadsheetId);
  const dashboardSheet = getSheetByTitle(metadata, DASHBOARD_SHEET).properties;

  const requests = [
    ...buildTransactionsFormatRequests(txSheet.sheetId),
    ...buildReceiptItemsFormatRequests(receiptSheet.sheetId),
    ...dashboardFormatRequests(dashboardSheet.sheetId),
  ];

  await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests } });
}

async function appendTransaction(tx) {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  if (!spreadsheetId) throw new Error('Missing GOOGLE_SHEET_ID in .env');

  await ensureSheetExists(TRANSACTIONS_SHEET, TRANSACTION_HEADERS);
  const sheets = await getSheets();
  const values = [
    tx.timestamp,
    tx.date,
    tx.month,
    tx.type,
    tx.amount,
    tx.category,
    tx.note,
    tx.formattedAmount,
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${TRANSACTIONS_SHEET}!A:H`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [values] },
  });
}

async function getTransactions(opts = {}) {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  if (!spreadsheetId) throw new Error('Missing GOOGLE_SHEET_ID in .env');

  await ensureSheetExists(TRANSACTIONS_SHEET, TRANSACTION_HEADERS);
  const sheets = await getSheets();
  const resp = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${TRANSACTIONS_SHEET}!A:H`,
  });

  const rows = resp.data.values || [];
  const dataRows = rows[0] && rows[0][0] && rows[0][0].toLowerCase().includes('timestamp')
    ? rows.slice(1)
    : rows;

  const result = dataRows.map(r => ({
    timestamp: r[0],
    date: r[1],
    month: r[2],
    type: r[3],
    amount: Number(r[4]),
    category: r[5],
    note: r[6],
    formattedAmount: r[7],
  }));

  if (opts.month) return result.filter(t => t.month === opts.month);
  return result;
}

async function appendReceiptItems(receiptItems) {
  if (!Array.isArray(receiptItems) || !receiptItems.length) return;

  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  if (!spreadsheetId) throw new Error('Missing GOOGLE_SHEET_ID in .env');

  await ensureSheetExists(RECEIPT_ITEMS_SHEET, RECEIPT_ITEM_HEADERS);
  const sheets = await getSheets();
  const values = receiptItems.map(item => [
    item.receipt_id,
    item.transaction_timestamp,
    item.date,
    item.month,
    item.store_name,
    item.payment_method,
    item.item_index,
    item.description,
    item.quantity,
    item.unit_price,
    item.total_price,
    item.category,
    item.transaction_type,
    item.raw_note,
    item.created_at,
  ]);

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${RECEIPT_ITEMS_SHEET}!A:O`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values },
  });
}

async function getReceiptItems(opts = {}) {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  if (!spreadsheetId) throw new Error('Missing GOOGLE_SHEET_ID in .env');

  await ensureSheetExists(RECEIPT_ITEMS_SHEET, RECEIPT_ITEM_HEADERS);
  const sheets = await getSheets();
  const resp = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${RECEIPT_ITEMS_SHEET}!A:O`,
  });

  const rows = resp.data.values || [];
  const dataRows = rows[0] && rows[0][0] && rows[0][0].toLowerCase().includes('receipt_id')
    ? rows.slice(1)
    : rows;

  let result = dataRows.map(r => ({
    receipt_id: r[0],
    transaction_timestamp: r[1],
    date: r[2],
    month: r[3],
    store_name: r[4],
    payment_method: r[5],
    item_index: Number(r[6]) || 0,
    description: r[7],
    quantity: Number(r[8]) || 1,
    unit_price: Number(r[9]) || 0,
    total_price: Number(r[10]) || 0,
    category: r[11],
    transaction_type: r[12],
    raw_note: r[13],
    created_at: r[14],
  }));

  if (opts.month) result = result.filter(item => item.month === opts.month);
  if (opts.receiptId) result = result.filter(item => item.receipt_id === opts.receiptId);
  if (opts.transactionTimestamp) result = result.filter(item => item.transaction_timestamp === opts.transactionTimestamp);
  return result;
}

async function clearAllTransactions() {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  if (!spreadsheetId) throw new Error('Missing GOOGLE_SHEET_ID in .env');

  await ensureSheetExists(TRANSACTIONS_SHEET, TRANSACTION_HEADERS);
  const sheets = await getSheets();
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `${TRANSACTIONS_SHEET}!A:H`,
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${TRANSACTIONS_SHEET}!A1:H1`,
    valueInputOption: 'RAW',
    requestBody: { values: [TRANSACTION_HEADERS] },
  });
}

async function clearAllReceiptItems() {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  if (!spreadsheetId) throw new Error('Missing GOOGLE_SHEET_ID in .env');

  await ensureSheetExists(RECEIPT_ITEMS_SHEET, RECEIPT_ITEM_HEADERS);
  const sheets = await getSheets();
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `${RECEIPT_ITEMS_SHEET}!A:O`,
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${RECEIPT_ITEMS_SHEET}!A1:O1`,
    valueInputOption: 'RAW',
    requestBody: { values: [RECEIPT_ITEM_HEADERS] },
  });
}

async function deleteLastTransaction() {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  if (!spreadsheetId) throw new Error('Missing GOOGLE_SHEET_ID in .env');

  await ensureSheetExists(TRANSACTIONS_SHEET, TRANSACTION_HEADERS);
  const sheets = await getSheets();
  const resp = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${TRANSACTIONS_SHEET}!A:H`,
  });
  const rows = resp.data.values ? resp.data.values.length : 0;
  if (rows <= 1) return;

  const metadata = await getSpreadsheetMetadata(sheets, spreadsheetId);
  const sheet = getSheetByTitle(metadata, TRANSACTIONS_SHEET);
  const numericSheetId = sheet ? sheet.properties.sheetId : 0;
  const rowIndex = rows - 1;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [{
        deleteDimension: {
          range: {
            sheetId: numericSheetId,
            dimension: 'ROWS',
            startIndex: rowIndex,
            endIndex: rowIndex + 1,
          },
        },
      }],
    },
  });
}

async function deleteReceiptItemsByTransactionTimestamp(timestamp) {
  if (!timestamp) return;

  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  if (!spreadsheetId) throw new Error('Missing GOOGLE_SHEET_ID in .env');

  const items = await getReceiptItems({});
  const remaining = items.filter(item => item.transaction_timestamp !== timestamp);
  const sheets = await getSheets();

  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `${RECEIPT_ITEMS_SHEET}!A:O`,
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${RECEIPT_ITEMS_SHEET}!A1:O1`,
    valueInputOption: 'RAW',
    requestBody: { values: [RECEIPT_ITEM_HEADERS] },
  });

  if (remaining.length) await appendReceiptItems(remaining);
}

module.exports = {
  appendTransaction,
  getTransactions,
  clearAllTransactions,
  deleteLastTransaction,
  appendReceiptItems,
  getReceiptItems,
  clearAllReceiptItems,
  deleteReceiptItemsByTransactionTimestamp,
  setupGoogleSheetsFormatting,
};
