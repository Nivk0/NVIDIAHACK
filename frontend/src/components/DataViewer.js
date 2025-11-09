import React, { useState } from 'react';
import './DataViewer.css';

function DataViewer({ memories, clusters, onMemoryClick, onMemoryActionChange }) {

  const [filterAction, setFilterAction] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('relevance');
  const [searchTerm, setSearchTerm] = useState('');

  const getActionColor = (action) => {
    switch (action) {
      case 'keep': return '#2ecc71';
      case 'compress': return '#f39c12';
      case 'low_relevance': return '#d68910';
      case 'forget': return '#d68910';
      case 'delete': return '#c0392b';
      default: return '#95a5a6';
    }
  };

  const getSentimentColor = (sentiment) => {
    if (!sentiment) return '#95a5a6';
    if (sentiment.label === 'positive') return '#2ecc71';
    if (sentiment.label === 'negative') return '#e74c3c';
    return '#95a5a6';
  };


  const getMemoryAction = (memory) => {

    if (memory.overrideAction) {
      let action = memory.overrideAction.toLowerCase();

      if (action === 'forget') {
        return 'low_relevance';
      }
      return action;
    }


    const cluster = clusters.find(c => {
      const memoryIds = c.memoryIds || c.memories || [];
      return memoryIds.includes(memory.id);
    });

    if (cluster && cluster.action) {
      let action = cluster.action.toLowerCase();

      if (action === 'forget') {
        return 'low_relevance';
      }
      return action;
    }


    let action = memory.predictedAction || memory.nemotronAnalysis?.predictedAction || 'keep';

    if (action && action.toLowerCase() === 'forget') {
      return 'low_relevance';
    }
    return action;
  };


  const filteredMemories = memories.filter(memory => {
    const action = getMemoryAction(memory);
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


  const types = [...new Set(memories.map(m => m.type))].filter(Boolean);



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
      </div>

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
              <option value="low_relevance">Low Future Relevance</option>
              <option value="delete">Delete</option>
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
                  const action = getMemoryAction(memory);
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
                      <td onClick={(e) => e.stopPropagation()}>
                        <select
                          className="action-dropdown"
                          value={action}
                          onChange={(e) => {
                            e.stopPropagation();
                            const newAction = e.target.value;
                            if (onMemoryActionChange) {
                              onMemoryActionChange(memory.id, newAction);
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                          onMouseDown={(e) => e.stopPropagation()}
                          style={{
                            backgroundColor: getActionColor(action),
                            color: 'white',
                            border: 'none',
                            borderRadius: '12px',
                            padding: '4px 28px 4px 12px',
                            fontSize: '12px',
                            fontWeight: '600',
                            textTransform: 'uppercase',
                            cursor: 'pointer',
                            appearance: 'none',
                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='white' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'right 8px center',
                            backgroundSize: '12px',
                            minWidth: '100px'
                          }}
                        >
                          <option value="keep" style={{ backgroundColor: getActionColor('keep'), color: 'white' }}>Keep</option>
                          <option value="compress" style={{ backgroundColor: getActionColor('compress'), color: 'white' }}>Compress</option>
                          <option value="low_relevance" style={{ backgroundColor: getActionColor('low_relevance'), color: 'white' }}>Low Future Relevance</option>
                          <option value="delete" style={{ backgroundColor: getActionColor('delete'), color: 'white' }}>Delete</option>
                        </select>
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
    </div>
  );
}

export default DataViewer;

