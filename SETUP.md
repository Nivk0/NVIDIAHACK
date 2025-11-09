# Setup Instructions

## Quick Start

1. **Install Dependencies**

   ```bash
   # Install backend dependencies
   npm install

   # Install frontend dependencies
   cd frontend
   npm install
   cd ..
   ```

   Or install all at once:
   ```bash
   npm run install-all
   ```

2. **Start the Application**

   ```bash
   # Start both backend and frontend
   npm run dev
   ```

   This will start:
   - Backend server on `http://localhost:5000`
   - Frontend server on `http://localhost:3000`

3. **Open the Application**

   Open your browser and navigate to `http://localhost:3000`

## Manual Setup

### Backend Only

```bash
npm run server
```

### Frontend Only

```bash
npm run client
```

## Testing the Application

1. **Upload Sample Data**:
   - Click "Upload Your Data"
   - Either select files or enter text data
   - Example text data:
     ```
     Graduated from university in 2018. Great memories of college days.
     
     Meeting notes from work project. Important deadlines coming up.
     
     Blurry photo from vacation. Not very clear but had fun.
     ```

2. **View Memory Garden**:
   - After processing completes, you'll see clusters of memories
   - Each cluster is a "patch" in the garden
   - Memories are colored tiles (green=keep, orange=compress, red=forget)

3. **Use Time Slider**:
   - Slide the time horizon to see how memories fade over time
   - Observe which memories remain relevant in the future

4. **Explore Memories**:
   - Click any memory tile to see details
   - View scores, sentiment, and predictions
   - Override AI recommendations if needed
   - Delete memories to move them to oblivion

## Project Structure

```
memory-storage-app/
├── backend/
│   ├── server.js           # Express server
│   ├── routes/             # API routes
│   ├── agents/             # Processing agents
│   ├── data/               # JSON storage
│   └── uploads/            # Temporary uploads
├── frontend/
│   ├── src/
│   │   ├── App.js          # Main app
│   │   └── components/     # React components
│   └── ...
└── package.json
```

## Troubleshooting

### Port Already in Use

If port 5000 or 3000 is already in use:

- Backend: Set `PORT` environment variable
  ```bash
  PORT=5001 npm run server
  ```

- Frontend: Create `.env` file in `frontend/` directory
  ```
  PORT=3001
  ```

### CORS Issues

The backend is configured to allow CORS from `http://localhost:3000`. If you change the frontend port, update `backend/server.js`.

### Data Not Loading

Make sure the backend server is running before the frontend tries to fetch data.

## Next Steps

- Add more data types (images, PDFs, etc.)
- Customize clustering algorithms
- Add batch operations
- Export/import functionality
- Database integration

