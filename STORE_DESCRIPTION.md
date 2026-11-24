# Chrome Web Store Listing & Submission Guide

Use this document to copy and paste directly into the **Chrome Web Store Developer Dashboard** ([chrome.google.com/webstore/devconsole](https://chrome.google.com/webstore/devconsole/)).

---

## 1. Store Metadata

### Extension Name
```text
InstaBulk: Saved Posts Manager
```

### Short Description (≤ 132 characters)
```text
Bulk manage your Instagram saved posts with ease. Select, unsave, or move posts to collections efficiently.
```

### Category
```text
Productivity
```

### Visibility
```text
Public
```

---

## 2. Detailed Description (Paste into Store Listing)

```markdown
Take control of your saved posts on Instagram with InstaBulk — the clean, Apple-inspired bulk manager for Instagram.

Tired of opening every single saved post one by one just to unsave it? InstaBulk adds intuitive, one-click selection circles directly on your saved post thumbnails and gives you a floating action dock to batch-unsave posts effortlessly.

✨ Key Features:
• One-Click Selection: Select multiple saved posts and reels directly from your grid.
• Batch Unsave: Unsave dozens of selected posts automatically in seconds with a real-time progress monitor.
• Floating Action Dock: Sleek, glass-morphic floating toolbar that automatically appears when you make selections and tucks away when done.
• Safe Background Execution: Automatically mutes background media and handles Instagram confirmation dialogs safely.
• Zero Auth Required: Operates directly inside your existing Instagram session — no passwords, tokens, or credentials needed.
• 100% Private & Local: All state is stored locally on your device. Zero external servers, tracking, or telemetry.

🚀 How to Use:
1. Enter your Instagram handle in the extension popup and click "Go to Saved Posts" (or navigate directly to instagram.com/your_username/saved/all-posts/).
2. Click the selection circles on the posts you wish to remove.
3. Click "Unsave" on the floating bottom dock and let InstaBulk handle the rest!

🔒 Privacy First:
InstaBulk runs completely locally in your browser. We never collect, track, or transmit your personal data, credentials, or browsing history.

Need support or want to request a feature? Check out our GitHub repository:
https://github.com/sssanthoshsivan/instagram-organizer
```

---

## 3. Privacy & Justifications (Required by Chrome Web Store)

### Single Purpose Description
```text
Bulk select and manage saved posts directly on Instagram.
```

### Permission Justifications:
- **`storage`**:
  ```text
  Required to store user preferences (bulk selection toggle and temporary selected post IDs) locally on the device via chrome.storage.local.
  ```
- **`activeTab`**:
  ```text
  Required to communicate with the active Instagram tab to toggle selection circles and check saved post count when the popup opens.
  ```
- **Host Permission (`https://www.instagram.com/*`)**:
  ```text
  Required to inject selection circles onto post thumbnails and display the floating bulk action dock on Instagram's saved posts page.
  ```

### Privacy Policy URL
```text
https://github.com/sssanthoshsivan/instagram-organizer/blob/main/PRIVACY_POLICY.md
```

---

## 4. Store Assets Checklist

- [x] **Store Icon**: `icons/icon128.png` (128×128 PNG)
- [ ] **Screenshots**: At least 1 screenshot (1280×800 or 640×400) showing the selection circles on Instagram saved posts and the floating bottom action dock.
- [x] **ZIP Package**: `instabulk-v1.0.0.zip` ready to upload.
