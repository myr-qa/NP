const fs = require('fs/promises');
const path = require('path');
const handlebars = require('handlebars');
const { generateCommitFrequencyChart } = require('./charts/commitFrequencyChart');
const { generateTopFilesChart } = require('./charts/topFilesChart');
const { generateFixTrendChart } = require('./charts/fixTrendChart');
const { generateFixRatePieChart } = require('./charts/fixRatePieChart');

/**
 * Generates an HTML report from analysis results and saves it to a file.
 *
 * @param {object} analysisResults - The results from the analyzeCommits function.
 * @param {object} cliOptions - The command-line options object from Commander.js.
 *                              Expected to have `output` and `format`.
 */
async function generateHtmlReport(analysisResults, cliOptions = {}) {
  const outputDir = cliOptions.output || path.join(process.cwd(), 'git-qa-report');
  const reportFilename = 'report.html';
  const outputPath = path.join(outputDir, reportFilename);

  try {
    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true });

    // Generate commit frequency chart if data is available
    let chartImageRelPath = null;
    if (analysisResults.commitFrequency) {
      const chartPath = await generateCommitFrequencyChart(analysisResults.commitFrequency, outputDir);
      chartImageRelPath = path.basename(chartPath); // relative to outputDir
    }

    // Generate additional charts
    let topFilesChartRelPath = null;
    if (analysisResults.topFiles && analysisResults.topFiles.length > 0) {
      const chartPath = await generateTopFilesChart(analysisResults.topFiles, outputDir);
      topFilesChartRelPath = path.basename(chartPath);
    }
    let fixTrendChartRelPath = null;
    if (analysisResults.fixTrend && Object.keys(analysisResults.fixTrend).length > 0) {
      const chartPath = await generateFixTrendChart(analysisResults.fixTrend, outputDir);
      fixTrendChartRelPath = path.basename(chartPath);
    }
    let fixRatePieChartRelPath = null;
    if (typeof analysisResults.commitsWithKeywords?.length === 'number' && typeof analysisResults.totalCommits === 'number') {
      const chartPath = await generateFixRatePieChart(
        analysisResults.commitsWithKeywords.length,
        analysisResults.totalCommits,
        outputDir
      );
      fixRatePieChartRelPath = path.basename(chartPath);
    }

    // Read the Handlebars template
    const templatePath = path.join(__dirname, 'templates', 'html', 'report.hbs');
    const templateContent = await fs.readFile(templatePath, 'utf-8');

    // Compile the template
    const compiledTemplate = handlebars.compile(templateContent);
    // Create a deep copy of analysisResults to avoid modifying the original object
    // A simple structuredClone is available in Node.js v17+
    // For broader compatibility, a common approach is JSON.parse(JSON.stringify(obj))
    // but be aware of its limitations (e.g., loses Date objects, functions, undefined).
    // Given our data structure, this should be acceptable.
    const processedData = JSON.parse(JSON.stringify(analysisResults));

    // Pre-process keywordsFound for the template
    if (processedData.commitsWithKeywords && Array.isArray(processedData.commitsWithKeywords)) {
      processedData.commitsWithKeywords.forEach(commit => {
        if (commit.keywordsFound && Array.isArray(commit.keywordsFound)) {
          commit.keywordsFoundString = commit.keywordsFound.join(', ');
        } else {
          commit.keywordsFoundString = 'N/A';
        }
      });
    }

    // Add chart image paths for the template
    processedData.commitFrequencyChart = chartImageRelPath;
    processedData.topFilesChart = topFilesChartRelPath;
    processedData.fixTrendChart = fixTrendChartRelPath;
    processedData.fixRatePieChart = fixRatePieChartRelPath;

    // Apply data to the template
    const htmlContent = compiledTemplate({ analysisResults: processedData });
    
    // Write the HTML content to the output file
    await fs.writeFile(outputPath, htmlContent, 'utf-8');
    console.log(`HTML report saved to ${outputPath}`);

  } catch (error) {
    console.error(`Error generating HTML report: ${error.message}`);
    // console.error(error.stack); // For more detailed debugging if needed
  }
}

module.exports = {
  generateHtmlReport,
};

