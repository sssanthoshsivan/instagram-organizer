import React, { useEffect, useState } from 'react';
import './Popup.css';
import { isSavedPage, cleanInstagramUsername, getSavedPostsUrl } from '../shared/page-utils';

const Popup = () => {
  const [isInstagramSavedPage, setIsInstagramSavedPage] = useState(false);
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [totalSaved, setTotalSaved] = useState<string>('—');
  const [instagramUserId, setInstagramUserId] = useState<string>('');
  const [isEditingUsername, setIsEditingUsername] = useState(false);

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      let isSaved = false;

      if (activeTab?.url) {
        try {
          const url = new URL(activeTab.url);
          if (url.hostname.includes('instagram.com')) {
            isSaved = isSavedPage(url.pathname);
          }
        } catch {
          isSaved = !!(
            activeTab.url.includes('instagram.com') &&
            (activeTab.url.includes('/saved/') || activeTab.url.includes('/reels/saved/'))
          );
        }
      }

      setIsInstagramSavedPage(isSaved);

      if (isSaved && activeTab?.id) {
        chrome.tabs.sendMessage(activeTab.id, { type: 'GET_TOTAL_SAVED_COUNT' }, (response) => {
          if (chrome.runtime.lastError) return;
          if (response?.totalSaved !== undefined) {
            setTotalSaved(String(response.totalSaved));
          }
        });
      }

      chrome.storage.local.get(['bulkMode', 'instagramUserId'], (result) => {
        const bulkModeActive = result.bulkMode !== false;
        setIsBulkMode(bulkModeActive);

        if (typeof result.instagramUserId === 'string') {
          setInstagramUserId(result.instagramUserId);
        } else if (activeTab?.url) {
          // Pre-fill username if currently on an Instagram profile page
          try {
            const url = new URL(activeTab.url);
            if (url.hostname.includes('instagram.com')) {
              const segments = url.pathname.split('/').filter(Boolean);
              const reservedRoutes = ['explore', 'reels', 'direct', 'stories', 'accounts', 'your_activity', 'saved', 'p'];
              if (segments[0] && !reservedRoutes.includes(segments[0].toLowerCase())) {
                const detected = cleanInstagramUsername(segments[0]);
                if (detected) {
                  setInstagramUserId(detected);
                  chrome.storage.local.set({ instagramUserId: detected });
                }
              }
            }
          } catch {
            // ignore URL parsing failures
          }
        }
      });
    });

    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }, area: string) => {
      if (area === 'local' && changes.bulkMode) {
        setIsBulkMode(!!changes.bulkMode.newValue);
      }
    };
    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  const toggleBulkMode = () => {
    const newValue = !isBulkMode;
    setIsBulkMode(newValue);
    chrome.storage.local.set({ bulkMode: newValue });

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_BULK_MODE', active: newValue }, () => {
          if (chrome.runtime.lastError) {
            // Silently ignore if tab cannot receive message
          }
        });
      }
    });
  };

  const handleUsernameChange = (val: string) => {
    setInstagramUserId(val);
    const cleaned = cleanInstagramUsername(val);
    chrome.storage.local.set({ instagramUserId: cleaned });
  };

  const handleOpenSavedPosts = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanId = cleanInstagramUsername(instagramUserId);
    if (!cleanId) return;

    chrome.storage.local.set({ instagramUserId: cleanId });
    window.open(getSavedPostsUrl(cleanId), '_blank');
  };

  const cleanedHandle = cleanInstagramUsername(instagramUserId);

  return (
    <div className="popup-shell">
      {/* Header */}
      <header className="popup-header">
        <div className="brand-group">
          <div className="brand-icon">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="2" y="2" width="20" height="20" rx="6" stroke="url(#ig-grad)" strokeWidth="2" />
              <circle cx="12" cy="12" r="4.2" stroke="url(#ig-grad)" strokeWidth="2" />
              <circle cx="17.5" cy="6.5" r="1.2" fill="#ff3355" />
              <defs>
                <linearGradient id="ig-grad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#f58529" />
                  <stop offset="0.5" stopColor="#dd2a7b" />
                  <stop offset="1" stopColor="#8134af" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div className="brand-text">
            <div className="brand-title">InstaBulk</div>
            <div className="brand-subtitle">Saved Organizer</div>
          </div>
        </div>

        <div className={`status-pill ${isInstagramSavedPage ? 'active' : 'inactive'}`}>
          <span className="status-dot"></span>
          <span>{isInstagramSavedPage ? 'Ready' : 'Inactive'}</span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="popup-body">
        {!isInstagramSavedPage ? (
          <div className="surface-card guide-card">
            <div className="guide-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"></path>
                <line x1="12" y1="7" x2="12" y2="13"></line>
                <line x1="9" y1="10" x2="15" y2="10"></line>
              </svg>
            </div>
            <h2 className="guide-title">Open Saved Posts</h2>
            <p className="guide-desc">
              Enter your Instagram username to redirect straight to your saved posts without authentication.
            </p>

            <form onSubmit={handleOpenSavedPosts} className="username-form">
              <div className="input-group">
                <span className="input-prefix">@</span>
                <input
                  type="text"
                  className="username-input"
                  placeholder="your_username"
                  value={instagramUserId}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck="false"
                  required
                />
              </div>

              <button
                type="submit"
                className="btn-primary"
                disabled={!cleanedHandle}
              >
                <span>Go to Saved Posts</span>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              </button>
            </form>

            {cleanedHandle && (
              <div className="target-url-preview">
                Redirects to: <code>instagram.com/{cleanedHandle}/saved/all-posts/</code>
              </div>
            )}
          </div>
        ) : (
          <div className="active-controls">
            {/* Account / Target Info Row */}
            <div className="surface-card account-card">
              <div className="account-info">
                <span className="account-label">Instagram Handle</span>
                {isEditingUsername ? (
                  <div className="inline-edit-group">
                    <span className="input-prefix">@</span>
                    <input
                      type="text"
                      className="inline-username-input"
                      value={instagramUserId}
                      onChange={(e) => handleUsernameChange(e.target.value)}
                      onBlur={() => setIsEditingUsername(false)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') setIsEditingUsername(false);
                      }}
                      autoFocus
                    />
                  </div>
                ) : (
                  <div className="account-value" onClick={() => setIsEditingUsername(true)} title="Click to edit handle">
                    <span>@{cleanedHandle || 'not set'}</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                    </svg>
                  </div>
                )}
              </div>
              {cleanedHandle && (
                <button
                  type="button"
                  className="btn-reopen"
                  onClick={() => window.open(getSavedPostsUrl(cleanedHandle), '_blank')}
                  title="Re-open all-posts in new tab"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                    <polyline points="15 3 21 3 21 9"></polyline>
                    <line x1="10" y1="14" x2="21" y2="3"></line>
                  </svg>
                </button>
              )}
            </div>

            {/* Bulk Mode Switch Card */}
            <div
              className="surface-card setting-card"
              onClick={toggleBulkMode}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === ' ' || e.key === 'Enter') {
                  e.preventDefault();
                  toggleBulkMode();
                }
              }}
            >
              <div className="setting-row">
                <div className="setting-info">
                  <div className="setting-title">Bulk Selection</div>
                  <div className="setting-desc">Display selection circles on post tiles</div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isBulkMode}
                  className={`toggle-switch ${isBulkMode ? 'on' : 'off'}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleBulkMode();
                  }}
                  title={isBulkMode ? 'Disable Bulk Mode' : 'Enable Bulk Mode'}
                >
                  <span className="toggle-thumb" />
                </button>
              </div>
            </div>

            {/* Metrics Card */}
            <div className="surface-card metrics-card">
              <div className="metric-col">
                <div className="metric-label">Items Loaded</div>
                <div className="metric-value">{totalSaved}</div>
              </div>
              <div className="metric-divider"></div>
              <div className="metric-col">
                <div className="metric-label">Bulk Mode</div>
                <div className={`metric-status ${isBulkMode ? 'active' : ''}`}>
                  {isBulkMode ? 'Active' : 'Standby'}
                </div>
              </div>
            </div>

            {/* Practical Tip */}
            <div className="tip-strip">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
              <span>Select posts on Instagram to reveal the bulk action dock at the bottom of the page.</span>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="popup-footer">
        <div className="footer-meta">
          <span className="meta-tag">v1.0.0</span>
          <span className="meta-dot">·</span>
          <span className="meta-security">Local & Private</span>
        </div>
        <a
          href="https://github.com/topics/instagram"
          target="_blank"
          rel="noopener noreferrer"
          className="footer-link"
        >
          Documentation
        </a>
      </footer>
    </div>
  );
};

export default Popup;
