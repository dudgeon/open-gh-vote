# Open GH Vote

A lightweight POC for an open-source, fully GitHub-native leaderboard for idea submissions.
Users submit ideas via GitHub Issues, ideas appear on a leaderboard hosted on GitHub Pages,
and ideas are ranked by 👍 reactions using a time-decay scoring algorithm.

## Architecture

```
GitHub Issue + Reactions → GitHub Actions (cron + events) → docs/data/topics.json → GitHub Pages (docs/index.html)
```

- **Issue Template** (`.github/ISSUE_TEMPLATE/topic-proposal.yml`): Structured form for topic proposals, auto-labels `topic-proposal`
- **Actions Workflow** (`.github/workflows/aggregate-votes.yml`): Runs on cron (every 30min), issue events, and manual dispatch
- **Aggregation Script** (`scripts/aggregate-topics.js`): Fetches issues via GitHub API, computes time-decay scores, writes JSON
- **GitHub Pages** (`docs/index.html`): Single self-contained HTML file that renders the ranked leaderboard from JSON

## Key Design Decisions

- **Zero external dependencies**: Aggregation script uses only Node.js built-ins (https, fs, path). No package.json, no npm install.
- **GitHub Pages served from `/docs`**: JSON output goes to `docs/data/topics.json` so Pages can fetch it via relative path.
- **Scoring**: `(thumbsup + 1) / (hoursAge + 2)^1.2` — HN-style time decay. Higher votes + recency = higher rank.
- **Only 👍 reactions count** for the POC. Other reaction types are out of scope.

## Development

- No build step. All files are static or run directly via Node.js.
- To test the aggregation script locally: `GITHUB_TOKEN=<pat> GITHUB_REPOSITORY=owner/repo node scripts/aggregate-topics.js`
- The workflow auto-commits `docs/data/topics.json` with `[skip ci]` to avoid recursive triggers.

## Out-of-Scope Backlog

Items referenced but deferred beyond the POC:

- [ ] Visual design / polish
- [ ] Category filtering in the UI
- [ ] Search functionality
- [ ] Linking issues to published content
- [ ] Multiple reaction types (beyond 👍)
- [ ] API pagination (currently capped at 100 issues)
- [ ] UI pagination
- [ ] Authentication or user-specific views
- [ ] Mobile responsiveness
