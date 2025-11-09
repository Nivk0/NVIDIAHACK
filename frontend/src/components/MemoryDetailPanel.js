import React, { useMemo, useState, useEffect } from 'react';
import './MemoryDetailPanel.css';

function MemoryDetailPanel({ memory, timeHorizon, onUpdate, onDelete, onClose }) {
  const [showFullSummary, setShowFullSummary] = useState(false);
  const searchQuery = memory._searchQuery || memory.searchQuery;

  // Reset showFullSummary when memory changes
  useEffect(() => {
    setShowFullSummary(false);
  }, [memory?.id]);

  const relevance1Month = memory.relevance1Month ?? memory.nemotronAnalysis?.relevance1Month ?? 0.5;
  const relevance1Year = memory.relevance1Year ?? memory.nemotronAnalysis?.relevance1Year ?? 0.5;
  const attachmentScore = memory.attachment ?? memory.nemotronAnalysis?.attachment ?? 0.5;
  const analysisExplanation = memory.nemotronExplanation || memory.nemotronAnalysis?.explanation;
  const analysisConfidence = memory.nemotronConfidence ?? memory.nemotronAnalysis?.confidence;
  const wasNemotronUsed = memory.nemotronAnalyzed ?? memory.nemotronAnalysis?.nemotronAnalyzed;

  // Get sentiment score and normalize to 0-1 range (if it's -1 to 1, convert it)
  const rawSentimentScore = memory.sentiment?.score ?? memory.nemotronAnalysis?.sentimentScore ?? 0;
  const sentimentScore = useMemo(() => {
    // If score is already 0-1, use it as is
    if (rawSentimentScore >= 0 && rawSentimentScore <= 1) {
      return rawSentimentScore;
    }
    // If score is -1 to 1, normalize to 0-1
    if (rawSentimentScore >= -1 && rawSentimentScore <= 1) {
      return (rawSentimentScore + 1) / 2;
    }
    // Default to 0.5 if unknown
    return 0.5;
  }, [rawSentimentScore]);

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
      case 'low_relevance':
        return '#d68910'; // Darker orange
      case 'forget':
        return '#d68910'; // Support old "forget" for backward compatibility
      case 'delete':
        return '#c0392b';
      default:
        return '#95a5a6';
    }
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
      const apiBase = process.env.REACT_APP_API_BASE_URL?.replace('/api', '') || 'http://localhost:5001';
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

  // Use Nemotron-generated summary if available, otherwise use the memory's summary
  const formattedSummary = useMemo(() => {
    return memory.nemotronAnalysis?.summary ||
      memory.nemotronSummary ||
      memory.summary ||
      'No summary available';
  }, [memory.nemotronAnalysis?.summary, memory.nemotronSummary, memory.summary]);

  const fullSummaryText = useMemo(() => formattedSummary, [formattedSummary]);

  const collapsedSummary = useMemo(() => {
    if (!fullSummaryText || fullSummaryText === 'No summary available') return 'No summary available';
    return fullSummaryText.length > 240
      ? `${fullSummaryText.substring(0, 240).trim()}…`
      : fullSummaryText;
  }, [fullSummaryText]);

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
    // If we have a good explanation string, use it directly
    if (analysisExplanation && typeof analysisExplanation === 'string') {
      const trimmed = analysisExplanation.trim();

      // Skip if it's just a placeholder
      if (trimmed.toLowerCase() === 'analyzed by nemotron' || trimmed.length < 20) {
        // Generate explanation from available data
        const actionName = predictedAction === 'low_relevance' ? 'Low Future Relevance' :
          predictedAction.charAt(0).toUpperCase() + predictedAction.slice(1);
        const reasons = [];
        if (relevance1Year < 0.3) {
          reasons.push(`low long-term relevance (${Math.round(relevance1Year * 100)}%)`);
        }
        if (memory.age > 24) {
          reasons.push(`age of ${memory.age} months`);
        }
        if (attachmentScore < 0.3) {
          reasons.push(`low emotional attachment (${Math.round(attachmentScore * 100)}%)`);
        }
        if (memory.metadata?.imageQuality === 'blurry') {
          reasons.push('low image quality');
        }

        const reasonText = reasons.length > 0
          ? ` due to ${reasons.join(', ')}`
          : ` based on relevance scores (${Math.round(relevance1Month * 100)}% 1-month, ${Math.round(relevance1Year * 100)}% 1-year)`;

        return {
          text: `This ${memory.age || 0}-month-old ${memory.type || 'memory'} is recommended for ${actionName}${reasonText}.`,
          extras: null
        };
      }

      // Try to parse as JSON if it looks like JSON
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (parsed.explanation) {
            return { text: parsed.explanation, extras: null };
          }
        } catch (err) {
          // Not valid JSON, use as-is
        }
      }

      // Use the explanation string directly
      return { text: trimmed, extras: null };
    }

    // If it's an object, extract explanation
    if (analysisExplanation && typeof analysisExplanation === 'object') {
      const text = analysisExplanation.explanation ||
        analysisExplanation.reason ||
        analysisExplanation.text ||
        'Nemotron analyzed this memory.';
      return { text: String(text), extras: null };
    }

    // Fallback: generate explanation from data
    const actionName = predictedAction === 'low_relevance' ? 'Low Future Relevance' :
      predictedAction.charAt(0).toUpperCase() + predictedAction.slice(1);
    const reasons = [];
    if (relevance1Year < 0.3) {
      reasons.push(`low long-term relevance (${Math.round(relevance1Year * 100)}%)`);
    }
    if (memory.age > 24) {
      reasons.push(`age of ${memory.age} months`);
    }
    if (attachmentScore < 0.3) {
      reasons.push(`low emotional attachment (${Math.round(attachmentScore * 100)}%)`);
    }

    const reasonText = reasons.length > 0
      ? ` due to ${reasons.join(', ')}`
      : ` based on relevance scores (${Math.round(relevance1Month * 100)}% 1-month, ${Math.round(relevance1Year * 100)}% 1-year)`;

    return {
      text: `This ${memory.age || 0}-month-old ${memory.type || 'memory'} is recommended for ${actionName}${reasonText}.`,
      extras: null
    };
  }, [analysisExplanation, predictedAction, relevance1Month, relevance1Year, attachmentScore, memory.age, memory.type, memory.metadata]);

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
        <button className="close-button" onClick={onClose} title="Close" aria-label="Close panel">
          ✕
        </button>
      </div>

      <div className="panel-content">
        <div className="detail-section">
          <h3>Summary</h3>
          <pre
            className={`memory-summary ${showFullSummary ? 'expanded' : ''}`}
            style={{
              maxHeight: showFullSummary ? 'none' : '140px',
              overflow: showFullSummary ? 'visible' : 'hidden',
              display: 'block',
              wordWrap: 'break-word',
              wordBreak: 'break-word',
              overflowWrap: 'break-word',
              whiteSpace: 'pre-wrap'
            }}
          >
            {showFullSummary ? fullSummaryText : collapsedSummary}
          </pre>
          {fullSummaryText && fullSummaryText.length > 240 && (
            <div style={{ marginTop: '8px' }}>
              <button
                type="button"
                className="summary-toggle"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  e.nativeEvent?.stopImmediatePropagation?.();
                  setShowFullSummary(prev => !prev);
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                style={{ pointerEvents: 'auto' }}
              >
                {showFullSummary ? 'Show less' : 'Show more'}
              </button>
            </div>
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
                {memory.sentiment?.label || 'neutral'} ({sentimentScore.toFixed(2)})
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
            {(() => {
              // Get the explanation text
              const explanationText = parsedExplanation?.text || 'No explanation available.';

              return (
                <div>
                  <p className="analysis-explanation">
                    {explanationText}
                  </p>
                  <div className="explanation-factors">
                    <p className="factors-header">Analysis Details:</p>
                    <ul>
                      <li>
                        <strong>1-Month Relevance:</strong> {((relevance1Month * 100).toFixed(0))}%
                      </li>
                      <li>
                        <strong>1-Year Relevance:</strong> {((relevance1Year * 100).toFixed(0))}%
                      </li>
                      <li>
                        <strong>Attachment Score:</strong> {((attachmentScore * 100).toFixed(0))}%
                      </li>
                      <li>
                        <strong>Memory Age:</strong> {memory.age || 0} months
                      </li>
                      <li>
                        <strong>Content Type:</strong> {memory.type || 'unknown'}
                      </li>
                      {memory.sentiment?.label && (
                        <li>
                          <strong>Sentiment:</strong> {memory.sentiment.label}
                        </li>
                      )}
                      {analysisConfidence !== undefined && (
                        <li>
                          <strong>Confidence:</strong> {((analysisConfidence * 100).toFixed(0))}%
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              );
            })()}
            <p className="analysis-source">
              {wasNemotronUsed ? '✓ Analyzed by NVIDIA Nemotron AI' : '⚠ Using heuristic fallback analysis'}
              {memory.nemotronUpdatedAt && (
                <span className="update-time"> • Updated {new Date(memory.nemotronUpdatedAt).toLocaleDateString()}</span>
              )}
            </p>
          </div>
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

