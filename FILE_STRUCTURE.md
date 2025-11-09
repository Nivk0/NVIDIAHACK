# File Structure

```
memory-storage-app/
│
├── backend/
│   ├── server.js                    # Express server entry point
│   │
│   ├── routes/
│   │   ├── upload.js                # File upload & processing status endpoints
│   │   ├── memories.js              # Memory CRUD operations
│   │   └── clusters.js              # Cluster retrieval endpoints
│   │
│   ├── agents/
│   │   ├── scanner.js               # Stage 1: Data scanning & type detection
│   │   ├── prediction.js            # Stage 2: Relevance prediction (1mo/1yr)
│   │   ├── sentiment.js             # Stage 3: Sentiment & attachment analysis
│   │   └── compression.js           # Stage 4: Clustering & action prediction
│   │
│   ├── data/                        # JSON storage (created at runtime)
│   │   ├── memories/                # Stored memories
│   │   ├── clusters/                # Memory clusters
│   │   └── oblivion.json            # Deleted memory summaries
│   │
│   └── uploads/                     # Temporary file uploads (created at runtime)
│
├── frontend/
│   ├── public/                      # Static files
│   │   └── ...
│   │
│   ├── src/
│   │   ├── App.js                   # Main app component
│   │   ├── App.css                  # Main app styles
│   │   │
│   │   ├── components/
│   │   │   ├── UploadComponent.js   # Upload UI with progress bar
│   │   │   ├── UploadComponent.css
│   │   │   ├── MemoryGarden.js      # Garden visualization
│   │   │   ├── MemoryGarden.css
│   │   │   ├── MemoryDetailPanel.js # Memory details & overrides
│   │   │   └── MemoryDetailPanel.css
│   │   │
│   │   ├── index.js                 # React entry point
│   │   └── index.css                # Global styles
│   │
│   └── package.json                 # Frontend dependencies
│
├── package.json                     # Root package.json with scripts
├── .gitignore                       # Git ignore rules
├── README.md                        # Project documentation
├── SETUP.md                         # Setup instructions
└── FILE_STRUCTURE.md                # This file
```

## Key Components

### Backend

- **server.js**: Express server setup, middleware, route registration
- **routes/**: API endpoints for upload, memories, and clusters
- **agents/**: 4-stage processing pipeline
  1. Scanner: Identifies and categorizes data
  2. Prediction: Predicts future relevance
  3. Sentiment: Analyzes emotional attachment
  4. Compression: Clusters memories and recommends actions

### Frontend

- **App.js**: Main application state and routing
- **UploadComponent**: File/text upload with 4-stage progress tracking
- **MemoryGarden**: Visual cluster representation with time-based fading
- **MemoryDetailPanel**: Detailed memory view with override options

## Data Flow

1. **Upload** → Files/text uploaded to backend
2. **Processing** → 4 agents process data sequentially
3. **Storage** → Memories and clusters saved as JSON
4. **Display** → Frontend fetches and visualizes data
5. **Interaction** → User can override actions, delete memories

## Storage

- Memories stored in `backend/data/memories/*.json`
- Clusters stored in `backend/data/clusters/*.json`
- Deleted memories (summaries) in `backend/data/oblivion.json`
- Temporary uploads in `backend/uploads/`

