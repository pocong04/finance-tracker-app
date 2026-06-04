# 🚀 QUICK START - Deploy Bot ke Railway (5 Menit)

## ⚡ Quick Summary
Bot Anda sudah siap deploy! Hanya 6 langkah mudah, total 5 menit.

---

## 📋 Langkah Deployment

### **LANGKAH 1: Buat GitHub Repository**
1. Buka: https://github.com/new
2. Repository name: **finance-tracker-app**
3. Description: **Finance tracker bot Telegram**
4. Pilih: **Public**
5. Klik: **Create Repository**
6. ✅ Catat URL repository Anda (misal: github.com/USERNAME/finance-tracker-app)

---

### **LANGKAH 2: Push Code ke GitHub**

Buka **PowerShell** di folder proyek, jalankan:

```powershell
cd "E:\claude resounce\finance-tracker-app"

# Ganti USERNAME dengan username GitHub Anda!
git remote add origin https://github.com/USERNAME/finance-tracker-app.git
git branch -M main
git push -u origin main
```

**Saat diminta input:**
- Username: masukkan GitHub username Anda
- Password: buat Personal Access Token di https://github.com/settings/tokens/new
  - Check: `repo`
  - Check: `read:user`
  - Copy token → paste sebagai password

✅ Code sudah di GitHub!

---

### **LANGKAH 3: Sign Up Railway**

1. Buka: https://railway.app
2. Klik: **Sign Up**
3. Pilih: **Continue with GitHub**
4. Authorize Railway

✅ Railway account sudah siap!

---

### **LANGKAH 4: Buat Project Baru di Railway**

1. Di Railway dashboard, klik: **New Project**
2. Pilih: **Deploy from GitHub repo**
3. Pilih repository: **finance-tracker-app**
4. Authorize & Connect

Railway akan mulai build (tunggu 2-3 menit sampai ✅ Success)

---

### **LANGKAH 5: Add Environment Variables**

Setelah build selesai, Railway akan buka project dashboard:

1. Klik: **Variables** (atau **Environment**)
2. Tambahkan variables ini:

| Variable | Value |
|----------|-------|
| `PORT` | `3000` |
| `GOOGLE_SHEET_ID` | `1QzZkJdksK_8wh3ocBWwm92qd_EpaF8gOL3J9ochXFc4` |
| `TELEGRAM_TOKEN` | `1972023286:AAEt9IqLEYKmPonalKb4nY_mMU9Lb1qsC9U` |
| `WHATSAPP_ENABLED` | `false` |
| `MONTHLY_BUDGET` | `5000000` |
| `GOOGLE_CREDENTIALS_JSON` | **[PASTE ISI FILE credentials.json]** |

**Untuk `GOOGLE_CREDENTIALS_JSON`:**
- Buka file `credentials.json` di komputer Anda
- Copy SELURUH isi file (dari `{` sampai `}`)
- Paste ke value di Railway

3. Klik: **Save**

Railway akan **auto-redeploy** dengan variables baru (2 menit)

---

### **LANGKAH 6: Verifikasi Bot Online**

1. Di Railway dashboard, cari: **Domains**
2. Salin URL yang diberikan Railway (misal: `finance-tracker-xyz.railway.app`)
3. Buka di browser → pastikan dashboard muncul
4. Bot Telegram sudah **aktif 24/7 di cloud!** ✅

---

## 🧪 Test Bot

Buka Telegram → cari **@POCONG02_BOT** → kirim:
```
50k makanan nasi goreng
```

Bot akan balas konfirmasi & data otomatis tersimpan ke Google Sheet! 📊

---

## 📱 Sekarang Bot Anda:

✅ **Aktif 24/7** - tidak perlu laptop nyala  
✅ **Gratis** - Railway free tier $5/bulan  
✅ **Auto-update** - push ke GitHub = auto-deploy  
✅ **Scalable** - bisa handle ratusan user  

---

## 🔄 Update Bot (Setiap Kali)

Setelah ini, setiap kali Anda edit kode:

```bash
git add -A
git commit -m "Update bot"
git push origin main
```

Railway **otomatis deploy** dalam 2-3 menit! 🚀

---

## ⚠️ Troubleshooting

| Masalah | Solusi |
|--------|--------|
| Build failed | Klik **Deployments** → lihat error log |
| Bot tidak merespons | Cek `TELEGRAM_TOKEN` benar di Variables |
| credentials error | Pastikan `GOOGLE_CREDENTIALS_JSON` ter-paste lengkap |
| Variabel tidak aktif | Klik **Redeploy** di Railway |

---

## 🎉 Selamat!

Bot Anda sudah **production-ready** di cloud! 🚀

Hubungi @POCONG02_BOT kapan saja untuk catat keuangan Anda.
