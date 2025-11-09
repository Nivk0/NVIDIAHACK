import React, { useState, useEffect } from 'react';
import './App.css';
import UploadComponent from './components/UploadComponent';
import MemoryGarden from './components/MemoryGarden';
import MemoryDetailPanel from './components/MemoryDetailPanel';
import DataViewer from './components/DataViewer';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import UserProfile from './components/UserProfile';
import AIMemorySearch from './components/AIMemorySearch';

const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001/api';

function App() {
  const [memories, setMemories] = useState([]);
  const [clusters, setClusters] = useState([]);
  const [selectedMemory, setSelectedMemory] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [timeHorizon] = useState(0); // 0 = now, 12 = 1 year
  const [viewMode, setViewMode] = useState('garden'); // 'garden', 'data', 'analytics', or 'timeline'

  useEffect(() => {
    fetchMemories();
    fetchClusters();
  }, []);

  const fetchMemories = async () => {
    try {
      console.log('Fetching memories from:', `${API_BASE}/memories`);
      const response = await fetch(`${API_BASE}/memories`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log(`Loaded ${data.length} memories`);
      setMemories(data);
      // Show upload only if explicitly requested, otherwise show the views
      // Don't auto-show upload when no memories - let user see the empty states
    } catch (error) {
      console.error('Error fetching memories:', error);
      alert(`Failed to load memories: ${error.message}. Make sure the backend server is running on port 5001.`);
    }
  };

  const fetchClusters = async () => {
    try {
      console.log('Fetching clusters from:', `${API_BASE}/clusters`);
      const response = await fetch(`${API_BASE}/clusters`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log(`Loaded ${data.length} clusters`);
      setClusters(data);
    } catch (error) {
      console.error('Error fetching clusters:', error);
      alert(`Failed to load clusters: ${error.message}. Make sure the backend server is running on port 5001.`);
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
        // Refresh both memories and clusters since action change affects clusters
        await fetchMemories();
        await fetchClusters();
        if (selectedMemory && selectedMemory.id === memoryId) {
          const updated = await response.json();
          setSelectedMemory(updated);
        }
      }
    } catch (error) {
      console.error('Error updating memory:', error);
      alert('Failed to update memory action: ' + error.message);
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

  const handleDeleteCluster = async (clusterId) => {
    try {
      const response = await fetch(`${API_BASE}/clusters/${clusterId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        const data = await response.json();
        console.log(data.message);
        fetchClusters();
        fetchMemories(); // Refresh to update cluster references
      } else {
        const error = await response.json();
        alert('Failed to delete cluster: ' + error.error);
      }
    } catch (error) {
      console.error('Error deleting cluster:', error);
      alert('Failed to delete cluster: ' + error.message);
    }
  };

  const handleRemoveMemoryFromCluster = async (clusterId, memoryId) => {
    try {
      const response = await fetch(`${API_BASE}/clusters/${clusterId}/memories/${memoryId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        fetchClusters();
        fetchMemories(); // Refresh to update cluster references
      }
    } catch (error) {
      console.error('Error removing memory from cluster:', error);
      alert('Failed to remove memory from cluster: ' + error.message);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <div className="header-content">
          <div>
            <h1>Memory Garden <span style={{ color: '#76B900', fontWeight: '800' }}>AI</span></h1>
            <p>Powered by <span style={{ color: '#76B900', fontWeight: '700' }}>NVIDIA Nemotron</span> • Intelligent Memory Management</p>
          </div>
          <div className="header-buttons">
            <button
              className="header-action-button"
              onClick={() => {
                setShowSearch(true);
                setShowProfile(false);
                setShowUpload(false);
              }}
              title="AI Memory Search (RAG-powered)"
            >
              🔍 Search
            </button>
            <button
              className="header-action-button"
              onClick={() => {
                setShowProfile(true);
                setShowSearch(false);
                setShowUpload(false);
              }}
              title="Edit User Profile"
            >
              ⚙️ Profile
            </button>
          </div>
        </div>
      </header>

      <div className="view-switcher">
        <button
          className={`view-button ${viewMode === 'garden' && !showUpload ? 'active' : ''}`}
          onClick={() => {
            setShowUpload(false);
            setViewMode('garden');
          }}
        >
          🌱 Memory Garden
        </button>
        <button
          className={`view-button ${viewMode === 'data' && !showUpload ? 'active' : ''}`}
          onClick={() => {
            setShowUpload(false);
            setViewMode('data');
          }}
        >
          📊 Data Viewer
        </button>
        <button
          className={`view-button ${viewMode === 'analytics' && !showUpload ? 'active' : ''}`}
          onClick={() => {
            setShowUpload(false);
            setViewMode('analytics');
          }}
        >
          📈 Analytics
        </button>
        <button
          className={`upload-button-header ${showUpload ? 'active' : ''}`}
          onClick={() => setShowUpload(true)}
        >
          + Upload Data
        </button>
      </div>

      {showUpload ? (
        <UploadComponent onComplete={handleUploadComplete} />
      ) : (
        <div className="main-container">

          {viewMode === 'garden' ? (
            <div className={`garden-container ${selectedMemory ? 'with-panel' : ''}`}>
              <MemoryGarden
                memories={memories}
                clusters={clusters}
                timeHorizon={timeHorizon}
                onMemoryClick={handleMemoryClick}
                onDeleteCluster={handleDeleteCluster}
                onRemoveMemoryFromCluster={handleRemoveMemoryFromCluster}
              />
            </div>
          ) : viewMode === 'data' ? (
            <div className={`data-viewer-container ${selectedMemory ? 'with-panel' : ''}`}>
              <DataViewer
                memories={memories}
                clusters={clusters}
                onMemoryClick={handleMemoryClick}
                onMemoryActionChange={handleMemoryUpdate}
              />
            </div>
          ) : (
            <div className={`analytics-container ${selectedMemory ? 'with-panel' : ''}`}>
              <AnalyticsDashboard
                memories={memories}
                clusters={clusters}
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
              onMemoryRefresh={async (updatedMemory) => {
                setSelectedMemory(updatedMemory);
                await fetchMemories();
              }}
            />
          )}
        </div>
      )}

      {showProfile && (
        <UserProfile onClose={() => setShowProfile(false)} />
      )}

      {showSearch && (
        <AIMemorySearch
          memories={memories}
          onMemoryClick={(memory) => {
            setSelectedMemory(memory);
            setShowSearch(false);
          }}
          onClose={() => setShowSearch(false)}
        />
      )}
    </div>
  );
}

export default App;
