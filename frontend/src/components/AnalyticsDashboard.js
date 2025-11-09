import React, { useMemo, useCallback } from 'react';
import './AnalyticsDashboard.css';

function AnalyticsDashboard({ memories, clusters }) {

  const getMemoryAction = useCallback((memory) => {

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
  }, [clusters]);

  const stats = useMemo(() => {
    if (!memories || memories.length === 0) {
      return null;
    }


    const actionCounts = memories.reduce((acc, mem) => {
      const action = getMemoryAction(mem);
      acc[action] = (acc[action] || 0) + 1;
      return acc;
    }, {});


    const storageByAction = memories.reduce((acc, mem) => {
      const action = getMemoryAction(mem);
      const size = mem.size || 0;
      acc[action] = (acc[action] || 0) + size;
      return acc;
    }, {});


    const avgRelevance1Month = memories.reduce((sum, m) => {
      const rel = m.nemotronAnalysis?.relevance1Month ?? m.relevance1Month ?? 0.5;
      return sum + rel;
    }, 0) / memories.length;

    const avgRelevance1Year = memories.reduce((sum, m) => {
      const rel = m.nemotronAnalysis?.relevance1Year ?? m.relevance1Year ?? 0.5;
      return sum + rel;
    }, 0) / memories.length;

    const avgAttachment = memories.reduce((sum, m) => {
      const att = m.nemotronAnalysis?.attachment ?? m.attachment ?? 0.5;
      return sum + att;
    }, 0) / memories.length;


    const sentimentCounts = memories.reduce((acc, mem) => {
      const sentiment = mem.sentiment?.label || 'neutral';
      acc[sentiment] = (acc[sentiment] || 0) + 1;
      return acc;
    }, {});


    const ageGroups = {
      recent: memories.filter(m => (m.age || 0) < 6).length,
      medium: memories.filter(m => (m.age || 0) >= 6 && (m.age || 0) < 24).length,
      old: memories.filter(m => (m.age || 0) >= 24).length,
    };


    const typeCounts = memories.reduce((acc, mem) => {
      const type = mem.type || 'unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});


    const totalStorage = memories.reduce((sum, m) => sum + (m.size || 0), 0);


    const clusterStats = {
      total: clusters.length,
      actionClusters: clusters.filter(c => {
        const action = c.action ? c.action.toLowerCase() : '';
        return c.type === 'action' || ['keep', 'compress', 'low_relevance', 'delete', 'forget'].includes(action);
      }).length,
      totalMemoriesInClusters: clusters.reduce((sum, c) => sum + (c.memoryIds?.length || c.memories?.length || 0), 0),
    };

    return {
      totalMemories: memories.length,
      actionCounts,
      storageByAction,
      avgRelevance1Month,
      avgRelevance1Year,
      avgAttachment,
      sentimentCounts,
      ageGroups,
      typeCounts,
      totalStorage,
      clusterStats,
    };
  }, [memories, clusters, getMemoryAction]);

  if (!stats) {
    return (
      <div className="analytics-dashboard">
        <h2>Analytics Dashboard</h2>
        <p className="empty-state">No memories to analyze yet. Upload some data to see statistics!</p>
      </div>
    );
  }

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

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

  const getActionDisplayName = (action) => {
    switch (action) {
      case 'keep': return 'Keep';
      case 'compress': return 'Compress';
      case 'low_relevance': return 'Low Future Relevance';
      case 'forget': return 'Low Future Relevance';
      case 'delete': return 'Delete';
      default: return action ? action.charAt(0).toUpperCase() + action.slice(1) : 'Unknown';
    }
  };

  return (
    <div className="analytics-dashboard">
      <h2>📊 Analytics Dashboard</h2>

      <div className="stats-grid">
        {}
        <div className="stat-card overview">
          <h3>Overview</h3>
          <div className="stat-value">{stats.totalMemories}</div>
          <div className="stat-label">Total Memories</div>
          <div className="stat-subvalue">{stats.clusterStats.total} Clusters</div>
        </div>

        <div className="stat-card storage">
          <h3>Storage</h3>
          <div className="stat-value">{formatBytes(stats.totalStorage)}</div>
          <div className="stat-label">Total Size</div>
        </div>

        <div className="stat-card relevance">
          <h3>Average Relevance</h3>
          <div className="stat-value">{(stats.avgRelevance1Month * 100).toFixed(1)}%</div>
          <div className="stat-label">1 Month</div>
          <div className="stat-subvalue">{(stats.avgRelevance1Year * 100).toFixed(1)}% in 1 Year</div>
        </div>

        <div className="stat-card attachment">
          <h3>Attachment</h3>
          <div className="stat-value">{(stats.avgAttachment * 100).toFixed(1)}%</div>
          <div className="stat-label">Average</div>
        </div>
      </div>

      {}
      <div className="stat-section">
        <h3>Action Distribution</h3>
        <div className="action-distribution">
          {Object.entries(stats.actionCounts).map(([action, count]) => {
            const percentage = (count / stats.totalMemories * 100).toFixed(1);
            const storage = formatBytes(stats.storageByAction[action] || 0);
            return (
              <div key={action} className="action-bar">
                <div className="action-header">
                  <span className="action-name" style={{ color: getActionColor(action) }}>
                    {getActionDisplayName(action)}
                  </span>
                  <span className="action-count">{count} ({percentage}%)</span>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: getActionColor(action),
                    }}
                  />
                </div>
                <div className="action-storage">{storage}</div>
              </div>
            );
          })}
        </div>
      </div>

      {}
      <div className="charts-grid">
        {}
        <div className="chart-card">
          <h3>Sentiment Distribution</h3>
          <div className="sentiment-chart">
            {Object.entries(stats.sentimentCounts).map(([sentiment, count]) => {
              const percentage = (count / stats.totalMemories * 100).toFixed(1);
              return (
                <div key={sentiment} className="sentiment-item">
                  <div className="sentiment-label">
                    <span>{sentiment}</span>
                    <span>{count} ({percentage}%)</span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: sentiment === 'positive' ? '#2ecc71' : sentiment === 'negative' ? '#e74c3c' : '#95a5a6',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {}
        <div className="chart-card">
          <h3>Age Distribution</h3>
          <div className="age-chart">
            {Object.entries(stats.ageGroups).map(([group, count]) => {
              const percentage = (count / stats.totalMemories * 100).toFixed(1);
              const labels = {
                recent: '< 6 months',
                medium: '6-24 months',
                old: '> 24 months',
              };
              return (
                <div key={group} className="age-item">
                  <div className="age-label">
                    <span>{labels[group]}</span>
                    <span>{count} ({percentage}%)</span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: group === 'recent' ? '#2ecc71' : group === 'medium' ? '#f39c12' : '#e74c3c',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {}
        <div className="chart-card">
          <h3>Type Distribution</h3>
          <div className="type-chart">
            {Object.entries(stats.typeCounts)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 5)
              .map(([type, count]) => {
                const percentage = (count / stats.totalMemories * 100).toFixed(1);
                return (
                  <div key={type} className="type-item">
                    <div className="type-label">
                      <span>{type}</span>
                      <span>{count} ({percentage}%)</span>
                    </div>
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: '#3498db',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {}
      <div className="insights-section">
        <h3>💡 Insights</h3>
        <div className="insights-list">
          {stats.avgRelevance1Month > 0.7 && (
            <div className="insight positive">
              ✓ High average relevance ({((stats.avgRelevance1Month) * 100).toFixed(1)}%) suggests most memories are currently valuable.
            </div>
          )}
          {stats.avgRelevance1Year < 0.4 && (
            <div className="insight warning">
              ⚠ Low long-term relevance ({((stats.avgRelevance1Year) * 100).toFixed(1)}%) suggests many memories may lose value over time.
            </div>
          )}
          {(stats.actionCounts.compress || 0) + (stats.actionCounts.low_relevance || stats.actionCounts.forget || 0) + (stats.actionCounts.delete || 0) > stats.totalMemories * 0.3 && (
            <div className="insight info">
              ℹ️ {((((stats.actionCounts.compress || 0) + (stats.actionCounts.low_relevance || stats.actionCounts.forget || 0) + (stats.actionCounts.delete || 0)) / stats.totalMemories * 100).toFixed(1))}% of memories are candidates for compression or deletion.
            </div>
          )}
          {stats.ageGroups.old > stats.totalMemories * 0.4 && (
            <div className="insight warning">
              ⚠️ {((stats.ageGroups.old / stats.totalMemories) * 100).toFixed(1)}% of memories are over 2 years old - consider reviewing for cleanup.
            </div>
          )}
          {stats.clusterStats.actionClusters < 4 && (
            <div className="insight info">
              ℹ️ You have {stats.clusterStats.actionClusters} action-based clusters. Consider running clustering to organize memories better.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AnalyticsDashboard;

