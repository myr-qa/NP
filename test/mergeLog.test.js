const { getMergeCommitsOnly } = require('../src/lib/git/mergeLog');
const simpleGit = require('simple-git');

jest.mock('simple-git');

describe('getMergeCommitsOnly', () => {
  it('parses merge log output correctly', async () => {
    const mockRaw = jest.fn().mockResolvedValue(
      'abc123|p1 p2|Merge pull request #1|Alice|2025-05-01\n' +
      'def456|p3 p4|Merge pull request #2|Bob|2025-05-02\n'
    );
    simpleGit.mockReturnValue({ raw: mockRaw });

    const merges = await getMergeCommitsOnly('master');
    expect(merges).toEqual([
      {
        hash: 'abc123',
        parents: ['p1', 'p2'],
        message: 'Merge pull request #1',
        author_name: 'Alice',
        date: '2025-05-01'
      },
      {
        hash: 'def456',
        parents: ['p3', 'p4'],
        message: 'Merge pull request #2',
        author_name: 'Bob',
        date: '2025-05-02'
      }
    ]);
    expect(mockRaw).toHaveBeenCalledWith([
      'log', '--merges', '--first-parent', 'master',
      '--pretty=format:%H|%P|%s|%an|%ad'
    ]);
  });
});
