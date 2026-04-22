const GITHUB_TOKEN = import.meta.env.VITE_GITHUB_TOKEN;
const GITHUB_OWNER = import.meta.env.VITE_GITHUB_OWNER;
const GITHUB_REPO = import.meta.env.VITE_GITHUB_REPO;

const HEADERS = {
  Authorization: `Bearer ${GITHUB_TOKEN}`,
  Accept: "application/vnd.github.v3+json",
  "Content-Type": "application/json",
};

export interface GitHubIssue {
  number: number;
  body: string | null;
}

export async function readIssues(): Promise<GitHubIssue[]> {
  const response = await fetch(
    `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues?state=open`,
    { headers: HEADERS },
  );
  if (!response.ok) throw new Error("Failed to fetch issues from GitHub");
  return response.json();
}

export function parseBody(body: string) {
  try {
    const jsonMatch = body.match(/```json\s*([\s\S]*?)\s*```/) || [null, body];
    const jsonStr = jsonMatch[1].trim();
    const cleanedJson = jsonStr
      .replace(/,+/g, ",")
      .replace(/,\s*}/g, "}")
      .replace(/,\s*\]/g, "]")
      .replace(/(\r\n|\n|\r)/gm, "")
      .trim();
    return JSON.parse(cleanedJson);
  } catch (e) {
    console.error("JSON Parsing Error:", e);
    throw new Error("Failed to parse issue body JSON");
  }
}

export async function createIssue(title: string, body: string) {
  const response = await fetch(
    `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues`,
    {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({ title, body }),
    },
  );
  if (!response.ok) throw new Error("Failed to create issue");
  return response.json();
}

export async function updateIssue(issueNumber: number, body: string) {
  const response = await fetch(
    `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues/${issueNumber}`,
    {
      method: "PATCH",
      headers: HEADERS,
      body: JSON.stringify({ body }),
    },
  );
  if (!response.ok) throw new Error("Failed to update issue");
  return response.json();
}

export async function closeIssue(issueNumber: number) {
  const response = await fetch(
    `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues/${issueNumber}`,
    {
      method: "PATCH",
      headers: HEADERS,
      body: JSON.stringify({ state: "closed" }),
    },
  );
  if (!response.ok) throw new Error("Failed to close issue");
  return response.json();
}
