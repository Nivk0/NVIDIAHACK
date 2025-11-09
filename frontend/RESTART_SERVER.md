# Fix "undefined" Auth0 Domain Error

## The Problem
If you see `undefined/authorize` in the URL, it means your environment variables aren't loaded.

## The Solution

**React apps only load `.env` files when the dev server starts!**

### Steps to Fix:

1. **Stop your current dev server** (press `Ctrl+C` in the terminal where it's running)

2. **Restart the dev server:**
   ```bash
   cd frontend
   npm start
   ```

3. **Wait for it to compile** (you'll see "Compiled successfully!")

4. **Open http://localhost:3000** in your browser

5. **Try logging in again** - it should work now!

## Verify .env File

Make sure your `.env` file is in the `frontend` folder (not the root):

```bash
cd frontend
cat .env
```

You should see:
```
REACT_APP_AUTH0_DOMAIN=dev-w0z7um1c0uzv5dm8.us.auth0.com
REACT_APP_AUTH0_CLIENT_ID=nCUpzsQCTZEyt6UyaJI2ravBdemFQ5Ex
REACT_APP_AUTH0_AUDIENCE=
REACT_APP_API_BASE_URL=http://localhost:5001/api
```

## Important Notes

- ✅ `.env` file must be in the `frontend/` directory
- ✅ Must restart dev server after creating/modifying `.env`
- ✅ Environment variables must start with `REACT_APP_`
- ✅ No spaces around the `=` sign in `.env` file

## Still Not Working?

1. Check browser console (F12) for errors
2. Make sure you're running from the `frontend` directory
3. Try clearing browser cache
4. Check that `.env` file has no extra spaces or quotes

