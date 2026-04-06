const GITHUB_TOKEN = import.meta.env.VITE_GITHUB_TOKEN;
const GITHUB_OWNER = import.meta.env.VITE_GITHUB_OWNER;
const GITHUB_REPO = import.meta.env.VITE_GITHUB_REPO;

export async function readIssues() {
  const response = await fetch(
    `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues?state=open`,
    {
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github.v3+json",
      },
    },
  );

  if (!response.ok) {
    throw new Error("Failed to fetch issues from GitHub");
  }

  return response.json();
}

export function parseBody(body: string) {
  try {
    const jsonMatch = body.match(/```json\s*([\s\S]*?)\s*```/) || [null, body];
    let jsonStr = jsonMatch[1].trim();

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
