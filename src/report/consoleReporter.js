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
  console.log(`\n--- Console Report ---`);
  console.log(`Total commits analyzed: ${analysisResults.totalCommits}`);
  console.log(`Commits with keywords: ${analysisResults.commitsWithKeywords.length}`);

  if (analysisResults.commitsWithKeywords.length > 0) {
    console.log(`\nKeyword Counts:`);
    for (const keyword in analysisResults.keywordCounts) {
      // Ensure the property belongs to the object itself, not its prototype
      if (Object.prototype.hasOwnProperty.call(analysisResults.keywordCounts, keyword)) {
        console.log(`  ${keyword}: ${analysisResults.keywordCounts[keyword]}`);
      }
    }
  }

  if (cliOptions.verbose && analysisResults.commitsWithKeywords.length > 0) {
    console.log(`\nCommits containing keywords:`);
    analysisResults.commitsWithKeywords.forEach(commit => {
      const messagePreview = commit.message.length > 60 ? commit.message.substring(0, 57) + '...' : commit.message;
      console.log(`  - ${commit.hash.substring(0,7)} by ${commit.author}: ${messagePreview} (Keywords: ${commit.keywordsFound.join(', ')})`);
    });
  }
}

module.exports = {
  generateConsoleReport,
};

