const { getMergeCommitsOnly } = require('../git/mergeLog');
const { categorizeFixes, getTopFilesFromMerges } = require('./fixCategorizer');

/**
 * Main orchestrator function to analyze hot files quickly.
 * Integrates merge commit retrieval, categorization, and top file aggregation.
 *
 * @param {Object} gitRepo - The git repository instance.
 * @param {number} topN - Number of top files to return for each category.
 * @returns {Object} Analysis results with separate fix and hotfix data.
 */
async function analyzeHotFilesFast(targetBranch = 'HEAD', topN = 10) {
  console.log('[DEBUG] Entered analyzeHotFilesFast for branch:', targetBranch);
  try {
    // Get only merge commits
    const mergeCommits = await getMergeCommitsOnly(targetBranch);
    console.log('[DEBUG] Analyzing merges in branch:', targetBranch || 'HEAD');
    console.log('[DEBUG] Merge commits found:', mergeCommits.length);
    mergeCommits.forEach((merge, idx) => {
      console.log(`[DEBUG] Merge #${idx + 1}: hash=${merge.hash}, parents=${merge.parents}, files=${merge.files ? merge.files.length : 0}`);
      if (merge.files && merge.files.length > 0) {
        console.log(`[DEBUG] Files:`, merge.files);
      }
    });

    // Split into categories
    const { fixMerges, hotfixMerges } = categorizeFixes(mergeCommits);
    console.log('[DEBUG] Fix merges:', fixMerges.length);
    console.log('[DEBUG] Hotfix merges:', hotfixMerges.length);

    // Generate top 10 files for each category
    const topFixFiles = getTopFilesFromMerges(fixMerges, 10);
    const topHotfixFiles = getTopFilesFromMerges(hotfixMerges, 10);
    console.log('[DEBUG] Top fix files:', topFixFiles.length);
    console.log('[DEBUG] Top hotfix files:', topHotfixFiles.length);

    // Get total unique files count for each category
    const allFixFiles = new Set(fixMerges.flatMap((m) => m.files));
    const allHotfixFiles = new Set(hotfixMerges.flatMap((m) => m.files));
    console.log('[DEBUG] Total unique fix files:', allFixFiles.size);
    console.log('[DEBUG] Total unique hotfix files:', allHotfixFiles.size);

    return {
      totalMerges: mergeCommits.length,
      fixMerges: fixMerges.length,
      hotfixMerges: hotfixMerges.length,
      topFixFiles,
      topHotfixFiles,
      totalFixFiles: allFixFiles.size,
      totalHotfixFiles: allHotfixFiles.size,
    };
  } catch (error) {
    console.error('ERROR: analyzeHotFilesFast failed:', error);
    return {
      totalMerges: 0,
      fixMerges: 0,
      hotfixMerges: 0,
      topFixFiles: [],
      topHotfixFiles: [],
      totalFixFiles: 0,
      totalHotfixFiles: 0,
    };
  }
}

module.exports = { analyzeHotFilesFast };
