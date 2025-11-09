# Quick Reference: Connect Railway to Netlify

## 🚀 3-Minute Setup

### 1. Get Railway URL
- Railway Dashboard → Your Service → Settings → Domains
- Copy URL: `https://your-app.up.railway.app`

### 2. Add to Netlify
- Netlify Dashboard → Your Site → Site settings → Environment variables
- Add: `REACT_APP_API_BASE_URL` = `https://your-app.up.railway.app/api`
- ⚠️ **Don't forget `/api` at the end!**

### 3. Redeploy Netlify
- Deploys tab → "Trigger deploy" → "Clear cache and deploy site"

### 4. Test
- Visit your Netlify site
- Open browser console (F12) → Network tab
- Check API calls go to your Railway URL ✅

## ✅ Checklist

- [ ] Railway backend is running (`/api/health` works)
- [ ] Added `REACT_APP_API_BASE_URL` in Netlify
- [ ] URL includes `/api` at the end
- [ ] Redeployed Netlify
- [ ] Tested connection

## 🔧 Common Issues

**CORS Error?** → Check `backend/server.js` allows your Netlify domain

**404 Error?** → Make sure URL includes `/api`

**Wrong URL?** → Check environment variable is set correctly and site was redeployed

**For detailed instructions, see: [CONNECT_RAILWAY_TO_NETLIFY.md](CONNECT_RAILWAY_TO_NETLIFY.md)**

