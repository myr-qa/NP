const { analyzeCommits } = require('../src/lib/analysis/engine');

describe('analyzeCommits', () => {
  it('should return default empty results and log error if commits is not an array', async () => {
    const result = await analyzeCommits(null);
    expect(result).toEqual({
      totalCommits: 0,
      commitsWithKeywords: [],
      keywordCounts: { fix: 0, hotfix: 0, bugfix: 0, resolve: 0, patch: 0 },
      topFixFiles: [],
      fixTrend: {},
      dailyCommitCounts: {},
      defectFixRate: 0,
    });
  });

  it('should return correct results for an empty array of commits', async () => {
    const result = await analyzeCommits([]);
    expect(result).toEqual({
      totalCommits: 0,
      commitsWithKeywords: [],
      keywordCounts: { fix: 0, hotfix: 0, bugfix: 0, resolve: 0, patch: 0 },
      topFixFiles: [],
      fixTrend: {},
      dailyCommitCounts: {},
      defectFixRate: 0,
    });
  });

  it('should handle commits with no matching keywords', async () => {
    const commits = [
      { subject: 'Initial commit', date: '2025-05-01', files: ['file1.js'] },
    ];
    const result = await analyzeCommits(commits);
    expect(result.commitsWithKeywords).toEqual([]);
    expect(result.keywordCounts).toEqual({ fix: 0, hotfix: 0, bugfix: 0, resolve: 0, patch: 0 });
  });

  it('should correctly analyze commits with matching default keywords', async () => {
    const commit1 = { subject: 'Fix: resolved issue #123', date: '2025-05-01', files: ['file1.js'], hash: 'h1' };
    const commit2 = { subject: 'Hotfix: urgent patch needed', date: '2025-05-02', files: ['file2.js'], hash: 'h2' };
    const commits = [commit1, commit2];
    const result = await analyzeCommits(commits);
    expect(result.commitsWithKeywords.length).toBe(2);
    expect(result.keywordCounts).toEqual({ fix: 1, hotfix: 1, bugfix: 0, resolve: 0, patch: 1 });
    expect(result.fixTrend).toEqual({
      '2025-05-01': 1,
      '2025-05-02': 1,
    });
    expect(result.topFixFiles).toEqual([
      { file: 'file1.js', count: 1 },
      { file: 'file2.js', count: 1 },
    ]);
  });

  it('should correctly populate keywordsFound and aggregate keywordCounts', async () => {
    const commit1 = { subject: 'Fix: issue #123', date: '2025-05-01', files: ['file1.js'], hash: 'h1' };
    const commit2 = { subject: 'Hotfix: patch needed', date: '2025-05-02', files: ['file2.js'], hash: 'h2' };
    const commits = [commit1, commit2];
    const result = await analyzeCommits(commits);
    const foundCommit1 = result.commitsWithKeywords.find(c => c.hash === commit1.hash);
    const foundCommit2 = result.commitsWithKeywords.find(c => c.hash === commit2.hash);
    expect(foundCommit1.keywordsFound).toEqual(['fix']);
    expect(foundCommit2.keywordsFound).toEqual(['hotfix', 'patch']);
  });
});
