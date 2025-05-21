const { analyzeCommits } = require('../src/lib/analysis/engine');
const { findKeywordsInMessage } = require('../src/lib/analysis/keywords');

// Mock the keywords module
jest.mock('../src/lib/analysis/keywords', () => ({
  findKeywordsInMessage: jest.fn(),
}));

// Default keywords list from engine.js, ensure this matches for tests
const DEFAULT_KEYWORDS = ['fix', 'hotfix', 'bugfix', 'resolve', 'patch'];

describe('analyzeCommits', () => {
  beforeEach(() => {
    // Reset the mock before each test
    findKeywordsInMessage.mockReset();
    // Spy on console.error and suppress output during tests, then restore
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore console.error
    console.error.mockRestore();
  });

  const sampleCommit1 = { hash: 'h1', subject: 'Fix: issue 1', author_name: 'A1', date: 'D1' };
  const sampleCommit2 = { hash: 'h2', subject: 'Update readme', author_name: 'A2', date: 'D2' };
  const sampleCommit3 = { hash: 'h3', message: 'Resolve: problem X', author_name: 'A3', date: 'D3' }; // Uses 'message' field
  const sampleCommit4 = { hash: 'h4', subject: 'Another fix', author_name: 'A1', date: 'D4'};


  it('should return default empty results and log error if commits is not an array', async () => {
    const result = await analyzeCommits(null, '');
    expect(result).toEqual({
      totalCommits: 0,
      commitsWithKeywords: [],
      keywordCounts: {},
    });
    expect(console.error).toHaveBeenCalledWith('Error: Expected an array of commits for analysis.');
  });

  it('should return correct results for an empty array of commits', async () => {
    const result = await analyzeCommits([], '');
    const expectedKeywordCounts = {};
    DEFAULT_KEYWORDS.forEach(kw => expectedKeywordCounts[kw] = 0);
    expect(result).toMatchObject({
      totalCommits: 0,
      commitsWithKeywords: [],
      keywordCounts: expectedKeywordCounts,
    });
    // Check that all other keys are present and empty/zero as well
    expect(result.commitFrequency).toEqual({});
    expect(result.fixTrend).toEqual({});
    expect(result.fileChangeCounts).toEqual({});
    expect(result.fixFileCounts).toEqual({});
    expect(result.topFiles).toEqual([]);
    expect(result.topFixFiles).toEqual([]);
    expect(result.defectFixRate).toBe(0);
  });

  it('should handle commits with no matching keywords (using default keywords)', async () => {
    findKeywordsInMessage.mockReturnValue([]); // Mock returns no keywords
    const commits = [sampleCommit2];
    const result = await analyzeCommits(commits, '');

    const expectedKeywordCounts = {};
    DEFAULT_KEYWORDS.forEach(kw => expectedKeywordCounts[kw] = 0);

    expect(result.totalCommits).toBe(1);
    expect(result.commitsWithKeywords).toEqual([]);
    expect(result.keywordCounts).toEqual(expectedKeywordCounts);
    expect(findKeywordsInMessage).toHaveBeenCalledWith(sampleCommit2.subject, DEFAULT_KEYWORDS);
  });

  it('should correctly analyze commits with matching default keywords', async () => {
    findKeywordsInMessage
      .mockReturnValueOnce(['fix']) // For sampleCommit1
      .mockReturnValueOnce([]);    // For sampleCommit2

    const commits = [sampleCommit1, sampleCommit2];
    const result = await analyzeCommits(commits, '');

    expect(result.totalCommits).toBe(2);
    expect(result.commitsWithKeywords.length).toBe(1);
    expect(result.commitsWithKeywords[0]).toMatchObject({
      hash: sampleCommit1.hash,
      message: sampleCommit1.subject,
      keywordsFound: ['fix'],
    });
    const expectedKeywordCounts = { ...DEFAULT_KEYWORDS.reduce((acc, kw) => ({...acc, [kw]: 0}), {}), 'fix': 1 };
    expect(result.keywordCounts).toEqual(expectedKeywordCounts);
    expect(findKeywordsInMessage).toHaveBeenCalledWith(sampleCommit1.subject, DEFAULT_KEYWORDS);
    expect(findKeywordsInMessage).toHaveBeenCalledWith(sampleCommit2.subject, DEFAULT_KEYWORDS);
  });

  it('should use CLI-provided keywords and override defaults', async () => {
    const cliKeywords = 'custom1,custom2';
    const parsedCliKeywords = ['custom1', 'custom2'];
    findKeywordsInMessage.mockReturnValueOnce(['custom1']); // For sampleCommit1

    const commits = [sampleCommit1];
    const result = await analyzeCommits(commits, cliKeywords);

    const expectedKeywordCounts = { 'custom1': 1, 'custom2': 0 };

    expect(result.totalCommits).toBe(1);
    expect(result.commitsWithKeywords.length).toBe(1);
    expect(result.commitsWithKeywords[0].keywordsFound).toEqual(['custom1']);
    expect(result.keywordCounts).toEqual(expectedKeywordCounts);
    expect(findKeywordsInMessage).toHaveBeenCalledWith(sampleCommit1.subject, parsedCliKeywords);
  });

  it('should use default keywords if CLI keywords string is empty or whitespace', async () => {
    findKeywordsInMessage.mockReturnValueOnce(['patch']); // For sampleCommit1
    const commits = [sampleCommit1];

    // Test with empty string
    let result = await analyzeCommits(commits, '');
    expect(findKeywordsInMessage).toHaveBeenCalledWith(sampleCommit1.subject, DEFAULT_KEYWORDS);
    expect(result.keywordCounts['patch']).toBe(1);

    // Test with whitespace string
    findKeywordsInMessage.mockClear(); // Clear previous calls
    findKeywordsInMessage.mockReturnValueOnce(['resolve']);
    result = await analyzeCommits(commits, '   ');
    expect(findKeywordsInMessage).toHaveBeenCalledWith(sampleCommit1.subject, DEFAULT_KEYWORDS);
    expect(result.keywordCounts['resolve']).toBe(1);
  });

  it('should use commit.subject for message by default', async () => {
    findKeywordsInMessage.mockReturnValue(['fix']);
    const commits = [sampleCommit1];
    await analyzeCommits(commits, '');
    expect(findKeywordsInMessage).toHaveBeenCalledWith(sampleCommit1.subject, DEFAULT_KEYWORDS);
  });

  it('should use commit.message if commit.subject is missing', async () => {
    findKeywordsInMessage.mockReturnValue(['resolve']);
    const commits = [sampleCommit3]; // sampleCommit3 has 'message' field
    await analyzeCommits(commits, '');
    expect(findKeywordsInMessage).toHaveBeenCalledWith(sampleCommit3.message, DEFAULT_KEYWORDS);
  });

  it('should use empty string if both subject and message are missing', async () => {
    const commitWithoutMessage = { hash: 'h5', author_name: 'A5', date: 'D5' };
    findKeywordsInMessage.mockReturnValue([]);
    const commits = [commitWithoutMessage];
    await analyzeCommits(commits, '');
    expect(findKeywordsInMessage).toHaveBeenCalledWith('', DEFAULT_KEYWORDS);
  });

  it('should correctly report totalCommits', async () => {
    const commits = [sampleCommit1, sampleCommit2, sampleCommit3];
    findKeywordsInMessage.mockReturnValue([]); // No keywords found for simplicity
    const result = await analyzeCommits(commits, '');
    expect(result.totalCommits).toBe(3);
  });

  it('should correctly populate keywordsFound and aggregate keywordCounts', async () => {
    findKeywordsInMessage
      .mockImplementation((message, keywords) => {
        if (message === sampleCommit1.subject) return ['fix'];
        if (message === sampleCommit4.subject) return ['fix', 'patch']; // Commit with multiple keywords
        return [];
      });

    const commits = [sampleCommit1, sampleCommit2, sampleCommit4];
    const result = await analyzeCommits(commits, '');

    expect(result.totalCommits).toBe(3);
    expect(result.commitsWithKeywords.length).toBe(2);

    const commit1Result = result.commitsWithKeywords.find(c => c.hash === sampleCommit1.hash);
    expect(commit1Result.keywordsFound).toEqual(['fix']);

    const commit4Result = result.commitsWithKeywords.find(c => c.hash === sampleCommit4.hash);
    expect(commit4Result.keywordsFound).toEqual(['fix', 'patch']);
    
    const expectedKeywordCounts = {
        ...DEFAULT_KEYWORDS.reduce((acc, kw) => ({...acc, [kw]: 0}), {}),
        'fix': 2, // from commit1 and commit4
        'patch': 1 // from commit4
      };
    expect(result.keywordCounts).toEqual(expectedKeywordCounts);
  });
});

