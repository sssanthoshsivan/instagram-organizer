# Privacy Policy for Savedly: Saved Posts Manager for Instagram

**Last Updated**: November 24, 2026

**Savedly: Saved Posts Manager for Instagram** ("the extension") is committed to respecting and protecting your privacy. This Privacy Policy explains how information is handled by the extension.

---

## 1. Information Collection and Usage

- **No Personal Data Collected**: The extension does **not** collect, store, transmit, or sell any personal data, passwords, browsing history, or analytics.
- **Local-Only Storage**: Any settings or temporary state (such as enabling bulk mode or remembering selected post identifiers for unsaving) are saved locally on your device via Chrome's `chrome.storage.local` API. This data never leaves your browser and is not sent to any external server.
- **Authentication**: The extension does **not** require, intercept, or handle your Instagram credentials or login tokens. You interact with Instagram through your normal browser session.

---

## 2. Permissions Justification

The extension requests only the minimum permissions necessary to function:

- **`storage`**: Used strictly to save your local UI preferences (such as your bulk mode toggle state) across browser sessions.
- **`activeTab`**: Used strictly to interact with your currently open Instagram saved posts tab when you open the extension popup or trigger bulk actions.
- **Host Permission (`https://www.instagram.com/*`)**: Used exclusively to inject the selection circles and floating action dock on Instagram's saved posts page (`/saved/all-posts/`) to allow you to select and unsave posts in bulk.

---

## 3. Third-Party Services and Analytics

- The extension does **not** use any third-party tracking, advertising, analytics, or external API endpoints.
- No network requests are made outside of standard user interactions with `instagram.com`.

---

## 4. Changes to This Policy

If any changes are made to this Privacy Policy in future updates, they will be reflected directly in this document and in the extension's release notes.

---

## 5. Contact & Support

If you have any questions or feedback regarding this extension or this policy, please open an issue on the official GitHub repository:
[https://github.com/sssanthoshsivan/instagram-organizer](https://github.com/sssanthoshsivan/instagram-organizer)
