// Generates a line chart for fix/hotfix commit trend over time
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const path = require('path');
const fs = require('fs/promises');

const width = 800;
const height = 400;

/**
 * Generates a line chart image for fix/hotfix commit trend by date.
 * @param {Object} fixTrend - { [date: string]: number }
 * @param {string} outputDir - Directory to save the chart image
 * @returns {Promise<string>} - Path to the generated chart image
 */
async function generateFixTrendChart(fixTrend, outputDir) {
  if (!fixTrend || Object.keys(fixTrend).length === 0) return null;
  const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height });
  const labels = Object.keys(fixTrend).sort();
  const data = labels.map(date => fixTrend[date]);

  const configuration = {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Fix/Hotfix Commits',
        data,
        fill: false,
        borderColor: 'rgba(75, 192, 192, 1)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.1
      }]
    },
    options: {
      plugins: {
        title: {
          display: true,
          text: 'Fix/Hotfix Commit Trend'
        },
        legend: { display: true }
      },
      scales: {
        x: { title: { display: true, text: 'Date' } },
        y: { title: { display: true, text: 'Fix/Hotfix Commits' }, beginAtZero: true }
      }
    }
  };

  const buffer = await chartJSNodeCanvas.renderToBuffer(configuration);
  const chartPath = path.join(outputDir, 'fix-trend.png');
  await fs.writeFile(chartPath, buffer);
  return chartPath;
}

module.exports = { generateFixTrendChart };
