#!/bin/bash
# deploy.sh - Automated deployment script untuk Railway
# Jalankan: bash deploy.sh

set -e  # Exit jika ada error

echo "================================================"
echo "  🚀 Finance Tracker Bot - Auto Deploy"
echo "================================================"
echo ""

# Check git
if ! command -v git &> /dev/null; then
  echo "❌ Git tidak terinstall"
  exit 1
fi

echo "✅ Git ditemukan"
echo ""

# Get user input
read -p "GitHub Username: " GITHUB_USER
read -p "GitHub Repository name (default: finance-tracker-app): " REPO_NAME
REPO_NAME=${REPO_NAME:-finance-tracker-app}

echo ""
echo "📋 Data yang akan digunakan:"
echo "  GitHub User: $GITHUB_USER"
echo "  Repository: $REPO_NAME"
echo ""

# Git config
echo "🔧 Configuring git..."
git remote remove origin 2>/dev/null || true
git remote add origin "https://github.com/$GITHUB_USER/$REPO_NAME.git"
git branch -M main

echo "✅ Git configured"
echo ""

# Push to GitHub
echo "📤 Pushing to GitHub..."
echo "(Jika diminta password, gunakan Personal Access Token dari https://github.com/settings/tokens)"
echo ""
git push -u origin main

echo ""
echo "================================================"
echo "  ✅ Code pushed to GitHub!"
echo "================================================"
echo ""
echo "📝 Langkah selanjutnya:"
echo "1. Buka: https://railway.app"
echo "2. Sign in dengan GitHub"
echo "3. New Project → Deploy from GitHub repo"
echo "4. Pilih: $REPO_NAME"
echo "5. Add Variables (lihat DEPLOY_QUICK_START.md)"
echo "6. Bot akan live 24/7! 🚀"
echo ""
