# Open GH Vote

A prototype for GitHub-native topic voting. Users submit topic proposals via GitHub Issues, vote using 👍 reactions, and a GitHub Actions workflow aggregates votes on a schedule and writes a scored JSON file. GitHub Pages serves a static leaderboard that displays topics ranked by a time-decay scoring algorithm.

## How It Works

1. A user creates an issue using the **Propose a Topic** template
2. Community members add 👍 reactions to issues they support
3. A GitHub Actions workflow runs every 30 minutes (and on issue events), fetches all `topic-proposal` issues via the GitHub API, computes a time-decay score, and commits the results to `docs/data/topics.json`
4. GitHub Pages serves `docs/index.html`, which reads the JSON and renders a ranked leaderboard

## Repository Structure

```
├── .github/
│   ├── ISSUE_TEMPLATE/
│   │   └── topic-proposal.yml        # Structured issue template
│   └── workflows/
│       └── aggregate-votes.yml        # Actions workflow (cron + event triggers)
├── scripts/
│   └── aggregate-topics.js            # Aggregation script (zero dependencies)
├── docs/
│   ├── index.html                     # Leaderboard UI
│   └── data/
│       └── topics.json                # Generated output (committed by Actions)
└── README.md
```

## Setup

### 1. Create the `topic-proposal` label

Go to **Issues → Labels** and create a label named exactly `topic-proposal`.

### 2. Enable GitHub Pages

Go to **Settings → Pages**:
- **Source:** Deploy from a branch
- **Branch:** `main`
- **Folder:** `/docs`

### 3. Verify Actions

Go to the **Actions** tab, select the "Aggregate Topic Votes" workflow, and click **Run workflow** to trigger it manually.

## Testing

1. Create a new issue using the "Propose a Topic" template
2. Add a 👍 reaction to the issue
3. Trigger the workflow manually (or wait for the 30-minute cron)
4. Visit the GitHub Pages site to see updated rankings

## Live Site

Once GitHub Pages is enabled, the leaderboard is available at:

```
https://{owner}.github.io/{repo}/
```
