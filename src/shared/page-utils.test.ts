import { describe, it, expect } from 'vitest';
import { isSavedPage } from './page-utils';

describe('isSavedPage()', () => {
  it('rejects common non-saved routes', () => {
    expect(isSavedPage('/')).toBe(false);
    expect(isSavedPage('/explore')).toBe(false);
    expect(isSavedPage('/reels/')).toBe(false);
    expect(isSavedPage('/p/123456789')).toBe(false);
    expect(isSavedPage('')).toBe(false);
  });

  it('accepts the saved folder with and without a trailing slash', () => {
    expect(isSavedPage('/saved')).toBe(true);
    expect(isSavedPage('/saved/')).toBe(true);
  });

  it('accepts the newer all-posts saved URL', () => {
    expect(isSavedPage('/saved/all-posts')).toBe(true);
    expect(isSavedPage('/saved/all-posts/')).toBe(true);
    expect(isSavedPage('/username/saved/all-posts')).toBe(true);
    expect(isSavedPage('/username/saved/all-posts/')).toBe(true);
  });

  it('rejects strings that merely contain "saved" as a substring', () => {
    expect(isSavedPage('/saved-by')).toBe(false);
    expect(isSavedPage('/unsaved')).toBe(false);
    expect(isSavedPage('/some-saved-posts')).toBe(false);
  });

  it('is case-insensitive', () => {
    expect(isSavedPage('/Saved/')).toBe(true);
    expect(isSavedPage('/SAVED')).toBe(true);
  });
});
