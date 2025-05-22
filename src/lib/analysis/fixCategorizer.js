const { log, enableLogging, disableLogging } = require('../utils/logger');


/**
 * Categorizes merge commits into regular fixes and hotfixes
 * @param {Array} mergeCommits - Array of merge commit objects
 * @returns {Object} { fixMerges: Array, hotfixMerges: Array }
 */
function categorizeFixes(mergeCommits) {
    enableLogging(true); // Enable logging for debugging
  const fixMerges = [];
  const hotfixMerges = [];
  log('Categorizing fixes from', mergeCommits.length, 'merge commits');

  for (const merge of mergeCommits) {
    const msg = (merge.message || '').toLowerCase();
    const containsFix = /\b(fix|bugfix|resolve|patch)\b/i.test(msg);
    const containsHotfix = /\bhotfix\b/i.test(msg);
    
    if (containsHotfix) {
      log('Found hotfix:', merge.message);
      hotfixMerges.push(merge);
    } else if (containsFix) {
      log('Found fix:', merge.message);
      fixMerges.push(merge);
    }
  }

  log('Categorization results:');
  log('- Fix merges:', fixMerges.length);
  log('- Hotfix merges:', hotfixMerges.length);

  return { fixMerges, hotfixMerges };
}

/**
 * Creates top files list from pre-filtered fix merges
 * @param {Array} fixMerges - Pre-filtered fix merge commits
 * @param {number} limit - Number of top files to return (default: 10)
 * @returns {Array} Top files with counts
 */
function getTopFilesFromMerges(fixMerges, limit = 10) {
    enableLogging(true); // Enable logging for debugging
  const fileCountMap = {};
  for (const merge of fixMerges) {
    if (Array.isArray(merge.files)) {
        log('Processing merge:', merge.message);
        log('Files:', merge.files);
      for (const file of merge.files) {
        fileCountMap[file] = (fileCountMap[file] || 0) + 1;
      }
    }
  }
  return Object.entries(fileCountMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([file, count]) => ({ file, count }));
}

module.exports = { categorizeFixes, getTopFilesFromMerges };
