/**
 * Instagram "Saved" page detection (pure, no DOM/chrome).
 *
 * A saved page is any route whose final (non-trailing-slash) path segment is
 * the literal "saved". Covers every Instagram layout we currently support:
 *   /saved/
 *   /saved
 *   /reels/saved/
 *   /reels/USERNAME/saved/
 *   /u/USERNAME/saved/
 *   /reels/USERNAME/saved (no trailing slash)
 */

export function isSavedPage(pathname: string): boolean {
  const segments = pathname.toLowerCase().split('/');
  return segments.some((segment) => segment === 'saved');
}
