const { analyzeCommits } = require('../src/lib/analysis/engine');

describe('analyzeCommits', () => {
  const sampleCommit1 = { hash: 'h1', subject: 'Fix: issue 1', author_name: 'A1', date: '2025-05-01' };
  const sampleCommit2 = { hash: 'h2', subject: 'Update readme', author_name: 'A2', date: '2025-05-02' };
  const sampleCommit3 = { hash: 'h3', message: 'Resolve: problem X', author_name: 'A3', date: '2025-05-03' }; 
  const sampleCommit4 = { hash: 'h4', subject: 'Hotfix: urgent patch', author_name: 'A1', date: '2025-05-04'};

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
    const commits = [sampleCommit2];
    const result = await analyzeCommits(commits);
    expect(result.commitsWithKeywords).toEqual([]);
    expect(result.keywordCounts).toEqual({ fix: 0, hotfix: 0, bugfix: 0, resolve: 0, patch: 0 });
  });

  it('should correctly analyze commits with matching default keywords', async () => {
    const commits = [sampleCommit1, sampleCommit4];
    const result = await analyzeCommits(commits);
    expect(result.totalCommits).toBe(2);
    expect(result.commitsWithKeywords.length).toBe(2);
    const commit1 = result.commitsWithKeywords.find(c => c.hash === sampleCommit1.hash);
    const commit4 = result.commitsWithKeywords.find(c => c.hash === sampleCommit4.hash);
    expect(commit1.keywordsFound).toEqual(['fix']);
    expect(commit4.keywordsFound).toEqual(['hotfix', 'patch']);
    expect(result.keywordCounts).toEqual({ fix: 1, hotfix: 1, bugfix: 0, resolve: 0, patch: 1 });
  });

  it('should use commit.message if commit.subject is missing', async () => {
    const commits = [sampleCommit3];
    const result = await analyzeCommits(commits);
    expect(result.commitsWithKeywords.length).toBe(1);
    expect(result.commitsWithKeywords[0].keywordsFound).toEqual(['resolve']);
    expect(result.keywordCounts).toEqual({ fix: 0, hotfix: 0, bugfix: 0, resolve: 1, patch: 0 });
  });

  it('should use empty string if both subject and message are missing', async () => {
    const commitWithoutMessage = { hash: 'h5', author_name: 'A5', date: '2025-05-05' };
    const commits = [commitWithoutMessage];
    const result = await analyzeCommits(commits);
    expect(result.commitsWithKeywords.length).toBe(0);
    expect(result.keywordCounts).toEqual({ fix: 0, hotfix: 0, bugfix: 0, resolve: 0, patch: 0 });
  });
});

