# Hot Files Logic Refactoring Guide

## Overview
Refactor the hot files analysis to improve performance by focusing on merge commits only and eliminating redundant fix detection logic.

## Current Problems
1. **Inefficient processing**: Analyzes ALL commits then filters
2. **Redundant logic**: Re-checks fix keywords on already-filtered commits
3. **Mixed concerns**: Single function handles both regular fixes and hotfixes
4. **Performance issues**: Processes individual commits instead of merge commits only

## New Architecture

### Core Functions to Create

#### 1. Get Merge Commits Only
```javascript
/**
 * Retrieves only merge commits from target branch for performance
 * @param {string} targetBranch - Branch to analyze (default: 'master')
 * @returns {Promise<Array>} Array of merge commit objects with files
 */
async function getMergeCommitsOnly(targetBranch = 'master') {
  const git = simpleGit();
  
  // Get merge commits with parent info
  const mergeLog = await git.raw([
    'log', '--merges', '--first-parent', targetBranch, 
    '--pretty=format:%H|%P|%s|%an|%ad'
  ]);

  const merges = mergeLog.split('\n').filter(Boolean).map(line => {
    const [hash, parents, message, author, date] = line.split('|');
    return { 
      hash, 
      parents: parents ? parents.split(' ') : [], 
      message: message || '',
      author_name: author,
      date 
    };
  });

  // Add files to each merge
  for (const merge of merges) {
    try {
      const diffResult = await git.raw([
        'diff', '--name-only', merge.parents[0], merge.parents[1]
      ]);
      merge.files = diffResult.split('\n').map(f => f.trim()).filter(f => f.length > 0);
    } catch {
      merge.files = [];
    }
  }

  return merges;
}
```

#### 2. Split Fix Types
```javascript
/**
 * Categorizes merge commits into regular fixes and hotfixes
 * @param {Array} mergeCommits - Array of merge commit objects
 * @returns {Object} { fixMerges: Array, hotfixMerges: Array }
 */
function categorizeFixes(mergeCommits) {
  const fixMerges = [];
  const hotfixMerges = [];

  for (const merge of mergeCommits) {
    const msg = merge.message.toLowerCase();
    
    // Check if contains fix-related keywords
    const containsFix = /\b(fix|bugfix|resolve|patch)\b/i.test(msg);
    const containsHotfix = /\bhotfix\b/i.test(msg);
    
    if (containsHotfix) {
      hotfixMerges.push(merge);
    } else if (containsFix) {
      fixMerges.push(merge);
    }
  }

  return { fixMerges, hotfixMerges };
}
```

#### 3. Generate Top Files (Streamlined)
```javascript
/**
 * Creates top files list from pre-filtered fix merges
 * NO additional fix detection needed - these are already known fixes
 * @param {Array} fixMerges - Pre-filtered fix merge commits
 * @param {number} limit - Number of top files to return (default: 10)
 * @returns {Array} Top files with counts
 */
function getTopFilesFromMerges(fixMerges, limit = 10) {
  const fileCountMap = {};
  
  // Since these are pre-filtered, we know they're all fix-related
  for (const merge of fixMerges) {
    if (Array.isArray(merge.files)) {
      for (const file of merge.files) {
        fileCountMap[file] = (fileCountMap[file] || 0) + 1;
      }
    }
  }
  
  // Return sorted top files
  return Object.entries(fileCountMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([file, count]) => ({ file, count }));
}
```

#### 4. Main Orchestrator Function
```javascript
/**
 * Fast hot files analysis focusing on merge commits only
 * @param {string} targetBranch - Branch to analyze
 * @returns {Promise<Object>} Analysis results with separate fix/hotfix data
 */
async function analyzeHotFilesFast(targetBranch = 'master') {
  try {
    // 1. Get only merge commits (performance boost)
    const mergeCommits = await getMergeCommitsOnly(targetBranch);
    
    // 2. Split into categories (no redundant checking)
    const { fixMerges, hotfixMerges } = categorizeFixes(mergeCommits);
    
    // 3. Generate top files for each category
    const topFixFiles = getTopFilesFromMerges(fixMerges);
    const topHotfixFiles = getTopFilesFromMerges(hotfixMerges);
    
    return {
      totalMerges: mergeCommits.length,
      fixMerges: fixMerges.length,
      hotfixMerges: hotfixMerges.length,
      topFixFiles,
      topHotfixFiles,
      // Add raw data for further analysis if needed
      fixMergeCommits: fixMerges,
      hotfixMergeCommits: hotfixMerges
    };
    
  } catch (error) {
    log('ERROR: analyzeHotFilesFast failed:', error);
    return {
      totalMerges: 0,
      fixMerges: 0,
      hotfixMerges: 0,
      topFixFiles: [],
      topHotfixFiles: []
    };
  }
}
```

## Implementation Steps

### Step 1: Update engine.js
- Add the new functions above
- Keep existing functions for backward compatibility
- Export new `analyzeHotFilesFast` function

### Step 2: Update htmlReporter.js
- Modify template data preparation to handle both `topFixFiles` and `topHotfixFiles`
- Add chart generation for hotfix files separately

### Step 3: Update HTML Template
- Add separate sections for Fix Files vs Hotfix Files
- Create side-by-side comparison charts
- Add summary metrics (fix ratio vs hotfix ratio)

## Template Updates Needed

### Add to processedData in htmlReporter.js:
```javascript
// In generateHtmlReport function
if (analysisResults.topFixFiles) {
  processedData.topFixFiles = analysisResults.topFixFiles;
}
if (analysisResults.topHotfixFiles) {
  processedData.topHotfixFiles = analysisResults.topHotfixFiles;
}

// Add ratio calculations
if (analysisResults.fixMerges && analysisResults.hotfixMerges) {
  const totalFixRelated = analysisResults.fixMerges + analysisResults.hotfixMerges;
  processedData.fixToHotfixRatio = totalFixRelated > 0 
    ? (analysisResults.fixMerges / totalFixRelated) * 100 
    : 0;
}
```

### Add to HTML template:
```html
<!-- Add new section after existing File Analysis -->
<h2 class="section-header"><i class="bi bi-speedometer2"></i> Fix vs Hotfix Analysis</h2>
<div class="row">
  <div class="col-md-6">
    <div class="chart-container">
      <h5 class="mb-4">Regular Fix Files</h5>
      <div class="table-container">
        <table class="table table-hover">
          <thead class="table-primary">
            <tr><th>File</th><th>Fix Count</th></tr>
          </thead>
          <tbody>
            {{#each analysisResults.topFixFiles}}
              <tr>
                <td>{{this.file}}</td>
                <td><span class="badge bg-primary">{{this.count}}</span></td>
              </tr>
            {{/each}}
          </tbody>
        </table>
      </div>
    </div>
  </div>
  
  <div class="col-md-6">
    <div class="chart-container">
      <h5 class="mb-4">Hotfix Files (Urgent)</h5>
      <div class="table-container">
        <table class="table table-hover">
          <thead class="table-danger">
            <tr><th>File</th><th>Hotfix Count</th></tr>
          </thead>
          <tbody>
            {{#each analysisResults.topHotfixFiles}}
              <tr>
                <td>{{this.file}}</td>
                <td><span class="badge bg-danger">{{this.count}}</span></td>
              </tr>
            {{/each}}
          </tbody>
        </table>
      </div>
    </div>
  </div>
</div>
```

## Performance Benefits
1. **Faster Git Operations**: Only processes merge commits
2. **Eliminated Redundancy**: No re-checking of fix keywords
3. **Cleaner Logic**: Separate concerns for fix types
4. **Better Scalability**: Linear performance with merge count (not total commit count)

## Testing Recommendations
1. **Unit Tests**: Test `categorizeFixes()` with various merge message patterns
2. **Integration Tests**: Verify `getMergeCommitsOnly()` returns correct Git data
3. **Performance Tests**: Compare old vs new function execution times
4. **Edge Case Tests**: Handle empty repositories, no merge commits, malformed data

## Migration Path
1. Implement new functions alongside existing ones
2. Add feature flag to switch between old/new logic
3. Test thoroughly in development
4. Gradually migrate calling code
5. Remove old functions once confident in new implementation