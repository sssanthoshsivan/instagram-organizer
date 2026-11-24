/**
 * Instagram page detection and URL utilities (pure, no DOM/chrome).
 */

/**
 * A saved page is any route whose path contains the segment "saved".
 * Covers every Instagram layout we currently support:
 *   /saved/
 *   /saved
 *   /reels/saved/
 *   /reels/USERNAME/saved/
 *   /u/USERNAME/saved/
 *   /{user_id}/saved/all-posts/
 */
export function isSavedPage(pathname: string): boolean {
  const segments = pathname.toLowerCase().split('/');
  return segments.some((segment) => segment === 'saved');
}

/**
 * Sanitizes and extracts a clean Instagram username/handle.
 * Handles inputs like:
 *   - "username"
 *   - "@username"
 *   - "https://www.instagram.com/username/"
 *   - "  @user.name_123  "
 */
export function cleanInstagramUsername(input: string): string {
  if (!input) return '';
  let cleaned = input.trim();
  // Strip protocol and domain if full URL was pasted
  cleaned = cleaned.replace(/^https?:\/\/(www\.)?instagram\.com\//i, '');
  // Strip query parameters or hashes
  cleaned = cleaned.split('?')[0].split('#')[0];
  // Strip any trailing route segments
  cleaned = cleaned.split('/')[0];
  // Strip leading '@' symbols
  cleaned = cleaned.replace(/^@+/, '');
  return cleaned.trim();
}

/**
 * Constructs the direct URL to the user's saved posts collection:
 * https://www.instagram.com/{user_id}/saved/all-posts/
 */
export function getSavedPostsUrl(userId: string): string {
  const clean = cleanInstagramUsername(userId);
  if (!clean) return 'https://www.instagram.com/';
  return `https://www.instagram.com/${clean}/saved/all-posts/`;
}
