import React from 'react';
import ReactDOM from 'react-dom/client';
import BulkManagerUI from './BulkManagerUI.tsx';

class InstagramSavedManager {
  private active: boolean = false;
  private bulkModeEnabled: boolean = false;
  private selectedPosts: Set<string> = new Set();
  private observer: MutationObserver | null = null;

  constructor() {
    this.init();
  }

  private init() {
    console.log('InstaBulk: Content Script Loaded');
    
    // CRITICAL: Only run on saved posts page
    if (!this.isOnSavedPage()) {
      console.log('InstaBulk: Not on saved page, extension inactive');
    }
    
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === 'TOGGLE_BULK_MODE') {
        this.bulkModeEnabled = !!message.active;
        this.setBulkMode(message.active);
      }
    });

    chrome.storage.local.get(['bulkMode'], (result) => {
      this.bulkModeEnabled = !!result.bulkMode;
      if (result.bulkMode) {
        this.setBulkMode(true);
      }
    });

    // Monitor URL changes (Instagram is a SPA)
    this.watchForNavigation();
  }

  private isOnSavedPage(): boolean {
    const pathname = window.location.pathname.toLowerCase();
    // More robust regex: matches /any_user/saved/, /reels/saved/, /saved/ etc.
    // Accounts for various trailing slash scenarios
    return /\/saved(\/|$)/.test(pathname);
  }

  private watchForNavigation() {
    let lastUrl = window.location.href;
    
    const checkUrlChange = () => {
      const currentUrl = window.location.href;
      if (currentUrl !== lastUrl) {
        lastUrl = currentUrl;
        console.log('InstaBulk: URL changed to', currentUrl);
        
        // If we navigate away from saved page, disable the injected UI but
        // keep the user's bulk-mode preference so it can be restored later.
        if (!this.isOnSavedPage() && this.active) {
          console.log('InstaBulk: Left saved page, disabling features');
          this.setBulkMode(false);
          // Also clear selected posts when navigating away
          this.selectedPosts.clear();
          this.updateUI();
          return;
        }

        // Instagram is a SPA, so when returning to the saved page we need to
        // restore bulk mode without requiring a full refresh.
        if (this.isOnSavedPage() && this.bulkModeEnabled && !this.active) {
          console.log('InstaBulk: Returned to saved page, restoring bulk mode');
          window.setTimeout(() => this.setBulkMode(true), 300);
        }
      }
    };
    
    setInterval(checkUrlChange, 1000);
    window.addEventListener('popstate', checkUrlChange);
  }

  private setBulkMode(active: boolean) {
    // Prevent activation if not on saved page
    if (active && !this.isOnSavedPage()) {
      console.warn('InstaBulk: Cannot enable bulk mode - not on saved page');
      this.showNotification('Please navigate to your saved posts first');
      chrome.storage.local.set({ bulkMode: false });
      this.bulkModeEnabled = false;
      return;
    }

    if (this.active === active) {
      if (active) {
        this.scanAndInjectCheckboxes();
      }
      return;
    }

    this.active = active;
    if (active) {
      this.enableBulkFeatures();
    } else {
      this.disableBulkFeatures();
    }
  }

  private showNotification(message: string) {
    const toast = document.createElement('div');
    toast.className = 'instabulk-toast';
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      top: 60px;
      left: 50%;
      transform: translateX(-50%);
      background: #262626;
      color: white;
      padding: 12px 24px;
      border-radius: 99px;
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 14px;
      font-weight: 600;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
      border: 1px solid rgba(255,255,255,0.1);
      transition: all 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(-50%) translateY(-20px)';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  private enableBulkFeatures() {
    console.log('InstaBulk: Enabling Bulk Mode');
    document.body.classList.add('instabulk-active');
    this.injectUI();
    this.scanAndInjectCheckboxes();
    this.startObserver();
  }

  private disableBulkFeatures() {
    console.log('InstaBulk: Disabling Bulk Mode');
    document.body.classList.remove('instabulk-active');
    this.selectedPosts.clear();
    this.removeCheckboxes();
    this.stopObserver();
    this.removeUI();
  }

  private injectUI() {
    if (document.getElementById('instabulk-toolbar-root')) return;

    const root = document.createElement('div');
    root.id = 'instabulk-toolbar-root';
    document.body.appendChild(root);

    ReactDOM.createRoot(root).render(
      <React.StrictMode>
        <BulkManagerUI selectedCount={this.selectedPosts.size} onClear={() => this.clearSelection()} />
      </React.StrictMode>
    );
  }

  private removeUI() {
    const root = document.getElementById('instabulk-toolbar-root');
    if (root) root.remove();
  }

  private scanAndInjectCheckboxes() {
    if (!this.isOnSavedPage() || !this.active) return;

    // Target the main content area where posts are listed
    const mainContent = document.querySelector('main');
    if (!mainContent) return;

    // Instagram uses different structures for Posts and Reels.
    // Posts are typically in <article> tags, while Reels in the grid can be in <div> wrappers.
    // We search for all links that point to a post/reel and find their container.
    const postLinks = mainContent.querySelectorAll('a[href*="/p/"], a[href*="/reels/"], a[href*="/reel/"]');
    
    postLinks.forEach((postLink) => {
      const container = this.findPostTileContainer(postLink as HTMLAnchorElement, mainContent);
      if (!container || container === mainContent) return;

      // Skip if we already added a checkbox to this container
      if (container.querySelector('.instabulk-checkbox-container')) return;

      const postId = postLink.getAttribute('href') || '';
      if (!postId) return;

      // Prepare container for absolute positioning of checkbox
      const currentPos = window.getComputedStyle(container).position;
      if (currentPos === 'static') {
        container.style.position = 'relative';
      }

      const checkboxContainer = document.createElement('div');
      checkboxContainer.className = 'instabulk-checkbox-container';
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'instabulk-checkbox';
      checkbox.setAttribute('data-post-id', postId);
      checkbox.checked = this.selectedPosts.has(postId);

      checkbox.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        if (target.checked) {
          this.selectedPosts.add(postId);
        } else {
          this.selectedPosts.delete(postId);
        }
        this.updateUI();
      });

      // Prevent triggering the post popup when clicking the checkbox area
      checkboxContainer.addEventListener('click', (e) => e.stopPropagation());
      checkboxContainer.appendChild(checkbox);
      container.appendChild(checkboxContainer);
    });
  }

  private findPostTileContainer(postLink: HTMLAnchorElement, mainContent: Element): HTMLElement | null {
    const postSelector = 'a[href*="/p/"], a[href*="/reels/"], a[href*="/reel/"]';

    let current: HTMLElement | null = postLink;
    let candidate: HTMLElement | null = postLink;

    while (current?.parentElement && current.parentElement !== mainContent) {
      const parent = current.parentElement as HTMLElement;
      const siblingPostCount = parent.querySelectorAll(postSelector).length;

      // Once the parent contains multiple post links, we've climbed out of the
      // individual tile and should use the last single-post ancestor.
      if (siblingPostCount > 1) {
        break;
      }

      candidate = parent;
      current = parent;
    }

    return candidate;
  }

  private removeCheckboxes() {
    document.querySelectorAll('.instabulk-checkbox-container').forEach(el => el.remove());
  }

  private startObserver() {
    if (this.observer) return;

    this.observer = new MutationObserver(() => {
      if (this.active && this.isOnSavedPage()) {
        this.scanAndInjectCheckboxes();
      }
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  private stopObserver() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }

  private clearSelection() {
    this.selectedPosts.clear();
    document.querySelectorAll('.instabulk-checkbox').forEach(cb => {
      (cb as HTMLInputElement).checked = false;
    });
    this.updateUI();
  }

  public async startUnsave() {
    console.log(`InstaBulk: Starting Bulk Unsave for ${this.selectedPosts.size} posts`);
    this.broadcastStatus('processing', 0);

    const postIds = Array.from(this.selectedPosts);
    let completed = 0;
    let failed = 0;

    for (const postId of postIds) {
      if (!this.active || !this.isOnSavedPage()) {
        console.log('InstaBulk: Stop condition met (inactive or wrong page)');
        break;
      }

      try {
        const success = await this.unsaveSinglePost(postId);
        if (success) {
          completed++;
          this.selectedPosts.delete(postId);
          const checkbox = document.querySelector(`.instabulk-checkbox[data-post-id="${postId}"]`);
          checkbox?.closest('.instabulk-checkbox-container')?.remove();
        } else {
          failed++;
        }
      } catch (err) {
        console.error('InstaBulk: Error in loop', postId, err);
        failed++;
      }

      this.broadcastStatus('processing', Math.round((completed / postIds.length) * 100));
      await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 2000));
    }

    this.broadcastStatus('done', 100);
    this.updateUI();
  }

  private async unsaveSinglePost(postId: string): Promise<boolean> {
    try {
      const postLink = document.querySelector(`a[href*="${postId}"]`) as HTMLAnchorElement;
      if (!postLink) return false;

      postLink.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await new Promise(resolve => setTimeout(resolve, 500));
      postLink.click();

      const modal = await this.waitForModal();
      if (!modal) return false;

      const removeButton = modal.querySelector('svg[aria-label="Remove"], svg[aria-label="Unsave"]') 
        ? (modal.querySelector('svg[aria-label="Remove"], svg[aria-label="Unsave"]')?.closest('button, [role="button"]') as HTMLElement)
        : null;

      if (!removeButton) {
        await this.closeModal();
        return false;
      }

      this.simulateClick(removeButton);
      await new Promise(resolve => setTimeout(resolve, 800));
      await this.closeModal();

      return true;
    } catch (error) {
      await this.closeModal();
      return false;
    }
  }

  private async waitForModal(maxAttempts: number = 30): Promise<HTMLElement | null> {
    for (let i = 0; i < maxAttempts; i++) {
      const modal = document.querySelector('[role="dialog"]') as HTMLElement;
      if (modal) {
        await new Promise(resolve => setTimeout(resolve, 500));
        return modal;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return null;
  }

  private async closeModal(): Promise<void> {
    try {
      const closeButton = document.querySelector('[role="dialog"] button[aria-label*="Close"]') as HTMLElement;
      if (closeButton) {
        closeButton.click();
      } else {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      }
      await new Promise(resolve => setTimeout(resolve, 800));
    } catch (error) {}
  }

  private simulateClick(element: HTMLElement) {
    ['mousedown', 'mouseup', 'click'].forEach(type => {
      element.dispatchEvent(new MouseEvent(type, { view: window, bubbles: true, cancelable: true, buttons: 1 }));
    });
  }

  private broadcastStatus(status: 'idle' | 'processing' | 'done', progress: number) {
    window.dispatchEvent(new CustomEvent('instabulk-status-update', { detail: { status, progress } }));
  }

  private updateUI() {
    window.dispatchEvent(new CustomEvent('instabulk-selection-changed', { detail: { count: this.selectedPosts.size } }));
  }
}

const manager = new InstagramSavedManager();

window.addEventListener('instabulk-action-unsave', () => {
  manager.startUnsave();
});
