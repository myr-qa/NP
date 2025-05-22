const DEFAULT_KEYWORDS = ['fix', 'hotfix', 'bugfix', 'resolve', 'patch'];

/**
 * Analyze hot files from merge commits only.
 * @param {Array} merges - Array of merge commit objects (from getMergeCommitsOnly)
 * @param {Array<string>} keywords - Keywords to detect hotfix merges
 * @returns {{ hotFiles: Object, topHotFiles: Array, hotfixMerges: Array }}
 */
function analyzeHotFilesFromMerges(merges, keywords = DEFAULT_KEYWORDS) {
  const hotFiles = {};
  const hotfixMerges = [];
  const lowerKeywords = keywords.map(k => k.toLowerCase());

  for (const merge of merges) {
    const msg = (merge.message || '').toLowerCase();
    if (lowerKeywords.some(kw => msg.includes(kw))) {
      hotfixMerges.push(merge);
      if (Array.isArray(merge.files)) {
        for (const file of merge.files) {
          hotFiles[file] = (hotFiles[file] || 0) + 1;
        }
      }
    }
  }
  const topHotFiles = Object.entries(hotFiles)
    .sort((a, b) => b[1] - a[1])
    .map(([file, count]) => ({ file, count }));
  return { hotFiles, topHotFiles, hotfixMerges };
}

module.exports = { analyzeHotFilesFromMerges };
