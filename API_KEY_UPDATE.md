# How to Update Your NVIDIA Nemotron API Key

## Current Status

❌ **Your current API key is returning 403 Forbidden errors.**

This means the API key is either:
- Invalid or expired
- Doesn't have access to the requested models
- Needs to be regenerated

## Quick Fix: Get a New API Key

### Step 1: Get Your API Key

1. Visit **https://build.nvidia.com/**
2. Sign in with your NVIDIA account (or create one if needed)
3. Navigate to **API Keys** section
4. Click **"Create New API Key"** or **"Generate Key"**
5. Copy the new API key (it will look like: `nvapi-...`)

### Step 2: Update Your .env File

1. Open the `.env` file in the project root
2. Find the line: `NEMOTRON_API_KEY=...`
3. Replace the old key with your new key:
   ```
   NEMOTRON_API_KEY=your_new_api_key_here
   ```
4. Save the file

### Step 3: Test the New Key

Run this command to test if the new key works:

```bash
npm run analyze
```

Or test manually:
```bash
node -e "require('dotenv').config(); const https = require('https'); const key = process.env.NEMOTRON_API_KEY; const req = https.request({ hostname: 'integrate.api.nvidia.com', path: '/v1/chat/completions', method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key } }, (res) => { console.log('Status:', res.statusCode); res.on('data', d => process.stdout.write(d)); }); req.write(JSON.stringify({ model: 'meta/llama-3.1-70b-instruct', messages: [{ role: 'user', content: 'test' }], max_tokens: 5 })); req.end();"
```

If you see `Status: 200`, your key is working! ✅

## Alternative: Use a Different Model

If your API key works but doesn't have access to `meta/llama-3.1-70b-instruct`, try updating the model in `.env`:

```
NEMOTRON_MODEL=meta/llama-3.1-8b-instruct
```

Or check available models at https://build.nvidia.com/

## Troubleshooting

### Still Getting 403 Errors?

1. **Verify the key format**: Should start with `nvapi-` and be about 70 characters long
2. **Check for extra spaces**: Make sure there are no spaces around the `=` sign
3. **Restart the server**: After updating `.env`, restart your backend server
4. **Check API key permissions**: Some keys may only work with specific models or endpoints

### Need Help?

- Check NVIDIA's documentation: https://docs.nvidia.com/nim/
- Visit NVIDIA Build dashboard: https://build.nvidia.com/
- Check your API key status and usage limits in the dashboard

