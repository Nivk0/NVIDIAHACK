import React from 'react';
import './MemoryGarden.css';

function MemoryGarden({ memories, clusters, timeHorizon, onMemoryClick }) {
  const getMemoryOpacity = (memory) => {
    if (timeHorizon === 0) return 1;

    // Calculate opacity based on relevance at time horizon
    const relevance = memory.relevance1Year || 0.5;
    const monthsAhead = timeHorizon;

    // Interpolate between relevance1Month and relevance1Year
    let futureRelevance;
    if (monthsAhead <= 1) {
      futureRelevance = memory.relevance1Month || relevance;
    } else if (monthsAhead >= 12) {
      futureRelevance = relevance;
    } else {
      const monthRatio = monthsAhead / 12;
      const monthRelevance = memory.relevance1Month || relevance;
      futureRelevance = monthRelevance + (relevance - monthRelevance) * monthRatio;
    }

    // Opacity based on relevance (0.3 min opacity for visibility)
    return 0.3 + (futureRelevance * 0.7);
  };

  const getMemoryColor = (memory) => {
    const action = memory.overrideAction || memory.predictedAction || memory.nemotronAnalysis?.predictedAction || 'pending';

    switch (action) {
      case 'keep':
        return '#2ecc71'; // Green
      case 'compress':
        return '#f39c12'; // Orange
      case 'forget':
        return '#e74c3c'; // Red
      case 'pending':
        return '#95a5a6';
      default:
        return '#95a5a6'; // Gray
    }
  };

  const getClusterMemories = (cluster) => {
    return memories.filter(m => cluster.memoryIds.includes(m.id));
  };

  return (
    <div className="memory-garden">
      <h2>Memory Garden</h2>
      <p className="garden-subtitle">
        Each cluster is a patch in your garden. Memories fade based on predicted relevance.
      </p>

      {clusters.length === 0 ? (
        <div className="no-clusters">
          <p>No clusters yet. Upload some data to get started!</p>
        </div>
      ) : (
        <div className="garden-patches">
          {clusters.map(cluster => {
            const clusterMemories = getClusterMemories(cluster);

            return (
              <div key={cluster.id} className="garden-patch">
                <div className="patch-header">
                  <h3>{cluster.name}</h3>
                  <span className="patch-size">{cluster.size} memories</span>
                </div>
                <div className="patch-action-badge" data-action={cluster.action}>
                  {cluster.action}
                </div>
                <div className="patch-memories">
                  {clusterMemories.map(memory => {
                    const opacity = getMemoryOpacity(memory);
                    const color = getMemoryColor(memory);

                    return (
                      <div
                        key={memory.id}
                        className="memory-tile"
                        style={{
                          backgroundColor: color,
                          opacity: opacity,
                          cursor: 'pointer',
                          backgroundImage: memory.type === 'image' && memory.imageUrl ? `url(${memory.imageUrl})` : 'none',
                          backgroundSize: 'cover',
                          backgroundPosition: 'center'
                        }}
                        onClick={() => onMemoryClick(memory)}
                        title={memory.summary || memory.content?.substring(0, 50)}
                      >
                        <div className="memory-tile-content">
                          {memory.type === 'image' && memory.imageUrl ? (
                            <div className="memory-image-overlay">
                              <div className="memory-relevance">
                                {((memory.relevance1Year || 0.5) * 100).toFixed(0)}%
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="memory-type-icon">{memory.type?.[0]?.toUpperCase() || '?'}</div>
                              <div className="memory-relevance">
                                {((memory.relevance1Year || 0.5) * 100).toFixed(0)}%
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
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

