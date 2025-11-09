# NVIDIA Nemotron Integration Guide

This guide explains how to set up and use NVIDIA Nemotron for AI-powered memory analysis.

## Overview

Nemotron is NVIDIA's family of large language models that can analyze memories and determine whether they should be kept, compressed, or forgotten. The integration automatically uses Nemotron when an API key is configured, and falls back to rule-based analysis otherwise.

## Setup Instructions

⚠️ **API Key Status: Current key is returning 403 errors**

The NVIDIA Nemotron API key in your `.env` file is currently returning 403 Forbidden errors. This means the key is either invalid, expired, or doesn't have access to the requested models.

**See [API_KEY_UPDATE.md](API_KEY_UPDATE.md) for step-by-step instructions to get and update your API key.**

### Configuration

The `.env` file contains:
- `NEMOTRON_API_KEY`: Your NVIDIA API key (already configured)
- `NEMOTRON_API_URL`: API endpoint (defaults to NVIDIA's public endpoint)
- `NEMOTRON_MODEL`: Model to use (defaults to Nemotron-4)
- `USE_NEMOTRON`: Set to `false` to disable Nemotron

### To Update Your API Key

If you need to change the API key, edit the `.env` file:

```bash
# Edit .env file
NEMOTRON_API_KEY=your_new_api_key_here
```

### To Get a New API Key

1. Visit [NVIDIA Build](https://build.nvidia.com/)
2. Sign up or log in to your NVIDIA account
3. Navigate to the API Keys section
4. Create a new API key
5. Update the `.env` file with the new key

### 3. Available Models

You can use any of these NVIDIA models:

- `nv-ai-foundation/nemotron-4-340b-instruct` (Recommended - Nemotron-4)
- `meta/llama-3.1-70b-instruct` (Alternative)
- `meta/llama-3.1-8b-instruct` (Faster, smaller)

Check [NVIDIA's documentation](https://build.nvidia.com/) for the latest available models.

### 4. Test the Integration

Test that Nemotron is working:

```bash
# The API key is automatically loaded from .env file
# No need to export it manually!

# Run the analysis script on existing memories
npm run analyze
```

This will analyze all memories in `backend/data/memories/` and update them with Nemotron's predictions.

**Note:** The API key should be in your `.env` file (see [NEMOTRON_CONFIGURATION.md](NEMOTRON_CONFIGURATION.md) for detailed setup instructions). You don't need to export it in your terminal.

## How It Works

### Analysis Process

1. **Memory Analysis**: For each memory, Nemotron receives:
   - Memory type (document, image, email, text)
   - Age (in months)
   - Content or summary
   - Creation date

2. **AI Evaluation**: Nemotron analyzes:
   - Relevance in 1 month
   - Relevance in 1 year
   - Emotional attachment level
   - Sentiment (positive, negative, neutral)
   - Recommended action (keep, compress, forget)

3. **Decision Making**: Based on the analysis:
   - **Keep**: Important, meaningful memories with high value
   - **Compress**: Moderately important memories that can be stored efficiently
   - **Forget**: Outdated or irrelevant content

### Automatic vs Manual Analysis

- **New Uploads**: Automatically analyzed with Nemotron (if API key is set)
- **Existing Memories**: Use `npm run analyze` to re-analyze with Nemotron

## Important: Nemotron-Only Mode

⚠️ **The system is now configured to use ONLY Nemotron - no fallback to rule-based analysis.**

If Nemotron is unavailable (no API key, API errors, etc.), the system will throw an error instead of falling back to rules. This ensures all actions come from AI analysis, not hardcoded rules.

To use the app, you **must** have a valid Nemotron API key configured.

## Troubleshooting

### API Key Issues

**Error: "NEMOTRON_API_KEY is not set"**
- Solution: Set the `NEMOTRON_API_KEY` environment variable

**Error: "Invalid API key"**
- Solution: Check that your API key is correct and active

### Model Issues

**Error: "Model not found"**
- Solution: Check that the model name is correct. Try: `nv-ai-foundation/nemotron-4-340b-instruct`

### Rate Limiting

**Error: "Rate limit exceeded"**
- Solution: The script includes delays between requests. For large batches, you may need to increase delays in `backend/agents/nemotron.js`

### Network Issues

**Error: "Request timeout"**
- Solution: Check your internet connection. The timeout is set to 30 seconds per request.

## Cost Considerations

- NVIDIA provides free tier access with usage limits
- Check [NVIDIA's pricing](https://build.nvidia.com/) for current rates
- The integration includes rate limiting to manage costs

## Advanced Configuration

### Custom Prompts

Edit `backend/agents/nemotron.js` to customize the analysis prompt:

```javascript
buildPrompt(memory) {
  // Customize the prompt here
  return `Your custom prompt...`;
}
```

### Batch Processing

Adjust batch size and delays in the analysis script:

```javascript
// In analyze-memories.js
const batchSize = 5; // Process 5 memories at a time
await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay
```

### Error Handling

The system automatically falls back to rule-based analysis if Nemotron fails. You can customize fallback behavior in `backend/agents/nemotron.js`.

## Support

For issues with:
- **Nemotron API**: Check [NVIDIA's documentation](https://build.nvidia.com/)
- **Integration**: Check the application logs and error messages
- **Model Selection**: Try different models to find the best fit

## Examples

### Analyze Existing Memories

```bash
# API key is loaded from .env automatically
npm run analyze
```

### Use Different Model

Edit `.env` file:
```
NEMOTRON_MODEL=meta/llama-3.1-8b-instruct
```

Then run:
```bash
npm run analyze
```

### Disable Nemotron

Edit `.env` file:
```
USE_NEMOTRON=false
```

Then restart the server:
```bash
npm run dev
```

**See [NEMOTRON_CONFIGURATION.md](NEMOTRON_CONFIGURATION.md) for complete configuration guide.**

