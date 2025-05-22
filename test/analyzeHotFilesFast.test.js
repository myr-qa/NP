const { analyzeHotFilesFast } = require('../src/lib/analysis/analyzeHotFilesFast');
const { getMergeCommitsOnly } = require('../src/lib/git/mergeLog');
const { categorizeFixes, getTopFilesFromMerges } = require('../src/lib/analysis/fixCategorizer');

jest.mock('../src/lib/git/mergeLog');
jest.mock('../src/lib/analysis/fixCategorizer');

describe('analyzeHotFilesFast', () => {
  it('integrates merge commit retrieval, categorization, and top file aggregation', async () => {
    // Mock data
    const mockMergeCommits = [
      { message: 'Merge hotfix: urgent', files: ['foo.js'] },
      { message: 'Merge fix: bug', files: ['bar.js'] },
      { message: 'Merge bugfix: issue', files: ['baz.js'] },
    ];

    const mockFixMerges = [
      { files: ['bar.js'] },
      { files: ['baz.js'] },
    ];

    const mockHotfixMerges = [
      { files: ['foo.js'] },
    ];

    const mockTopFixFiles = [
      { file: 'bar.js', count: 1 },
      { file: 'baz.js', count: 1 },
    ];

    const mockTopHotfixFiles = [
      { file: 'foo.js', count: 1 },
    ];

    // Mock implementations
    getMergeCommitsOnly.mockResolvedValue(mockMergeCommits);
    categorizeFixes.mockReturnValue({ fixMerges: mockFixMerges, hotfixMerges: mockHotfixMerges });
    getTopFilesFromMerges.mockImplementation((merges) => {
      if (merges === mockFixMerges) return mockTopFixFiles;
      if (merges === mockHotfixMerges) return mockTopHotfixFiles;
    });

    // Run the function
    const result = await analyzeHotFilesFast({}, 2);

    // Assertions
    expect(getMergeCommitsOnly).toHaveBeenCalled();
    expect(categorizeFixes).toHaveBeenCalledWith(mockMergeCommits);
    expect(getTopFilesFromMerges).toHaveBeenCalledWith(mockFixMerges, 2);
    expect(getTopFilesFromMerges).toHaveBeenCalledWith(mockHotfixMerges, 2);
    expect(result).toEqual({
      topFixFiles: mockTopFixFiles,
      topHotfixFiles: mockTopHotfixFiles,
    });
  });
});
