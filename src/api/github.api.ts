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

/** 저장소의 열린 이슈 목록을 가져옵니다(최대 100건). */
export async function readIssues(): Promise<GitHubIssue[]> {
  const response = await fetch(`${API}/issues?state=open&per_page=100`, {
    headers: HEADERS,
  });
  if (!response.ok) throw new Error("Failed to fetch issues from GitHub");
  return response.json();
}

export interface CreateIssueOptions {
  title: string;
  body: string;
  labels?: string[];
  milestone?: number;
}

/** 새 이슈를 생성합니다. */
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

/** 이슈 본문을 갱신합니다. */
export async function updateIssue(issueNumber: number, body: string) {
  const response = await fetch(`${API}/issues/${issueNumber}`, {
    method: "PATCH",
    headers: HEADERS,
    body: JSON.stringify({ body }),
  });
  if (!response.ok) throw new Error("Failed to update issue");
  return response.json();
}

/** 이슈 제목만 변경합니다. */
export async function updateIssueTitle(issueNumber: number, title: string) {
  const response = await fetch(`${API}/issues/${issueNumber}`, {
    method: "PATCH",
    headers: HEADERS,
    body: JSON.stringify({ title }),
  });
  if (!response.ok) throw new Error("Failed to update issue title");
  return response.json();
}

/** 이슈에 연결된 마일스톤(세대)을 교체합니다. */
export async function updateIssueMilestone(issueNumber: number, milestone: number) {
  const response = await fetch(`${API}/issues/${issueNumber}`, {
    method: "PATCH",
    headers: HEADERS,
    body: JSON.stringify({ milestone }),
  });
  if (!response.ok) throw new Error("Failed to update issue milestone");
  return response.json();
}

/** 이슈의 라벨(타입)을 통째로 교체합니다. */
export async function updateIssueLabels(issueNumber: number, labels: string[]) {
  const response = await fetch(`${API}/issues/${issueNumber}/labels`, {
    method: "PUT",
    headers: HEADERS,
    body: JSON.stringify({ labels }),
  });
  if (!response.ok) throw new Error("Failed to update issue labels");
  return response.json();
}

/** 이슈를 닫습니다(놓아주기에 사용). */
export async function closeIssue(issueNumber: number) {
  const response = await fetch(`${API}/issues/${issueNumber}`, {
    method: "PATCH",
    headers: HEADERS,
    body: JSON.stringify({ state: "closed" }),
  });
  if (!response.ok) throw new Error("Failed to close issue");
  return response.json();
}

/** 이슈에 댓글을 답니다(축하 메시지 등). */
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

/** 라벨이 저장소에 없으면 생성합니다. 422(이미 존재) 응답은 성공으로 간주하고 캐시합니다. */
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

/** 동일 제목의 마일스톤이 없으면 생성하고, 있으면 그대로 사용합니다. number를 반환합니다. */
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
