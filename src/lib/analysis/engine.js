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
    fixTrend: {}, // { 'YYYY-MM-DD': fix/hotfix count }
    fileChangeCounts: {}, // { filename: count }
    defectFixRate: 0, // fix/hotfix commits / total
    topFiles: [] // [{ file, count }]
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
  }
  // Calculate defect-fix rate
  analysisResults.defectFixRate = analysisResults.totalCommits > 0 ? (analysisResults.commitsWithKeywords.length / analysisResults.totalCommits) : 0;
  // Top 10 files
  analysisResults.topFiles = Object.entries(analysisResults.fileChangeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([file, count]) => ({ file, count }));

  return analysisResults;
}

module.exports = {
  analyzeCommits,
};

