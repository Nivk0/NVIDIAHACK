# Memory Storage App

An AI-powered memory management application that scans your data (notes, chats, documents, photos) and identifies memory clusters. It predicts relevance, analyzes sentiment, and helps you manage storage intelligently.

## Features

- **Data Scanning**: Upload files, notes, chats, and documents
- **4-Stage Processing Pipeline**:
  1. **Scanning**: Identifies and categorizes data
  2. **Prediction**: Predicts relevance at 1 month and 1 year
  3. **Sentiment Analysis**: Analyzes emotional attachment
  4. **Clustering**: Groups related memories together

- **Memory Garden UI**: Visual representation of memory clusters
- **Time Slider**: See how memories fade over time (now → 1 year)
- **Smart Clustering**: Automatically groups memories by:
  - Type (documents, images, emails, etc.)
  - Age (recent, medium, old)
  - Content (graduation, work, personal, etc.)

- **Action Recommendations**: 
  - **Keep**: Important memories to retain
  - **Compress**: Memories that can be compressed
  - **Forget**: Memories that can be deleted

- **User Override**: Override AI recommendations for individual memories
- **Oblivion**: Safe deletion that retains summaries

## Project Structure

```
memory-storage-app/
├── backend/
│   ├── server.js              # Express server
│   ├── routes/
│   │   ├── upload.js          # File upload endpoints
│   │   ├── memories.js        # Memory CRUD operations
│   │   └── clusters.js        # Cluster operations
│   ├── agents/
│   │   ├── scanner.js         # Data scanning agent
│   │   ├── prediction.js      # Relevance prediction agent
│   │   ├── sentiment.js       # Sentiment analysis agent
│   │   └── compression.js     # Clustering agent
│   ├── data/
│   │   ├── memories/          # Stored memories (JSON)
│   │   ├── clusters/          # Memory clusters (JSON)
│   │   └── oblivion.json      # Deleted memory summaries
│   └── uploads/               # Temporary file uploads
├── frontend/
│   ├── src/
│   │   ├── App.js             # Main app component
│   │   ├── components/
│   │   │   ├── UploadComponent.js
│   │   │   ├── MemoryGarden.js
│   │   │   └── MemoryDetailPanel.js
│   │   └── ...
│   └── ...
└── package.json
```

## Installation

1. Install backend dependencies:
```bash
npm install
```

2. Install frontend dependencies:
```bash
cd frontend
npm install
cd ..
```

Or install all at once:
```bash
npm run install-all
```

3. NVIDIA Nemotron API is configured:
   - The API key is already set in the `.env` file
   - Nemotron will be used automatically for memory analysis
   - To disable Nemotron, edit `.env` and set `USE_NEMOTRON=false`
   - See [NEMOTRON_SETUP.md](NEMOTRON_SETUP.md) for more details

## Running the Application

### Development Mode (Both servers)

```bash
npm run dev
```

This will start:
- Backend server on `http://localhost:5000`
- Frontend server on `http://localhost:3000`

### Run Separately

Backend only:
```bash
npm run server
```

Frontend only:
```bash
npm run client
```

## Usage

### Analyzing Existing Memories with Nemotron

To re-analyze existing memories using Nemotron AI:

```bash
# The API key is already configured in .env file
# Run the analysis script
npm run analyze
```

This will analyze all memories in the `backend/data/memories/` directory and update them with Nemotron's predictions.

### Using the Application

1. **Upload Data**: 
   - Select files or enter text data
   - Watch the progress bar through the 4 processing stages
   - Memories are automatically analyzed using Nemotron (if configured) or rule-based analysis

2. **Explore Memory Garden**:
   - View memory clusters as "patches" in the garden
   - Each memory is a colored tile:
     - Green = Keep
     - Orange = Compress
     - Red = Forget
   - Opacity indicates relevance over time

3. **Time Slider**:
   - Slide to see how memories fade over time
   - Observe which memories remain relevant in the future

4. **Memory Details**:
   - Click any memory tile to see details
   - View scores, sentiment, and predictions
   - Override AI recommendations
   - Delete memories (moves to oblivion)

## API Endpoints

### Upload
- `POST /api/upload` - Upload files and text data
- `GET /api/upload/status/:jobId` - Get processing status

### Memories
- `GET /api/memories` - Get all memories
- `GET /api/memories/:id` - Get memory by ID
- `PUT /api/memories/:id` - Update memory action
- `DELETE /api/memories/:id` - Delete memory (move to oblivion)

### Clusters
- `GET /api/clusters` - Get all clusters
- `GET /api/clusters/:id` - Get cluster by ID

## Technologies

- **Backend**: Express.js, Node.js
- **Frontend**: React
- **AI/NLP**: 
  - NVIDIA Nemotron (AI-powered memory analysis)
  - Natural (fallback sentiment analysis)
- **Storage**: JSON files (can be extended to database)

## NVIDIA Nemotron Integration

**The app uses ONLY Nemotron for AI-powered memory analysis - no hardcoded values!**

All memories are dynamically analyzed using NVIDIA Nemotron. See [NEMOTRON_SETUP.md](NEMOTRON_SETUP.md) for detailed setup instructions.

### Quick Start with Nemotron

✅ **Nemotron is already configured!** The API key is set in the `.env` file.

1. **Upload new data** - All memories will be automatically analyzed with Nemotron:
   - Go to `http://localhost:3000`
   - Click "Upload Your Data"
   - Upload files or enter text
   - Watch as Nemotron analyzes each memory in real-time

2. **No hardcoded data** - All memories are fresh Nemotron analyses

**Important**: Nemotron API key is required. The system will not work without a valid API key. All analysis is done dynamically - no fallback to hardcoded rules.

## Future Enhancements

- Database integration (MongoDB, PostgreSQL)
- Image analysis for blurry photo detection using Nemotron Vision
- Cloud storage integration
- Export/import functionality
- Batch operations on clusters
- Advanced clustering algorithms

## License

ISC

