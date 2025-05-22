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
    await fs.mkdir(outputDir, { recursive: true });

    // Generate charts
    let chartImageRelPath = null;
    if (analysisResults.commitFrequency) {
      const chartPath = await generateCommitFrequencyChart(analysisResults.commitFrequency, outputDir);
      chartImageRelPath = path.basename(chartPath);
    }
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
    let topFixFilesChartRelPath = null;
    if (analysisResults.topFixFiles && analysisResults.topFixFiles.length > 0) {
      const { generateTopFilesChart } = require('./charts/topFilesChart');
      const chartPath = await generateTopFilesChart(analysisResults.topFixFiles, outputDir);
      topFixFilesChartRelPath = path.basename(chartPath);
    }

    // Use improved template
    const templatePath = path.join(__dirname, 'templates', 'html', 'improved-report-template.html');
    const templateContent = await fs.readFile(templatePath, 'utf-8');
    
    // Register Handlebars helpers
    handlebars.registerHelper('gt', (a, b) => a > b);

    const compiledTemplate = handlebars.compile(templateContent);
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

    // Compute uniqueFilesCount
    processedData.uniqueFilesCount = processedData.fileChangeCounts ? Object.keys(processedData.fileChangeCounts).length : 0;

    // Compute hotfixPercentage
    const hotfixCommits = processedData.commitsWithKeywords ? processedData.commitsWithKeywords.filter(c => c.keywordsFound && c.keywordsFound.includes('hotfix')) : [];
    processedData.hotfixPercentage = processedData.commitsWithKeywords && processedData.commitsWithKeywords.length > 0
      ? (hotfixCommits.length / processedData.commitsWithKeywords.length) * 100
      : 0;

    // Compute hotspotConcentration (percentage of fixes in the top file)
    if (processedData.topFixFiles && processedData.topFixFiles.length > 0 && processedData.commitsWithKeywords && processedData.commitsWithKeywords.length > 0) {
      const topFileFixes = processedData.topFixFiles[0].count;
      processedData.hotspotConcentration = (topFileFixes / processedData.commitsWithKeywords.length) * 100;
    } else {
      processedData.hotspotConcentration = 0;
    }

    // Compute commitConsistency (stddev/mean of daily commit counts)
    if (processedData.commitFrequency && Object.values(processedData.commitFrequency).length > 1) {
      const counts = Object.values(processedData.commitFrequency);
      const mean = counts.reduce((a, b) => a + b, 0) / counts.length;
      const variance = counts.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (counts.length - 1);
      const stddev = Math.sqrt(variance);
      processedData.commitConsistency = mean > 0 ? (1 - (stddev / mean)) : 0;
    } else {
      processedData.commitConsistency = 0;
    }

    // Compute keywordPercentages for progress bars
    if (processedData.keywordCounts && processedData.commitsWithKeywords && processedData.commitsWithKeywords.length > 0) {
      processedData.keywordPercentages = {};
      const total = Object.values(processedData.keywordCounts).reduce((a, b) => a + b, 0);
      for (const [kw, count] of Object.entries(processedData.keywordCounts)) {
        processedData.keywordPercentages[kw] = total > 0 ? (count / total) * 100 : 0;
      }
    } else {
      processedData.keywordPercentages = {};
    }

    // Precompute percent/rounded values for template (no inline math in Handlebars!)
    // Handle defectFixRate and codeStability
    if (typeof processedData.defectFixRate === 'number') {
      processedData.defectFixRatePercent = Number(processedData.defectFixRate.toFixed(1));
      processedData.codeStabilityPercent = Number((100 - processedData.defectFixRate).toFixed(1));
    } else {
      processedData.defectFixRatePercent = 0;
      processedData.codeStabilityPercent = 100;
    }

    // Handle hotfix percentage
    if (processedData.commitsWithKeywords && processedData.commitsWithKeywords.length > 0) {
      const hotfixCount = processedData.keywordCounts?.hotfix || 0;
      const totalFixCount = processedData.commitsWithKeywords.length;
      processedData.hotfixPercentage = (hotfixCount / totalFixCount) * 100;
    } else {
      processedData.hotfixPercentage = 0;
    }
    processedData.hotfixPercentageRounded = Number(processedData.hotfixPercentage.toFixed(1));

    // Handle hotspot concentration
    if (processedData.commitsWithKeywords?.length > 0 && processedData.topFixFiles?.length > 0) {
      const topFileCount = processedData.topFixFiles[0].count;
      processedData.hotspotConcentration = (topFileCount / processedData.commitsWithKeywords.length) * 100;
    } else {
      processedData.hotspotConcentration = 0;
    }
    processedData.hotspotConcentrationRounded = Number(processedData.hotspotConcentration.toFixed(1));

    // Handle commit consistency
    if (typeof processedData.commitConsistency === 'number') {
      processedData.commitConsistencyRounded = Number(processedData.commitConsistency.toFixed(2));
    } else {
      processedData.commitConsistencyRounded = 0;
    }

    // Add chart image paths for the template
    processedData.commitFrequencyChart = chartImageRelPath;
    processedData.topFilesChart = topFilesChartRelPath;
    processedData.fixTrendChart = fixTrendChartRelPath;
    processedData.fixRatePieChart = fixRatePieChartRelPath;
    processedData.topFixFilesChart = topFixFilesChartRelPath;

    // Add topHotfixFiles if available
    if (analysisResults.topHotfixFiles) {
      processedData.topHotfixFiles = analysisResults.topHotfixFiles;
    }

    // Add repoName if available
    if (cliOptions.repoName) {
      processedData.repoName = cliOptions.repoName;
    } else {
      processedData.repoName = '';
    }

    // Apply data to the template
    const htmlContent = compiledTemplate({ analysisResults: processedData, ...processedData });
    await fs.writeFile(outputPath, htmlContent, 'utf-8');
    console.log(`HTML report saved to ${outputPath}`);
  } catch (error) {
    console.error(`Error generating HTML report: ${error.message}`);
  }
}

module.exports = {
  generateHtmlReport,
};

