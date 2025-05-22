const simpleGit = require('simple-git');
const { log } = require('../utils/logger');

/**
 * Retrieves commit history from the Git repository.
 * @param {object} [filters={}] - Optional filters for commits.
 *                                 (e.g., { since, until, branches, authors })
 *                                 Currently, these filters are not implemented.
 * @returns {Promise<Array<object>>} An array of commit objects, or an empty array on error.
 * Each commit object will have: hash, author_name, author_email, date, subject.
 */
async function getCommits(filters = {}) {
  const git = simpleGit();

  try {
    const mergeLog = await git.raw(['log', '--merges', '--pretty=format:%H|%an|%ae|%ad|%s']);
    log('DEBUG: Raw merge log output:', mergeLog); // Replace console.log with log

    const commits = mergeLog.split('\n').filter(Boolean).map(line => {
      const [hash, author_name, author_email, date, subject] = line.split('|');
      log('DEBUG: Parsed fields:', { hash, author_name, author_email, date, subject }); // Replace console.log with log
      return { hash, author_name, author_email, date, subject }; // Ensure only defined fields are used
    });

    log('DEBUG: Parsed commits:', commits); // Replace console.log with log

    for (const commit of commits) {
      try {
        const showResult = await git.raw([
          'show', '--pretty=format:', '--name-only', commit.hash
        ]);
        const files = showResult.split('\n').map(f => f.trim()).filter(f => f.length > 0);
        commit.files = files;
      } catch (err) {
        commit.files = [];
      }
    }

    return commits;
  } catch (error) {
    log('DEBUG: Error in getCommits:', error); // Replace console.error with log
    return [];
  }
}

/**
 * Retrieves merge commits into a target branch and classifies them as hotfix or release.
 * @param {string} targetBranch - The branch to analyze (e.g., 'master')
 * @returns {Promise<Array<{hash: string, parents: string[], message: string, files: string[], type: 'hotfix' | 'release'}>>}
 */
async function getClassifiedMerges(targetBranch = 'remotes/origin/master') {
  const git = simpleGit();
  const mergeLog = await git.raw([
    'log', '--merges', '--first-parent', targetBranch, '--pretty=format:%H|%P|%s'
  ]);

  log('DEBUG: Raw merge log output:', mergeLog); // Debug log for raw merge log

  const merges = mergeLog.split('\n').filter(Boolean).map(line => {
    const [hash, parents, message] = line.split('|');
    return { hash, parents: parents ? parents.split(' ') : [], message: message || '' };
  });

  log('DEBUG: Parsed merges:', merges); // Debug log for parsed merges

  for (const merge of merges) {
    try {
      const diffResult = await git.raw([
        'diff', '--name-only', merge.parents[0], merge.parents[1]
      ]);
      merge.files = diffResult.split('\n').map(f => f.trim()).filter(f => f.length > 0);
    } catch {
      merge.files = [];
    }
  }

  return merges;
}

module.exports = {
  getCommits,
  getClassifiedMerges,
};

