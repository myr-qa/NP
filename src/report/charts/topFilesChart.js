// Generates a bar chart for the top N most frequently changed files
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const path = require('path');
const fs = require('fs/promises');

const width = 800;
const height = 400;

/**
 * Generates a bar chart image for top changed files.
 * @param {Array<{file: string, count: number}>} topFiles - Array of top files and their change counts
 * @param {string} outputDir - Directory to save the chart image
 * @returns {Promise<string>} - Path to the generated chart image
 */
async function generateTopFilesChart(topFiles, outputDir) {
  if (!topFiles || topFiles.length === 0) return null;
  const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height });
  const labels = topFiles.map(f => f.file);
  const data = topFiles.map(f => f.count);

  const configuration = {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Most Frequently Changed Files',
        data,
        backgroundColor: 'rgba(255, 159, 64, 0.6)',
        borderColor: 'rgba(255, 159, 64, 1)',
        borderWidth: 1
      }]
    },
    options: {
      plugins: {
        title: {
          display: true,
          text: 'Top Changed Files'
        },
        legend: { display: false }
      },
      indexAxis: 'y',
      scales: {
        x: { title: { display: true, text: 'Changes' }, beginAtZero: true },
        y: { title: { display: true, text: 'File' } }
      }
    }
  };

  const buffer = await chartJSNodeCanvas.renderToBuffer(configuration);
  const chartPath = path.join(outputDir, 'top-files.png');
  await fs.writeFile(chartPath, buffer);
  return chartPath;
}

module.exports = { generateTopFilesChart };
