# How to Connect Railway Backend to Netlify Frontend

This guide will walk you through connecting your deployed Railway backend to your Netlify frontend.

## Prerequisites

- ✅ Backend deployed on Railway
- ✅ Frontend deployed on Netlify
- ✅ Both services are running

## Step-by-Step Connection Guide

### Step 1: Get Your Railway Backend URL

1. Go to **Railway Dashboard**: https://railway.app
2. Click on your **backend service**
3. Go to the **"Settings"** tab
4. Scroll down to the **"Domains"** section
5. You'll see a URL like: `https://your-app.up.railway.app`
6. **Copy this URL** - you'll need it!

**Important**: Make sure your backend is deployed and running. You can test it by visiting:
```
https://your-app.up.railway.app/api/health
```
It should return: `{"status":"ok"}`

### Step 2: Update Netlify Environment Variable

1. Go to **Netlify Dashboard**: https://app.netlify.com
2. Click on your **site** (e.g., `nvidiaai`)
3. Click **"Site settings"** (gear icon in the top menu)
4. In the left sidebar, click **"Environment variables"**
5. Click **"Add a variable"** button

6. Add the Railway backend URL:
   - **Key**: `REACT_APP_API_BASE_URL`
   - **Value**: `https://your-app.up.railway.app/api`
     - ⚠️ **Important**: Make sure to include `/api` at the end!
     - Replace `your-app.up.railway.app` with your actual Railway URL
   - **Scopes**: Select **"All scopes"** (or "Production" if you prefer)
   - Click **"Create variable"**

**Example**:
- If your Railway URL is: `https://memory-garden-backend.up.railway.app`
- Then set: `REACT_APP_API_BASE_URL` = `https://memory-garden-backend.up.railway.app/api`

### Step 3: Verify CORS is Configured

Your backend should already allow requests from Netlify. Let's verify:

1. Check `backend/server.js` - it should have:
   ```javascript
   app.use(cors({
     origin: [
       'http://localhost:3000',
       'https://nvidiaai.netlify.app',
       process.env.FRONTEND_URL
     ].filter(Boolean)
   }));
   ```

2. If your Netlify URL is different, you can:
   - Option A: Add `FRONTEND_URL` environment variable in Railway:
     - Key: `FRONTEND_URL`
     - Value: `https://your-netlify-site.netlify.app`
   
   - Option B: Update `backend/server.js` to include your Netlify URL directly

### Step 4: Redeploy Netlify Frontend

After adding the environment variable, you **must** redeploy:

1. In Netlify dashboard, go to **"Deploys"** tab
2. Click **"Trigger deploy"** → **"Clear cache and deploy site"**
3. Wait for the deployment to complete (usually 2-5 minutes)

**Why redeploy?** Environment variables are only available during the build process. After adding/changing them, you need to rebuild your frontend.

### Step 5: Test the Connection

1. Visit your Netlify site: `https://your-site.netlify.app`
2. Open browser **Developer Console** (F12 or Right-click → Inspect → Console)
3. Look for API calls - they should go to your Railway URL
4. Try logging in or uploading a file
5. Check the Network tab to see if API requests are successful

**What to look for**:
- ✅ API calls should go to: `https://your-app.up.railway.app/api/...`
- ✅ Requests should return `200 OK` status
- ❌ If you see `CORS error`, check Step 3
- ❌ If you see `404`, check that the URL includes `/api`

## Quick Checklist

- [ ] Got Railway backend URL
- [ ] Tested Railway backend is working (`/api/health` returns `{"status":"ok"}`)
- [ ] Added `REACT_APP_API_BASE_URL` in Netlify (with `/api` at the end)
- [ ] Verified CORS allows Netlify domain
- [ ] Triggered new Netlify deployment
- [ ] Tested the connection in browser

## Troubleshooting

### Problem: API calls are going to `localhost:5001`

**Solution**: The environment variable isn't set correctly or the site wasn't redeployed.
1. Double-check `REACT_APP_API_BASE_URL` in Netlify
2. Make sure you triggered a new deployment after adding it
3. Clear browser cache and hard refresh (Ctrl+Shift+R or Cmd+Shift+R)

### Problem: CORS Error

**Error**: `Access to fetch at 'https://...' from origin 'https://...' has been blocked by CORS policy`

**Solution**:
1. Check Railway backend CORS configuration in `backend/server.js`
2. Make sure your Netlify URL is in the allowed origins
3. Add `FRONTEND_URL` environment variable in Railway with your Netlify URL
4. Redeploy Railway backend after making changes

### Problem: 404 Not Found

**Error**: `GET https://your-app.up.railway.app/api/memories 404`

**Solution**:
1. Make sure the URL includes `/api` at the end
2. Check that your Railway backend is actually running
3. Test the backend directly: `https://your-app.up.railway.app/api/health`

### Problem: Network Error / Connection Refused

**Solution**:
1. Verify Railway backend is deployed and running
2. Check Railway logs for errors
3. Make sure the Railway URL is correct (no typos)
4. Test the backend URL directly in your browser

### Problem: Environment Variable Not Working

**Solution**:
1. Variable name must be exactly: `REACT_APP_API_BASE_URL` (case-sensitive)
2. Must start with `REACT_APP_` to be available in React
3. After adding/changing, you MUST redeploy Netlify
4. Check Netlify build logs to see if the variable is being used

## Verify Environment Variable is Set

To check if the variable is being used:

1. Open your Netlify site
2. Open browser console (F12)
3. Type: `console.log(process.env.REACT_APP_API_BASE_URL)`
4. You should see your Railway URL (or `undefined` if not set)

**Note**: In production builds, React replaces `process.env.REACT_APP_*` variables at build time, so you might not see them in the console. Check the Network tab instead to see where API calls are going.

## Testing the Full Connection

### Test 1: Health Check
1. Visit: `https://your-app.up.railway.app/api/health`
2. Should return: `{"status":"ok"}`

### Test 2: Frontend API Call
1. Open your Netlify site
2. Open browser console (F12) → Network tab
3. Try to load memories or login
4. Check Network tab - you should see requests to your Railway URL
5. Requests should return `200 OK`

### Test 3: Full Flow
1. Visit your Netlify site
2. Try logging in (if using Auth0)
3. Try uploading a file
4. Check that data appears correctly
5. Verify in Network tab that all API calls go to Railway

## Additional Configuration

### If You Have Auth0

Make sure you've also set these in Netlify:
- `REACT_APP_AUTH0_DOMAIN`
- `REACT_APP_AUTH0_CLIENT_ID`
- `REACT_APP_AUTH0_AUDIENCE` (if needed)

And update Auth0 callback URLs to include your Netlify URL.

### If You Need to Update the URL Later

1. Go to Netlify → Site settings → Environment variables
2. Find `REACT_APP_API_BASE_URL`
3. Click the edit icon (pencil)
4. Update the value
5. Save
6. **Redeploy** (Trigger deploy → Clear cache and deploy site)

## Summary

**To connect Railway to Netlify:**

1. ✅ Get Railway backend URL
2. ✅ Add `REACT_APP_API_BASE_URL` = `https://your-railway-url.up.railway.app/api` in Netlify
3. ✅ Verify CORS allows Netlify domain
4. ✅ Redeploy Netlify frontend
5. ✅ Test the connection

**That's it!** Your frontend should now be connected to your backend. 🎉

## Need Help?

- **Railway Issues**: Check Railway logs in the dashboard
- **Netlify Issues**: Check Netlify build logs
- **CORS Issues**: Verify backend CORS configuration
- **API Issues**: Test backend directly with `/api/health` endpoint

