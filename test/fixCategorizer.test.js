const { categorizeFixes, getTopFilesFromMerges } = require('../src/lib/analysis/fixCategorizer');

describe('categorizeFixes', () => {
  it('splits fix and hotfix merges correctly', () => {
    const merges = [
      { message: 'Merge hotfix: urgent', files: ['foo.js'] },
      { message: 'Merge fix: bug', files: ['bar.js'] },
      { message: 'Merge bugfix: issue', files: ['baz.js'] },
      { message: 'Merge patch: update', files: ['foo.js'] },
      { message: 'Merge: update', files: ['bar.js'] },
    ];
    const { fixMerges, hotfixMerges } = categorizeFixes(merges);
    expect(hotfixMerges.length).toBe(1);
    expect(fixMerges.length).toBe(3);
    expect(hotfixMerges[0].message).toMatch(/hotfix/);
    expect(fixMerges.map(m => m.message)).toEqual(
      expect.arrayContaining([
        'Merge fix: bug',
        'Merge bugfix: issue',
        'Merge patch: update'
      ])
    );
  });
});

describe('getTopFilesFromMerges', () => {
  it('returns top files from fix merges', () => {
    const fixMerges = [
      { files: ['foo.js', 'bar.js'] },
      { files: ['foo.js'] },
      { files: ['baz.js', 'foo.js'] },
    ];
    const topFiles = getTopFilesFromMerges(fixMerges, 2);
    expect(topFiles[0]).toEqual({ file: 'foo.js', count: 3 });
    expect(topFiles[1].file).toBe('bar.js');
  });
});
