const fs = require('fs/promises');
const path = require('path');
const { log } = require('../lib/utils/logger');

/**
 * Escapes a field for CSV format.
 * If the field contains a comma, newline, or double quote, it's enclosed in double quotes.
 * Existing double quotes within the field are doubled.
 * @param {string | number | Date} field - The field to escape.
 * @returns {string} The CSV-escaped string.
 */
function escapeCsvField(field) {
  if (field === null || typeof field === 'undefined') {
    return '';
  }
  const stringField = String(field);
  // Regex to check if field needs quoting (contains comma, newline, or double quote)
  if (/[,"\n]/.test(stringField)) {
    // Enclose in double quotes and double up existing double quotes
    return `"${stringField.replace(/"/g, '""')}"`;
  }
  return stringField;
}

/**
 * Generates a CSV report from analysis results and saves it to a file.
 *
 * @param {object} analysisResults - The results from the analyzeCommits function.
 *                                   Expected to have `commitsWithKeywords`.
 * @param {object} cliOptions - The command-line options object.
 *                              Expected to have `output`.
 */
async function generateCsvReport(analysisResults, cliOptions = {}) {
  const outputDir = cliOptions.output || path.join(process.cwd(), 'git-qa-report');
  const reportFilename = 'report.csv';
  const outputPath = path.join(outputDir, reportFilename);

  try {
    await fs.mkdir(outputDir, { recursive: true });

    const csvHeader = 'Hash,Author,Date,Message,KeywordsFound,CommitFrequency,DefectFixRate';
    const rows = analysisResults.commitsWithKeywords.map(commit => {
      const keywords = commit.keywordsFound.join('; '); // Join keywords with semicolon or other suitable delimiter
      return [
        escapeCsvField(commit.hash),
        escapeCsvField(commit.author),
        escapeCsvField(commit.date),
        escapeCsvField(commit.subject), // Use 'subject' instead of 'message'
        escapeCsvField(keywords),
        escapeCsvField(commit.commitFrequency), // Added commit frequency
        escapeCsvField(commit.defectFixRate),   // Added defect-fix rate
      ].join(',');
    });

    const csvContent = [csvHeader, ...rows].join('\n');

    await fs.writeFile(outputPath, csvContent, 'utf-8');
    log(`CSV report saved to ${outputPath}`);

  } catch (error) {
    console.error(`Error generating CSV report: ${error.message}`);
  }
}

module.exports = {
  generateCsvReport,
};

