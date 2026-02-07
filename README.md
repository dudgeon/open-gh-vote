# Open GH Vote

A prototype for a GitHub-native topic voting system. Users submit topic proposals via GitHub Issues, vote using 👍 reactions, and a GitHub Actions workflow aggregates votes on a schedule. GitHub Pages serves a static leaderboard that displays topics ranked by a time-decay scoring algorithm.

## What This Proves

This POC validates the end-to-end mechanism for GitHub-native content prioritization:

1. **GitHub Actions cron scheduling** works and runs reliably on a timer
2. **GitHub API** can fetch issues with reaction counts using the built-in `GITHUB_TOKEN`
3. **An Actions workflow** can compute scores, write a JSON data file, and commit it back to the repo
4. **GitHub Pages** can serve a static site that reads this JSON and renders a ranked list
5. **The full loop**: user creates issue → user reacts with 👍 → cron fires → JSON updates → site reflects new ranking

## Architecture

```
┌─────────────┐     ┌──────────────────┐     ┌──────────────────┐
│ GitHub Issue │────▶│ GitHub Actions   │────▶│ docs/data/       │
│ + Reactions  │     │ (cron + events)  │     │ topics.json      │
└─────────────┘     └──────────────────┘     └────────┬─────────┘
                                                      │
                                                      ▼
                                               ┌─────────────┐
                                               │ GitHub Pages │
                                               │ (docs/)      │
                                               └─────────────┘
```

## How It Works

1. A user creates an issue using the **Propose a Topic** template (auto-labeled `topic-proposal`)
2. Community members add 👍 reactions to issues they support
3. A GitHub Actions workflow runs every 30 minutes (and on issue events), fetches all `topic-proposal` issues via the GitHub API, computes a time-decay score for each, and commits the results to `docs/data/topics.json`
4. GitHub Pages serves `docs/index.html`, which fetches the JSON and renders a ranked leaderboard

## Repository Structure

```
├── .github/
│   ├── ISSUE_TEMPLATE/
│   │   └── topic-proposal.yml        # Structured issue form (YAML format)
│   └── workflows/
│       └── aggregate-votes.yml        # Actions workflow (cron + event triggers)
├── scripts/
│   └── aggregate-topics.js            # Aggregation script (zero npm dependencies)
├── docs/                              # GitHub Pages source (served from /docs)
│   ├── index.html                     # Single-page leaderboard UI
│   └── data/
│       └── topics.json                # Generated output (committed by Actions)
├── CLAUDE.md                          # Project context for AI assistants
└── README.md                          # This file
```

## Scoring Algorithm

Topics are ranked using a time-decay formula inspired by Hacker News:

```
score = (thumbsUp + 1) / (hoursAge + 2) ^ 1.2
```

- `thumbsUp` = number of 👍 reactions on the issue
- `hoursAge` = hours since the issue was created
- `+ 1` in the numerator ensures zero-vote issues still appear (just ranked lower)
- `+ 2` in the denominator prevents division by zero and dampens very new issues
- Gravity of `1.2` provides moderate decay — a week-old issue needs roughly 3x the votes of a new issue to rank equally

Only 👍 reactions are counted for the POC.

## Setup

### Step 1: Create the `topic-proposal` Label

The issue template auto-applies this label, but the label **must exist** before any issues are created.

Go to **Issues → Labels** and create a label named exactly `topic-proposal`.

Direct URL: `https://github.com/{owner}/{repo}/labels`

### Step 2: Enable GitHub Pages

Go to **Settings → Pages**:
- **Source:** Deploy from a branch
- **Branch:** `main`
- **Folder:** `/docs`
- Click **Save**

The site will be available at `https://{owner}.github.io/{repo}/` within a minute or two.

### Step 3: Enable Actions (if needed)

Actions should be enabled by default on new repos. Verify by going to the **Actions** tab. If you see a prompt to enable workflows, approve it.

### Step 4: Verify the Workflow

Trigger the workflow manually to validate it works before waiting for the cron:

1. Go to the **Actions** tab
2. Select the **Aggregate Topic Votes** workflow
3. Click **Run workflow** → **Run workflow** (the `workflow_dispatch` trigger)
4. Watch it run — it should complete in under 30 seconds
5. Check that `docs/data/topics.json` was created/updated in the repo

## Testing

### End-to-End Test

1. Create a new issue using the "Propose a Topic" template
2. Add a 👍 reaction to the issue
3. Trigger the workflow manually (or wait for the 30-minute cron)
4. Visit the GitHub Pages site and verify the topic appears with the correct vote count
5. Add more reactions, re-trigger, verify the score and ranking update

### Local Development

No build step. All files are static or run directly via Node.js.

**Test the aggregation script locally:**
```bash
GITHUB_TOKEN=<personal-access-token> GITHUB_REPOSITORY=owner/repo node scripts/aggregate-topics.js
```

**Test the HTML locally** (requires a web server since `fetch` doesn't work from `file://`):
```bash
cd docs && python3 -m http.server 8000
# Then visit http://localhost:8000
```
(Requires `docs/data/topics.json` to exist — run the aggregation script first.)

## Design Constraints

- **Zero external dependencies**: The aggregation script uses only Node.js built-ins (`https`, `fs`, `path`). No `package.json`, no `npm install`.
- **First-party Actions only**: Only `actions/checkout@v4` and `actions/setup-node@v4` are used — both owned by the GitHub `actions` org.
- **No external API calls**: Everything uses `api.github.com` via the auto-provided `GITHUB_TOKEN`.
- **Self-contained Pages directory**: JSON output goes to `docs/data/topics.json` so the HTML at `docs/index.html` can fetch it via a relative path.
- **`[skip ci]` on auto-commits**: Prevents the workflow's own commits from re-triggering workflows.

## Enterprise Migration Checklist

Before cloning to an enterprise org, verify:

- [ ] `actions/checkout@v4` and `actions/setup-node@v4` are allowed (first-party GitHub Actions)
- [ ] No external API calls — only `api.github.com` via `GITHUB_TOKEN`
- [ ] No npm dependencies — script uses only Node.js built-ins
- [ ] GitHub Pages is enabled for the enterprise org (some orgs restrict this)
- [ ] Issue templates work on GitHub Enterprise Cloud (standard feature)

**Fallback if Actions are restricted:** Replace `actions/checkout` with bare `git` commands in a `run:` step, and rely on the pre-installed Node.js on `ubuntu-latest` instead of `actions/setup-node`.

## Success Criteria

The prototype is successful if:

1. The cron-triggered workflow runs automatically on schedule
2. The event-triggered workflow runs when issues are opened
3. `docs/data/topics.json` is correctly generated and committed
4. The GitHub Pages site loads and displays ranked topics
5. Vote counts (👍 reactions) are accurately reflected in the JSON and UI
6. The scoring algorithm produces sensible rankings (more votes + recency = higher rank)
7. The full loop works: propose → vote → aggregate → display
8. All of the above works without any external services or dependencies beyond GitHub

## Live Site

Once GitHub Pages is enabled, the leaderboard is available at:

```
https://{owner}.github.io/{repo}/
```
