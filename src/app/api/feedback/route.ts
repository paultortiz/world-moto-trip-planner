import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import crypto from "crypto";
import fs from "fs";
import path from "path";

const GITHUB_OWNER = "paultortiz";
const GITHUB_REPO = "world-moto-trip-planner";
const PRIVATE_KEY_PATH = path.join(process.cwd(), "secrets", "github-app.pem");

type FeedbackType = "bug" | "feature";

interface FeedbackBody {
  type: FeedbackType;
  title: string;
  description: string;
}

/**
 * Creates a JWT for GitHub App authentication.
 */
function createGitHubAppJWT(appId: string, privateKey: string): string {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iat: now - 60, // Issued 60 seconds ago to account for clock drift
    exp: now + 600, // Expires in 10 minutes
    iss: appId,
  };

  const header = { alg: "RS256", typ: "JWT" };

  const base64Header = Buffer.from(JSON.stringify(header)).toString("base64url");
  const base64Payload = Buffer.from(JSON.stringify(payload)).toString("base64url");

  const signatureInput = `${base64Header}.${base64Payload}`;
  const signature = crypto
    .createSign("RSA-SHA256")
    .update(signatureInput)
    .sign(privateKey, "base64url");

  return `${signatureInput}.${signature}`;
}

/**
 * Gets an installation access token for the GitHub App.
 */
async function getInstallationToken(appId: string, privateKey: string, installationId: string): Promise<string> {
  const jwt = createGitHubAppJWT(appId, privateKey);

  const response = await fetch(
    `https://api.github.com/app/installations/${installationId}/access_tokens`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    console.error("Failed to get installation token:", response.status, error);
    throw new Error("Failed to authenticate with GitHub");
  }

  const data = await response.json();
  return data.token;
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as FeedbackBody;
    const { type, title, description } = body;

    if (!type || !["bug", "feature"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid feedback type. Must be 'bug' or 'feature'." },
        { status: 400 }
      );
    }

    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return NextResponse.json(
        { error: "Title is required." },
        { status: 400 }
      );
    }

    if (!description || typeof description !== "string" || description.trim().length === 0) {
      return NextResponse.json(
        { error: "Description is required." },
        { status: 400 }
      );
    }

    const appId = process.env.GITHUB_APP_ID;
    const installationId = process.env.GITHUB_APP_INSTALLATION_ID;

    // Load private key: prefer local file (dev), fall back to env var (Vercel)
    let privateKey: string | undefined;
    if (fs.existsSync(PRIVATE_KEY_PATH)) {
      privateKey = fs.readFileSync(PRIVATE_KEY_PATH, "utf-8");
    } else if (process.env.GITHUB_APP_PRIVATE_KEY) {
      privateKey = process.env.GITHUB_APP_PRIVATE_KEY.replace(/\\n/g, "\n");
    }

    if (!appId || !privateKey || !installationId) {
      console.error("GitHub App credentials not configured");
      return NextResponse.json(
        { error: "Feedback submission is not configured. Please contact the administrator." },
        { status: 503 }
      );
    }

    const token = await getInstallationToken(appId, privateKey, installationId);

    const labels = type === "bug" ? ["bug"] : ["enhancement"];
    const issueTitle = type === "bug" ? `[Bug] ${title.trim()}` : `[Feature Request] ${title.trim()}`;
    const issueBody = `## Description
${description.trim()}

---
*Submitted by: ${session.user.email || "Anonymous user"}*
*Submitted via: World Moto Trip Planner feedback form*`;

    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        body: JSON.stringify({
          title: issueTitle,
          body: issueBody,
          labels,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("GitHub API error:", response.status, errorData);
      return NextResponse.json(
        { error: "Failed to submit feedback. Please try again later." },
        { status: 502 }
      );
    }

    const issue = await response.json();

    return NextResponse.json(
      {
        message: "Feedback submitted successfully!",
        issueNumber: issue.number,
        issueUrl: issue.html_url,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error submitting feedback:", error);
    return NextResponse.json(
      { error: "Failed to submit feedback." },
      { status: 500 }
    );
  }
}
