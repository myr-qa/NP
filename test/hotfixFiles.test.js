const { analyzeHotfixFiles, analyzeHotfixFilesAuto } = require('../src/lib/analysis/engine');

// Mock merge data for analyzeHotfixFiles
const mockMerges = [
  {
    hash: 'abc123',
    message: 'Merge pull request #1 from hotfix-foo to master',
    files: ['foo.js', 'bar.js']
  },
  {
    hash: 'def456',
    message: 'Merge pull request #2 from develop to master',
    files: ['baz.js']
  },
  {
    hash: 'ghi789',
    message: 'Merge pull request #3 from feature-x to master {fix}',
    files: ['foo.js']
  }
];

describe('analyzeHotfixFiles', () => {
  it('should aggregate files affected by hotfix merges', () => {
    const { topHotfixFiles, hotfixFiles, hotfixCommits } = analyzeHotfixFiles(mockMerges);
    expect(hotfixCommits.length).toBe(2); // Only hotfix and {fix} merges
    expect(hotfixFiles['foo.js']).toBe(2);
    expect(hotfixFiles['bar.js']).toBe(1);
    expect(topHotfixFiles[0].file).toBe('foo.js');
    expect(topHotfixFiles[0].count).toBe(2);
  });
});

describe('analyzeHotfixFilesAuto', () => {
  it('should be a function and return a Promise', () => {
    expect(typeof analyzeHotfixFilesAuto).toBe('function');
    expect(analyzeHotfixFilesAuto('master')).toBeInstanceOf(Promise);
  });
});
