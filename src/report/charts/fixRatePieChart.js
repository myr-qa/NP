// Generates a pie chart for defect-fix rate (fix/hotfix vs other commits)
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const path = require('path');
const fs = require('fs/promises');

const width = 400;
const height = 400;

/**
 * Generates a pie chart image for defect-fix rate.
 * @param {number} fixCount - Number of fix/hotfix commits
 * @param {number} totalCount - Total number of commits
 * @param {string} outputDir - Directory to save the chart image
 * @returns {Promise<string>} - Path to the generated chart image
 */
async function generateFixRatePieChart(fixCount, totalCount, outputDir) {
  if (totalCount === 0) return null;
  const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height });
  const data = [fixCount, totalCount - fixCount];
  const labels = ['Fix/Hotfix Commits', 'Other Commits'];

  const configuration = {
    type: 'pie',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: [
          'rgba(255, 99, 132, 0.7)',
          'rgba(54, 162, 235, 0.7)'
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)'
        ],
        borderWidth: 1
      }]
    },
    options: {
      plugins: {
        title: {
          display: true,
          text: 'Defect-Fix Rate'
        },
        legend: { display: true }
      }
    }
  };

  const buffer = await chartJSNodeCanvas.renderToBuffer(configuration);
  const chartPath = path.join(outputDir, 'fix-rate-pie.png');
  await fs.writeFile(chartPath, buffer);
  return chartPath;
}

module.exports = { generateFixRatePieChart };
