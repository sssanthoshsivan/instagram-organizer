import React, { useEffect, useState } from 'react';
import './BulkManagerUI.css';

interface Props {
  selectedCount: number;
  onClear: () => void;
}

const BulkManagerUI: React.FC<Props> = ({ selectedCount: initialCount, onClear }) => {
  const [count, setCount] = useState(initialCount);
  const [status, setStatus] = useState<'idle' | 'processing' | 'done'>('idle');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handleSelectionChange = (e: any) => {
      setCount(e.detail.count);
    };

    const handleStatusUpdate = (e: any) => {
      setStatus(e.detail.status);
      setProgress(e.detail.progress);
    };

    window.addEventListener('instabulk-selection-changed', handleSelectionChange);
    window.addEventListener('instabulk-status-update', handleStatusUpdate);
    return () => {
      window.removeEventListener('instabulk-selection-changed', handleSelectionChange);
      window.removeEventListener('instabulk-status-update', handleStatusUpdate);
    };
  }, []);

  const handleUnsave = () => {
    if (count === 0) return;
    window.dispatchEvent(new CustomEvent('instabulk-action-unsave'));
  };

  return (
    <div className={`instabulk-toolbar ${count > 0 ? 'visible' : ''}`}>
      <div className="toolbar-inner">
        <div className="selection-stats">
          <span className="count-badge">{count}</span>
          <span>Selected</span>
        </div>

        {status === 'processing' ? (
          <div className="progress-container">
            <div className="progress-bar" style={{ width: `${progress}%` }}></div>
            <span className="progress-text">Processing... {progress}%</span>
          </div>
        ) : status === 'done' ? (
          <div className="success-message">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <span>Completed!</span>
          </div>
        ) : (
          <div className="action-buttons">
            <button className="toolbar-btn secondary" onClick={onClear}>Deselect All</button>
            <button className="toolbar-btn primary" onClick={handleUnsave}>Unsave Selected</button>
            <button className="toolbar-btn accent">Move to Collection</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BulkManagerUI;
