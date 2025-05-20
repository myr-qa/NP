// Generates a commit frequency bar chart using chartjs-node-canvas
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const path = require('path');
const fs = require('fs/promises');

const width = 800;
const height = 400;

/**
 * Generates a bar chart image for commit frequency by date.
 * @param {Object} commitFrequency - { [date: string]: number }
 * @param {string} outputDir - Directory to save the chart image
 * @returns {Promise<string>} - Path to the generated chart image
 */
async function generateCommitFrequencyChart(commitFrequency, outputDir) {
  const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height });
  const labels = Object.keys(commitFrequency);
  const data = Object.values(commitFrequency);
  console.log('DEBUG: Chart labels:', labels);
  console.log('DEBUG: Chart data:', data);

  // If all values are zero or empty, add a dummy value to avoid empty chart
  const hasData = data.some(v => v > 0);
  const chartData = hasData ? data : [0];
  const chartLabels = hasData ? labels : ['No Data'];

  const configuration = {
    type: 'bar',
    data: {
      labels: chartLabels,
      datasets: [{
        label: 'Commits per Day',
        data: chartData,
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1
      }]
    },
    options: {
      plugins: {
        title: {
          display: true,
          text: 'Commit Frequency by Date'
        },
        legend: {
          display: true
        }
      },
      scales: {
        x: { title: { display: true, text: 'Date' } },
        y: { title: { display: true, text: 'Commits' }, beginAtZero: true, suggestedMax: Math.max(...chartData, 1) }
      }
    }
  };

  const buffer = await chartJSNodeCanvas.renderToBuffer(configuration);
  const chartPath = path.join(outputDir, 'commit-frequency.png');
  await fs.writeFile(chartPath, buffer);
  return chartPath;
}

module.exports = { generateCommitFrequencyChart };
