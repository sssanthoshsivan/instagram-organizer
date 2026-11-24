import React, { useEffect, useState } from 'react';
import './BulkManagerUI.css';

interface Props {
  selectedCount: number;
  onClear: () => void;
  onMoveToCollection: () => void;
  onClose?: () => void;
}

const BulkManagerUI: React.FC<Props> = ({
  selectedCount: initialCount,
  onClear,
  onMoveToCollection,
  onClose,
}) => {
  const [count, setCount] = useState(initialCount);
  const [status, setStatus] = useState<'idle' | 'processing' | 'done'>('idle');
  const [progress, setProgress] = useState(0);
  const [resultSummary, setResultSummary] = useState<{ completed: number; failed: number } | null>(null);
  const [showToolbar, setShowToolbar] = useState(initialCount > 0);

  useEffect(() => {
    const handleSelectionChange = (e: CustomEvent<{ count: number }>) => {
      setCount(e.detail.count);
      if (e.detail.count > 0) {
        setShowToolbar(true);
      }
    };

    const handleStatusUpdate = (
      e: CustomEvent<{
        status: 'idle' | 'processing' | 'done';
        progress: number;
        completed?: number;
        failed?: number;
      }>
    ) => {
      setStatus(e.detail.status);
      setProgress(e.detail.progress);

      if (e.detail.status === 'processing') {
        setShowToolbar(true);
      }

      if (e.detail.status === 'done') {
        if (e.detail.completed !== undefined || e.detail.failed !== undefined) {
          setResultSummary({
            completed: e.detail.completed ?? 0,
            failed: e.detail.failed ?? 0,
          });
        }
      }
    };

    window.addEventListener('instabulk-selection-changed', handleSelectionChange as EventListener);
    window.addEventListener('instabulk-status-update', handleStatusUpdate as EventListener);

    return () => {
      window.removeEventListener('instabulk-selection-changed', handleSelectionChange as EventListener);
      window.removeEventListener('instabulk-status-update', handleStatusUpdate as EventListener);
    };
  }, []);


  // Auto-dismiss the toolbar after completion
  useEffect(() => {
    if (status === 'done') {
      const dismissDelay = resultSummary && resultSummary.failed > 0 ? 4000 : 2500;
      const timer = window.setTimeout(() => {
        setShowToolbar(false);
        setStatus('idle');
        setResultSummary(null);
      }, dismissDelay);

      return () => window.clearTimeout(timer);
    }
  }, [status, resultSummary]);

  const handleUnsave = () => {
    if (count === 0 || status === 'processing') return;
    window.dispatchEvent(new CustomEvent('instabulk-action-unsave'));
  };

  const handleClose = () => {
    setShowToolbar(false);
    setStatus('idle');
    setResultSummary(null);
    if (onClose) {
      onClose();
    } else {
      onClear();
    }
  };

  const isVisible = showToolbar && (count > 0 || status === 'processing' || status === 'done');

  return (
    <div className={`instabulk-dock-wrapper ${isVisible ? 'visible' : ''}`}>
      <div className="instabulk-dock">
        {status === 'done' ? (
          <div className="dock-section done-group">
            <div className="done-badge">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <span className="done-text">
              {resultSummary && resultSummary.failed > 0
                ? `${resultSummary.completed} unsaved (${resultSummary.failed} failed)`
                : 'All selected posts unsaved'}
            </span>
          </div>
        ) : (
          <>
            {/* Left: Selection Counter & Clear */}
            <div className="dock-section selection-group">
              <div className="selection-badge">
                <span className="count-num">{count}</span>
                <span className="count-label">selected</span>
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

            {/* Center: Processing Progress */}
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
          </>
        )}

        <div className="dock-divider" />

        {/* Dedicated Close Button */}
        <button
          type="button"
          className="dock-close-btn"
          onClick={handleClose}
          disabled={status === 'processing'}
          title="Close toolbar and deselect posts"
          aria-label="Close toolbar"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    </div>
  );
};

export default BulkManagerUI;
