const { execSync } = require('child_process');
const { findKeywordsInMessage } = require('./keywords');
const { log } = require('../utils/logger');

const DEFAULT_KEYWORDS = ['fix', 'hotfix', 'bugfix', 'resolve', 'patch'];

/**
 * Analyzes an array of commit objects to find commits containing specified keywords.
 *
 * @param {Array<object>} commits - An array of commit objects (from simple-git log).
 *                                  Each commit object is expected to have at least:
 *                                  `hash`, `subject` (commit message), `author_name`, `date`.
 * @param {string} [cliKeywords] - A comma-separated string of keywords from CLI options.
 * @returns {Promise<object>} An object containing analysis results:
 *                            {
 *                              totalCommits: number,
 *                              commitsWithKeywords: Array<object>,
 *                              keywordCounts: object
 *                            }
 */
async function analyzeCommits(commits) {
  const analysisResults = {
    totalCommits: Array.isArray(commits) ? commits.length : 0,
    commitsWithKeywords: [],
    keywordCounts: { fix: 0, hotfix: 0, bugfix: 0, resolve: 0, patch: 0 },
    topFixFiles: {},
    fixTrend: {},
    dailyCommitCounts: {},
    defectFixRate: 0,
  };

  // Ensure commits is an array
  if (!Array.isArray(commits)) {
    log('DEBUG: Invalid commits input:', commits);
    return {
      ...analysisResults,
      topFixFiles: [],
    };
  }

  const isWordMatch = (text, word) => {
    const regex = new RegExp(`\\b${word}\\b`, 'i');
    return regex.test(text);
  };

  for (const commit of commits) {
    // Use commit.message as fallback if subject is missing
    const commitSubject = commit.subject || commit.message || '';

    const isFix = isFixCommit(commitSubject);

    if (isFix) {
      analysisResults.commitsWithKeywords.push(commit);

      // Count keywords using word boundary matching
      const foundKeywords = new Set();
      for (const keyword of Object.keys(analysisResults.keywordCounts)) {
        if (isWordMatch(commitSubject, keyword)) {
          if (!foundKeywords.has(keyword)) {
            analysisResults.keywordCounts[keyword]++;
            foundKeywords.add(keyword);
          }
        }
      }

      // Populate keywordsFound for each commit
      commit.keywordsFound = Array.from(foundKeywords);

      // Track fix trend by date
      const date = commit.date && !isNaN(new Date(commit.date))
        ? new Date(commit.date).toISOString().split('T')[0]
        : 'unknown';
      analysisResults.fixTrend[date] = (analysisResults.fixTrend[date] || 0) + 1;

      // Count affected files
      for (const file of commit.files || []) {
        analysisResults.topFixFiles[file] = (analysisResults.topFixFiles[file] || 0) + 1;
      }
    }

    // Count daily commits
    const commitDate = commit.date && !isNaN(new Date(commit.date))
      ? new Date(commit.date).toISOString().split('T')[0]
      : 'unknown';
    analysisResults.dailyCommitCounts[commitDate] = (analysisResults.dailyCommitCounts[commitDate] || 0) + 1;
  }

  // Convert topFixFiles to sorted array
  analysisResults.topFixFiles = Object.entries(analysisResults.topFixFiles)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([file, count]) => ({ file, count }));

  // Calculate defect-fix rate
  const totalFixCommits = analysisResults.commitsWithKeywords.length;
  analysisResults.defectFixRate = totalFixCommits > 0
    ? (totalFixCommits / analysisResults.totalCommits) * 100
    : 0;

  return analysisResults;
}

function isFixCommit(message) {
  if (!message) {
    log('DEBUG: Commit message is undefined or null:', message);
    return false;
  }

  const isWordMatch = (text, word) => {
    const regex = new RegExp(`\\b${word}\\b`, 'i');
    return regex.test(text);
  };

  const lowerMessage = message.toLowerCase();
  return (
    isWordMatch(lowerMessage, 'fix') ||
    isWordMatch(lowerMessage, 'hotfix') ||
    isWordMatch(lowerMessage, 'bugfix') ||
    isWordMatch(lowerMessage, 'resolve') ||
    isWordMatch(lowerMessage, 'patch')
  );
}

/**
 * Analyze hotfix merges and aggregate affected files.
 * @param {Array<{hash: string, parents: string[], message: string, files: string[]}>} masterMerges
 * @returns {Object} { hotfixFiles: { [file: string]: number }, hotfixCommits: Array, topHotfixFiles: Array }
 */
function analyzeHotfixFiles(masterMerges) {
  const hotfixFiles = {};
  const hotfixCommits = [];
  for (const merge of masterMerges) {
    // Heuristic: hotfix if message contains 'hotfix', '{fix}', or branch is not develop
    const msg = merge.message.toLowerCase();
    const isHotfix = msg.includes('hotfix') || msg.includes('{fix}') || (msg.includes('from') && !msg.includes('from develop'));
    if (isHotfix && Array.isArray(merge.files)) {
      hotfixCommits.push(merge);
      for (const file of merge.files) {
        if (!hotfixFiles[file]) hotfixFiles[file] = 0;
        hotfixFiles[file]++;
      }
    }
  }
  // Top 10 files
  const topHotfixFiles = Object.entries(hotfixFiles)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([file, count]) => ({ file, count }));
  return { hotfixFiles, hotfixCommits, topHotfixFiles };
}

/**
 * Analyze and report files most frequently affected by hotfix merges into master.
 * @param {string} targetBranch - The branch to analyze (default: 'master')
 * @returns {Promise<{ topHotfixFiles: Array, hotfixFiles: Object, hotfixCommits: Array }>} 
 */
async function analyzeHotfixFilesAuto(targetBranch = 'remotes/origin/master') {
  const { getClassifiedMerges } = require('../git/log');
  const merges = await getClassifiedMerges(targetBranch);
  const hotfixMerges = merges.filter(m => m.type === 'hotfix');
  const hotfixFiles = {};
  for (const merge of hotfixMerges) {
    for (const file of merge.files) {
      if (!hotfixFiles[file]) hotfixFiles[file] = 0;
      hotfixFiles[file]++;
    }
  }
  const topHotfixFiles = Object.entries(hotfixFiles)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([file, count]) => ({ file, count }));
  return { topHotfixFiles, hotfixFiles, hotfixCommits: hotfixMerges };
}

module.exports = {
  analyzeCommits,
  analyzeHotfixFiles,
  analyzeHotfixFilesAuto,
};

