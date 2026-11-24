import React from 'react';
import ReactDOM from 'react-dom/client';
import BulkManagerUI from './BulkManagerUI.tsx';
import { isSavedPage } from '../shared/page-utils.ts';

class InstagramSavedManager {
  private active: boolean = false;
  private bulkModeEnabled: boolean = false;
  private selectedPosts: Set<string> = new Set();
  private observer: MutationObserver | null = null;
  private processingOverlay: HTMLElement | null = null;
  private mutedMedia: Array<{ element: HTMLMediaElement; muted: boolean; volume: number }> = [];

  constructor() {
    this.init();
  }

  private init() {
    console.log('InstaBulk: Content Script Loaded');
    
    // CRITICAL: Only run on saved posts page
    if (!this.isOnSavedPage()) {
      console.log('InstaBulk: Not on saved page, extension inactive');
    }
    
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message.type === 'TOGGLE_BULK_MODE') {
        this.bulkModeEnabled = !!message.active;
        this.setBulkMode(message.active);
      }
      if (message.type === 'GET_TOTAL_SAVED_COUNT') {
        sendResponse({ totalSaved: this.getTotalSavedCount() });
      }
    });

    chrome.storage.local.get(['bulkMode', 'selectedPosts'], (result) => {
      // Default to true so selection circles appear automatically on saved page
      this.bulkModeEnabled = result.bulkMode !== false;
      if (result.selectedPosts) {
        this.selectedPosts = new Set(result.selectedPosts as string[]);
      }
      if (this.bulkModeEnabled && this.isOnSavedPage()) {
        this.setBulkMode(true);
      }
    });

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes.bulkMode !== undefined) {
        const newActive = !!changes.bulkMode.newValue;
        this.bulkModeEnabled = newActive;
        if (this.isOnSavedPage()) {
          this.setBulkMode(newActive);
        }
      }
    });

    // Monitor URL changes (Instagram is a SPA)
    this.watchForNavigation();
  }

  private isOnSavedPage(): boolean {
    return isSavedPage(window.location.pathname);
  }

  private getTotalSavedCount(): number {
    if (!this.isOnSavedPage()) return 0;

    const mainContent = document.querySelector('main');
    if (!mainContent) return 0;

    const postLinks = mainContent.querySelectorAll('a[href*="/p/"], a[href*="/reels/"], a[href*="/reel/"]');
    return postLinks.length;
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
          this.setBulkMode(true);
        }
      }
    };

    // Intercept SPA pushState and replaceState for instant URL change detection
    const originalPushState = history.pushState.bind(history);
    history.pushState = (...args) => {
      originalPushState(...args);
      checkUrlChange();
    };

    const originalReplaceState = history.replaceState.bind(history);
    history.replaceState = (...args) => {
      originalReplaceState(...args);
      checkUrlChange();
    };
    
    setInterval(checkUrlChange, 600);
    window.addEventListener('popstate', checkUrlChange);
  }

  private setBulkMode(active: boolean) {
    // Prevent activation if not on saved page
    if (active && !this.isOnSavedPage()) {
      return;
    }

    if (this.active === active) {
      if (active) {
        this.scanAndInjectCheckboxes();
        this.restoreSelection();
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
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(-50%) translateY(-10px)';
      setTimeout(() => toast.remove(), 250);
    }, 3000);
  }

  private enableBulkFeatures() {
    console.log('InstaBulk: Enabling Bulk Mode');
    document.body.classList.add('instabulk-active');
    this.injectUI();
    this.scanAndInjectCheckboxes();
    this.restoreSelection();
    this.startObserver();

    // Schedule retries for async-rendered Instagram posts
    [300, 800, 1500, 2500, 4000].forEach((delay) => {
      window.setTimeout(() => {
        if (this.active && this.isOnSavedPage()) {
          this.scanAndInjectCheckboxes();
          this.restoreSelection();
        }
      }, delay);
    });
  }

  private disableBulkFeatures() {
    console.log('InstaBulk: Disabling Bulk Mode');
    document.body.classList.remove('instabulk-active');
    document.querySelectorAll('.instabulk-post-selected').forEach(el => {
      el.classList.remove('instabulk-post-selected');
    });
    this.selectedPosts.clear();
    this.persistSelection();
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
        <BulkManagerUI
          selectedCount={this.selectedPosts.size}
          onClear={() => this.clearSelection()}
          onClose={() => this.clearSelection()}
          onMoveToCollection={() => this.showNotification('Move to Collection is not available yet — it is on our roadmap.')}
        />
      </React.StrictMode>
    );
  }

  private removeUI() {
    const root = document.getElementById('instabulk-toolbar-root');
    if (root) root.remove();
  }

  private scanAndInjectCheckboxes() {
    if (!this.isOnSavedPage() || !this.active) return;

    // Search across document for post links, ignoring dialogs, modals, and our toolbar
    const postLinks = document.querySelectorAll<HTMLAnchorElement>(
      'a[href*="/p/"], a[href*="/reel/"], a[href*="/reels/"]'
    );
    
    const processedPostIds = new Set<string>();

    postLinks.forEach((postLink) => {
      if (postLink.closest('[role="dialog"]') || postLink.closest('#instabulk-toolbar-root')) {
        return;
      }

      const href = postLink.getAttribute('href') || '';
      const match = href.match(/\/(p|reel|reels)\/([A-Za-z0-9_-]+)/);
      if (!match) return;

      const postId = `/${match[1]}/${match[2]}/`;
      if (processedPostIds.has(postId)) return;
      processedPostIds.add(postId);

      const container = this.findPostTileContainer(postLink);
      if (!container) return;

      // Skip if we already added a checkbox to this container for this post
      if (container.querySelector(`.instabulk-checkbox-container[data-post-id="${postId}"]`)) {
        return;
      }

      // Ensure relative positioning on the container
      const currentPos = window.getComputedStyle(container).position;
      if (currentPos === 'static') {
        container.style.position = 'relative';
      }

      const checkboxContainer = document.createElement('div');
      checkboxContainer.className = 'instabulk-checkbox-container';
      checkboxContainer.setAttribute('data-post-id', postId);
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'instabulk-checkbox instabulk-checkbox-native';
      checkbox.setAttribute('data-post-id', postId);
      const isSelected = this.selectedPosts.has(postId);
      checkbox.checked = isSelected;

      const visualCircle = document.createElement('div');
      visualCircle.className = `instabulk-checkbox-circle ${isSelected ? 'checked' : ''}`;
      visualCircle.innerHTML = `
        <svg viewBox="0 0 24 24" class="instabulk-check-svg">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      `;

      if (isSelected) {
        container.classList.add('instabulk-post-selected');
      }

      checkbox.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        if (target.checked) {
          this.selectedPosts.add(postId);
          visualCircle.classList.add('checked');
          container.classList.add('instabulk-post-selected');
        } else {
          this.selectedPosts.delete(postId);
          visualCircle.classList.remove('checked');
          container.classList.remove('instabulk-post-selected');
        }
        this.updateUI();
        this.persistSelection();
      });

      // Prevent triggering the post popup when clicking the checkbox area
      checkboxContainer.addEventListener('click', (e) => e.stopPropagation());
      checkboxContainer.addEventListener('mousedown', (e) => e.stopPropagation());

      checkboxContainer.appendChild(checkbox);
      checkboxContainer.appendChild(visualCircle);
      container.appendChild(checkboxContainer);
    });
  }

  private findPostTileContainer(postLink: HTMLAnchorElement): HTMLElement {
    const parent = postLink.parentElement;
    if (parent && parent.tagName !== 'MAIN' && parent.tagName !== 'BODY') {
      const siblingLinks = parent.querySelectorAll('a[href*="/p/"], a[href*="/reel/"], a[href*="/reels/"]');
      if (siblingLinks.length <= 1) {
        return parent;
      }
    }
    return postLink;
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

    window.addEventListener('scroll', this.handleScrollScan, { passive: true });
  }

  private handleScrollScan = () => {
    if (this.active && this.isOnSavedPage()) {
      this.scanAndInjectCheckboxes();
    }
  };

  private stopObserver() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    window.removeEventListener('scroll', this.handleScrollScan);
  }

  private persistSelection() {
    chrome.storage.local.set({ selectedPosts: Array.from(this.selectedPosts) });
  }

  private restoreSelection() {
    document.querySelectorAll('.instabulk-checkbox-container').forEach((cbContainer) => {
      const input = cbContainer.querySelector('.instabulk-checkbox') as HTMLInputElement | null;
      const circle = cbContainer.querySelector('.instabulk-checkbox-circle');
      if (!input) return;

      const postId = input.getAttribute('data-post-id') || '';
      const container = cbContainer.parentElement;
      const isSelected = this.selectedPosts.has(postId);
      input.checked = isSelected;
      if (isSelected) {
        circle?.classList.add('checked');
        container?.classList.add('instabulk-post-selected');
      } else {
        circle?.classList.remove('checked');
        container?.classList.remove('instabulk-post-selected');
      }
    });
  }

  private clearSelection() {
    this.selectedPosts.clear();
    document.querySelectorAll('.instabulk-checkbox').forEach(cb => {
      (cb as HTMLInputElement).checked = false;
    });
    document.querySelectorAll('.instabulk-checkbox-circle').forEach(circle => {
      circle.classList.remove('checked');
    });
    document.querySelectorAll('.instabulk-post-selected').forEach(el => {
      el.classList.remove('instabulk-post-selected');
    });
    this.updateUI();
    this.persistSelection();
  }

  public async startUnsave() {
    console.log(`InstaBulk: Starting Bulk Unsave for ${this.selectedPosts.size} posts`);
    this.showProcessingOverlay();
    this.broadcastStatus('processing', 0);

    const postIds = Array.from(this.selectedPosts);
    let completed = 0;
    let failed = 0;

    try {
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
            this.persistSelection();
            const checkbox = document.querySelector(`.instabulk-checkbox[data-post-id="${postId}"]`);
            const container = checkbox?.closest('.instabulk-checkbox-container')?.parentElement;
            container?.classList.remove('instabulk-post-selected');
            checkbox?.closest('.instabulk-checkbox-container')?.remove();
          } else {
            failed++;
          }
        } catch (err) {
          console.error('InstaBulk: Error in loop', postId, err);
          failed++;
        }

        this.broadcastStatus('processing', Math.round((completed / postIds.length) * 100));
        this.updateProcessingOverlay(completed, postIds.length, failed);
        await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 2000));
      }
    } finally {
      this.hideProcessingOverlay();
    }

    this.broadcastStatus('done', 100, completed, failed);
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
      const unsaveCompleted = await this.waitForUnsaveCompletion(modal, removeButton);
      if (!unsaveCompleted) {
        await this.closeModal();
        return false;
      }

      await this.closeModal();

      return true;
    } catch {
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
    } catch { // modal close failure is non-critical; ignore
    }

  }

  private async waitForUnsaveCompletion(
    modal: HTMLElement,
    originalRemoveButton: HTMLElement,
    maxAttempts: number = 30
  ): Promise<boolean> {
    for (let i = 0; i < maxAttempts; i++) {
      if (!modal.isConnected) {
        return true;
      }

      const currentRemoveButton = modal.querySelector('svg[aria-label="Remove"], svg[aria-label="Unsave"]')
        ?.closest('button, [role="button"]') as HTMLElement | null;

      const buttonDetached = !originalRemoveButton.isConnected;
      const buttonChanged = !!currentRemoveButton && currentRemoveButton !== originalRemoveButton;
      const buttonGone = !currentRemoveButton;

      if (buttonDetached || buttonChanged || buttonGone) {
        return true;
      }

      await new Promise(resolve => setTimeout(resolve, 150));
    }

    return false;
  }

  private simulateClick(element: HTMLElement) {
    ['mousedown', 'mouseup', 'click'].forEach(type => {
      element.dispatchEvent(new MouseEvent(type, { view: window, bubbles: true, cancelable: true, buttons: 1 }));
    });
  }

  private showProcessingOverlay() {
    this.mutePageMedia();

    if (this.processingOverlay) {
      this.processingOverlay.classList.add('visible');
      this.updateProcessingOverlay(0, this.selectedPosts.size, 0);
      return;
    }

    const overlay = document.createElement('div');
    overlay.className = 'instabulk-processing-overlay visible';
    overlay.innerHTML = `
      <div class="instabulk-processing-card">
        <div class="instabulk-processing-spinner"></div>
        <div class="instabulk-processing-title">Unsave in progress</div>
        <div class="instabulk-processing-subtitle">
          Instagram dialogs are being handled behind this screen.
        </div>
        <div class="instabulk-processing-counter">Starting...</div>
      </div>
    `;

    document.body.appendChild(overlay);
    this.processingOverlay = overlay;
    this.updateProcessingOverlay(0, this.selectedPosts.size, 0);
  }

  private updateProcessingOverlay(completed: number, total: number, failed: number) {
    const counter = this.processingOverlay?.querySelector('.instabulk-processing-counter');
    if (!counter) return;

    const remaining = Math.max(total - completed - failed, 0);
    counter.textContent = `${completed} completed - ${failed} failed - ${remaining} remaining`;
  }

  private hideProcessingOverlay() {
    if (!this.processingOverlay) return;
    this.processingOverlay.remove();
    this.processingOverlay = null;
    this.restorePageMedia();
  }

  private mutePageMedia() {
    this.mutedMedia = [];

    document.querySelectorAll('video, audio').forEach((node) => {
      const element = node as HTMLMediaElement;
      this.mutedMedia.push({
        element,
        muted: element.muted,
        volume: element.volume,
      });

      element.muted = true;
      element.volume = 0;
    });
  }

  private restorePageMedia() {
    this.mutedMedia.forEach(({ element, muted, volume }) => {
      element.muted = muted;
      element.volume = volume;
    });

    this.mutedMedia = [];
  }

  private broadcastStatus(status: 'idle' | 'processing' | 'done', progress: number, completed?: number, failed?: number) {
    window.dispatchEvent(new CustomEvent('instabulk-status-update', { detail: { status, progress, completed, failed } }));
  }

  private updateUI() {
    window.dispatchEvent(new CustomEvent('instabulk-selection-changed', { detail: { count: this.selectedPosts.size } }));
  }
}

const manager = new InstagramSavedManager();

window.addEventListener('instabulk-action-unsave', () => {
  manager.startUnsave();
});
