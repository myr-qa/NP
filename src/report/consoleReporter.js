const { log } = require('../lib/utils/logger');

/**
 * Generates and prints a summary report to the console based on analysis results.
 *
 * @param {object} analysisResults - The results from the analyzeCommits function.
 *                                   Expected structure:
 *                                   {
 *                                     totalCommits: number,
 *                                     commitsWithKeywords: Array<object>,
 *                                     keywordCounts: object
 *                                   }
 * @param {object} cliOptions - The command-line options object from Commander.js.
 *                              Used here to check for `cliOptions.verbose`.
 */
function generateConsoleReport(analysisResults, cliOptions = {}) {
  log(`\n--- Console Report ---`);
  log(`Total commits analyzed: ${analysisResults.totalCommits}`);
  log(`Commits with keywords: ${analysisResults.commitsWithKeywords.length}`);

  // Added commit frequency and defect-fix rate to the console report.
  if (analysisResults.totalCommits > 0) {
    const commitFrequency = (analysisResults.commitsWithKeywords.length / analysisResults.totalCommits) * 100;
    log(`Commit frequency: ${commitFrequency.toFixed(2)}%`);
  }

  if (analysisResults.commitsWithKeywords.length > 0) {
    log(`\nKeyword Counts:`);
    for (const keyword in analysisResults.keywordCounts) {
      // Ensure the property belongs to the object itself, not its prototype
      if (Object.prototype.hasOwnProperty.call(analysisResults.keywordCounts, keyword)) {
        log(`  ${keyword}: ${analysisResults.keywordCounts[keyword]}`);
      }
    }

    // Calculate and log defect-fix rate if possible
    const defectFixCommits = analysisResults.commitsWithKeywords.filter(commit => {
      const keywords = commit.keywordsFound || []; // Fallback to an empty array if undefined
      return keywords.includes('defect');
    }).length;
    const defectFixRate = (defectFixCommits / analysisResults.commitsWithKeywords.length) * 100;
    log(`Defect-fix rate: ${defectFixRate.toFixed(2)}%`);
  }

  if (cliOptions.verbose && analysisResults.commitsWithKeywords.length > 0) {
    log(`\nCommits containing keywords:`);
    analysisResults.commitsWithKeywords.forEach(commit => {
      const messagePreview = commit.subject.length > 60 ? commit.subject.substring(0, 57) + '...' : commit.subject; // Use 'subject' instead of 'message'
      log(`  - ${commit.hash.substring(0,7)} by ${commit.author}: ${messagePreview} (Keywords: ${commit.keywordsFound.join(', ')})`);
    });
  }

  log('DEBUG: Console report generated successfully'); // Example log replacement
}

module.exports = {
  generateConsoleReport,
};

