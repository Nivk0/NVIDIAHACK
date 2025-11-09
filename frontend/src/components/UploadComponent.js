import React, { useState, useRef } from 'react';
import './UploadComponent.css';

const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001/api';

function UploadComponent({ onComplete }) {
  const [files, setFiles] = useState([]);
  const [textData, setTextData] = useState('');
  const [jobId, setJobId] = useState(null);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('');
  const [status, setStatus] = useState('idle'); // idle, uploading, processing, completed
  const [showPickerOptions, setShowPickerOptions] = useState(false);

  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);

  const buildFileKey = (file) => `${file.webkitRelativePath || file.name}:${file.size}:${file.lastModified}`;

  const mergeFileLists = (existing, incoming) => {
    const map = new Map();
    existing.forEach(file => map.set(buildFileKey(file), file));
    incoming.forEach(file => map.set(buildFileKey(file), file));
    return Array.from(map.values());
  };

  const openPicker = (mode) => {
    if (mode === 'folder' && folderInputRef.current) {
      folderInputRef.current.click();
    } else if (fileInputRef.current) {
      fileInputRef.current.click();
    }
    setShowPickerOptions(false);
  };

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files || []);
    setFiles(prev => mergeFileLists(prev, selected));
    if (e.target) {
      e.target.value = '';
    }
  };

  const handleFolderChange = (e) => {
    const selected = Array.from(e.target.files || []);
    setFiles(prev => mergeFileLists(prev, selected));
    if (e.target) {
      e.target.value = '';
    }
  };

  const handleTextDataChange = (e) => {
    setTextData(e.target.value);
  };

  const handleUpload = async () => {
    if (files.length === 0 && !textData.trim()) {
      alert('Please select files or enter text data');
      return;
    }

    setStatus('uploading');

    try {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file);
      });

      if (files.length > 0) {
        const metadataList = files.map((file) => {
          const relativePath = file.webkitRelativePath || null;
          const segments = relativePath ? relativePath.split(/[\\/]/).filter(Boolean) : [];
          return {
            originalname: file.name,
            relativePath,
            rootFolder: segments.length > 1 ? segments[0] : null,
            lastModified: file.lastModified || null,
            size: file.size,
            type: file.type || null
          };
        });
        formData.append('fileMetadata', JSON.stringify(metadataList));
      }

      if (textData.trim()) {
        const textItems = textData.split('\n\n').map((text, index) => ({
          type: 'text',
          content: text,
          createdAt: new Date().toISOString(),
          metadata: { index }
        }));
        formData.append('textData', JSON.stringify(textItems));
      }

      const response = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      setJobId(data.jobId);
      setStatus('processing');

      // Poll for progress
      pollProgress(data.jobId);
    } catch (error) {
      console.error('Upload error:', error);
      setStatus('idle');
      alert('Upload failed: ' + error.message);
    }
  };

  const pollProgress = async (jobId) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`${API_BASE}/upload/status/${jobId}`);
        const data = await response.json();

        setProgress(data.progress || 0);
        setStage(data.stage || '');

        if (data.status === 'completed') {
          clearInterval(interval);
          setStatus('completed');
          setTimeout(() => {
            onComplete();
          }, 1000);
        } else if (data.status === 'failed') {
          clearInterval(interval);
          setStatus('idle');
          alert('Processing failed: ' + (data.error || 'Unknown error'));
        }
      } catch (error) {
        console.error('Error polling progress:', error);
        clearInterval(interval);
        setStatus('idle');
      }
    }, 500);
  };

  const getStageLabel = (stage) => {
    const stages = {
      scanning: 'Scanning data...',
      predicting: 'Predicting relevance...',
      analyzing: 'Analyzing sentiment...',
      clustering: 'Creating clusters...',
      complete: 'Complete!'
    };
    return stages[stage] || stage;
  };

  return (
    <div className="upload-component">
      <div className="upload-card">
        <h2>Upload Your Data</h2>
        <p>Upload files, notes, chats, or documents to analyze and cluster</p>
        <div style={{ 
          padding: '12px', 
          background: '#e8f4f8', 
          borderRadius: '8px', 
          marginBottom: '20px',
          fontSize: '14px',
          color: '#2c3e50'
        }}>
          <strong>🤖 AI-Powered Analysis:</strong> All memories will be analyzed using NVIDIA Nemotron AI to determine relevance, sentiment, and recommended actions.
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileChange}
          style={{ display: 'none' }}
          disabled={status === 'processing' || status === 'uploading'}
        />
        <input
          ref={folderInputRef}
          type="file"
          multiple
          onChange={handleFolderChange}
          style={{ display: 'none' }}
          disabled={status === 'processing' || status === 'uploading'}
          {...{ webkitdirectory: '', directory: '' }}
        />

        <div className="upload-section">
          <div className="upload-label">
            <span>Choose files or entire folders</span>
          </div>
          <div className="button-row picker-row">
            <div className="picker-wrapper">
              <button
                type="button"
                className="upload-button secondary"
                onClick={() => setShowPickerOptions((prev) => !prev)}
                disabled={status === 'processing' || status === 'uploading'}
              >
                Select Files or Folders
              </button>
              {showPickerOptions && (
                <div className="picker-menu">
                  <button
                    type="button"
                    onClick={() => openPicker('file')}
                    disabled={status === 'processing' || status === 'uploading'}
                  >
                    Choose Files
                  </button>
                  <button
                    type="button"
                    onClick={() => openPicker('folder')}
                    disabled={status === 'processing' || status === 'uploading'}
                  >
                    Choose Folder
                  </button>
                </div>
              )}
            </div>
          </div>
          {files.length > 0 && (
            <div className="file-list">
              {files.map((file) => (
                <div key={buildFileKey(file)} className="file-item">
                  <span className="file-name">{file.webkitRelativePath || file.name}</span>
                  <span className="file-size">{(file.size / 1024).toFixed(2)} KB</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="upload-section">
          <label className="upload-label">
            <span>Or Enter Text Data</span>
            <textarea
              value={textData}
              onChange={handleTextDataChange}
              placeholder="Enter notes, chats, or documents (separate with double newline)"
              rows="10"
              disabled={status === 'processing' || status === 'uploading'}
            />
          </label>
        </div>

        <button
          className="upload-button"
          onClick={handleUpload}
          disabled={status === 'processing' || status === 'uploading' || (files.length === 0 && !textData.trim())}
        >
          {status === 'uploading' ? 'Uploading...' : status === 'processing' ? 'Processing...' : 'Upload & Analyze'}
        </button>

        {(status === 'processing' || status === 'uploading') && (
          <div className="progress-container">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="progress-info">
              <span className="progress-percentage">{progress}%</span>
              <span className="progress-stage">{getStageLabel(stage)}</span>
            </div>
            <div className="agent-stages">
              <div className={`agent-stage ${stage === 'scanning' ? 'active' : progress > 25 ? 'completed' : ''}`}>
                <span>1. Scanning</span>
              </div>
              <div className={`agent-stage ${stage === 'predicting' ? 'active' : progress > 50 ? 'completed' : ''}`}>
                <span>2. Predicting</span>
              </div>
              <div className={`agent-stage ${stage === 'analyzing' ? 'active' : progress > 75 ? 'completed' : ''}`}>
                <span>3. Analyzing</span>
              </div>
              <div className={`agent-stage ${stage === 'clustering' ? 'active' : progress === 100 ? 'completed' : ''}`}>
                <span>4. Clustering</span>
              </div>
            </div>
          </div>
        )}

        {status === 'completed' && (
          <div className="completion-message">
            ✓ Processing complete! Loading your Memory Garden...
          </div>
        )}
      </div>
    </div>
  );
}

export default UploadComponent;

