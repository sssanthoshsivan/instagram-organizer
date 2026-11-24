import React, { useEffect, useState } from 'react';
import './BulkManagerUI.css';

interface Props {
  selectedCount: number;
  onClear: () => void;
  onMoveToCollection: () => void;
}

const BulkManagerUI: React.FC<Props> = ({ selectedCount: initialCount, onClear, onMoveToCollection }) => {
  const [count, setCount] = useState(initialCount);
  const [status, setStatus] = useState<'idle' | 'processing' | 'done'>('idle');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handleSelectionChange = (e: CustomEvent<{ count: number }>) => {
      setCount(e.detail.count);
    };

    const handleStatusUpdate = (e: CustomEvent<{ status: 'idle' | 'processing' | 'done'; progress: number }>) => {
      setStatus(e.detail.status);
      setProgress(e.detail.progress);
    };

    window.addEventListener('instabulk-selection-changed', handleSelectionChange as EventListener);
    window.addEventListener('instabulk-status-update', handleStatusUpdate as EventListener);
    return () => {
      window.removeEventListener('instabulk-selection-changed', handleSelectionChange as EventListener);
      window.removeEventListener('instabulk-status-update', handleStatusUpdate as EventListener);
    };
  }, []);

  const handleUnsave = () => {
    if (count === 0 || status === 'processing') return;
    window.dispatchEvent(new CustomEvent('instabulk-action-unsave'));
  };

  const showToolbar = count > 0 || status !== 'idle';

  return (
    <div className={`instabulk-dock-wrapper ${showToolbar ? 'visible' : ''}`}>
      <div className="instabulk-dock">
        {/* Left: Selection Counter & Clear */}
        <div className="dock-section selection-group">
          <div className="selection-badge">
            <span className="count-num">{count}</span>
            <span className="count-label">{count === 1 ? 'selected' : 'selected'}</span>
          </div>
          {count > 0 && status === 'idle' && (
            <button
              type="button"
              className="dock-btn-ghost"
              onClick={onClear}
              title="Deselect all posts"
            >
              Clear
            </button>
          )}
        </div>

        {/* Center: Processing Progress or Completed State */}
        {status === 'processing' && (
          <div className="dock-section progress-group">
            <div className="dock-progress-track">
              <div
                className="dock-progress-fill"
                style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
              />
            </div>
            <span className="dock-progress-text">{progress}%</span>
          </div>
        )}

        {status === 'done' && (
          <div className="dock-section done-group">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <span>Completed</span>
          </div>
        )}

        {/* Right: Primary Actions */}
        <div className="dock-section action-group">
          <button
            type="button"
            className="dock-btn dock-btn-secondary"
            onClick={onMoveToCollection}
            disabled={status === 'processing'}
            title="Move to Collection (Roadmap)"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
              <line x1="12" y1="11" x2="12" y2="17"></line>
              <line x1="9" y1="14" x2="15" y2="14"></line>
            </svg>
            <span>Collection</span>
          </button>

          <button
            type="button"
            className="dock-btn dock-btn-primary"
            onClick={handleUnsave}
            disabled={count === 0 || status === 'processing'}
            title="Unsave selected posts"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              <line x1="10" y1="11" x2="10" y2="17"></line>
              <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
            <span>Unsave ({count})</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkManagerUI;
