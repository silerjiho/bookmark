const GITHUB_TOKEN = import.meta.env.VITE_GITHUB_TOKEN;
const GITHUB_OWNER = import.meta.env.VITE_GITHUB_OWNER;
const GITHUB_REPO = import.meta.env.VITE_GITHUB_REPO;

const HEADERS = {
  Authorization: `Bearer ${GITHUB_TOKEN}`,
  Accept: "application/vnd.github.v3+json",
  "Content-Type": "application/json",
};

const API = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}`;

export interface GitHubIssue {
  number: number;
  body: string | null;
}

export async function readIssues(): Promise<GitHubIssue[]> {
  const response = await fetch(`${API}/issues?state=open&per_page=100`, {
    headers: HEADERS,
  });
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

export interface CreateIssueOptions {
  title: string;
  body: string;
  labels?: string[];
  milestone?: number;
}

export async function createIssue(opts: CreateIssueOptions) {
  const response = await fetch(`${API}/issues`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({
      title: opts.title,
      body: opts.body,
      labels: opts.labels,
      milestone: opts.milestone,
    }),
  });
  if (!response.ok) throw new Error("Failed to create issue");
  return response.json();
}

export async function updateIssue(issueNumber: number, body: string) {
  const response = await fetch(`${API}/issues/${issueNumber}`, {
    method: "PATCH",
    headers: HEADERS,
    body: JSON.stringify({ body }),
  });
  if (!response.ok) throw new Error("Failed to update issue");
  return response.json();
}

export async function updateIssueMilestone(issueNumber: number, milestone: number) {
  const response = await fetch(`${API}/issues/${issueNumber}`, {
    method: "PATCH",
    headers: HEADERS,
    body: JSON.stringify({ milestone }),
  });
  if (!response.ok) throw new Error("Failed to update issue milestone");
  return response.json();
}

export async function closeIssue(issueNumber: number) {
  const response = await fetch(`${API}/issues/${issueNumber}`, {
    method: "PATCH",
    headers: HEADERS,
    body: JSON.stringify({ state: "closed" }),
  });
  if (!response.ok) throw new Error("Failed to close issue");
  return response.json();
}

export async function createIssueComment(issueNumber: number, body: string) {
  const response = await fetch(`${API}/issues/${issueNumber}/comments`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({ body }),
  });
  if (!response.ok) throw new Error("Failed to create issue comment");
  return response.json();
}

const labelCache = new Set<string>();

/** Idempotently ensure a label exists on the repo. Caches successful creations/lookups. */
export async function ensureLabel(name: string, color = "ededed"): Promise<void> {
  if (labelCache.has(name)) return;

  const createRes = await fetch(`${API}/labels`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({ name, color }),
  });
  if (createRes.ok || createRes.status === 422) {
    labelCache.add(name);
    return;
  }
  throw new Error(`Failed to ensure label "${name}"`);
}

const milestoneCache = new Map<string, number>();
let milestonesBootstrapped = false;

async function listMilestones(): Promise<{ number: number; title: string }[]> {
  const res = await fetch(`${API}/milestones?state=all&per_page=100`, {
    headers: HEADERS,
  });
  if (!res.ok) throw new Error("Failed to list milestones");
  return res.json();
}

/** Idempotently ensure a milestone with the given title exists. Returns its number. */
export async function ensureMilestone(title: string): Promise<number> {
  const cached = milestoneCache.get(title);
  if (cached != null) return cached;

  if (!milestonesBootstrapped) {
    const list = await listMilestones();
    for (const m of list) milestoneCache.set(m.title, m.number);
    milestonesBootstrapped = true;
    const found = milestoneCache.get(title);
    if (found != null) return found;
  }

  const createRes = await fetch(`${API}/milestones`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({ title }),
  });
  if (createRes.ok) {
    const m: { number: number; title: string } = await createRes.json();
    milestoneCache.set(m.title, m.number);
    return m.number;
  }
  if (createRes.status === 422) {
    const list = await listMilestones();
    for (const m of list) milestoneCache.set(m.title, m.number);
    const found = milestoneCache.get(title);
    if (found != null) return found;
  }
  throw new Error(`Failed to ensure milestone "${title}"`);
}
