# 🚀 Deployment Guide - Railway.app

## Step 1: Buat GitHub Repository

1. Buka https://github.com/new
2. Repository name: `finance-tracker-app`
3. Description: `Finance tracker bot dengan Telegram, WhatsApp, Google Sheets`
4. Pilih **Public** (gratis)
5. **Jangan** init README (sudah ada)
6. Klik **Create repository**

## Step 2: Push Code ke GitHub

Setelah repository dibuat, GitHub akan memberi instruksi. Jalankan di PowerShell:

```powershell
cd "E:\claude resounce\finance-tracker-app"

# Ganti USERNAME dengan username GitHub Anda
git remote add origin https://github.com/USERNAME/finance-tracker-app.git
git branch -M main
git push -u origin main
```

Masukkan **GitHub username** dan **Personal Access Token** saat diminta.

> **Buat Personal Access Token:** https://github.com/settings/tokens
> - Pilih: `repo`, `read:user`
> - Copy token, gunakan sebagai password saat push

## Step 3: Deploy ke Railway

### A. Sign Up Railway
1. Buka https://railway.app
2. Klik **Sign Up**
3. Pilih **GitHub** untuk login (paling mudah)
4. Authorize Railway

### B. Buat Project Baru
1. Klik **New Project** (atau **+ New**)
2. Pilih **Deploy from GitHub repo**
3. Cari repository: `finance-tracker-app`
4. Klik untuk connect

### C. Setup Environment Variables
Setelah repo ter-connect, Railway akan membuka project dashboard:

1. Klik **Add Variables**
2. Tambahkan dari `.env` Anda:

```
PORT=3000
GOOGLE_SHEET_ID=1QzZkJdksK_8wh3ocBWwm92qd_EpaF8gOL3J9ochXFc4
TELEGRAM_TOKEN=1972023286:AAEt9IqLEYKmPonalKb4nY_mMU9Lb1qsC9U
WHATSAPP_ENABLED=false
MONTHLY_BUDGET=5000000
```

**PENTING:** Jangan masukkan `credentials.json` di sini (terlalu panjang).
Gunakan Railway's File System untuk upload file.

### D. Upload credentials.json ke Railway

1. Di Railway dashboard, klik **File System**
2. Upload file `credentials.json` Anda
3. Path: `/app/credentials.json` atau `/credentials.json`

Atau bisa langsung add variabel:
- Di **Variables**, tambahkan `GOOGLE_CREDENTIALS_JSON` dengan isi file credentials.json (copy-paste seluruh JSON)
- Di kode, modify untuk baca dari variabel environment

### E. Deploy
Railway akan auto-deploy saat ada push ke GitHub.

Tunggu sampai status hijau ✅ "Success"

## Step 4: Verifikasi Bot Online

1. Railway akan kasih public URL (misal: `finance-tracker-app.railway.app`)
2. Buka URL di browser → lihat dashboard
3. Bot Telegram akan berjalan di server (24/7 aktif!)

## Step 5: Update Kode & Auto-Deploy

Setiap kali Anda:
```bash
git add -A
git commit -m "Update bot"
git push origin main
```

Railway **otomatis deploy** dalam 2-5 menit! 🚀

---

## 📋 Troubleshooting Railway

| Masalah | Solusi |
|--------|--------|
| Build failed | Cek logs (Klik project → Deployments → lihat error) |
| Bot tidak merespons | Pastikan `TELEGRAM_TOKEN` benar di Railway variables |
| credentials.json not found | Upload file ke Railway File System |
| Port error | Railway auto-assign PORT, jangan hardcode 3000 |

---

## ⚡ Railway Pricing (Free Tier)

- **$5 free credit/bulan** (biasanya cukup untuk bot)
- Bot Telegram sederhana = ~$0-2/bulan
- Jika habis credit, service stop (bisa upgrade billing)

---

## 🎉 Setelah Deploy

✅ Bot akan aktif **24/7 di cloud**  
✅ Laptop Anda bisa mati, bot tetap hidup  
✅ Akses via URL: `finance-tracker-app.railway.app`  
✅ Setiap push ke GitHub = auto-update  

**Selamat! Bot Anda sudah production-ready!** 🚀
