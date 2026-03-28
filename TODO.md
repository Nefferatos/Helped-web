# Vercel Deployment Steps

## 1. Import Repo
- vercel.com → New Project → Import GitHub "Helped-web"
- **Preset**: Other (no Node.js needed, vercel.json handles)

## 2. Deploy
- Override → Use vercel.json builds/routes
- Deploy!

## 3. Env Vars
- Settings → Environment Variables
- `DATABASE_URL` = pg URI

## 4. DB Init
- Connect DB → Run backend/schema.sql

Live! 🚀
