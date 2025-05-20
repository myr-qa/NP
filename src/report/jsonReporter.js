const fs = require('fs/promises');
const path = require('path');

/**
 * Generates a JSON report from analysis results and saves it to a file.
 *
 * @param {object} analysisResults - The results from the analyzeCommits function.
 * @param {object} cliOptions - The command-line options object.
 *                              Expected to have `output`.
 */
async function generateJsonReport(analysisResults, cliOptions = {}) {
  const outputDir = cliOptions.output || path.join(process.cwd(), 'git-qa-report');
  const reportFilename = 'report.json';
  const outputPath = path.join(outputDir, reportFilename);

  try {
    await fs.mkdir(outputDir, { recursive: true });

    const jsonContent = JSON.stringify(analysisResults, null, 2);

    await fs.writeFile(outputPath, jsonContent, 'utf-8');
    console.log(`JSON report saved to ${outputPath}`);

  } catch (error) {
    console.error(`Error generating JSON report: ${error.message}`);
  }
}

module.exports = {
  generateJsonReport,
};

