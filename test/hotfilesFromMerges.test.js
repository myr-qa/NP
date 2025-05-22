const { analyzeHotFilesFromMerges } = require('../src/lib/analysis/hotfiles');

describe('analyzeHotFilesFromMerges', () => {
  it('aggregates hot files from merge commits with fix/hotfix keywords', () => {
    const merges = [
      { message: 'Merge hotfix: urgent', files: ['foo.js', 'bar.js'] },
      { message: 'Merge feature: new stuff', files: ['baz.js'] },
      { message: 'Merge fix: bug', files: ['foo.js'] },
      { message: 'Merge: update', files: ['bar.js'] },
    ];
    const result = analyzeHotFilesFromMerges(merges);
    expect(result.hotFiles).toEqual({ 'foo.js': 2, 'bar.js': 1 });
    expect(result.topHotFiles[0].file).toBe('foo.js');
    expect(result.topHotFiles[0].count).toBe(2);
    expect(result.hotfixMerges.length).toBe(2);
  });

  it('returns empty if no hotfix merges', () => {
    const merges = [
      { message: 'Merge feature: new stuff', files: ['baz.js'] },
      { message: 'Merge: update', files: ['bar.js'] },
    ];
    const result = analyzeHotFilesFromMerges(merges);
    expect(result.hotFiles).toEqual({});
    expect(result.topHotFiles).toEqual([]);
    expect(result.hotfixMerges).toEqual([]);
  });
});
