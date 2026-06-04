# 💰 Catatan Keuangan Pocong

Aplikasi catatan keuangan yang terintegrasi dengan **Telegram**, **WhatsApp**, dan **Google Spreadsheet**. Catat pengeluaran dan pemasukan langsung dari chat, dan lihat ringkasan keuangan di dashboard web.

## ✨ Fitur Utama

- 📱 **Bot Telegram** - Catat transaksi via chat Telegram
- 📱 **Bot WhatsApp** - Catat transaksi via WhatsApp
- 📊 **Dashboard Web** - Visualisasi keuangan dengan grafik & ringkasan
- 📈 **Google Spreadsheet** - Semua data tersimpan otomatis di Google Sheets
- 🎯 **Budget Tracking** - Monitor sisa budget bulanan
- 💾 **Kategori Fleksibel** - Pengeluaran & pemasukan terkategorisasi

## 🚀 Instalasi & Setup

### 1. Clone/Download Project

```bash
cd finance-tracker-app
npm install
```

### 2. Setup Google Sheets API

#### a. Buat Google Cloud Project

1. Buka [Google Cloud Console](https://console.cloud.google.com/)
2. Buat project baru dengan nama "Finance Tracker"
3. Enable **Google Sheets API**:
   - Di menu, cari "Google Sheets API"
   - Klik "Enable"

#### b. Buat Service Account

1. Buka **IAM & Admin** → **Service Accounts**
2. Klik **Create Service Account**
   - Nama: `finance-tracker`
   - Klik "Create and Continue"
3. Di bagian "Grant roles", pilih **Editor**
4. Klik "Create Key" → pilih **JSON**
5. File JSON akan otomatis download (simpan sebagai `credentials.json` di root folder)

#### c. Buat Google Spreadsheet

1. Buka [Google Sheets](https://sheets.google.com)
2. Buat spreadsheet baru dengan nama "Finance Tracker Pocong"
3. Buat sheet/tab dengan nama **"Transactions"** (jangan "Transaksi")
4. Tambahkan header di baris pertama:
   ```
   timestamp | date | month | type | amount | category | note | formattedAmount
   ```
5. Copy URL spreadsheet, ambil ID dari format:
   ```
   https://docs.google.com/spreadsheets/d/[ID_DISINI]/edit
   ```
6. Share spreadsheet dengan email service account (lihat di `credentials.json`)

### 3. Setup Environment Variables

Copy `.env.example` menjadi `.env` dan isi data:

```bash
cp .env.example .env
```

Edit `.env`:

```env
PORT=3000

# Google Sheets
GOOGLE_SHEET_ID=masukkan_id_spreadsheet_disini
GOOGLE_CREDENTIALS=./credentials.json

# Telegram (opsional)
TELEGRAM_TOKEN=masukkan_token_dari_botfather_disini
TELEGRAM_ALLOWED_IDS=

# WhatsApp (opsional)
WHATSAPP_ENABLED=false
WHATSAPP_ALLOWED_NUMBERS=

# Budget
MONTHLY_BUDGET=5000000
```

### 4. Setup Telegram Bot (Opsional)

1. Buka [@BotFather](https://t.me/botfather) di Telegram
2. Ketik `/newbot`
3. Ikuti instruksi untuk membuat bot baru
4. Copy token bot yang didapat ke `TELEGRAM_TOKEN` di `.env`

Untuk batasi akses hanya ke ID tertentu:
```bash
# Dapatkan chat ID Anda dari bot
# Lalu masukkan ke TELEGRAM_ALLOWED_IDS
TELEGRAM_ALLOWED_IDS=123456789,987654321
```

### 5. Setup WhatsApp Bot (Opsional)

1. Ubah di `.env`:
   ```env
   WHATSAPP_ENABLED=true
   ```
2. Saat app dijalankan, QR code akan muncul di terminal
3. Scan dengan WhatsApp Anda

## 📖 Penggunaan

### Jalankan Aplikasi

```bash
npm start
```

Atau untuk development dengan auto-reload:
```bash
npm run dev
```

Output akan menunjukkan:
```
================================================
  💰 Catatan Keuangan Pocong - Starting Up...
================================================

✅ Dashboard berjalan di http://localhost:3000
✅ Telegram bot sudah siap!
✅ WhatsApp bot sudah siap!

================================================
  📊 Semua service berjalan!
  🌐 Dashboard: http://localhost:3000
================================================
```

### 📱 Telegram Commands

Gunakan bot Telegram dengan perintah berikut:

| Perintah | Contoh | Keterangan |
|----------|--------|-----------|
| `/add` atau ketik langsung | `50000 makanan nasi goreng` | Catat pengeluaran |
| Pemasukan | `+2000000 gaji gaji bulan ini` | Catat pemasukan |
| `/summary` | `/summary` | Ringkasan bulan ini |
| `/summary YYYY-MM` | `/summary 2026-06` | Ringkasan bulan tertentu |
| `/categories` | `/categories` | Lihat kategori tersedia |
| `/help` | `/help` | Bantuan perintah |
| `/undo` | `/undo` | Hapus transaksi terakhir |

### 📱 WhatsApp Commands

Sama dengan Telegram:
- Ketik `50000 makanan nasi goreng` untuk catat pengeluaran
- Ketik `/help` untuk melihat bantuan
- Ketik `/summary` untuk ringkasan

### 💻 Dashboard Web

1. Buka browser: http://localhost:3000
2. Pilih bulan di atas kanan
3. Lihat ringkasan pendapatan, pengeluaran, saldo, & sisa budget
4. Grafik pengeluaran per kategori
5. Grafik tren pemasukan vs pengeluaran
6. Tabel riwayat transaksi

## 📋 Kategori Tersedia

### 📤 Pengeluaran (Expense)
- `makanan` - Makanan & minuman
- `minuman` - Minuman
- `transport` - Transportasi
- `belanja` - Belanja barang
- `tagihan` - Tagihan (listrik, air, dll)
- `hiburan` - Hiburan & rekreasi
- `kesehatan` - Kesehatan & obat
- `pendidikan` - Pendidikan & buku
- `lainnya` - Kategori lainnya

### 📥 Pemasukan (Income)
- `gaji` - Gaji bulanan
- `freelance` - Pendapatan freelance
- `investasi` - Investasi & dividen
- `tabungan` - Transfer tabungan

## 📊 Format Data di Google Sheets

Data akan disimpan otomatis dengan struktur:

| Kolom | Deskripsi |
|-------|-----------|
| A - timestamp | Waktu catat (YYYY-MM-DD HH:mm:ss) |
| B - date | Tanggal (YYYY-MM-DD) |
| C - month | Bulan (YYYY-MM) |
| D - type | Tipe (pemasukan/pengeluaran) |
| E - amount | Jumlah (angka) |
| F - category | Kategori transaksi |
| G - note | Catatan/deskripsi |
| H - formattedAmount | Format Rupiah |

## 🔧 Troubleshooting

### ❌ Error: "Missing GOOGLE_SHEET_ID"
- Pastikan `.env` sudah dibuat dan `GOOGLE_SHEET_ID` terisi dengan benar
- ID spreadsheet harus format panjang (misal: `1a2b3c4d5e6f...`)

### ❌ Error: "Credentials file not found"
- Pastikan file `credentials.json` ada di root folder
- Download ulang dari Google Cloud Console

### ❌ Telegram bot tidak merespons
- Pastikan `TELEGRAM_TOKEN` benar di `.env`
- Token harus dari @BotFather
- Restart app setelah mengubah `.env`

### ❌ WhatsApp QR tidak muncul
- Pastikan `WHATSAPP_ENABLED=true` di `.env`
- Restart app
- QR code akan muncul di terminal

### ❌ Dashboard tidak menampilkan data
- Cek console browser (F12 → Console)
- Pastikan Google Sheets API berjalan
- Cek sheet name harus "Transactions" (case-sensitive)

## 📁 Struktur Folder

```
finance-tracker-app/
├── index.js                 # Entry point utama
├── package.json             # Dependencies
├── .env.example            # Template environment
├── credentials.json        # Google Service Account (git-ignored)
├── src/
│   ├── models/
│   │   └── transaction.js   # Model & parser transaksi
│   └── services/
│       ├── googleSheets.js  # Google Sheets API
│       ├── telegramBot.js   # Telegram bot handler
│       ├── whatsappBot.js   # WhatsApp bot handler
│       └── dashboard.js     # Express server
└── public/
    ├── index.html          # Dashboard HTML
    ├── style.css           # Dashboard styling
    └── app.js              # Dashboard JavaScript
```

## 🔒 Keamanan

- **credentials.json** sudah di `.gitignore` - jangan commit!
- Batasi akses dengan `TELEGRAM_ALLOWED_IDS` dan `WHATSAPP_ALLOWED_NUMBERS`
- Gunakan API key/token dari bot yang aman
- Jangan share `.env` file ke orang lain

## 💡 Tips & Trik

1. **Format cepat transaksi**:
   - `50000 makanan nasi` = pengeluaran
   - `+5000000 gaji` = pemasukan
   - `-100000 belanja` = pengeluaran eksplisit

2. **Cek ringkasan kapan saja**:
   - `/summary` = bulan ini
   - `/summary 2026-05` = bulan kemarin

3. **Monitor budget**:
   - Lihat di dashboard berapa sisa budget bulan ini
   - Update `MONTHLY_BUDGET` sesuai kebutuhan

## 📝 Catatan

Aplikasi ini menggunakan:
- **Express.js** - Web server
- **node-telegram-bot-api** - Telegram integration
- **whatsapp-web.js** - WhatsApp integration
- **googleapis** - Google Sheets API
- **Chart.js** - Grafik di dashboard
- **dayjs** - Date handling

## 📞 Support

Jika ada pertanyaan atau bug, silakan:
1. Cek dokumentasi di atas
2. Cek console log untuk error messages
3. Pastikan semua environment variables sudah benar
4. Restart aplikasi setelah perubahan `.env`

---

**Happy tracking! 💰📊**
