# 🔑 Cara Mendapatkan credentials.json (Google Service Account)

## Langkah-langkah Detail

### 1. Buka Google Cloud Console
- Kunjungi: https://console.cloud.google.com/
- Login dengan akun Google Anda

### 2. Buat Project Baru (atau pilih yang sudah ada)
- Klik dropdown project di atas (sebelah "Google Cloud")
- Klik "NEW PROJECT"
- Nama project: `Finance Tracker` (atau nama bebas)
- Klik "CREATE"
- Tunggu beberapa detik hingga project dibuat

### 3. Enable Google Sheets API
- Di menu kiri, klik "APIs & Services" → "Library"
  (atau langsung ke: https://console.cloud.google.com/apis/library)
- Cari "Google Sheets API"
- Klik kartu "Google Sheets API"
- Klik tombol "ENABLE"
- Tunggu hingga API aktif

### 4. Buat Service Account
- Di menu kiri, klik "APIs & Services" → "Credentials"
  (atau: https://console.cloud.google.com/apis/credentials)
- Klik tombol "CREATE CREDENTIALS" di atas
- Pilih "Service Account"
- Isi form:
  - **Service account name**: `finance-tracker`
  - **Service account ID**: otomatis terisi (biarkan)
  - **Description**: `Service account untuk bot keuangan`
- Klik "CREATE AND CONTINUE"
- Di "Grant this service account access to project":
  - Select a role: Pilih "Editor" (atau "Owner" untuk full access)
- Klik "CONTINUE"
- Klik "DONE"

### 5. Download JSON Key
- Setelah service account dibuat, Anda akan melihat daftar service accounts
- Cari service account yang baru dibuat (finance-tracker@...)
- Klik email service account tersebut (akan buka detail page)
- Klik tab "KEYS" di atas
- Klik "ADD KEY" → "Create new key"
- Pilih format "JSON"
- Klik "CREATE"
- **File JSON akan otomatis terdownload ke komputer Anda**

### 6. Pindahkan File ke Project
- File yang terdownload namanya seperti: `your-project-123456-abcdef123456.json`
- **Pindahkan** atau **copy** file tersebut ke folder:
  ```
  E:\claude resounce\finance-tracker-app\
  ```
- **Rename** file menjadi `credentials.json` (PENTING!)

### 7. Share Google Spreadsheet dengan Service Account
- Buka file `credentials.json` yang baru saja Anda letakkan
- Cari baris `"client_email"`, contohnya:
  ```json
  "client_email": "finance-tracker@your-project-123456.iam.gserviceaccount.com"
  ```
- **Copy email tersebut**
- Buka Google Spreadsheet Anda:
  https://docs.google.com/spreadsheets/d/1QzZkJdksK_8wh3ocBWwm92qd_EpaF8gOL3J9ochXFc4/edit
- Klik tombol "Share" di kanan atas
- Paste email service account yang Anda copy
- **Pastikan role: "Editor"**
- **UNCHECK "Notify people"** (karena ini bukan email manusia)
- Klik "Share" atau "Done"

### 8. Pastikan Sheet Bernama "Transactions"
- Di spreadsheet, pastikan ada sheet/tab bernama **"Transactions"** (huruf besar T)
- Jika belum ada, rename sheet pertama atau buat baru
- Di baris pertama (header), isi kolom:
  ```
  timestamp | date | month | type | amount | category | note | formattedAmount
  ```
  (atau biarkan kosong, bot akan mulai mengisi dari baris 1)

---

## ✅ Checklist Sebelum Jalankan Bot

- [ ] File `credentials.json` sudah ada di `E:\claude resounce\finance-tracker-app\`
- [ ] Email service account sudah di-share ke spreadsheet dengan role Editor
- [ ] Spreadsheet punya sheet bernama "Transactions"
- [ ] `.env` sudah diisi dengan GOOGLE_SHEET_ID yang benar
- [ ] Telegram token sudah diisi di `.env`

---

## 🚀 Setelah Semua Selesai

Jalankan bot dengan:
```bash
npm start
```

Atau untuk keep running (install PM2 dulu):
```bash
npm install -g pm2
pm2 start index.js --name finance-tracker
pm2 save
pm2 startup
```

---

**Jika ada masalah, periksa:**
1. Apakah `credentials.json` formatnya benar? (file JSON valid)
2. Apakah Google Sheets API sudah enabled?
3. Apakah service account email sudah di-share ke spreadsheet?
4. Apakah sheet name persis "Transactions"?
