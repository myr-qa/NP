const { findKeywordsInMessage } = require('./keywords');

const DEFAULT_KEYWORDS = ['fix', 'hotfix', 'bugfix', 'resolve', 'patch'];

/**
 * Analyzes an array of commit objects to find commits containing specified keywords.
 *
 * @param {Array<object>} commits - An array of commit objects (from simple-git log).
 *                                  Each commit object is expected to have at least:
 *                                  `hash`, `subject` (commit message), `author_name`, `date`.
 * @param {string} [cliKeywords] - A comma-separated string of keywords from CLI options.
 * @returns {Promise<object>} An object containing analysis results:
 *                            {
 *                              totalCommits: number,
 *                              commitsWithKeywords: Array<object>,
 *                              keywordCounts: object
 *                            }
 */
async function analyzeCommits(commits, cliKeywords) {
  if (!Array.isArray(commits)) {
    console.error('Error: Expected an array of commits for analysis.');
    return {
      totalCommits: 0,
      commitsWithKeywords: [],
      keywordCounts: {},
    };
  }

  let effectiveKeywords = DEFAULT_KEYWORDS;
  if (cliKeywords && typeof cliKeywords === 'string' && cliKeywords.trim() !== '') {
    effectiveKeywords = cliKeywords.split(',').map(k => k.trim()).filter(k => k.length > 0);
  }

  const analysisResults = {
    totalCommits: commits.length,
    commitsWithKeywords: [],
    keywordCounts: {},
    commitFrequency: {},
    fixTrend: {},
    fileChangeCounts: {},
    defectFixRate: 0,
    topFiles: [],
    fixFileCounts: {}, // { filename: count } for fix/hotfix commits
    topFixFiles: [] // [{ file, count }]
  };

  // Initialize keywordCounts for all effective keywords
  effectiveKeywords.forEach(kw => {
    analysisResults.keywordCounts[kw] = 0;
  });

  for (const commit of commits) {
    // Assuming commit object has a 'subject' or 'message' field for the commit message.
    // Based on previous log.js setup, it should be 'subject'.
    const messageToAnalyze = commit.subject || commit.message || '';
    const foundInMessage = findKeywordsInMessage(messageToAnalyze, effectiveKeywords);

    if (foundInMessage.length > 0) {
      analysisResults.commitsWithKeywords.push({
        hash: commit.hash,
        message: messageToAnalyze, // Storing the original message used for analysis
        author: commit.author_name,
        date: commit.date,
        keywordsFound: foundInMessage,
      });

      foundInMessage.forEach(keyword => {
        // Ensure we are incrementing based on the original-case keyword from effectiveKeywords
        // if it was found. findKeywordsInMessage returns original case keywords.
        if (analysisResults.keywordCounts.hasOwnProperty(keyword)) {
          analysisResults.keywordCounts[keyword]++;
        } else {
          // This case might happen if a keyword was found that wasn't in the initial
          // effectiveKeywords list (e.g., if findKeywordsInMessage logic was broader).
          // For now, we assume findKeywordsInMessage only returns keywords from the provided list.
          // If a keyword is found that's not in the list, it implies an issue or a need to
          // add it dynamically, but for simplicity, we only count pre-defined effective keywords.
        }
      });
    }

    // Count commit frequency by date (YYYY-MM-DD)
    if (commit.date) {
      // Try to parse the date string to a Date object
      const dateObj = new Date(commit.date);
      // If parsing fails, fallback to the original string
      const dateOnly = isNaN(dateObj) ? commit.date : dateObj.toISOString().slice(0, 10);
      if (!analysisResults.commitFrequency[dateOnly]) {
        analysisResults.commitFrequency[dateOnly] = 0;
      }
      analysisResults.commitFrequency[dateOnly]++;
    }

    // Track fix/hotfix trend by date
    if (foundInMessage.length > 0 && commit.date) {
      const dateObj = new Date(commit.date);
      const dateOnly = isNaN(dateObj) ? commit.date : dateObj.toISOString().slice(0, 10);
      if (!analysisResults.fixTrend[dateOnly]) analysisResults.fixTrend[dateOnly] = 0;
      analysisResults.fixTrend[dateOnly]++;
    }
    // Track file changes if commit.files exists (extendable for future)
    if (commit.files && Array.isArray(commit.files)) {
      commit.files.forEach(file => {
        if (!analysisResults.fileChangeCounts[file]) analysisResults.fileChangeCounts[file] = 0;
        analysisResults.fileChangeCounts[file]++;
      });
    }
    // Track files affected by fix/hotfix commits
    if (foundInMessage.length > 0 && commit.files && Array.isArray(commit.files)) {
      commit.files.forEach(file => {
        if (!analysisResults.fixFileCounts[file]) analysisResults.fixFileCounts[file] = 0;
        analysisResults.fixFileCounts[file]++;
      });
    }
  }
  // Calculate defect-fix rate
  analysisResults.defectFixRate = analysisResults.totalCommits > 0 ? (analysisResults.commitsWithKeywords.length / analysisResults.totalCommits) : 0;
  // Top 10 files for all commits
  analysisResults.topFiles = Object.entries(analysisResults.fileChangeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([file, count]) => ({ file, count }));
  // Top 10 files for fix/hotfix commits
  analysisResults.topFixFiles = Object.entries(analysisResults.fixFileCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([file, count]) => ({ file, count }));

  return analysisResults;
}

/**
 * Analyze hotfix merges and aggregate affected files.
 * @param {Array<{hash: string, parents: string[], message: string, files: string[]}>} masterMerges
 * @returns {Object} { hotfixFiles: { [file: string]: number }, hotfixCommits: Array, topHotfixFiles: Array }
 */
function analyzeHotfixFiles(masterMerges) {
  const hotfixFiles = {};
  const hotfixCommits = [];
  for (const merge of masterMerges) {
    // Heuristic: hotfix if message contains 'hotfix', '{fix}', or branch is not develop
    const msg = merge.message.toLowerCase();
    const isHotfix = msg.includes('hotfix') || msg.includes('{fix}') || (msg.includes('from') && !msg.includes('from develop'));
    if (isHotfix && Array.isArray(merge.files)) {
      hotfixCommits.push(merge);
      for (const file of merge.files) {
        if (!hotfixFiles[file]) hotfixFiles[file] = 0;
        hotfixFiles[file]++;
      }
    }
  }
  // Top 10 files
  const topHotfixFiles = Object.entries(hotfixFiles)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([file, count]) => ({ file, count }));
  return { hotfixFiles, hotfixCommits, topHotfixFiles };
}

/**
 * Analyze and report files most frequently affected by hotfix merges into master.
 * @param {string} targetBranch - The branch to analyze (default: 'master')
 * @returns {Promise<{ topHotfixFiles: Array, hotfixFiles: Object, hotfixCommits: Array }>} 
 */
async function analyzeHotfixFilesAuto(targetBranch = 'remotes/origin/master') {
  const { getClassifiedMerges } = require('../git/log');
  const merges = await getClassifiedMerges(targetBranch);
  const hotfixMerges = merges.filter(m => m.type === 'hotfix');
  const hotfixFiles = {};
  for (const merge of hotfixMerges) {
    for (const file of merge.files) {
      if (!hotfixFiles[file]) hotfixFiles[file] = 0;
      hotfixFiles[file]++;
    }
  }
  const topHotfixFiles = Object.entries(hotfixFiles)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([file, count]) => ({ file, count }));
  return { topHotfixFiles, hotfixFiles, hotfixCommits: hotfixMerges };
}

module.exports = {
  analyzeCommits,
  analyzeHotfixFiles,
  analyzeHotfixFilesAuto,
};

