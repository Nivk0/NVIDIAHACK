import React from 'react';
import './MemoryDetailPanel.css';

function MemoryDetailPanel({ memory, timeHorizon, onUpdate, onDelete, onClose }) {
  const getFutureRelevance = () => {
    if (timeHorizon === 0) return memory.relevance1Month || 0.5;
    if (timeHorizon >= 12) return memory.relevance1Year || 0.5;
    
    const monthRatio = timeHorizon / 12;
    const monthRelevance = memory.relevance1Month || 0.5;
    const yearRelevance = memory.relevance1Year || 0.5;
    return monthRelevance + (yearRelevance - monthRelevance) * monthRatio;
  };

  const getActionColor = (action) => {
    switch (action) {
      case 'keep':
        return '#2ecc71';
      case 'compress':
        return '#f39c12';
      case 'forget':
        return '#e74c3c';
      default:
        return '#95a5a6';
    }
  };

  const handleActionChange = (action) => {
    onUpdate(memory.id, action);
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this memory? It will be moved to oblivion (summary retained).')) {
      onDelete(memory.id);
    }
  };

  const currentAction = memory.overrideAction || memory.predictedAction || 'keep';
  const futureRelevance = getFutureRelevance();

  return (
    <div className="memory-detail-panel">
      <div className="panel-header">
        <h2>Memory Details</h2>
        <button className="close-button" onClick={onClose}>×</button>
      </div>

      <div className="panel-content">
        <div className="detail-section">
          <h3>Summary</h3>
          <p className="memory-summary">{memory.summary || 'No summary available'}</p>
        </div>

        <div className="detail-section">
          <h3>{memory.type === 'image' ? 'Image' : 'Original Content'}</h3>
          {memory.type === 'image' && memory.imageUrl ? (
            <div className="memory-image-container">
              <img 
                src={memory.imageUrl} 
                alt={memory.summary || 'Memory image'} 
                className="memory-image"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'block';
                }}
              />
              <div className="image-error" style={{ display: 'none' }}>
                <p>Image could not be loaded</p>
                <p className="image-url">{memory.imageUrl}</p>
              </div>
            </div>
          ) : (
            <div className="memory-content">
              {memory.content ? (
                <pre>{memory.content.substring(0, 500)}{memory.content.length > 500 ? '...' : ''}</pre>
              ) : (
                <p>No content available</p>
              )}
            </div>
          )}
        </div>

        <div className="detail-section">
          <h3>Scores & Analysis</h3>
          <div className="scores-grid">
            <div className="score-item">
              <span className="score-label">Relevance (1 month)</span>
              <div className="score-bar">
                <div
                  className="score-fill"
                  style={{ width: `${(memory.relevance1Month || 0) * 100}%`, backgroundColor: '#3498db' }}
                />
                <span className="score-value">{(memory.relevance1Month || 0) * 100}%</span>
              </div>
            </div>
            <div className="score-item">
              <span className="score-label">Relevance (1 year)</span>
              <div className="score-bar">
                <div
                  className="score-fill"
                  style={{ width: `${(memory.relevance1Year || 0) * 100}%`, backgroundColor: '#3498db' }}
                />
                <span className="score-value">{(memory.relevance1Year || 0) * 100}%</span>
              </div>
            </div>
            <div className="score-item">
              <span className="score-label">Future Relevance ({timeHorizon} months)</span>
              <div className="score-bar">
                <div
                  className="score-fill"
                  style={{ width: `${futureRelevance * 100}%`, backgroundColor: '#2ecc71' }}
                />
                <span className="score-value">{(futureRelevance * 100).toFixed(0)}%</span>
              </div>
            </div>
            <div className="score-item">
              <span className="score-label">Attachment Level</span>
              <div className="score-bar">
                <div
                  className="score-fill"
                  style={{ width: `${(memory.attachment || 0) * 100}%`, backgroundColor: '#9b59b6' }}
                />
                <span className="score-value">{(memory.attachment || 0) * 100}%</span>
              </div>
            </div>
            <div className="score-item">
              <span className="score-label">Sentiment</span>
              <div className="sentiment-badge" data-sentiment={memory.sentiment?.label || 'neutral'}>
                {memory.sentiment?.label || 'neutral'} ({memory.sentiment?.score?.toFixed(2) || 0})
              </div>
            </div>
            <div className="score-item">
              <span className="score-label">Age</span>
              <span className="age-value">{memory.age || 0} months old</span>
            </div>
          </div>
        </div>

        <div className="detail-section">
          <h3>Prediction Explanation</h3>
          <div className="explanation">
            <p>
              Based on the analysis, this memory has a <strong>{(futureRelevance * 100).toFixed(0)}%</strong> relevance
              in <strong>{timeHorizon} months</strong>. The predicted action is{' '}
              <strong style={{ color: getActionColor(memory.predictedAction) }}>
                {memory.predictedAction}
              </strong>.
            </p>
            {memory.age > 24 && (
              <p className="explanation-note">
                ⚠️ This memory is over 2 years old and may be a candidate for compression or deletion.
              </p>
            )}
            {memory.relevance1Year < 0.3 && (
              <p className="explanation-note">
                ⚠️ Low predicted relevance in 1 year suggests this memory may not be needed long-term.
              </p>
            )}
          </div>
        </div>

        <div className="detail-section">
          <h3>Override Action</h3>
          <div className="action-selector">
            <button
              className={`action-button ${currentAction === 'keep' ? 'active' : ''}`}
              style={{ borderColor: getActionColor('keep') }}
              onClick={() => handleActionChange('keep')}
            >
              Keep
            </button>
            <button
              className={`action-button ${currentAction === 'compress' ? 'active' : ''}`}
              style={{ borderColor: getActionColor('compress') }}
              onClick={() => handleActionChange('compress')}
            >
              Compress
            </button>
            <button
              className={`action-button ${currentAction === 'forget' ? 'active' : ''}`}
              style={{ borderColor: getActionColor('forget') }}
              onClick={() => handleActionChange('forget')}
            >
              Forget
            </button>
          </div>
          {memory.userOverridden && (
            <p className="override-note">✓ You've overridden the AI prediction</p>
          )}
        </div>

        <div className="detail-section">
          <button className="delete-button" onClick={handleDelete}>
            Delete & Move to Oblivion
          </button>
          <p className="delete-note">
            This will delete the memory but retain a summary in oblivion.
          </p>
        </div>
      </div>
    </div>
  );
}

export default MemoryDetailPanel;

