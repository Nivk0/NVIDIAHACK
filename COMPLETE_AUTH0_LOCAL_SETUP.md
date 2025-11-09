# Complete Auth0 Local Setup Guide

## Your Current Configuration

- **Domain**: `dev-w0z7um1c0uzv5dm8.us.auth0.com`
- **Client ID**: `nCUpzsQCTZEyt6UyaJI2ravBdemFQ5Ex`
- **Local URL**: `http://localhost:3000`
- **Redirect URI**: `http://localhost:3000` (this is what needs to be in Auth0)

## Step-by-Step Auth0 Configuration

### Step 1: Open Auth0 Dashboard
1. Go to: **https://manage.auth0.com**
2. Log in with your Auth0 account

### Step 2: Navigate to Your Application
1. In the left sidebar, click **"Applications"**
2. Under "Applications", click **"Applications"** again
3. Click on **"Memory Garden"** (or whatever you named your app)

### Step 3: Go to Settings Tab
- Click the **"Settings"** tab (should be selected by default)

### Step 4: Configure Application URIs

Scroll down to the **"Application URIs"** section. You'll see three text fields:

#### Field 1: Allowed Callback URLs
**Type exactly this (copy and paste):**
```
http://localhost:3000
```

#### Field 2: Allowed Logout URLs
**Type exactly this:**
```
http://localhost:3000
```

#### Field 3: Allowed Web Origins
**Type exactly this:**
```
http://localhost:3000
```

### Step 5: Clear Application Login URL (Important!)
1. Find **"Application Login URL"** or **"Initiate Login URI"**
2. **Delete everything** in this field (leave it completely empty)
3. This field is NOT needed for Single Page Apps

### Step 6: Save Changes
1. **Scroll ALL the way to the bottom** of the page
2. Look for the blue **"Save Changes"** button
3. Click it
4. **Wait for the green success message** at the top that says "Application updated successfully"

### Step 7: Verify It Saved
1. Refresh the page (F5)
2. Scroll back to "Application URIs"
3. Verify all three fields still show `http://localhost:3000`
4. If they're empty, you didn't save - repeat Step 6

## Test Your Setup

### Step 1: Make Sure Your Dev Server is Running
```bash
cd frontend
npm start
```

Wait for "Compiled successfully!"

### Step 2: Open Your App
1. Go to: **http://localhost:3000**
2. You should see the NVIDIA login page

### Step 3: Test Login
1. Click the **"Login"** button
2. You should be redirected to Auth0 (not see an error)
3. Sign up or log in with Auth0
4. You should be redirected back to your app

## If You Still Get Errors

### Error: "Callback URL mismatch"
- **Check**: Did you click "Save Changes" at the bottom?
- **Check**: Is it exactly `http://localhost:3000` (no trailing slash, no https)?
- **Check**: Did you wait for the green success message?
- **Try**: Clear browser cache (Cmd+Shift+R) and try again

### Error: "Invalid state"
- Clear your browser cookies for localhost
- Try in an incognito/private window

### Still Not Working?
1. Click "See details for this error" in Auth0
2. It will show what URL it received vs what's allowed
3. Share that information and we can fix it

## Quick Verification Checklist

Before testing, make sure:
- ✅ `.env` file exists in `frontend/` directory
- ✅ `.env` contains your Domain and Client ID
- ✅ Dev server is running (`npm start`)
- ✅ Auth0 has `http://localhost:3000` in all three URL fields
- ✅ You clicked "Save Changes" in Auth0
- ✅ You saw the green success message

## Your Exact Values

**In Auth0 Dashboard:**
- Application: Memory Garden
- Domain: dev-w0z7um1c0uzv5dm8.us.auth0.com
- Client ID: nCUpzsQCTZEyt6UyaJI2ravBdemFQ5Ex

**In Your .env File:**
```
REACT_APP_AUTH0_DOMAIN=dev-w0z7um1c0uzv5dm8.us.auth0.com
REACT_APP_AUTH0_CLIENT_ID=nCUpzsQCTZEyt6UyaJI2ravBdemFQ5Ex
REACT_APP_AUTH0_AUDIENCE=
REACT_APP_API_BASE_URL=http://localhost:5001/api
```

**In Auth0 Allowed URLs:**
```
http://localhost:3000
```

That's it! Once you save these in Auth0, it should work immediately.

