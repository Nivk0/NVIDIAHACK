import React, { useState } from 'react';
import './DataViewer.css';

function DataViewer({ memories, clusters, onMemoryClick }) {
  const [viewMode, setViewMode] = useState('memories'); // 'memories' or 'clusters'
  const [filterAction, setFilterAction] = useState('all'); // 'all', 'keep', 'compress', 'forget'
  const [filterType, setFilterType] = useState('all'); // 'all', 'document', 'image', 'email', 'text'
  const [sortBy, setSortBy] = useState('relevance'); // 'relevance', 'age', 'date', 'type'
  const [searchTerm, setSearchTerm] = useState('');

  const getActionColor = (action) => {
    switch (action) {
      case 'keep': return '#2ecc71';
      case 'compress': return '#f39c12';
      case 'forget': return '#e74c3c';
      default: return '#95a5a6';
    }
  };

  const getSentimentColor = (sentiment) => {
    if (!sentiment) return '#95a5a6';
    if (sentiment.label === 'positive') return '#2ecc71';
    if (sentiment.label === 'negative') return '#e74c3c';
    return '#95a5a6';
  };

  // Filter and sort memories
  const filteredMemories = memories.filter(memory => {
    const action = memory.overrideAction || memory.predictedAction || 'keep';
    const matchesAction = filterAction === 'all' || action === filterAction;
    const matchesType = filterType === 'all' || memory.type === filterType;
    const matchesSearch = !searchTerm || 
      memory.summary?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      memory.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      memory.id?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesAction && matchesType && matchesSearch;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'relevance':
        return (b.relevance1Year || 0) - (a.relevance1Year || 0);
      case 'age':
        return (b.age || 0) - (a.age || 0);
      case 'date':
        return new Date(b.createdAt) - new Date(a.createdAt);
      case 'type':
        return (a.type || '').localeCompare(b.type || '');
      default:
        return 0;
    }
  });

  // Get unique types
  const types = [...new Set(memories.map(m => m.type))].filter(Boolean);

  // Get cluster memories count
  const getClusterMemories = (cluster) => {
    return memories.filter(m => cluster.memoryIds.includes(m.id));
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <div className="data-viewer">
      <div className="viewer-header">
        <h2>Data Viewer</h2>
        <div className="view-mode-tabs">
          <button
            className={viewMode === 'memories' ? 'active' : ''}
            onClick={() => setViewMode('memories')}
          >
            Memories ({memories.length})
          </button>
          <button
            className={viewMode === 'clusters' ? 'active' : ''}
            onClick={() => setViewMode('clusters')}
          >
            Clusters ({clusters.length})
          </button>
        </div>
      </div>

      {viewMode === 'memories' && (
        <div className="memories-view">
          <div className="filters">
            <div className="filter-group">
              <label>Search:</label>
              <input
                type="text"
                placeholder="Search memories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
            <div className="filter-group">
              <label>Action:</label>
              <select
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
              >
                <option value="all">All Actions</option>
                <option value="keep">Keep</option>
                <option value="compress">Compress</option>
                <option value="forget">Forget</option>
              </select>
            </div>
            <div className="filter-group">
              <label>Type:</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="all">All Types</option>
                {types.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label>Sort By:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="relevance">Relevance</option>
                <option value="age">Age</option>
                <option value="date">Date Created</option>
                <option value="type">Type</option>
              </select>
            </div>
          </div>

          <div className="memories-table">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Type</th>
                  <th>Summary</th>
                  <th>Action</th>
                  <th>Relevance (1yr)</th>
                  <th>Age</th>
                  <th>Sentiment</th>
                  <th>Date</th>
                  <th>Cluster</th>
                </tr>
              </thead>
              <tbody>
                {filteredMemories.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="no-data">
                      No memories found matching your filters.
                    </td>
                  </tr>
                ) : (
                  filteredMemories.map(memory => {
                    const action = memory.overrideAction || memory.predictedAction || 'keep';
                    return (
                      <tr
                        key={memory.id}
                        onClick={() => onMemoryClick(memory)}
                        className="memory-row"
                      >
                        <td className="memory-id">{memory.id.substring(0, 12)}...</td>
                        <td>
                          <span className="type-badge" data-type={memory.type}>
                            {memory.type || 'unknown'}
                          </span>
                        </td>
                        <td className="summary-cell">
                          {memory.type === 'image' && memory.imageUrl ? (
                            <div className="summary-with-thumbnail">
                              <img 
                                src={memory.imageUrl} 
                                alt={memory.summary || 'Thumbnail'} 
                                className="memory-thumbnail"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                }}
                              />
                              <span className="thumbnail-text">
                                {memory.summary || memory.content?.substring(0, 30) || 'No summary'}
                              </span>
                            </div>
                          ) : (
                            memory.summary || memory.content?.substring(0, 50) || 'No summary'
                          )}
                        </td>
                        <td>
                          <span
                            className="action-badge"
                            style={{ backgroundColor: getActionColor(action) }}
                          >
                            {action}
                          </span>
                        </td>
                        <td>
                          <div className="relevance-bar">
                            <div
                              className="relevance-fill"
                              style={{
                                width: `${(memory.relevance1Year || 0) * 100}%`,
                                backgroundColor: '#3498db'
                              }}
                            />
                            <span className="relevance-text">
                              {((memory.relevance1Year || 0) * 100).toFixed(0)}%
                            </span>
                          </div>
                        </td>
                        <td>{memory.age || 0} mo</td>
                        <td>
                          <span
                            className="sentiment-badge"
                            style={{ color: getSentimentColor(memory.sentiment) }}
                          >
                            {memory.sentiment?.label || 'neutral'}
                          </span>
                        </td>
                        <td>{formatDate(memory.createdAt)}</td>
                        <td className="cluster-cell">
                          {memory.clusterName || 'Unclustered'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
            <div className="table-footer">
              Showing {filteredMemories.length} of {memories.length} memories
            </div>
          </div>
        </div>
      )}

      {viewMode === 'clusters' && (
        <div className="clusters-view">
          <div className="clusters-grid">
            {clusters.map(cluster => {
              const clusterMemories = getClusterMemories(cluster);
              return (
                <div key={cluster.id} className="cluster-card">
                  <div className="cluster-header">
                    <h3>{cluster.name}</h3>
                    <span
                      className="cluster-action-badge"
                      style={{ backgroundColor: getActionColor(cluster.action) }}
                    >
                      {cluster.action}
                    </span>
                  </div>
                  <div className="cluster-info">
                    <div className="cluster-stat">
                      <span className="stat-label">Memories:</span>
                      <span className="stat-value">{cluster.size}</span>
                    </div>
                    <div className="cluster-stat">
                      <span className="stat-label">Type:</span>
                      <span className="stat-value">{cluster.type}</span>
                    </div>
                    <div className="cluster-stat">
                      <span className="stat-label">Total Size:</span>
                      <span className="stat-value">
                        {(cluster.totalSize / 1024).toFixed(2)} KB
                      </span>
                    </div>
                  </div>
                  <div className="cluster-memories-list">
                    <h4>Memories in this cluster:</h4>
                    <ul>
                      {clusterMemories.slice(0, 5).map(memory => (
                        <li
                          key={memory.id}
                          onClick={() => onMemoryClick(memory)}
                          className="cluster-memory-item"
                        >
                          {memory.type === 'image' && memory.imageUrl ? (
                            <img 
                              src={memory.imageUrl} 
                              alt={memory.summary || 'Thumbnail'} 
                              className="cluster-memory-thumbnail"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <span 
                            className="memory-type-icon" 
                            style={{ display: memory.type === 'image' && memory.imageUrl ? 'none' : 'flex' }}
                          >
                            {memory.type?.[0]?.toUpperCase() || '?'}
                          </span>
                          <span className="memory-summary">
                            {memory.summary || memory.content?.substring(0, 40) || 'No summary'}
                          </span>
                          <span
                            className="memory-action-dot"
                            style={{ backgroundColor: getActionColor(memory.overrideAction || memory.predictedAction || 'keep') }}
                          />
                        </li>
                      ))}
                      {clusterMemories.length > 5 && (
                        <li className="more-memories">
                          + {clusterMemories.length - 5} more memories
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default DataViewer;

