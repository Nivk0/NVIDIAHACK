# Railway Backend Deployment Guide

## Quick Setup (5 Minutes)

### Step 1: Sign Up for Railway
1. Go to: **https://railway.app**
2. Click **"Start a New Project"**
3. Sign up with **GitHub** (recommended) or email
4. Authorize Railway to access your GitHub

### Step 2: Deploy Your Backend
1. In Railway dashboard, click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Choose your repository: **NVIDIAHACK-1** (or whatever you named it)
4. Railway will start deploying automatically

### Step 3: Configure Settings
1. Click on your new service
2. Go to **"Settings"** tab
3. Set **Root Directory**: `backend`
4. Set **Start Command**: `node server.js` (or leave blank - it will use package.json)
5. Railway will auto-detect Node.js

### Step 4: Add Environment Variables (If Needed)
1. Go to **"Variables"** tab
2. Add any environment variables your backend needs:
   - `NEMOTRON_API_KEY` (if you're using Nemotron)
   - `FRONTEND_URL` = `https://nvidiaai.netlify.app` (optional)
   - Any other variables from your `.env` file

### Step 5: Get Your Backend URL
1. Go to **"Settings"** tab
2. Scroll to **"Domains"** section
3. Railway will generate a URL like: `https://your-app.up.railway.app`
4. **Copy this URL** - you'll need it!

### Step 6: Update Netlify
1. Go to **Netlify Dashboard** → Your Site → **Site settings** → **Environment variables**
2. Add/Update: `REACT_APP_API_BASE_URL`
3. Set value to: `https://your-app.up.railway.app/api`
   (Replace with your actual Railway URL)
4. **Redeploy** your frontend

### Step 7: Update Auth0 (If Needed)
1. Go to **Auth0 Dashboard** → Applications → Memory Garden → Settings
2. Update CORS origins if needed (Railway URL should work automatically)

## Testing Your Deployment

### Test Backend Health
Visit: `https://your-app.up.railway.app/api/health`
Should return: `{"status":"ok"}`

### Test Frontend
1. Go to: `https://nvidiaai.netlify.app`
2. Open browser console (F12)
3. Check for API calls - they should go to your Railway URL
4. Try logging in - should work!

## Railway Configuration Files

I've created these files for you:
- `railway.json` - Root configuration
- `backend/railway.json` - Backend-specific config
- `backend/package.json` - Already configured with start script

## Important Notes

### Port Configuration
- Railway automatically sets `PORT` environment variable
- Your server already uses `process.env.PORT || 5001`
- ✅ No changes needed!

### CORS
- I've updated your CORS to allow Netlify domain
- Railway URL is automatically allowed
- ✅ Already configured!

### File Storage
- Railway provides persistent storage
- Your `backend/data/` and `backend/uploads/` folders will work
- Files persist between deployments

### Environment Variables
Railway will use:
- `PORT` - Automatically set by Railway
- Any variables you add in Railway dashboard
- Variables from your `.env` file (if you upload it, but better to use Railway's variable system)

## Troubleshooting

### Backend Not Starting
1. Check Railway logs: Click on your service → "Deployments" → Click latest deployment → "View Logs"
2. Common issues:
   - Wrong root directory (should be `backend`)
   - Missing dependencies (check `package.json`)
   - Port issues (Railway sets PORT automatically)

### CORS Errors
- Make sure `https://nvidiaai.netlify.app` is in your CORS origins
- Already configured in `backend/server.js` ✅

### API Not Responding
- Check Railway logs for errors
- Verify the URL: `https://your-app.up.railway.app/api/health`
- Make sure frontend has correct `REACT_APP_API_BASE_URL`

## Railway Free Tier

- **$5 credit per month** (free)
- **500 hours** of usage
- **5GB** storage
- **100GB** bandwidth

**This is plenty for development and small apps!**

## Next Steps After Deployment

1. ✅ Backend deployed to Railway
2. ✅ Got Railway URL
3. ✅ Updated Netlify `REACT_APP_API_BASE_URL`
4. ✅ Redeployed frontend
5. ✅ Tested both work together

## Custom Domain (Optional)

Railway allows custom domains:
1. Go to Settings → Domains
2. Add your custom domain
3. Update DNS records as instructed
4. Update Netlify `REACT_APP_API_BASE_URL` to use custom domain

## Summary

Your app is now configured for Railway! Just:
1. Deploy to Railway (5 minutes)
2. Get your Railway URL
3. Update Netlify environment variable
4. Done! 🎉

