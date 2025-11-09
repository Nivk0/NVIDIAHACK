import React from 'react';
import './MemoryGarden.css';

function MemoryGarden({ memories, clusters, timeHorizon, onMemoryClick, onDeleteCluster, onRemoveMemoryFromCluster }) {
  const getActionColor = (action) => {
    switch (action) {
      case 'keep': return '#2ecc71';
      case 'compress': return '#f39c12';
      case 'low_relevance': return '#d68910'; // Darker orange
      case 'forget': return '#d68910'; // Support old "forget" for backward compatibility
      case 'delete': return '#c0392b';
      default: return '#95a5a6';
    }
  };

  const getActionDisplayName = (action) => {
    switch (action) {
      case 'keep': return 'Keep';
      case 'compress': return 'Compress';
      case 'low_relevance': return 'Low Future Relevance';
      case 'forget': return 'Low Future Relevance'; // Support old "forget" for backward compatibility
      case 'delete': return 'Delete';
      default: return action;
    }
  };

  const getClusterMemories = (cluster) => {
    // Support both old format (memories) and new format (memoryIds)
    const memoryIds = cluster.memoryIds || cluster.memories || [];
    if (!Array.isArray(memoryIds)) {
      return [];
    }
    return memories.filter(m => memoryIds.includes(m.id));
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getMemoryAction = (memory) => {
    // First check for user override
    if (memory.overrideAction) {
      let action = memory.overrideAction.toLowerCase();
      // Normalize old "forget" to "low_relevance"
      if (action === 'forget') {
        return 'low_relevance';
      }
      return action;
    }
    
    // Then check which cluster this memory belongs to
    const cluster = clusters.find(c => {
      const memoryIds = c.memoryIds || c.memories || [];
      return memoryIds.includes(memory.id);
    });
    
    if (cluster && cluster.action) {
      let action = cluster.action.toLowerCase();
      // Normalize old "forget" to "low_relevance"
      if (action === 'forget') {
        return 'low_relevance';
      }
      return action;
    }
    
    // Fallback to predicted action or default
    let action = memory.predictedAction || memory.nemotronAnalysis?.predictedAction || 'keep';
    // Normalize old "forget" to "low_relevance"
    if (action && action.toLowerCase() === 'forget') {
      return 'low_relevance';
    }
    return action;
  };

  return (
    <div className="memory-garden">
      <h2>Memory Garden</h2>
      <p className="garden-subtitle">
        Clusters organized by action. Each cluster contains memories with the same recommended action.
      </p>

      {clusters.filter(cluster => {
        const validActions = ['keep', 'compress', 'low_relevance', 'delete'];
        const action = cluster.action ? cluster.action.toLowerCase() : '';
        // Support old "forget" for backward compatibility
        if (action === 'forget') {
          return true;
        }
        return cluster.type === 'action' || (cluster.action && validActions.includes(action));
      }).length === 0 ? (
        <div className="no-clusters">
          <p>No action-based clusters yet. Upload new data to generate clusters organized by action (Keep, Compress, Low Future Relevance, Delete).</p>
        </div>
      ) : (
        <div className="clusters-grid">
          {clusters
            .filter(cluster => {
              const validActions = ['keep', 'compress', 'low_relevance', 'delete'];
              const action = cluster.action ? cluster.action.toLowerCase() : '';
              // Support old "forget" for backward compatibility
              if (action === 'forget') {
                return true;
              }
              return cluster.type === 'action' || (cluster.action && validActions.includes(action));
            })
            .sort((a, b) => {
              // Sort by action order: keep, compress, low_relevance, delete
              const order = { 'keep': 0, 'compress': 1, 'low_relevance': 2, 'forget': 2, 'delete': 3 };
              const actionA = a.action ? a.action.toLowerCase() : '';
              const actionB = b.action ? b.action.toLowerCase() : '';
              return (order[actionA] ?? 99) - (order[actionB] ?? 99);
            })
            .map(cluster => {
              const clusterMemories = getClusterMemories(cluster);
              
              return (
                <div key={cluster.id} className="cluster-card">
                  <div className="cluster-header">
                    <h3>{cluster.action ? getActionDisplayName(cluster.action) : cluster.name}</h3>
                    <div className="cluster-header-actions">
                      <span
                        className="cluster-action-badge"
                        style={{ backgroundColor: getActionColor(cluster.action) }}
                      >
                        {cluster.action ? getActionDisplayName(cluster.action).toUpperCase() : 'N/A'}
                      </span>
                      {onDeleteCluster && (
                        <button
                          className="delete-cluster-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`Delete cluster "${cluster.name}"?`)) {
                              onDeleteCluster(cluster.id);
                            }
                          }}
                          title="Delete this cluster"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="cluster-info">
                    <div className="cluster-stat">
                      <span className="stat-label">Memories:</span>
                      <span className="stat-value">{cluster.size || clusterMemories.length}</span>
                    </div>
                    {cluster.type && cluster.type !== 'action' && (
                      <div className="cluster-stat">
                        <span className="stat-label">Type:</span>
                        <span className="stat-value">{cluster.type}</span>
                      </div>
                    )}
                    <div className="cluster-stat">
                      <span className="stat-label">Total Size:</span>
                      <span className="stat-value">
                        {cluster.totalSize ? formatBytes(cluster.totalSize) : 'N/A'}
                      </span>
                    </div>
                  </div>
                  <div className="cluster-memories-list">
                    <h4>Memories in this cluster:</h4>
                    <ul>
                      {clusterMemories.map(memory => (
                        <li
                          key={memory.id}
                          className="cluster-memory-item"
                        >
                          <div 
                            className="memory-item-content"
                            onClick={() => onMemoryClick(memory)}
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
                            <span className="memory-summary" title={memory.summary || memory.content || 'No summary'}>
                              {memory.summary || memory.content?.substring(0, 100) || 'No summary'}
                            </span>
                            <span
                              className="memory-action-dot"
                              style={{ backgroundColor: getActionColor(cluster.action || memory.overrideAction || memory.predictedAction || 'keep') }}
                              title={cluster.action ? getActionDisplayName(cluster.action) : 'Memory action'}
                            />
                            {onRemoveMemoryFromCluster && (
                              <button
                                className="remove-memory-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (window.confirm('Remove this memory from cluster?')) {
                                    onRemoveMemoryFromCluster(cluster.id, memory.id);
                                  }
                                }}
                                title="Remove from cluster"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}

export default MemoryGarden;
