# How to Configure Your Nemotron API Key

## Quick Setup (Recommended)

The easiest way is to add your API key to the `.env` file in the project root. The application automatically loads it when it starts.

### Step 1: Create or Edit `.env` File

Create a file named `.env` in the root directory of your project (same level as `package.json`):

```bash
# In the project root directory
touch .env
```

### Step 2: Add Your API Key

Open the `.env` file and add your Nemotron configuration:

```bash
# NVIDIA Nemotron API Configuration
NEMOTRON_API_KEY=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
NEMOTRON_API_URL=https://integrate.api.nvidia.com/v1
NEMOTRON_MODEL=meta/llama-3.1-70b-instruct
USE_NEMOTRON=true
```

**Important:**
- No spaces around the `=` sign
- No quotes around the API key value
- The `.env` file is already in `.gitignore` so your key won't be committed to git

### Step 3: Verify It's Working

Test that the key is loaded correctly:

```bash
# Test the configuration
npm run analyze
```

Or test manually:
```bash
node -e "require('dotenv').config(); console.log('API Key:', process.env.NEMOTRON_API_KEY ? '✅ Set' : '❌ Not set');"
```

## How It Works

1. **Automatic Loading**: The backend server (`backend/server.js`) automatically loads the `.env` file using `dotenv`:
   ```javascript
   require('dotenv').config();
   ```

2. **No Manual Export Needed**: You don't need to run `export NEMOTRON_API_KEY=...` in your terminal. The `.env` file is loaded automatically.

3. **Works Everywhere**: Once configured in `.env`, the key is available to:
   - Backend server (`backend/server.js`)
   - Analysis scripts (`backend/scripts/analyze-memories.js`)
   - All backend agents (`backend/agents/nemotron.js`)

## Current Configuration

Your current `.env` file should look like this:

```
NEMOTRON_API_KEY=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
NEMOTRON_API_URL=https://integrate.api.nvidia.com/v1
NEMOTRON_MODEL=meta/llama-3.1-70b-instruct
USE_NEMOTRON=true
```

## Alternative: Environment Variables (Not Recommended)

If you prefer to set it in your terminal session instead of `.env`:

```bash
# Set for current session
export NEMOTRON_API_KEY=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

# Then run
npm run analyze
```

**Note:** This only works for the current terminal session. The `.env` file method is better because it persists.

## Troubleshooting

### Key Not Being Loaded

1. **Check file location**: Make sure `.env` is in the project root (same directory as `package.json`)
2. **Check file name**: It must be exactly `.env` (not `.env.txt` or `env`)
3. **Restart the server**: After changing `.env`, restart your backend server:
   ```bash
   # Stop the server (Ctrl+C) and restart
   npm run dev
   ```

### Still Getting 403 Errors

If your key is configured but still getting 403 errors:

1. **Verify key is active**: Check your NVIDIA dashboard at https://build.nvidia.com/
2. **Check key permissions**: Ensure the key has access to the models you're using
3. **Wait a few minutes**: New keys may take a few minutes to activate
4. **Try a different model**: Update `NEMOTRON_MODEL` in `.env` to try different models

### Verify Configuration

Check that your key is loaded:

```bash
# Quick check
node -e "require('dotenv').config(); console.log('Key loaded:', !!process.env.NEMOTRON_API_KEY);"
```

## Configuration Options

### Available Models

You can change the model in `.env`:

```
NEMOTRON_MODEL=meta/llama-3.1-70b-instruct    # Default
NEMOTRON_MODEL=meta/llama-3.1-8b-instruct     # Faster, smaller
NEMOTRON_MODEL=mistralai/mistral-large         # Alternative
```

### API Endpoints

The default endpoint is usually correct, but you can change it:

```
NEMOTRON_API_URL=https://integrate.api.nvidia.com/v1
```

### Disable Nemotron

To temporarily disable Nemotron (will cause errors since system requires it):

```
USE_NEMOTRON=false
```

## Summary

✅ **Recommended Method**: Add to `.env` file in project root  
✅ **Automatic**: No need to export variables manually  
✅ **Persistent**: Configuration persists across sessions  
✅ **Secure**: `.env` is in `.gitignore` (won't be committed)

Your API key is already configured in `.env`! Just restart your server if you made changes.

