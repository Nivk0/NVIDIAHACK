# Troubleshooting Auth0 Environment Variables

## If environment variables still show as "undefined" after restart:

### 1. Clear Browser Cache
- **Chrome/Edge**: Press `Ctrl+Shift+Delete` (or `Cmd+Shift+Delete` on Mac)
- Select "Cached images and files"
- Click "Clear data"
- Or try a **hard refresh**: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)

### 2. Verify .env File Location
The `.env` file MUST be in the `frontend/` directory (same level as `package.json`):
```bash
cd frontend
ls -la .env
# Should show: -rw-r--r--  1 nk  staff  191 Nov  9 07:33 .env
```

### 3. Check .env File Format
Make sure there are:
- ✅ No spaces around the `=` sign
- ✅ No quotes around values
- ✅ Each variable on its own line
- ✅ Variables start with `REACT_APP_`

**Correct format:**
```
REACT_APP_AUTH0_DOMAIN=dev-w0z7um1c0uzv5dm8.us.auth0.com
REACT_APP_AUTH0_CLIENT_ID=nCUpzsQCTZEyt6UyaJI2ravBdemFQ5Ex
```

**Wrong format:**
```
REACT_APP_AUTH0_DOMAIN = dev-w0z7um1c0uzv5dm8.us.auth0.com  # ❌ Spaces around =
REACT_APP_AUTH0_DOMAIN="dev-w0z7um1c0uzv5dm8.us.auth0.com"  # ❌ Quotes (sometimes works but not recommended)
```

### 4. Force Server Restart
```bash
# Stop all React processes
pkill -f "react-scripts"

# Clear cache
cd frontend
rm -rf node_modules/.cache

# Start fresh
npm start
```

### 5. Check Browser Console
Open Developer Tools (F12) and look for:
```
🔍 Auth0 Environment Check:
Domain: dev-w0z7um1c0uzv5dm8.us.auth0.com
Client ID: nCUpzsQCT...
```

If you see "❌ MISSING", the server didn't load the .env file.

### 6. Verify Server Started Correctly
When you run `npm start`, you should see:
- "Starting the development server..."
- "Compiled successfully!"
- No errors about missing files

### 7. Try Creating .env.local
Sometimes `.env.local` takes precedence:
```bash
cd frontend
cp .env .env.local
npm start
```

### 8. Check for Multiple .env Files
React Scripts loads files in this order (later ones override):
1. `.env`
2. `.env.local`
3. `.env.development`
4. `.env.development.local`

Make sure you don't have conflicting values in other files.

## Still Not Working?

1. **Check terminal output** when starting the server - any errors?
2. **Try a different browser** (Firefox, Safari) to rule out browser cache
3. **Restart your computer** (sometimes helps with process issues)
4. **Check if port 3000 is actually running the right server:**
   ```bash
   lsof -i :3000
   ```

