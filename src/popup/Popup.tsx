import { useEffect, useState } from 'react';
import './Popup.css';

const Popup = () => {
  const [isInstagramSavedPage, setIsInstagramSavedPage] = useState(false);
  const [isBulkMode, setIsBulkMode] = useState(false);

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (activeTab?.url?.includes('instagram.com') && activeTab.url.includes('/saved/')) {
        setIsInstagramSavedPage(true);
      }
    });

    chrome.storage.local.get(['bulkMode'], (result) => {
      setIsBulkMode(!!result.bulkMode);
    });
  }, []);

  const toggleBulkMode = () => {
    const newValue = !isBulkMode;
    setIsBulkMode(newValue);
    chrome.storage.local.set({ bulkMode: newValue });

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'TOGGLE_BULK_MODE', active: newValue });
      }
    });
  };

  return (
    <div className="popup-container">
      <header className="popup-header">
        <div className="logo-section">
          <div className="gradient-logo">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 22 12 2Z" fill="url(#grad1)" />
              <path d="M16 8L10 14L8 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <defs>
                <linearGradient id="grad1" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#f09433" />
                  <stop offset="0.25" stopColor="#e6683c" />
                  <stop offset="0.5" stopColor="#dc2743" />
                  <stop offset="0.75" stopColor="#cc2366" />
                  <stop offset="1" stopColor="#bc1888" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <h1>InstaBulk</h1>
        </div>
        <div className={`status-badge ${isInstagramSavedPage ? 'status-active' : 'status-inactive'}`}>
          {isInstagramSavedPage ? 'Page Detected' : 'Unsupported Page'}
        </div>
      </header>

      <main>
        {!isInstagramSavedPage ? (
          <div className="glass-card instruction-card">
            <p>Please navigate to your <strong>Instagram Saved Posts</strong> page to start managing.</p>
            <button
              className="secondary-btn"
              onClick={() => window.open('https://instagram.com/reels/saved/', '_blank')}
            >
              Go to Saved Posts
            </button>
          </div>
        ) : (
          <div className="controls-grid">
            <div className="glass-card">
              <h3>Bulk Edit Mode</h3>
              <p className="description">Enable checkboxes on your saved thumbnails.</p>
              <button
                className={`primary-btn ${isBulkMode ? 'active' : ''}`}
                onClick={toggleBulkMode}
              >
                {isBulkMode ? 'Disable Bulk Mode' : 'Enable Bulk Mode'}
              </button>
            </div>

            <div className="glass-card stats-card">
              <div className="stat-item">
                <span className="label">Total Saved</span>
                <span className="value">...</span>
              </div>
              <div className="stat-item">
                <span className="label">Selected</span>
                <span className="value">0</span>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="footer-links">
        <a href="#">Help & Documentation</a>
        <span className="version">v1.0.0</span>
      </footer>
    </div>
  );
};

export default Popup;
