const https = require("https");
const fs = require("fs");
const path = require("path");

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY;

if (!GITHUB_TOKEN) {
  console.error("Error: GITHUB_TOKEN environment variable is not set.");
  process.exit(1);
}

if (!GITHUB_REPOSITORY) {
  console.error("Error: GITHUB_REPOSITORY environment variable is not set.");
  process.exit(1);
}

const [owner, repo] = GITHUB_REPOSITORY.split("/");

function fetchIssues() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "api.github.com",
      path: `/repos/${owner}/${repo}/issues?labels=topic-proposal&state=open&per_page=100`,
      method: "GET",
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "aggregate-topics-script",
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        if (res.statusCode !== 200) {
          reject(
            new Error(
              `GitHub API returned status ${res.statusCode}: ${data.slice(0, 500)}`
            )
          );
          return;
        }

        const linkHeader = res.headers["link"] || "";
        if (linkHeader.includes('rel="next"')) {
          console.warn(
            "Warning: Response contains 100 issues. There may be more issues that are not being fetched. Pagination support may be needed."
          );
        }

        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse API response: ${e.message}`));
        }
      });
    });

    req.on("error", reject);
    req.end();
  });
}

function computeScore(issue) {
  const hoursAge =
    (Date.now() - new Date(issue.created_at).getTime()) / (1000 * 60 * 60);
  const thumbsUp = issue.reactions["+1"] || 0;
  return (thumbsUp + 1) / Math.pow(hoursAge + 2, 1.2);
}

function extractCategory(labels) {
  const nonProposalLabels = labels
    .map((l) => l.name)
    .filter((name) => name !== "topic-proposal");
  return nonProposalLabels.length > 0 ? nonProposalLabels[0] : "Uncategorized";
}

function truncateDescription(body) {
  if (!body) return "";
  if (body.length <= 200) return body;
  return body.slice(0, 200) + "...";
}

async function main() {
  let issues;
  try {
    issues = await fetchIssues();
  } catch (err) {
    console.error(`Failed to fetch issues: ${err.message}`);
    process.exit(1);
  }

  // Filter out pull requests (the issues API can return PRs too)
  issues = issues.filter((issue) => !issue.pull_request);

  const topics = issues
    .map((issue) => ({
      id: issue.number,
      title: issue.title,
      description: truncateDescription(issue.body),
      url: issue.html_url,
      author: issue.user.login,
      category: extractCategory(issue.labels),
      created_at: issue.created_at,
      votes: issue.reactions["+1"] || 0,
      comment_count: issue.comments,
      score: parseFloat(computeScore(issue).toFixed(4)),
      labels: issue.labels.map((l) => l.name),
    }))
    .sort((a, b) => b.score - a.score);

  const output = {
    generated_at: new Date().toISOString(),
    total_topics: topics.length,
    topics,
  };

  const outputDir = path.join(__dirname, "..", "docs", "data");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, "topics.json");
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2) + "\n");

  if (topics.length > 0) {
    console.log(
      `Aggregated ${topics.length} topics. Top: '${topics[0].title}' (score: ${topics[0].score})`
    );
  } else {
    console.log("Aggregated 0 topics. No topic proposals found.");
  }
}

main();
