# Fix Auth0 Callback URL Mismatch Error

## ✅ Good News!
Your environment variables are working! The error now is just a configuration issue in Auth0.

## The Problem
Auth0 is rejecting the redirect because `http://localhost:3000` isn't in your allowed callback URLs.

## The Solution

### Step 1: Go to Auth0 Dashboard
1. Open: https://manage.auth0.com
2. Go to **Applications** → **Applications** (left sidebar)
3. Click on your application (should be "Memory Garden" or "My App")

### Step 2: Configure Callback URLs
1. Click on the **Settings** tab
2. Scroll down to **Application URIs** section
3. Add these URLs (one per line):

   **Allowed Callback URLs:**
   ```
   http://localhost:3000
   ```

   **Allowed Logout URLs:**
   ```
   http://localhost:3000
   ```

   **Allowed Web Origins:**
   ```
   http://localhost:3000
   ```

4. **Scroll to the bottom** and click **Save Changes**

### Step 3: Test Again
1. Go back to http://localhost:3000
2. Click "Login" again
3. It should now work! 🎉

## Important Notes

- ✅ Use `http://` (not `https://`) for localhost
- ✅ No trailing slash: `http://localhost:3000` (not `http://localhost:3000/`)
- ✅ Each URL on its own line
- ✅ You can add multiple URLs (one per line) if needed

## For Production (Later)

When you deploy to Netlify, you'll need to add your production URL too:
```
http://localhost:3000,https://your-app.netlify.app
```

But for now, just `http://localhost:3000` is enough!

