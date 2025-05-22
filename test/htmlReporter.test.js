const { generateHtmlReport } = require('../src/report/htmlReporter');
const fs = require('fs/promises');
const path = require('path');
const handlebars = require('handlebars');

// Mock external dependencies
jest.mock('fs/promises');
jest.mock('handlebars', () => ({
  compile: jest.fn().mockReturnValue(() => '<html>mocked</html>'),
  registerHelper: jest.fn()
}));
jest.mock('../src/report/charts/commitFrequencyChart', () => ({
  generateCommitFrequencyChart: jest.fn().mockResolvedValue('mock-frequency-chart.png')
}));
jest.mock('../src/report/charts/topFilesChart', () => ({
  generateTopFilesChart: jest.fn().mockResolvedValue('mock-files-chart.png')
}));
jest.mock('../src/report/charts/fixTrendChart', () => ({
  generateFixTrendChart: jest.fn().mockResolvedValue('mock-trend-chart.png')
}));
jest.mock('../src/report/charts/fixRatePieChart', () => ({
  generateFixRatePieChart: jest.fn().mockResolvedValue('mock-pie-chart.png')
}));

describe('htmlReporter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fs.mkdir.mockResolvedValue(undefined);
    fs.writeFile.mockResolvedValue(undefined);
    fs.readFile.mockResolvedValue('{{mock-template}}');
    handlebars.registerHelper.mockImplementation(() => {});
  });

  describe('Calculation Tests', () => {
    beforeEach(() => {
      handlebars.compile.mockReturnValue((data) => JSON.stringify({ analysisResults: data.analysisResults }));
    });

    it('should calculate defect fix rate correctly', async () => {
      const mockAnalysisResults = {
        totalCommits: 100,
        commitsWithKeywords: [
          { hash: 'test1', subject: 'fix: bug', keywordsFound: ['fix'] },
          { hash: 'test2', subject: 'hotfix: urgent', keywordsFound: ['hotfix'] }
        ],
        defectFixRate: 8.6666666,
        keywordCounts: { fix: 1, hotfix: 1, bugfix: 0, resolve: 0, patch: 0 },
        topFixFiles: [{ file: 'test.js', count: 2 }]
      };

      await generateHtmlReport(mockAnalysisResults, { output: 'test-output' });
      const data = JSON.parse(fs.writeFile.mock.calls[0][1]);

      expect(data.analysisResults.defectFixRatePercent).toBe(8.7);
      expect(data.analysisResults.codeStabilityPercent).toBe(91.3);
    });

    it('should handle zero values correctly', async () => {
      const mockAnalysisResults = {
        totalCommits: 100,
        commitsWithKeywords: [],
        defectFixRate: 0,
        keywordCounts: { fix: 0, hotfix: 0, bugfix: 0, resolve: 0, patch: 0 },
        topFixFiles: []
      };

      await generateHtmlReport(mockAnalysisResults, { output: 'test-output' });
      const data = JSON.parse(fs.writeFile.mock.calls[0][1]);

      expect(data.analysisResults.defectFixRatePercent).toBe(0);
      expect(data.analysisResults.codeStabilityPercent).toBe(100);
      expect(data.analysisResults.hotfixPercentageRounded).toBe(0);
      expect(data.analysisResults.hotspotConcentrationRounded).toBe(0);
    });

    it('should handle missing values gracefully', async () => {
      const mockAnalysisResults = {
        totalCommits: 100,
        commitsWithKeywords: []
      };

      await generateHtmlReport(mockAnalysisResults, { output: 'test-output' });
      const data = JSON.parse(fs.writeFile.mock.calls[0][1]);

      expect(data.analysisResults.defectFixRatePercent).toBe(0);
      expect(data.analysisResults.codeStabilityPercent).toBe(100);
      expect(data.analysisResults.hotfixPercentageRounded).toBe(0);
      expect(data.analysisResults.hotspotConcentrationRounded).toBe(0);
    });

    it('should calculate hotfix percentages correctly', async () => {
      const mockAnalysisResults = {
        totalCommits: 100,
        commitsWithKeywords: [
          { hash: 'test1', subject: 'fix: bug', keywordsFound: ['fix'] },
          { hash: 'test2', subject: 'hotfix: urgent1', keywordsFound: ['hotfix'] },
          { hash: 'test3', subject: 'hotfix: urgent2', keywordsFound: ['hotfix'] }
        ],
        defectFixRate: 10,
        keywordCounts: { fix: 1, hotfix: 2, bugfix: 0, resolve: 0, patch: 0 },
        topFixFiles: [{ file: 'test.js', count: 2 }]
      };

      await generateHtmlReport(mockAnalysisResults, { output: 'test-output' });
      const data = JSON.parse(fs.writeFile.mock.calls[0][1]);

      expect(data.analysisResults.hotfixPercentageRounded).toBe(66.7);
    });

    it('should not multiply defect fix rate by 100 twice', async () => {
      const mockAnalysisResults = {
        totalCommits: 100,
        commitsWithKeywords: [
          { hash: 'test1', subject: 'fix: bug1', keywordsFound: ['fix'] },
          { hash: 'test2', subject: 'fix: bug2', keywordsFound: ['fix'] }
        ],
        defectFixRate: 8.68,
        keywordCounts: { fix: 2, hotfix: 0, bugfix: 0, resolve: 0, patch: 0 }
      };

      await generateHtmlReport(mockAnalysisResults, { output: 'test-output' });
      const data = JSON.parse(fs.writeFile.mock.calls[0][1]);

      expect(data.analysisResults.defectFixRatePercent).toBe(8.7);
      expect(data.analysisResults.codeStabilityPercent).toBe(91.3);
    });
  });

  describe('Chart Generation', () => {
    beforeEach(() => {
      handlebars.compile.mockReturnValue(() => '<html>mocked</html>');
    });

    it('should generate all required charts', async () => {
      const commitFrequencyChart = require('../src/report/charts/commitFrequencyChart');
      const topFilesChart = require('../src/report/charts/topFilesChart');
      const fixTrendChart = require('../src/report/charts/fixTrendChart');
      const fixRatePieChart = require('../src/report/charts/fixRatePieChart');

      const mockAnalysisResults = {
        commitFrequency: { '2024-01-01': 2, '2024-01-02': 3 },
        topFiles: [{ file: 'foo.js', count: 2 }],
        fixTrend: { '2024-01': 1 },
        commitsWithKeywords: [{ hash: 'a', keywordsFound: ['fix'] }],
        totalCommits: 10,
        topFixFiles: [{ file: 'foo.js', count: 2 }],
        keywordCounts: { fix: 1 }
      };

      await generateHtmlReport(mockAnalysisResults, { output: 'test-output' });

      expect(commitFrequencyChart.generateCommitFrequencyChart).toHaveBeenCalled();
      expect(topFilesChart.generateTopFilesChart).toHaveBeenCalled();
      expect(fixTrendChart.generateFixTrendChart).toHaveBeenCalled();
      expect(fixRatePieChart.generateFixRatePieChart).toHaveBeenCalled();
    });
  });

  describe('File Operations', () => {
    beforeEach(() => {
      handlebars.compile.mockReturnValue(() => '<html>mocked</html>');
    });

    it('should create output directory if it does not exist', async () => {
      const mockAnalysisResults = {
        totalCommits: 100,
        commitsWithKeywords: [],
        defectFixRate: 5
      };

      await generateHtmlReport(mockAnalysisResults, { output: path.join('test-output', 'nested', 'dir') });
      expect(fs.mkdir).toHaveBeenCalledWith(expect.stringContaining('test-output'), { recursive: true });
    });

    it('should render template with correct data', async () => {
      const mockAnalysisResults = {
        totalCommits: 100,
        commitsWithKeywords: [],
        defectFixRate: 5,
        keywordCounts: { fix: 0, hotfix: 0, bugfix: 0, resolve: 0, patch: 0 }
      };

      await generateHtmlReport(mockAnalysisResults, { output: 'test-output' });

      expect(handlebars.compile).toHaveBeenCalled();
      expect(fs.readFile).toHaveBeenCalled();
      
      const [filePath, content] = fs.writeFile.mock.calls[0];
      expect(filePath).toContain('test-output');
      expect(content).toBe('<html>mocked</html>');
    });
  });
});
