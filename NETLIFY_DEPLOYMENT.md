# Netlify Deployment Guide

This guide will walk you through deploying your Memory Garden AI frontend to Netlify.

## Prerequisites

1. A GitHub account (or GitLab/Bitbucket)
2. Your code pushed to a Git repository
3. Your backend API deployed and accessible (e.g., on Heroku, Railway, Render, etc.)
4. A Netlify account (free tier is fine)

## Step 1: Prepare Your Repository

1. Make sure all your changes are committed:
   ```bash
   git add .
   git commit -m "Prepare for Netlify deployment"
   ```

2. Push to your remote repository:
   ```bash
   git push origin main
   ```

## Step 2: Deploy Backend First

**Important:** Your frontend needs a backend API to work. Deploy your backend to a service like:
- **Heroku** (free tier available)
- **Railway** (free tier available)
- **Render** (free tier available)
- **Fly.io** (free tier available)

Once deployed, note your backend URL (e.g., `https://your-app.herokuapp.com`)

## Step 3: Deploy to Netlify

### Option A: Deploy via Netlify Dashboard (Recommended for first-time)

1. **Go to Netlify**: Visit [https://app.netlify.com](https://app.netlify.com) and sign in

2. **Add New Site**: Click "Add new site" → "Import an existing project"

3. **Connect to Git**: Choose your Git provider (GitHub, GitLab, or Bitbucket) and authorize Netlify

4. **Select Repository**: Choose your repository from the list

5. **Configure Build Settings**:
   - **Base directory**: `frontend`
   - **Build command**: `npm install && npm run build`
   - **Publish directory**: `frontend/build`

6. **Set Environment Variables**:
   - Click "Show advanced" → "New variable"
   - Add: `REACT_APP_API_BASE_URL` = `https://your-backend-url.com/api`
     (Replace with your actual deployed backend URL)

7. **Deploy**: Click "Deploy site"

### Option B: Deploy via Netlify CLI

1. **Install Netlify CLI**:
   ```bash
   npm install -g netlify-cli
   ```

2. **Login to Netlify**:
   ```bash
   netlify login
   ```

3. **Initialize Netlify** (from project root):
   ```bash
   netlify init
   ```
   - Choose "Create & configure a new site"
   - Follow the prompts

4. **Set Environment Variable**:
   ```bash
   netlify env:set REACT_APP_API_BASE_URL "https://your-backend-url.com/api"
   ```

5. **Deploy**:
   ```bash
   netlify deploy --prod
   ```

## Step 4: Verify Deployment

1. After deployment completes, Netlify will provide you with a URL (e.g., `https://your-app.netlify.app`)

2. Visit the URL and test your application

3. Check the browser console for any errors

## Step 5: Configure Custom Domain (Optional)

1. In Netlify dashboard, go to "Domain settings"
2. Click "Add custom domain"
3. Follow the instructions to configure your domain

## Troubleshooting

### Build Fails
- Check the build logs in Netlify dashboard
- Ensure all dependencies are in `package.json`
- Verify the build command works locally: `cd frontend && npm run build`

### API Calls Fail
- Verify `REACT_APP_API_BASE_URL` is set correctly in Netlify environment variables
- Check that your backend is deployed and accessible
- Ensure CORS is configured on your backend to allow requests from your Netlify domain

### Environment Variables Not Working
- Environment variables must start with `REACT_APP_` to be available in React
- After adding/changing environment variables, trigger a new deployment
- Check that variables are set in Netlify dashboard under Site settings → Environment variables

## Continuous Deployment

Netlify automatically deploys when you push to your main branch. To disable or configure:
- Go to Site settings → Build & deploy → Continuous Deployment
- Configure branch and build settings as needed

## Additional Resources

- [Netlify Documentation](https://docs.netlify.com/)
- [React Environment Variables](https://create-react-app.dev/docs/adding-custom-environment-variables/)

