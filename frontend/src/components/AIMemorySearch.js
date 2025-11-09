import React, { useState } from 'react';
import './AIMemorySearch.css';

const API_BASE = 'http://localhost:5001/api';

function AIMemorySearch({ memories, onMemoryClick, onClose }) {
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState([]);
  const [searchExplanation, setSearchExplanation] = useState('');
  const [error, setError] = useState('');


  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setSearching(true);
    setError('');
    setResults([]);
    setSearchExplanation('');

    try {
      const response = await fetch(`${API_BASE}/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: query.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Search failed with status ${response.status}`);
      }

      const data = await response.json();
      // Store search query with each result for RAG formatting
      const resultsWithQuery = (data.results || []).map(result => ({
        ...result,
        _searchQuery: data.searchQuery || query
      }));
      setResults(resultsWithQuery);
      setSearchExplanation(data.explanation || '');
      
      if (data.error) {
        setError(data.error);
      } else {
        setError('');
      }
    } catch (error) {
      console.error('Search error:', error);
      setError(`Failed to perform search: ${error.message}. Please try again.`);
      setResults([]);
      setSearchExplanation('');
    } finally {
      setSearching(false);
    }
  };


  const getActionColor = (action) => {
    switch (action) {
      case 'keep': return '#2ecc71';
      case 'compress': return '#f39c12';
      case 'forget': return '#e74c3c';
      case 'delete': return '#c0392b';
      default: return '#95a5a6';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'image': return '🖼️';
      case 'document': return '📄';
      case 'text': return '📝';
      case 'email': return '📧';
      case 'chat': return '💬';
      default: return '📎';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="ai-memory-search-panel">
      <div className="search-header">
        <h2>🔍 AI Memory Search</h2>
        <button className="close-button" onClick={onClose}>×</button>
      </div>

      <div className="search-content">
        <p className="search-description">
          Ask questions in natural language. AI will understand your intent and find relevant memories.
        </p>

        <form onSubmit={handleSearch} className="search-form">
          <div className="search-input-container">
            <input
              type="text"
              className="search-input"
              placeholder="e.g., Find memories about my college projects..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={searching}
            />
            <button
              type="submit"
              className="search-button"
              disabled={searching || !query.trim()}
            >
              {searching ? 'Searching...' : '🔍 Search'}
            </button>
          </div>
        </form>

        {error && (
          <div className="search-error">{error}</div>
        )}

        {searchExplanation && (
          <div className="search-explanation">
            <strong>AI Understanding:</strong> {searchExplanation}
          </div>
        )}

        {results.length > 0 && (
          <div className="search-results">
            <h3>Found {results.length} {results.length === 1 ? 'memory' : 'memories'}</h3>
            <div className="results-list">
              {results.map((memory) => {
                const action = memory.overrideAction || memory.predictedAction || 'keep';
                const relevance1Month = memory.nemotronAnalysis?.relevance1Month ?? memory.relevance1Month ?? 0.5;
                const relevance1Year = memory.nemotronAnalysis?.relevance1Year ?? memory.relevance1Year ?? 0.5;
                
                return (
                  <div
                    key={memory.id}
                    className="result-card"
                    onClick={() => onMemoryClick && onMemoryClick(memory, memory._searchQuery || query)}
                  >
                    <div className="result-header">
                      <div className="result-type-icon">
                        {getTypeIcon(memory.type)}
                      </div>
                      <div className="result-title">
                        {memory.title || memory.filename || 'Untitled Memory'}
                      </div>
                      <div
                        className="result-action-badge"
                        style={{ backgroundColor: getActionColor(action) }}
                      >
                        {action.charAt(0).toUpperCase() + action.slice(1)}
                      </div>
                    </div>

                    {memory.summary && (
                      <p className="result-summary">
                        {memory.summary.length > 200
                          ? `${memory.summary.substring(0, 200)}...`
                          : memory.summary}
                      </p>
                    )}

                    <div className="result-metadata">
                      <span>{formatDate(memory.createdAt)}</span>
                      {memory.age !== undefined && (
                        <>
                          <span>•</span>
                          <span>{memory.age} months old</span>
                        </>
                      )}
                      <span>•</span>
                      <span>Relevance: {(relevance1Month * 100).toFixed(0)}% (1M) / {(relevance1Year * 100).toFixed(0)}% (1Y)</span>
                    </div>

                    {memory.matchReason && (
                      <div className="match-reason">
                        <strong>Why this matches:</strong> {memory.matchReason}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!searching && results.length === 0 && query && !error && (
          <div className="no-results">
            <p>No memories found matching your query. Try rephrasing or using different keywords.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default AIMemorySearch;

