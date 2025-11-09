# Fix Auth0 Dashboard Errors

## Error: "initiate_login_uri must be https"

If you see this error in your Auth0 dashboard:

1. **Scroll down** on the Settings page
2. Find the **"Initiate Login URI"** field
3. **Leave it empty** (for Single Page Apps, this is not required)
4. Or if you want to set it, use: `https://your-domain.com` (must be https)

**For local development, you can ignore this error** - it won't affect your app.

## Configure Callback URLs

**Important:** You must configure these URLs in Auth0:

1. Scroll to **"Application URIs"** section
2. Set these values:

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

3. Click **Save Changes**

## Test Your Setup

1. Make sure your backend is running:
   ```bash
   cd backend
   npm start
   ```

2. Start your frontend:
   ```bash
   cd frontend
   npm start
   ```

3. Open http://localhost:3000
4. You should see the NVIDIA login page
5. Click "Login" - it should redirect to Auth0!

## If You Still See Errors

- Clear your browser cache
- Make sure `.env` file is in the `frontend` folder
- Restart your dev server after creating `.env`
- Check browser console for any error messages

