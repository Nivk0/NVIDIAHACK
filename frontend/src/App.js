import React, { useState, useEffect, useCallback } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import './App.css';
import UploadComponent from './components/UploadComponent';
import MemoryGarden from './components/MemoryGarden';
import MemoryDetailPanel from './components/MemoryDetailPanel';
import DataViewer from './components/DataViewer';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import UserProfile from './components/UserProfile';
import AIMemorySearch from './components/AIMemorySearch';
import Login from './components/Login';

const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001/api';

function App() {
  const { isAuthenticated, isLoading, user, getAccessTokenSilently, logout } = useAuth0();
  const [memories, setMemories] = useState([]);
  const [clusters, setClusters] = useState([]);
  const [selectedMemory, setSelectedMemory] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [timeHorizon] = useState(0);
  const [viewMode, setViewMode] = useState('garden');


  const getAuthHeaders = useCallback(async () => {
    const headers = {
      'Content-Type': 'application/json',
    };

    if (isAuthenticated) {
      try {
        const token = await getAccessTokenSilently();
        headers['Authorization'] = `Bearer ${token}`;
      } catch (error) {
        console.error('Error getting access token:', error);
      }
    }

    return headers;
  }, [isAuthenticated, getAccessTokenSilently]);

  const fetchMemories = useCallback(async () => {
    try {
      console.log('Fetching memories from:', `${API_BASE}/memories`);
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE}/memories`, {
        headers,
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log(`Loaded ${data.length} memories`);
      setMemories(data);


    } catch (error) {
      console.error('Error fetching memories:', error);
      alert(`Failed to load memories: ${error.message}. Make sure the backend server is running on port 5001.`);
    }
  }, [getAuthHeaders]);

  const fetchClusters = useCallback(async () => {
    try {
      console.log('Fetching clusters from:', `${API_BASE}/clusters`);
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE}/clusters`, {
        headers,
      });
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
  }, [getAuthHeaders]);

  useEffect(() => {


    if (!isLoading) {
      fetchMemories();
      fetchClusters();
    }
  }, [isAuthenticated, isLoading, fetchMemories, fetchClusters]);

  const handleUploadComplete = () => {

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
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE}/memories/${memoryId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ action }),
      });
      if (response.ok) {

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
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE}/memories/${memoryId}`, {
        method: 'DELETE',
        headers,
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
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE}/clusters/${clusterId}`, {
        method: 'DELETE',
        headers,
      });
      if (response.ok) {
        const data = await response.json();
        console.log(data.message);

        alert(data.message || 'Cluster and all its memories deleted successfully.');
        fetchClusters();
        fetchMemories();
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
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE}/clusters/${clusterId}/memories/${memoryId}`, {
        method: 'DELETE',
        headers,
      });
      if (response.ok) {
        fetchClusters();
        fetchMemories();
      }
    } catch (error) {
      console.error('Error removing memory from cluster:', error);
      alert('Failed to remove memory from cluster: ' + error.message);
    }
  };


  if (isLoading) {
    return (
      <div className="App">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <div>Loading...</div>
        </div>
      </div>
    );
  }


  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <div className="App">
      <header className="App-header">
        <div className="header-content">
          <div>
            <h1>Memory Garden <span style={{ color: '#76B900', fontWeight: '800' }}>AI</span></h1>
            <p>Powered by <span style={{ color: '#76B900', fontWeight: '700' }}>NVIDIA Nemotron</span> • Intelligent Memory Management</p>
          </div>
          <div className="header-buttons">
            {user && (
              <div className="user-info" style={{ marginRight: '15px', color: '#fff', fontSize: '0.9rem' }}>
                {user.name || user.email}
              </div>
            )}
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
            <button
              className="header-action-button"
              onClick={() => logout({ returnTo: window.location.origin })}
              title="Logout"
            >
              🚪 Logout
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
