const { findKeywordsInMessage } = require('../src/lib/analysis/keywords');

describe('findKeywordsInMessage', () => {
  it('should find a single keyword, case-insensitive', () => {
    const message = 'This is a Fix for a critical bug.';
    const keywords = ['fix'];
    expect(findKeywordsInMessage(message, keywords)).toEqual(['fix']);
  });

  it('should find multiple keywords, case-insensitive', () => {
    const message = 'This commit fixes a bug and resolves an issue.';
    const keywords = ['fix', 'resolve', 'issue'];
    // Order might matter if we strictly check equality, but content is key.
    // findKeywordsInMessage returns them in the order they appear in the keywords array.
    expect(findKeywordsInMessage(message, keywords)).toEqual(['fix', 'resolve', 'issue']);
  });

  it('should handle mixed case in message and keywords', () => {
    const message = 'Fixed a MAJOR BUG due to HotFix.';
    const keywords = ['major bug', 'hotfix'];
    expect(findKeywordsInMessage(message, keywords)).toEqual(['major bug', 'hotfix']);
  });

  it('should return an empty array if no keywords are found', () => {
    const message = 'This is a regular commit message.';
    const keywords = ['fix', 'bug'];
    expect(findKeywordsInMessage(message, keywords)).toEqual([]);
  });

  it('should return an empty array for an empty message', () => {
    const message = '';
    const keywords = ['fix', 'bug'];
    expect(findKeywordsInMessage(message, keywords)).toEqual([]);
  });

  it('should return an empty array for an empty keywords array', () => {
    const message = 'This is a fix.';
    const keywords = [];
    expect(findKeywordsInMessage(message, keywords)).toEqual([]);
  });

  it('should return an empty array if keywords is null or undefined', () => {
    const message = 'This is a fix.';
    expect(findKeywordsInMessage(message, null)).toEqual([]);
    expect(findKeywordsInMessage(message, undefined)).toEqual([]);
  });

  it('should return an empty array if message is null or undefined', () => {
    const keywords = ['fix'];
    expect(findKeywordsInMessage(null, keywords)).toEqual([]);
    expect(findKeywordsInMessage(undefined, keywords)).toEqual([]);
  });


  it('should trim keywords before matching', () => {
    const message = 'This is a fix for a bug.';
    const keywords = [' fix ', ' bug '];
    expect(findKeywordsInMessage(message, keywords)).toEqual([' fix ', ' bug ']); // Returns original
  });

  it('should match keywords that are substrings of words in the message', () => {
    // Current behavior: 'err' in 'error' will match.
    const message = 'An error occurred during the process.';
    const keywords = ['err'];
    expect(findKeywordsInMessage(message, keywords)).toEqual(['err']);
  });

  it('should handle keywords containing non-alphanumeric characters (if any)', () => {
    // Current implementation uses simple string `includes`, so special chars are part of the match.
    const message = 'Resolved issue #123 and bug-fix for JIRA-456.';
    const keywords = ['issue #123', 'bug-fix'];
    expect(findKeywordsInMessage(message, keywords)).toEqual(['issue #123', 'bug-fix']);
  });

  it('should return original case keywords', () => {
    const message = 'this is a Fix for a BUG';
    const keywords = ['fix', 'BUG'];
    // findKeywordsInMessage should return the keywords as they were in the input array
    expect(findKeywordsInMessage(message, keywords)).toEqual(['fix', 'BUG']);
  });

  it('should handle keywords with different casing in the input array', () => {
    const message = 'Fixed a bug, applied a Hotfix';
    const keywords = ['Bug', 'hotFIX'];
    expect(findKeywordsInMessage(message, keywords)).toEqual(['Bug', 'hotFIX']);
  });

  it('should not find keywords if only part of a multi-word keyword matches', () => {
    const message = 'This is a partial fix';
    const keywords = ['partial fix commit'];
    expect(findKeywordsInMessage(message, keywords)).toEqual([]);
  });

  it('should find a multi-word keyword correctly', () => {
    const message = 'This is a partial fix commit for the bug.';
    const keywords = ['partial fix commit'];
    expect(findKeywordsInMessage(message, keywords)).toEqual(['partial fix commit']);
  });

  it('should handle empty strings within the keywords array gracefully', () => {
    const message = 'A bug was fixed.';
    const keywords = ['fix', '', 'bug', '  '];
    expect(findKeywordsInMessage(message, keywords)).toEqual(['fix', 'bug']);
  });
});

