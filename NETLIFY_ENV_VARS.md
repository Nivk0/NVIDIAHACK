# Fix Netlify Environment Variables

## The Problem
Your Netlify deployment shows "Domain: undefined" and "Client ID: undefined" because Netlify doesn't use your local `.env` file. You need to add environment variables in the Netlify dashboard.

## Solution: Add Environment Variables in Netlify

### Step 1: Go to Netlify Dashboard
1. Go to: **https://app.netlify.com**
2. Log in to your account
3. Click on your site: **nvidiaai** (or whatever you named it)

### Step 2: Navigate to Environment Variables
1. Click **"Site settings"** (gear icon or in the top menu)
2. In the left sidebar, click **"Environment variables"**
3. Click **"Add a variable"** button

### Step 3: Add These Variables

Add each variable one by one:

#### Variable 1:
- **Key**: `REACT_APP_AUTH0_DOMAIN`
- **Value**: `dev-w0z7um1c0uzv5dm8.us.auth0.com`
- **Scopes**: Select "All scopes" (or "Production" if you want)
- Click **"Create variable"**

#### Variable 2:
- **Key**: `REACT_APP_AUTH0_CLIENT_ID`
- **Value**: `nCUpzsQCTZEyt6UyaJI2ravBdemFQ5Ex`
- **Scopes**: Select "All scopes"
- Click **"Create variable"**

#### Variable 3:
- **Key**: `REACT_APP_AUTH0_AUDIENCE`
- **Value**: (leave empty or don't add this one if not needed)
- **Scopes**: Select "All scopes"
- Click **"Create variable"** (or skip if not using API)

#### Variable 4:
- **Key**: `REACT_APP_API_BASE_URL`
- **Value**: Your backend API URL (e.g., `https://your-backend.herokuapp.com/api` or `https://your-backend.railway.app/api`)
- **Scopes**: Select "All scopes"
- Click **"Create variable"**

### Step 4: Redeploy
After adding the variables:
1. Go back to your site dashboard
2. Click **"Deploys"** tab
3. Click **"Trigger deploy"** → **"Clear cache and deploy site"**
4. Wait for the build to complete

### Step 5: Update Auth0 Callback URLs
Don't forget to add your Netlify URL to Auth0:

1. Go to: **https://manage.auth0.com**
2. Applications → Memory Garden → Settings
3. Scroll to "Application URIs"
4. Update **Allowed Callback URLs** to include:
   ```
   http://localhost:3000,https://nvidiaai.netlify.app
   ```
5. Update **Allowed Logout URLs**:
   ```
   http://localhost:3000,https://nvidiaai.netlify.app
   ```
6. Update **Allowed Web Origins**:
   ```
   http://localhost:3000,https://nvidiaai.netlify.app
   ```
7. Click **"Save Changes"**

## Quick Checklist

- ✅ Added `REACT_APP_AUTH0_DOMAIN` in Netlify
- ✅ Added `REACT_APP_AUTH0_CLIENT_ID` in Netlify
- ✅ Added `REACT_APP_API_BASE_URL` in Netlify (your backend URL)
- ✅ Triggered a new deploy in Netlify
- ✅ Added Netlify URL to Auth0 callback URLs
- ✅ Saved changes in Auth0

## Important Notes

- **Environment variables in Netlify are different from `.env` files**
- `.env` files are for local development only
- Netlify needs variables set in the dashboard
- After adding variables, you MUST redeploy for them to take effect
- Variable names must start with `REACT_APP_` to be available in React

## Verify It Worked

After redeploying:
1. Go to https://nvidiaai.netlify.app
2. Open browser console (F12)
3. You should see:
   ```
   🔍 Auth0 Environment Check:
   Domain: dev-w0z7um1c0uzv5dm8.us.auth0.com
   Client ID: nCUpzsQCT...
   ```

If you still see "undefined", the variables weren't set correctly or the site needs to be redeployed.

