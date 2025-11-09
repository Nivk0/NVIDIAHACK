# Quick Auth0 Setup Guide

Follow these steps to get Auth0 working in 5 minutes:

## Step 1: Create Auth0 Account (Free)

1. Go to **https://auth0.com** and click "Sign Up"
2. Create a free account (no credit card required)
3. You'll be taken to the Auth0 Dashboard

## Step 2: Create Application

1. In Auth0 Dashboard, click **Applications** → **Applications** (left sidebar)
2. Click **Create Application** button
3. Fill in:
   - **Name**: `Memory Garden AI` (or any name you like)
   - **Application Type**: Select **Single Page Web Applications**
4. Click **Create**

## Step 3: Get Your Credentials

1. You'll be on the **Settings** tab of your new application
2. Scroll down and find:
   - **Domain** (looks like: `your-username.auth0.com`)
   - **Client ID** (a long string of letters and numbers)
3. **Copy both values** - you'll need them in the next step

## Step 4: Configure Callback URLs

Still on the Settings page, scroll to **Application URIs**:

1. **Allowed Callback URLs**: Add `http://localhost:3000`
2. **Allowed Logout URLs**: Add `http://localhost:3000`
3. **Allowed Web Origins**: Add `http://localhost:3000`
4. Click **Save Changes** at the bottom

## Step 5: Create .env File

1. Go to your project folder: `cd frontend`
2. Create a file named `.env` (note the dot at the beginning)
3. Copy this template and fill in your values:

```env
REACT_APP_AUTH0_DOMAIN=your-tenant.auth0.com
REACT_APP_AUTH0_CLIENT_ID=your-client-id-here
REACT_APP_AUTH0_AUDIENCE=
REACT_APP_API_BASE_URL=http://localhost:5001/api
```

**Replace:**
- `your-tenant.auth0.com` with your **Domain** from Step 3
- `your-client-id-here` with your **Client ID** from Step 3
- Leave `REACT_APP_AUTH0_AUDIENCE` empty for now (optional)

## Step 6: Test It!

1. Make sure your backend is running: `cd backend && npm start` (in another terminal)
2. Start your frontend: `cd frontend && npm start`
3. Open http://localhost:3000
4. You should see the NVIDIA login page
5. Click "Login" - it will redirect to Auth0
6. Sign up or log in with Auth0
7. You'll be redirected back to your app!

## That's It! 🎉

Your Auth0 is now working. The `.env` file is already in `.gitignore`, so your credentials won't be committed to git.

## For Production (Netlify)

When you deploy to Netlify:

1. Go to your Netlify site dashboard
2. **Site settings** → **Environment variables**
3. Add the same variables from your `.env` file
4. Update Auth0 callback URLs to include your Netlify URL

## Need Help?

- Check the browser console for errors
- Make sure `.env` file is in the `frontend` folder (not root)
- Restart your dev server after creating `.env`
- Verify your Auth0 callback URLs match exactly

