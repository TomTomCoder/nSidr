import { GitHubClient } from './github-client';

// Tool definitions (OpenAI function format) — used only for documentation/reference.
// Dispatch is handled by executeGitHubTool below.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const githubAgentTools: any[] = [
  {
    type: 'function',
    function: {
      name: 'create_issue',
      description: 'Create a new issue in a GitHub repository',
      parameters: {
        type: 'object' as const,
        properties: {
          repo: {
            type: 'string',
            description: 'Repository in format "owner/repo" (e.g. "octocat/Hello-World")',
          },
          title: {
            type: 'string',
            description: 'Issue title',
          },
          body: {
            type: 'string',
            description: 'Issue description/body',
          },
          labels: {
            type: 'array',
            items: { type: 'string' },
            description: 'Optional: Array of label names to assign',
          },
        },
        required: ['repo', 'title', 'body'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_pull_requests',
      description: 'List open pull requests in a GitHub repository',
      parameters: {
        type: 'object' as const,
        properties: {
          repo: {
            type: 'string',
            description: 'Repository in format "owner/repo" (e.g. "octocat/Hello-World")',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of pull requests to return (default: 20, max: 100)',
            default: 20,
          },
        },
        required: ['repo'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'add_comment',
      description: 'Add a comment to a GitHub issue or pull request',
      parameters: {
        type: 'object' as const,
        properties: {
          repo: {
            type: 'string',
            description: 'Repository in format "owner/repo" (e.g. "octocat/Hello-World")',
          },
          issue_number: {
            type: 'number',
            description: 'Issue or pull request number',
          },
          body: {
            type: 'string',
            description: 'Comment text',
          },
        },
        required: ['repo', 'issue_number', 'body'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_issue_details',
      description: 'Get detailed information about a GitHub issue or pull request',
      parameters: {
        type: 'object' as const,
        properties: {
          repo: {
            type: 'string',
            description: 'Repository in format "owner/repo" (e.g. "octocat/Hello-World")',
          },
          issue_number: {
            type: 'number',
            description: 'Issue or pull request number',
          },
        },
        required: ['repo', 'issue_number'],
      },
    },
  },
];

export async function executeGitHubTool(
  toolName: string,
  toolInput: Record<string, unknown>,
  agentId: string,
  gitHubClient: GitHubClient,
  userId?: string
): Promise<unknown> {
  // Parse repo format "owner/repo"
  const parseRepo = (repoStr: string): { owner: string; repo: string } => {
    const parts = repoStr.split('/');
    if (parts.length !== 2) {
      throw new Error(`Invalid repo format. Use "owner/repo" (e.g. "octocat/Hello-World")`);
    }
    return { owner: parts[0], repo: parts[1] };
  };

  switch (toolName) {
    case 'create_issue': {
      const { repo, title, body, labels } = toolInput as {
        repo: string;
        title: string;
        body: string;
        labels?: string[];
      };
      const { owner, repo: repoName } = parseRepo(repo);

      const issue = await gitHubClient.createIssue(
        agentId,
        owner,
        repoName,
        title,
        body,
        labels,
        userId
      );
      return {
        success: true,
        issueNumber: issue.number,
        issueId: issue.id,
        title: issue.title,
        url: `https://github.com/${owner}/${repoName}/issues/${issue.number}`,
        createdAt: issue.created_at,
      };
    }

    case 'list_pull_requests': {
      const { repo, limit } = toolInput as {
        repo: string;
        limit?: number;
      };
      const { owner, repo: repoName } = parseRepo(repo);

      const prs = await gitHubClient.listPullRequests(
        agentId,
        owner,
        repoName,
        Math.min((limit as number) || 20, 100),
        userId
      );

      return {
        count: prs.length,
        pullRequests: prs.map((pr) => ({
          number: pr.number,
          title: pr.title,
          state: pr.state,
          author: pr.user?.login,
          createdAt: pr.created_at,
          url: `https://github.com/${owner}/${repoName}/pull/${pr.number}`,
        })),
      };
    }

    case 'add_comment': {
      const { repo, issue_number, body } = toolInput as {
        repo: string;
        issue_number: number;
        body: string;
      };
      const { owner, repo: repoName } = parseRepo(repo);

      const comment = await gitHubClient.addComment(
        agentId,
        owner,
        repoName,
        issue_number,
        body,
        userId
      );
      return {
        success: true,
        commentId: comment.id,
        createdAt: comment.created_at,
        url: `https://github.com/${owner}/${repoName}/issues/${issue_number}#issuecomment-${comment.id}`,
      };
    }

    case 'get_issue_details': {
      const { repo, issue_number } = toolInput as {
        repo: string;
        issue_number: number;
      };
      const { owner, repo: repoName } = parseRepo(repo);

      const issues = await gitHubClient.listIssues(agentId, owner, repoName, 1, userId);
      const issue = issues.find((i) => i.number === issue_number);

      if (!issue) {
        return {
          found: false,
          error: `Issue #${issue_number} not found in ${owner}/${repoName}`,
        };
      }

      return {
        found: true,
        number: issue.number,
        title: issue.title,
        state: issue.state,
        author: issue.user?.login,
        createdAt: issue.created_at,
        url: `https://github.com/${owner}/${repoName}/issues/${issue.number}`,
      };
    }

    default:
      throw new Error(`Unknown GitHub tool: ${toolName}`);
  }
}
