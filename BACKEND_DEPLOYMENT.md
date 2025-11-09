# Backend Deployment Guide

## Important: Backend Must Be Deployed Separately

**Netlify is for your frontend only.** Your backend (Node.js/Express) needs to be deployed to a different service that supports server-side applications.

## Recommended Backend Hosting Options

### Option 1: Railway (Easiest - Recommended) ⭐
- **Free tier available**
- **Very easy setup**
- **Automatic deployments from GitHub**

**Steps:**
1. Go to: https://railway.app
2. Sign up with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your repository
5. Railway will auto-detect it's a Node.js app
6. Set root directory to: `backend`
7. Add environment variables if needed (like API keys)
8. Deploy!

**Your backend URL will be:** `https://your-app.railway.app`

### Option 2: Render
- **Free tier available**
- **Easy setup**
- **Good for Node.js apps**

**Steps:**
1. Go to: https://render.com
2. Sign up
3. Click "New" → "Web Service"
4. Connect your GitHub repo
5. Settings:
   - **Name**: memory-garden-backend
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Environment**: Node
6. Add environment variables
7. Deploy!

**Your backend URL will be:** `https://your-app.onrender.com`

### Option 3: Heroku
- **Free tier (limited)**
- **Classic option**
- **Requires credit card for free tier**

**Steps:**
1. Install Heroku CLI
2. `cd backend`
3. `heroku create your-app-name`
4. `git push heroku main`
5. Add environment variables: `heroku config:set KEY=value`

### Option 4: Fly.io
- **Free tier available**
- **Good performance**
- **Requires CLI setup**

## After Deploying Backend

### Step 1: Get Your Backend URL
Once deployed, you'll get a URL like:
- `https://your-app.railway.app` (Railway)
- `https://your-app.onrender.com` (Render)
- `https://your-app.herokuapp.com` (Heroku)

### Step 2: Update Netlify Environment Variables
1. Go to Netlify Dashboard → Your Site → Site settings → Environment variables
2. Update `REACT_APP_API_BASE_URL` to:
   ```
   https://your-backend-url.com/api
   ```
   (Replace with your actual backend URL)

### Step 3: Redeploy Frontend
1. In Netlify, go to "Deploys" tab
2. Click "Trigger deploy" → "Clear cache and deploy site"

### Step 4: Update CORS in Backend
Make sure your backend allows requests from Netlify:

In `backend/server.js`, update CORS:
```javascript
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://nvidiaai.netlify.app',
    'https://your-netlify-url.netlify.app'
  ]
}));
```

## Quick Setup Checklist

**Backend:**
- [ ] Deploy backend to Railway/Render/Heroku
- [ ] Get backend URL
- [ ] Test backend is working (visit backend URL/api/health)
- [ ] Update CORS to allow Netlify domain

**Frontend (Netlify):**
- [ ] Add `REACT_APP_AUTH0_DOMAIN` environment variable
- [ ] Add `REACT_APP_AUTH0_CLIENT_ID` environment variable
- [ ] Add `REACT_APP_API_BASE_URL` = `https://your-backend-url.com/api`
- [ ] Redeploy frontend

**Auth0:**
- [ ] Add Netlify URL to callback URLs: `https://nvidiaai.netlify.app`
- [ ] Save changes

## Recommended: Railway Setup (Step-by-Step)

1. **Go to Railway**: https://railway.app
2. **Sign up** with GitHub
3. **New Project** → **Deploy from GitHub repo**
4. **Select your repository**
5. **Settings**:
   - **Root Directory**: `backend`
   - **Start Command**: `node server.js` (or `npm start` if you have a start script)
6. **Variables** (if needed):
   - Add any environment variables your backend needs
   - Check `backend/server.js` for `process.env` variables
7. **Deploy** - Railway will automatically deploy
8. **Get URL** - Railway gives you a URL like `https://your-app.up.railway.app`
9. **Update Netlify** - Set `REACT_APP_API_BASE_URL` to `https://your-app.up.railway.app/api`

## Testing Your Setup

1. **Test Backend**: Visit `https://your-backend-url.com/api/health`
   - Should return: `{"status":"ok"}`

2. **Test Frontend**: Visit `https://nvidiaai.netlify.app`
   - Should load without "undefined" errors
   - Check browser console (F12) for API calls

3. **Test Auth0**: Click "Login"
   - Should redirect to Auth0
   - After login, should redirect back to your app

## Summary

- ✅ **Frontend**: Deploy to Netlify (already done)
- ✅ **Backend**: Deploy to Railway/Render/Heroku (separate service)
- ✅ **Connect them**: Set `REACT_APP_API_BASE_URL` in Netlify to point to your backend
- ✅ **Auth0**: Add both localhost and Netlify URLs to callback URLs

You need **two separate deployments**:
1. Frontend on Netlify
2. Backend on Railway/Render/Heroku

