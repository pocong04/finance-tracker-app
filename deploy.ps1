# deploy.ps1 - Automated Deployment Script untuk Railway
# Jalankan: powershell -ExecutionPolicy Bypass -File deploy.ps1

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  🚀 Finance Tracker Bot - Auto Deploy to Railway" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Check prerequisites
Write-Host "📋 Checking prerequisites..." -ForegroundColor Yellow
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  Write-Host "❌ Git tidak terinstall" -ForegroundColor Red
  exit 1
}
Write-Host "✅ Git found" -ForegroundColor Green

# Get GitHub info
Write-Host ""
Write-Host "📝 Enter your GitHub information:" -ForegroundColor Yellow
$githubUser = Read-Host "  GitHub Username"
$repoName = Read-Host "  Repository name (default: finance-tracker-app)"
if ([string]::IsNullOrWhiteSpace($repoName)) { $repoName = "finance-tracker-app" }

$repoUrl = "https://github.com/$githubUser/$repoName.git"

Write-Host ""
Write-Host "📋 Information:" -ForegroundColor Cyan
Write-Host "  GitHub User: $githubUser"
Write-Host "  Repository: $repoName"
Write-Host "  URL: $repoUrl"
Write-Host ""

# Configure git
Write-Host "🔧 Configuring git remote..." -ForegroundColor Yellow
git remote remove origin 2>$null
git remote add origin $repoUrl
git branch -M main
Write-Host "✅ Git configured" -ForegroundColor Green

# Push to GitHub
Write-Host ""
Write-Host "📤 Pushing code to GitHub..." -ForegroundColor Yellow
Write-Host "(⚠️  If prompted for password, use Personal Access Token from:" -ForegroundColor Yellow
Write-Host "   https://github.com/settings/tokens/new" -ForegroundColor Yellow
Write-Host "   Scopes: repo, read:user)" -ForegroundColor Yellow
Write-Host ""

git push -u origin main

if ($LASTEXITCODE -eq 0) {
  Write-Host ""
  Write-Host "================================================" -ForegroundColor Green
  Write-Host "  ✅ Code successfully pushed to GitHub!" -ForegroundColor Green
  Write-Host "================================================" -ForegroundColor Green
  Write-Host ""
  Write-Host "🚀 NEXT STEPS - Deploy to Railway:" -ForegroundColor Cyan
  Write-Host ""
  Write-Host "1️⃣  Buka: https://railway.app" -ForegroundColor White
  Write-Host "2️⃣  Sign in dengan GitHub account Anda" -ForegroundColor White
  Write-Host "3️⃣  Klik: New Project → Deploy from GitHub repo" -ForegroundColor White
  Write-Host "4️⃣  Pilih repository: $repoName" -ForegroundColor White
  Write-Host "5️⃣  Tunggu build selesai (2-3 menit) ✅" -ForegroundColor White
  Write-Host "6️⃣  Klik: Variables → Add:" -ForegroundColor White
  Write-Host ""
  Write-Host "   PORT                       = 3000" -ForegroundColor Yellow
  Write-Host "   GOOGLE_SHEET_ID           = 1QzZkJdksK_8wh3ocBWwm92qd_EpaF8gOL3J9ochXFc4" -ForegroundColor Yellow
  Write-Host "   TELEGRAM_TOKEN            = 1972023286:AAEt9IqLEYKmPonalKb4nY_mMU9Lb1qsC9U" -ForegroundColor Yellow
  Write-Host "   WHATSAPP_ENABLED          = false" -ForegroundColor Yellow
  Write-Host "   MONTHLY_BUDGET            = 5000000" -ForegroundColor Yellow
  Write-Host "   GOOGLE_CREDENTIALS_JSON   = [PASTE ISI credentials.json]" -ForegroundColor Yellow
  Write-Host ""
  Write-Host "7️⃣  Klik: Save → Railway auto-redeploy (2 menit)" -ForegroundColor White
  Write-Host "8️⃣  Bot aktif 24/7 di cloud! 🎉" -ForegroundColor White
  Write-Host ""
  Write-Host "📱 Test di Telegram: @POCONG02_BOT" -ForegroundColor Cyan
  Write-Host "   Ketik: 50k makanan nasi goreng" -ForegroundColor Cyan
  Write-Host ""
} else {
  Write-Host "❌ Push failed. Check your credentials." -ForegroundColor Red
}
