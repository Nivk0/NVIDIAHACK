import React, { useMemo, useState } from 'react';
import './MemoryDetailPanel.css';

function MemoryDetailPanel({ memory, timeHorizon, onUpdate, onDelete, onClose }) {
  const [showFullSummary, setShowFullSummary] = useState(false);

  const relevance1Month = memory.relevance1Month ?? memory.nemotronAnalysis?.relevance1Month ?? 0.5;
  const relevance1Year = memory.relevance1Year ?? memory.nemotronAnalysis?.relevance1Year ?? 0.5;
  const attachmentScore = memory.attachment ?? memory.nemotronAnalysis?.attachment ?? 0.5;
  const analysisExplanation = memory.nemotronExplanation || memory.nemotronAnalysis?.explanation;
  const analysisConfidence = memory.nemotronConfidence ?? memory.nemotronAnalysis?.confidence;
  const wasNemotronUsed = memory.nemotronAnalyzed ?? memory.nemotronAnalysis?.nemotronAnalyzed;

  const getFutureRelevance = () => {
    if (timeHorizon === 0) return relevance1Month;
    if (timeHorizon >= 12) return relevance1Year;
    
    const monthRatio = timeHorizon / 12;
    return relevance1Month + (relevance1Year - relevance1Month) * monthRatio;
  };

  const getActionColor = (action) => {
    switch (action) {
      case 'keep':
        return '#2ecc71';
      case 'compress':
        return '#f39c12';
      case 'forget':
        return '#e74c3c';
      case 'delete':
        return '#c0392b';
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

  const resolvedFileUrl = useMemo(() => {
    // Check imageUrl first for images
    if (memory.type === 'image' && memory.imageUrl) {
      if (/^https?:\/\//i.test(memory.imageUrl)) {
        return memory.imageUrl;
      }
      const apiBase = process.env.REACT_APP_API_BASE || 'http://localhost:5001';
      return `${apiBase}${memory.imageUrl}`;
    }
    
    // Then check fileUrl
    if (!memory.fileUrl) return null;
    if (/^https?:\/\//i.test(memory.fileUrl)) {
      return memory.fileUrl;
    }
    const apiBase = process.env.REACT_APP_API_BASE || 'http://localhost:5001';
    // Ensure fileUrl starts with /
    const filePath = memory.fileUrl.startsWith('/') ? memory.fileUrl : `/${memory.fileUrl}`;
    return `${apiBase}${filePath}`;
  }, [memory.fileUrl, memory.imageUrl, memory.type]);

  const renderPrimaryContent = () => {
    // Check for image first
    if (memory.type === 'image') {
      const imageSrc = resolvedFileUrl || memory.imageUrl;
      if (imageSrc) {
        return (
          <div className="memory-image-container">
            <img 
              src={imageSrc} 
              alt={memory.summary || 'Memory image'} 
              className="memory-image"
              onError={(e) => {
                e.target.style.display = 'none';
                const errorDiv = e.target.nextElementSibling;
                if (errorDiv) errorDiv.style.display = 'block';
              }}
            />
            <div className="image-error" style={{ display: 'none' }}>
              <p>Image preview not available</p>
              <a
                href={imageSrc}
                target="_blank"
                rel="noopener noreferrer"
                className="memory-file-button"
              >
                Open Image
              </a>
            </div>
          </div>
        );
      }
      // If image type but no URL, show message
      return (
        <div className="memory-file-link">
          <p>Image preview not available. The image file may have been moved or deleted.</p>
        </div>
      );
    }

    // Check for document/file
    if (resolvedFileUrl) {
      const lowerUrl = resolvedFileUrl.toLowerCase();
      const isPdf = lowerUrl.includes('.pdf');
      const isImage = lowerUrl.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/i);

      return (
        <div className="memory-document">
          {isPdf ? (
            <div className="memory-document-frame">
              <iframe
                src={`${resolvedFileUrl}#toolbar=0`}
                title={memory.title || memory.summary || 'Document preview'}
                className="memory-document-iframe"
                onError={() => {
                  // If iframe fails, show fallback
                }}
              />
            </div>
          ) : isImage ? (
            <div className="memory-image-container">
              <img 
                src={resolvedFileUrl} 
                alt={memory.summary || 'Memory image'} 
                className="memory-image"
                onError={(e) => {
                  e.target.style.display = 'none';
                  const errorDiv = e.target.nextElementSibling;
                  if (errorDiv) errorDiv.style.display = 'block';
                }}
              />
              <div className="image-error" style={{ display: 'none' }}>
                <p>Image preview not available</p>
              </div>
            </div>
          ) : (
            <div className="memory-file-link">
              <p>Preview not available for this file type. Click below to open the full file.</p>
            </div>
          )}
          <div className="memory-file-actions">
            <a
              href={resolvedFileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="memory-file-button"
            >
              Open Full File
            </a>
          </div>
        </div>
      );
    }

    // Fallback to content
    if (memory.content) {
      return (
        <div className="memory-content memory-content--full">
          <pre>{memory.content}</pre>
        </div>
      );
    }

    return (
      <div className="memory-file-link">
        <p>No preview available. This memory may not have an associated file.</p>
        {memory.summary && (
          <p className="summary-fallback">Summary: {memory.summary}</p>
        )}
      </div>
    );
  };

  const overrideAction = memory.overrideAction;
  const predictedAction = memory.predictedAction || memory.nemotronAnalysis?.predictedAction || 'keep';
  const currentAction = overrideAction || predictedAction;
  const futureRelevance = getFutureRelevance();

  const formattedSummary = useMemo(() => memory.summary || 'No summary available', [memory.summary]);
  const fullSummaryText = useMemo(() => memory.content || formattedSummary, [memory.content, formattedSummary]);
  const collapsedSummary = useMemo(() => {
    if (!formattedSummary) return 'No summary available';
    return formattedSummary.length > 240
      ? `${formattedSummary.substring(0, 240).trim()}…`
      : formattedSummary;
  }, [formattedSummary]);

  const metadataEntries = useMemo(() => {
    if (!memory.metadata) return [];
    const entries = [];
    const ignoreKeys = new Set(['storedFilename', 'originalFilename', 'mimeType', 'size']);
    Object.entries(memory.metadata).forEach(([key, value]) => {
      if (value === undefined || value === null || ignoreKeys.has(key)) return;
      const label = key
        .replace(/([A-Z])/g, ' $1')
        .replace(/[_-]+/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());
      if (value instanceof Date) {
        entries.push([label, value.toLocaleString()]);
      } else if (typeof value === 'number') {
        entries.push([label, value]);
      } else {
        entries.push([label, String(value)]);
      }
    });
    return entries;
  }, [memory.metadata]);

  const parsedExplanation = useMemo(() => {
    if (!analysisExplanation) {
      return { text: 'No explanation provided', extras: null };
    }

    const normalize = (obj) => {
      if (!obj || typeof obj !== 'object') {
        return { text: String(obj), extras: null };
      }
      const { explanation, reason, action, relevance1Month, relevance1Year, attachment, ...rest } = obj;
      const detail = {};
      if (relevance1Month !== undefined) detail['Relevance (1 month)'] = `${Math.round(relevance1Month * 100)}%`;
      if (relevance1Year !== undefined) detail['Relevance (1 year)'] = `${Math.round(relevance1Year * 100)}%`;
      if (attachment !== undefined) detail['Attachment'] = `${Math.round(attachment * 100)}%`;
      if (action) detail['Model Action'] = action;
      Object.entries(rest || {}).forEach(([key, value]) => {
        if (typeof value === 'string' || typeof value === 'number') {
          detail[key] = value;
        }
      });

      return {
        text: explanation || reason || 'Nemotron provided a structured analysis.',
        extras: Object.keys(detail).length ? detail : null
      };
    };

    if (typeof analysisExplanation === 'string') {
      const trimmed = analysisExplanation.trim();
      try {
        const parsed = JSON.parse(trimmed);
        return normalize(parsed);
      } catch (err) {
        const explanationMatch = trimmed.match(/"explanation"\s*:\s*"([^"]+)/i);
        if (explanationMatch) {
          return { text: explanationMatch[1], extras: null };
        }
        return { text: analysisExplanation, extras: null };
      }
    }

    const result = normalize(analysisExplanation);
    if (result.text && result.text.trim().toLowerCase() === 'analyzed by nemotron') {
      result.text = 'Nemotron analyzed this memory but did not return additional reasoning. Use the summary and metadata above for context.';
    }
    return result;
  }, [analysisExplanation]);

  const horizonPhrase = useMemo(() => {
    if (timeHorizon === 0) return 'right now';
    if (timeHorizon === 1) return 'in 1 month';
    if (timeHorizon === 12) return 'in 12 months';
    return `in ${timeHorizon} months`;
  }, [timeHorizon]);

  return (
    <div className="memory-detail-panel">
      <div className="panel-header">
        <h2>Memory Details</h2>
        <button className="close-button" onClick={onClose}>×</button>
      </div>

      <div className="panel-content">
        <div className="detail-section">
          <h3>Summary</h3>
          <pre className={`memory-summary ${showFullSummary ? 'expanded' : ''}`}>
            {showFullSummary ? fullSummaryText : collapsedSummary}
          </pre>
          {fullSummaryText && fullSummaryText.length > 240 && (
            <button
              className="summary-toggle"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowFullSummary(prev => !prev);
              }}
            >
              {showFullSummary ? 'Show less' : 'Show more'}
            </button>
          )}
        </div>

        {metadataEntries.length > 0 && (
          <div className="detail-section">
            <h3>Metadata</h3>
            <div className="metadata-grid">
              {metadataEntries.map(([label, value]) => (
                <div key={label} className="metadata-row">
                  <span className="metadata-label">{label}</span>
                  <span className="metadata-value">{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="detail-section">
          <h3>{memory.type === 'image' ? 'Image' : 'Original Content'}</h3>
          {renderPrimaryContent()}
        </div>

        <div className="detail-section">
          <h3>Scores & Analysis</h3>
          <div className="scores-grid">
            <div className="score-item">
              <span className="score-label">Relevance (1 month)</span>
              <div className="score-bar">
                <div
                  className="score-fill"
                  style={{ width: `${relevance1Month * 100}%`, backgroundColor: '#3498db' }}
                />
                <span className="score-value">{(relevance1Month * 100).toFixed(0)}%</span>
              </div>
            </div>
            <div className="score-item">
              <span className="score-label">Relevance (1 year)</span>
              <div className="score-bar">
                <div
                  className="score-fill"
                  style={{ width: `${relevance1Year * 100}%`, backgroundColor: '#3498db' }}
                />
                <span className="score-value">{(relevance1Year * 100).toFixed(0)}%</span>
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
                  style={{ width: `${attachmentScore * 100}%`, backgroundColor: '#9b59b6' }}
                />
                <span className="score-value">{(attachmentScore * 100).toFixed(0)}%</span>
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
            {analysisConfidence !== undefined && (
              <div className="score-item">
                <span className="score-label">Nemotron Confidence</span>
                <div className="score-bar">
                  <div
                    className="score-fill"
                    style={{ width: `${analysisConfidence * 100}%`, backgroundColor: '#1abc9c' }}
                  />
                  <span className="score-value">{(analysisConfidence * 100).toFixed(0)}%</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="detail-section">
          <h3>Prediction Explanation</h3>
          <div className="explanation">
            {parsedExplanation?.text && parsedExplanation.text.trim() && parsedExplanation.text !== 'No explanation provided' ? (
              <p className="analysis-explanation">
                {parsedExplanation.text}
              </p>
            ) : (
              <p>
                This memory is predicted to retain <strong>{(futureRelevance * 100).toFixed(0)}% relevance</strong> {horizonPhrase}.
                Based on this analysis, the recommended action is:{' '}
                <strong style={{ color: getActionColor(predictedAction) }}>
                  {predictedAction.charAt(0).toUpperCase() + predictedAction.slice(1)}
                </strong>.
              </p>
            )}
            {parsedExplanation?.extras && Object.keys(parsedExplanation.extras).length > 0 && (
              <div className="analysis-extras">
                {Object.entries(parsedExplanation.extras).map(([label, value]) => (
                  <div key={label} className="analysis-extra-row">
                    <span className="analysis-extra-label">{label}</span>
                    <span className="analysis-extra-value">{value}</span>
                  </div>
                ))}
              </div>
            )}
            <p className="analysis-source">
              Source: {wasNemotronUsed ? 'NVIDIA Nemotron AI analysis' : 'Heuristic fallback'}
              {memory.nemotronUpdatedAt ? ` • Last updated ${new Date(memory.nemotronUpdatedAt).toLocaleString()}` : ''}
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
              className={`action-button ${overrideAction === 'keep' ? 'active' : ''}`}
              style={{ borderColor: getActionColor('keep') }}
              onClick={() => handleActionChange('keep')}
            >
              Keep
            </button>
            <button
              className={`action-button ${overrideAction === 'compress' ? 'active' : ''}`}
              style={{ borderColor: getActionColor('compress') }}
              onClick={() => handleActionChange('compress')}
            >
              Compress
            </button>
            <button
              className={`action-button ${overrideAction === 'forget' ? 'active' : ''}`}
              style={{ borderColor: getActionColor('forget') }}
              onClick={() => handleActionChange('forget')}
            >
              Forget
            </button>
            <button
              className={`action-button ${overrideAction === 'delete' ? 'active' : ''}`}
              style={{ borderColor: getActionColor('delete') }}
              onClick={() => handleActionChange('delete')}
            >
              Delete
            </button>
          </div>
          {memory.userOverridden && (
            <p className="override-note">✓ You've overridden the AI prediction</p>
          )}
          {!overrideAction && (
            <p className="override-note">Current: {predictedAction.charAt(0).toUpperCase() + predictedAction.slice(1)} (AI predicted)</p>
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

