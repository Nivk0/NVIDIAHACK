# Auth0 Setup Guide

This guide will help you set up Auth0 authentication for your Memory Garden AI application.

## Step 1: Create an Auth0 Account and Application

1. **Sign up for Auth0**: Go to [https://auth0.com](https://auth0.com) and create a free account

2. **Create a New Application**:
   - In the Auth0 Dashboard, go to **Applications** → **Applications**
   - Click **Create Application**
   - Name it "Memory Garden AI" (or your preferred name)
   - Select **Single Page Web Applications**
   - Click **Create**

3. **Configure Application Settings**:
   - Go to the **Settings** tab of your application
   - Note down the following values (you'll need them):
     - **Domain** (e.g., `your-tenant.auth0.com`)
     - **Client ID**

4. **Configure Allowed URLs**:
   - **Allowed Callback URLs**: 
     - For local development: `http://localhost:3000`
     - For production: `https://your-netlify-app.netlify.app`
   - **Allowed Logout URLs**: Same as callback URLs
   - **Allowed Web Origins**: Same as callback URLs
   - Click **Save Changes**

## Step 2: Create an API (Optional but Recommended)

If you want to secure your backend API with Auth0:

1. In Auth0 Dashboard, go to **Applications** → **APIs**
2. Click **Create API**
3. Fill in:
   - **Name**: Memory Garden API
   - **Identifier**: `https://memory-garden-api` (or your preferred identifier)
   - **Signing Algorithm**: RS256
4. Click **Create**
5. Note the **Identifier** (this is your Audience)

## Step 3: Configure Environment Variables

### For Local Development

Create a `.env` file in the `frontend` directory:

```env
REACT_APP_AUTH0_DOMAIN=your-tenant.auth0.com
REACT_APP_AUTH0_CLIENT_ID=your-client-id-here
REACT_APP_AUTH0_AUDIENCE=https://memory-garden-api
REACT_APP_API_BASE_URL=http://localhost:5001/api
```

Replace:
- `your-tenant.auth0.com` with your Auth0 domain
- `your-client-id-here` with your Client ID
- `https://memory-garden-api` with your API identifier (if you created an API)

### For Netlify Deployment

1. Go to your Netlify site dashboard
2. Navigate to **Site settings** → **Environment variables**
3. Add the following variables:
   - `REACT_APP_AUTH0_DOMAIN` = `your-tenant.auth0.com`
   - `REACT_APP_AUTH0_CLIENT_ID` = `your-client-id-here`
   - `REACT_APP_AUTH0_AUDIENCE` = `https://memory-garden-api` (if using API)
   - `REACT_APP_API_BASE_URL` = `https://your-backend-url.com/api`

## Step 4: Update Auth0 Application Settings for Production

After deploying to Netlify:

1. Go back to your Auth0 Application settings
2. Update **Allowed Callback URLs** to include your Netlify URL:
   ```
   http://localhost:3000,https://your-netlify-app.netlify.app
   ```
3. Update **Allowed Logout URLs**:
   ```
   http://localhost:3000,https://your-netlify-app.netlify.app
   ```
4. Update **Allowed Web Origins**:
   ```
   http://localhost:3000,https://your-netlify-app.netlify.app
   ```
5. Click **Save Changes**

## Step 5: Test Authentication

1. Start your development server:
   ```bash
   cd frontend
   npm start
   ```

2. You should see a login screen
3. Click "Log In" and authenticate with Auth0
4. After successful login, you should see the main application

## Step 6: Backend Integration (Optional)

If you want to verify tokens on your backend, you'll need to:

1. Install Auth0 SDK for Node.js:
   ```bash
   cd backend
   npm install express-oauth-server express-jwt jwks-rsa
   ```

2. Add middleware to verify tokens (example):
   ```javascript
   const jwt = require('express-jwt');
   const jwks = require('jwks-rsa');

   const jwtCheck = jwt({
     secret: jwks.expressJwtSecret({
       cache: true,
       rateLimit: true,
       jwksRequestsPerMinute: 5,
       jwksUri: 'https://YOUR_AUTH0_DOMAIN/.well-known/jwks.json'
     }),
     audience: 'YOUR_API_IDENTIFIER',
     issuer: 'https://YOUR_AUTH0_DOMAIN/',
     algorithms: ['RS256']
   });

   // Apply to protected routes
   app.use('/api/memories', jwtCheck);
   app.use('/api/clusters', jwtCheck);
   // etc.
   ```

## Troubleshooting

### "Invalid state" error
- Clear your browser cache and cookies
- Make sure callback URLs are correctly configured

### Token not being sent
- Check browser console for errors
- Verify environment variables are set correctly
- Make sure `REACT_APP_` prefix is used for all environment variables

### CORS errors
- Ensure your backend CORS settings allow requests from your frontend domain
- Check that Auth0 Web Origins are configured correctly

### Users can't log in
- Verify Auth0 application settings
- Check that callback URLs match exactly (including http vs https)
- Ensure environment variables are loaded correctly

## Additional Resources

- [Auth0 React SDK Documentation](https://auth0.com/docs/libraries/auth0-react)
- [Auth0 Quick Start Guide](https://auth0.com/docs/quickstart/spa/react)
- [Auth0 Dashboard](https://manage.auth0.com/)

