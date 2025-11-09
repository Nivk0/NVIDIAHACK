import React, { useState, useEffect } from 'react';
import './App.css';
import UploadComponent from './components/UploadComponent';
import MemoryGarden from './components/MemoryGarden';
import MemoryDetailPanel from './components/MemoryDetailPanel';
import DataViewer from './components/DataViewer';

const API_BASE = 'http://localhost:5001/api';

function App() {
  const [memories, setMemories] = useState([]);
  const [clusters, setClusters] = useState([]);
  const [selectedMemory, setSelectedMemory] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const [timeHorizon, setTimeHorizon] = useState(0); // 0 = now, 12 = 1 year
  const [viewMode, setViewMode] = useState('garden'); // 'garden' or 'data'

  useEffect(() => {
    fetchMemories();
    fetchClusters();
  }, []);

  const fetchMemories = async () => {
    try {
      const response = await fetch(`${API_BASE}/memories`);
      const data = await response.json();
      setMemories(data);
      // Show upload only if explicitly requested, otherwise show the views
      // Don't auto-show upload when no memories - let user see the empty states
    } catch (error) {
      console.error('Error fetching memories:', error);
    }
  };

  const fetchClusters = async () => {
    try {
      const response = await fetch(`${API_BASE}/clusters`);
      const data = await response.json();
      setClusters(data);
    } catch (error) {
      console.error('Error fetching clusters:', error);
    }
  };

  const handleUploadComplete = () => {
    // Fetch memories and clusters after upload completes
    setTimeout(() => {
      fetchMemories();
      fetchClusters();
      setShowUpload(false);
    }, 1500);
  };

  const handleMemoryClick = (memory) => {
    setSelectedMemory(memory);
  };

  const handleMemoryUpdate = async (memoryId, action) => {
    try {
      const response = await fetch(`${API_BASE}/memories/${memoryId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      });
      if (response.ok) {
        fetchMemories();
        if (selectedMemory && selectedMemory.id === memoryId) {
          const updated = await response.json();
          setSelectedMemory(updated);
        }
      }
    } catch (error) {
      console.error('Error updating memory:', error);
    }
  };

  const handleDeleteMemory = async (memoryId) => {
    try {
      const response = await fetch(`${API_BASE}/memories/${memoryId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        fetchMemories();
        setSelectedMemory(null);
      }
    } catch (error) {
      console.error('Error deleting memory:', error);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Memory Garden</h1>
        <p>AI-Powered Memory Management</p>
      </header>

      {showUpload ? (
        <UploadComponent onComplete={handleUploadComplete} />
      ) : (
        <div className="main-container">
          <div className="view-switcher">
            <button
              className={`view-button ${viewMode === 'garden' ? 'active' : ''}`}
              onClick={() => setViewMode('garden')}
            >
              🌱 Memory Garden
            </button>
            <button
              className={`view-button ${viewMode === 'data' ? 'active' : ''}`}
              onClick={() => setViewMode('data')}
            >
              📊 Data Viewer
            </button>
            <button
              className="upload-button-header"
              onClick={() => setShowUpload(true)}
            >
              + Upload Data
            </button>
          </div>

          {viewMode === 'garden' ? (
            <div className={`garden-container ${selectedMemory ? 'with-panel' : ''}`}>
              <div className="time-slider-container">
                <label>Time Horizon: {timeHorizon === 0 ? 'Now' : `${timeHorizon} months`}</label>
                <input
                  type="range"
                  min="0"
                  max="12"
                  value={timeHorizon}
                  onChange={(e) => setTimeHorizon(Number(e.target.value))}
                  className="time-slider"
                />
                <div className="slider-labels">
                  <span>Now</span>
                  <span>1 Year</span>
                </div>
              </div>

              <MemoryGarden
                memories={memories}
                clusters={clusters}
                timeHorizon={timeHorizon}
                onMemoryClick={handleMemoryClick}
              />
            </div>
          ) : (
            <div className={`data-viewer-container ${selectedMemory ? 'with-panel' : ''}`}>
              <DataViewer
                memories={memories}
                clusters={clusters}
                onMemoryClick={handleMemoryClick}
              />
            </div>
          )}

          {selectedMemory && (
            <MemoryDetailPanel
              memory={selectedMemory}
              timeHorizon={timeHorizon}
              onUpdate={handleMemoryUpdate}
              onDelete={handleDeleteMemory}
              onClose={() => setSelectedMemory(null)}
            />
          )}
        </div>
      )}
    </div>
  );
}

export default App;
