const simpleGit = require('simple-git');

/**
 * Checks if the current directory is a Git repository.
 * @returns {Promise<boolean>} True if it is a Git repository, false otherwise.
 */
async function isGitRepository() {
  try {
    const git = simpleGit();
    return await git.checkIsRepo();
  } catch (error) {
    // console.error('Failed to check Git repository status:', error);
    return false;
  }
}

module.exports = {
  isGitRepository,
};

