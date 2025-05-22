const simpleGit = require('simple-git');

/**
 * Retrieves only merge commits from target branch for performance
 * @param {string} targetBranch - Branch to analyze (default: 'master')
 * @returns {Promise<Array>} Array of merge commit objects with files
 */
async function getMergeCommitsOnly(targetBranch = 'HEAD') {
  const git = simpleGit();
  
  try {
    // Get merge commits with parent info
    const mergeLog = await git.raw([
      'log', '--merges', '--first-parent',
      targetBranch || 'HEAD',
      '--pretty=format:%H|%P|%s|%an|%ad'
    ]);

    const merges = mergeLog.split('\n').filter(Boolean).map(line => {
      const [hash, parents, message, author, date] = line.split('|');
      return {
        hash,
        parents: parents ? parents.split(' ') : [],
        message: message || '',
        author_name: author,
        date
      };
    });

    // Extract changed files for each merge
    for (const merge of merges) {
      try {
        if (merge.parents.length >= 2) {
          // Get files changed between the first and second parent of the merge
          const diffResult = await git.raw([
            'diff', '--name-only', merge.parents[0], merge.parents[1]
          ]);
          merge.files = diffResult.split('\n').map(f => f.trim()).filter(f => f.length > 0);
        } else {
          merge.files = [];
        }
      } catch (error) {
        console.error(`Error getting files for merge ${merge.hash}:`, error);
        merge.files = [];
      }
    }
    return merges;
  } catch (error) {
    console.error('Error getting merge commits:', error);
    return [];
  }
}

module.exports = { getMergeCommitsOnly };
