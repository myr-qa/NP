# Git Quality Analyzer (git-qa)

A command-line tool to analyze Git repositories for commit patterns, focusing on fixes, hotfixes, and other development workflow insights.

## Features

- Analyze commit history for fix/hotfix/bugfix patterns
- Identify frequently changed (affected) files
- Visualize commit and fix/hotfix trends over time
- Calculate defect-fix rates and top changed files
- Generate static HTML reports with interactive charts (Chart.js)
- Export results as CSV, JSON, or text
- Console summary output for quick insights

## Installation

### For development

1. Clone the repository.
2. Navigate to the project directory.
3. Run `npm install` to install dependencies.
4. Run `npm link` to make the `git-qa` command available globally.

### Global installation (once published or from a local tarball)

```bash
npm install -g .
```

(Or `npm install -g <package-name>` if published)

## Usage

The primary command is `analyze`, which scans the Git history of the current directory.

```bash
git-qa analyze [options]
```

### Examples

Analyze the current branch for commits in the last month, outputting an HTML report:

```bash
git-qa analyze --since="1 month ago" --format="html"
```

Analyze specific branches for commits by certain authors, outputting to a custom directory in CSV format:

```bash
git-qa analyze --branches="main,develop" --authors="user1@example.com,user2" --output="./reports" --format="csv" --verbose
```

## Commands and Options

You can view all available commands and options by running:

```bash
git-qa --help
```

or for a specific command:

```bash
git-qa analyze --help
```

### `analyze` command options

- `-b, --branches <branches>`: Branches to analyze (comma-separated, default: current branch)
- `-s, --since <date>`: Analyze commits after date (e.g., '2023-01-01' or '3 months ago')
- `-u, --until <date>`: Analyze commits before date
- `-a, --authors <authors>`: Filter by authors (comma-separated)
- `-k, --keywords <words>`: Custom fix/hotfix keywords (comma-separated, overrides defaults like 'fix', 'hotfix', 'bugfix')
- `-o, --output <dir>`: Output directory for reports (default: ./git-qa-report)
- `-f, --format <format>`: Output format (html, csv, json, text) (default: html)
- `-v, --verbose`: Verbose output (e.g., lists commits found with keywords to console)
- `-h, --help`: Display help for command

## Output & Reports

- **HTML Report**: Includes executive summary, commit/fix trends, affected files, defect-fix rates, and interactive charts (commit frequency, top files, fix/hotfix trends, defect-fix pie chart).
- **CSV/JSON/Text**: Export raw and summary data for further analysis.
- **Console**: Quick summary of key metrics and findings.

## Project Structure

See `architecture.md` for a detailed breakdown. Key folders:

- `bin/` - CLI entry point
- `src/lib/git/` - Git operations
- `src/lib/analysis/` - Commit and pattern analysis
- `src/report/` - Report generation and chart rendering
- `src/report/templates/` - Handlebars templates for HTML/text reports
- `test/` - Unit and integration tests

## Testing

- Run `npm test` to execute Jest-based unit tests for core analysis and git modules.
- Integration tests validate end-to-end CLI usage and report generation.

## Contributing

Pull requests and issues are welcome! Please see `architecture.md` and `tasks.md` for project structure and open tasks.

## License

ISC

