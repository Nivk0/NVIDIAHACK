# Sample Data for Memory Garden AI Demo

This directory contains sample files that demonstrate all the features of the Memory Garden AI application.

## Files Included

### Documents
- **meeting-notes-2024.txt** - Meeting notes from a project kickoff
- **research-paper-abstract.md** - Academic research paper abstract
- **important-document.txt** - Insurance policy information (high importance)
- **project-ideas.txt** - List of project ideas and priorities

### Personal Notes
- **personal-notes.txt** - Personal journal entries and reminders
- **random-thoughts.txt** - Random daily observations
- **old-photo-description.txt** - Description of an old family photo

### Data Files
- **expenses-2024.csv** - Expense tracking spreadsheet data
- **email-draft.eml** - Email message with action items

### Images
- **vacation-photo.jpg.txt** - Description of a vacation photo (placeholder)
- **meeting-whiteboard.jpg.txt** - Description of a meeting whiteboard photo (placeholder)
- **sunset-beach.jpg.txt** - Description of a sunset beach photo (placeholder)

## How to Use for Demo

1. **Upload via Web Interface:**
   - Go to the Memory Garden AI app
   - Click "+ Upload Data"
   - Select all files from this directory (or select the entire folder)
   - Click "Upload & Analyze"

2. **What to Expect:**
   - The AI will analyze each file
   - Files will be categorized by type (document, text, image, email, csv)
   - Each memory will get:
     - Relevance scores (1 month, 1 year)
     - Sentiment analysis
     - Predicted action (keep, compress, low_relevance, delete)
   - Memories will be organized into clusters

3. **Demo Scenarios:**
   - **High Relevance:** important-document.txt, meeting-notes-2024.txt
   - **Medium Relevance:** research-paper-abstract.md, project-ideas.txt
   - **Low Relevance:** random-thoughts.txt, old-photo-description.txt
   - **Different Types:** Documents, images, emails, CSV files
   - **Different Ages:** Mix of recent and older content

## File Types Covered

✅ Text files (.txt)
✅ Markdown files (.md)
✅ CSV files (.csv)
✅ Email files (.eml)
✅ Image files (descriptions provided)

## Notes

- Image files are represented as text descriptions for demo purposes
- To add actual images, place .jpg, .png, or .gif files in this directory
- All files contain realistic content that the AI can analyze
- Files have varying importance levels to demonstrate the AI's decision-making

## Creating Actual Images (Optional)

If you want to add actual image files:

```bash
# Install Pillow (Python image library)
pip install Pillow

# Or use ImageMagick
# On Mac: brew install imagemagick
# On Linux: sudo apt-get install imagemagick

# Then create images using any image editor or the tools above
```

