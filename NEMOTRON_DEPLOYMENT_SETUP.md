# How to Configure NVIDIA Nemotron After Deployment

This guide shows you how to set up Nemotron on your deployed backend (Railway, Render, etc.).

## Quick Setup (Railway)

### Step 1: Get Your NVIDIA API Key

1. Visit **https://build.nvidia.com/**
2. Sign in with your NVIDIA account (or create one if needed)
3. Navigate to **API Keys** section
4. Click **"Create New API Key"** or **"Generate Key"**
5. Copy the API key (it will look like: `nvapi-...`)

### Step 2: Add Environment Variable in Railway

1. Go to your **Railway Dashboard**: https://railway.app
2. Click on your **backend service**
3. Go to the **"Variables"** tab
4. Click **"+ New Variable"**
5. Add the following variables:

#### Required Variable:
- **Key**: `NEMOTRON_API_KEY`
- **Value**: `nvapi-your-actual-api-key-here` (paste your API key)
- Click **"Add"**

#### Optional Variables (for customization):
- **Key**: `NEMOTRON_API_URL`
- **Value**: `https://integrate.api.nvidia.com/v1`
- Click **"Add"**

- **Key**: `NEMOTRON_MODEL`
- **Value**: `meta/llama-3.1-70b-instruct` (or another model)
- Click **"Add"**

- **Key**: `USE_NEMOTRON`
- **Value**: `true`
- Click **"Add"**

### Step 3: Redeploy (if needed)

Railway will automatically redeploy when you add environment variables. If it doesn't:

1. Go to **"Deployments"** tab
2. Click **"Redeploy"** on the latest deployment
3. Wait for deployment to complete

### Step 4: Verify It's Working

1. Check Railway logs:
   - Go to your service → **"Deployments"** → Click latest deployment → **"View Logs"**
   - Look for: `[Nemotron] NEMOTRON_API_KEY configured` (or similar)
   - Should NOT see: `Nemotron is required but not configured`

2. Test the API:
   - Visit: `https://your-app.up.railway.app/api/health`
   - Should return: `{"status":"ok"}`

3. Test with a memory upload:
   - Upload a file through your frontend
   - Check logs to see if Nemotron analysis is running
   - Memories should have `nemotronAnalyzed: true` in the response

## Alternative: Render.com Setup

If you're using Render instead of Railway:

1. Go to your **Render Dashboard**: https://dashboard.render.com
2. Click on your **Web Service**
3. Go to **"Environment"** tab
4. Click **"Add Environment Variable"**
5. Add the same variables as above:
   - `NEMOTRON_API_KEY` = your API key
   - `NEMOTRON_API_URL` = `https://integrate.api.nvidia.com/v1` (optional)
   - `NEMOTRON_MODEL` = `meta/llama-3.1-70b-instruct` (optional)
   - `USE_NEMOTRON` = `true` (optional)
6. Click **"Save Changes"**
7. Render will automatically redeploy

## Alternative: Heroku Setup

If you're using Heroku:

```bash
# Using Heroku CLI
heroku config:set NEMOTRON_API_KEY=nvapi-your-actual-api-key-here
heroku config:set NEMOTRON_API_URL=https://integrate.api.nvidia.com/v1
heroku config:set NEMOTRON_MODEL=meta/llama-3.1-70b-instruct
heroku config:set USE_NEMOTRON=true

# Or using Heroku Dashboard:
# 1. Go to your app → Settings → Config Vars
# 2. Click "Reveal Config Vars"
# 3. Add each variable manually
```

## Available Models

You can use any of these NVIDIA models (update `NEMOTRON_MODEL`):

- `meta/llama-3.1-70b-instruct` (Default - Recommended)
- `meta/llama-3.1-8b-instruct` (Faster, smaller)
- `mistralai/mistral-large` (Alternative)
- `nv-ai-foundation/nemotron-4-340b-instruct` (If available)

Check https://build.nvidia.com/ for the latest available models.

## Troubleshooting

### Error: "Nemotron is required but not configured"

**Problem**: The `NEMOTRON_API_KEY` environment variable is not set.

**Solution**:
1. Verify the variable is added in Railway/Render/Heroku dashboard
2. Check the variable name is exactly: `NEMOTRON_API_KEY` (case-sensitive)
3. Make sure there are no extra spaces in the value
4. Redeploy your service

### Error: "API authentication failed (403)"

**Problem**: The API key is invalid or doesn't have access to the model.

**Solution**:
1. Verify your API key is correct at https://build.nvidia.com/
2. Check that the key hasn't expired
3. Try a different model (update `NEMOTRON_MODEL`)
4. Wait a few minutes - new keys may take time to activate

### Error: "Model not found (404)"

**Problem**: The model name is incorrect or not available.

**Solution**:
1. Check available models at https://build.nvidia.com/
2. Update `NEMOTRON_MODEL` to a valid model name
3. Try: `meta/llama-3.1-70b-instruct` (most common)

### Nemotron Not Running

**Check logs for**:
- `[Nemotron] NEMOTRON_API_KEY not configured` → Add the API key
- `[Nemotron] API error` → Check API key validity
- `[Nemotron] Request timeout` → Network issue, will retry

**Verify**:
1. Check Railway/Render logs
2. Verify environment variables are set
3. Test API key manually (see below)

## Testing Your API Key

You can test if your API key works by making a test request:

```bash
# Replace YOUR_API_KEY with your actual key
curl -X POST https://integrate.api.nvidia.com/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "model": "meta/llama-3.1-70b-instruct",
    "messages": [{"role": "user", "content": "test"}],
    "max_tokens": 5
  }'
```

If you get a response (not 401/403), your key is working! ✅

## Environment Variables Summary

Here's what you need to add in your deployment platform:

| Variable | Required | Default Value | Description |
|----------|----------|---------------|-------------|
| `NEMOTRON_API_KEY` | ✅ Yes | - | Your NVIDIA API key from build.nvidia.com |
| `NEMOTRON_API_URL` | ❌ No | `https://integrate.api.nvidia.com/v1` | API endpoint |
| `NEMOTRON_MODEL` | ❌ No | `meta/llama-3.1-70b-instruct` | Model to use |
| `USE_NEMOTRON` | ❌ No | `true` | Enable/disable Nemotron |

## After Configuration

Once you've added the environment variables:

1. ✅ **Redeploy** your backend (automatic on Railway/Render)
2. ✅ **Check logs** to verify Nemotron is loading
3. ✅ **Test upload** a file to see Nemotron analysis in action
4. ✅ **Verify** memories have `nemotronAnalyzed: true` in responses

## Cost Considerations

- NVIDIA provides free tier access with usage limits
- Check https://build.nvidia.com/ for current pricing
- The integration includes rate limiting to manage costs
- Caching reduces API calls (memories are cached for 7 days)

## Summary

**To enable Nemotron after deployment:**

1. Get API key from https://build.nvidia.com/
2. Add `NEMOTRON_API_KEY` environment variable in Railway/Render/Heroku
3. (Optional) Add other configuration variables
4. Redeploy
5. Done! 🎉

Your deployed backend will now use NVIDIA Nemotron for AI-powered memory analysis!

