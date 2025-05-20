const simpleGit = require('simple-git');

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

  // Define the desired log format.
  // The keys (hash, author_name, etc.) will be the property names in the resulting objects.
  const logFormat = {
    hash: '%H',
    author_name: '%an',
    author_email: '%ae',
    date: '%ad', // simple-git will parse this to a Date object if possible or leave as string
    subject: '%s',
  };

  // Options for the simple-git log command.
  // We include the format. Filtering options from `filters` will be added later.
  const gitLogOptions = {
    format: logFormat,
    // Example of how filters could be integrated later:
    // if (filters.since) options['--since'] = filters.since;
    // if (filters.until) options['--until'] = filters.until;
    // if (filters.authors) options['--author'] = filters.authors; // May need more complex handling for multiple authors
    // Branches are typically specified differently, e.g. git.log(['main', '--since=...']) or similar
  };

  try {
    // For now, we pass only the format options.
    // Filtering based on the `filters` parameter will be implemented in a future step.
    const log = await git.log(gitLogOptions);
    const commits = log.all || [];
    // For each commit, fetch the list of changed files
    for (const commit of commits) {
      try {
        // Get files changed in this commit (excluding merge commits)
        const showResult = await git.raw([
          'show', '--pretty=format:', '--name-only', commit.hash
        ]);
        // Split by newlines, filter out empty lines
        const files = showResult.split('\n').map(f => f.trim()).filter(f => f.length > 0);
        commit.files = files;
      } catch (err) {
        commit.files = [];
      }
    }
    return commits;
  } catch (error) {
    // console.error('Failed to retrieve commits:', error); // It's good practice to log errors, but per plan step this might be silent for now
    return [];
  }
}

module.exports = {
  getCommits,
};

