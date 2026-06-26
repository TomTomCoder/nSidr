import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { GitHubOAuthService } from './github-oauth.service';

interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  owner: { login: string };
}

interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  state: string;
  user: { login: string };
  created_at: string;
}

interface GitHubPR {
  id: number;
  number: number;
  title: string;
  state: string;
  user: { login: string };
  created_at: string;
  merge_commit_sha?: string;
}

interface GitHubUser {
  login: string;
  id: number;
  name: string;
  bio?: string;
  public_repos: number;
  followers: number;
}

@Injectable()
export class GitHubClient {
  private readonly logger = new Logger(GitHubClient.name);
  private readonly GITHUB_API_BASE = 'https://api.github.com';

  constructor(
    private readonly httpService: HttpService,
    private readonly oauthService: GitHubOAuthService
  ) {}

  async getUserProfile(agentId: string): Promise<GitHubUser> {
    const token = await this.oauthService.getValidToken(agentId);
    try {
      const response = await firstValueFrom(
        this.httpService.get<GitHubUser>(`${this.GITHUB_API_BASE}/user`, {
          headers: { Authorization: `token ${token.accessToken}` },
        })
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get GitHub profile: ${(error as Error).message}`);
      throw error;
    }
  }

  async listRepositories(agentId: string, limit: number = 20): Promise<GitHubRepository[]> {
    const token = await this.oauthService.getValidToken(agentId);
    try {
      const response = await firstValueFrom(
        this.httpService.get<GitHubRepository[]>(`${this.GITHUB_API_BASE}/user/repos`, {
          params: { per_page: limit, sort: 'updated' },
          headers: { Authorization: `token ${token.accessToken}` },
        })
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to list GitHub repositories: ${(error as Error).message}`);
      throw error;
    }
  }

  async listIssues(
    agentId: string,
    owner: string,
    repo: string,
    limit: number = 20,
    userId?: string
  ): Promise<GitHubIssue[]> {
    const token = await this.oauthService.getValidToken(agentId, userId);
    try {
      const response = await firstValueFrom(
        this.httpService.get<GitHubIssue[]>(
          `${this.GITHUB_API_BASE}/repos/${owner}/${repo}/issues`,
          {
            params: { per_page: limit, state: 'open' },
            headers: { Authorization: `token ${token.accessToken}` },
          }
        )
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to list GitHub issues: ${(error as Error).message}`);
      throw error;
    }
  }

  async createIssue(
    agentId: string,
    owner: string,
    repo: string,
    title: string,
    body: string,
    labels?: string[],
    userId?: string
  ): Promise<GitHubIssue> {
    const token = await this.oauthService.getValidToken(agentId, userId);
    try {
      const response = await firstValueFrom(
        this.httpService.post<GitHubIssue>(
          `${this.GITHUB_API_BASE}/repos/${owner}/${repo}/issues`,
          {
            title,
            body,
            labels,
          },
          {
            headers: { Authorization: `token ${token.accessToken}` },
          }
        )
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to create GitHub issue: ${(error as Error).message}`);
      throw error;
    }
  }

  async listPullRequests(
    agentId: string,
    owner: string,
    repo: string,
    limit: number = 20,
    userId?: string
  ): Promise<GitHubPR[]> {
    const token = await this.oauthService.getValidToken(agentId, userId);
    try {
      const response = await firstValueFrom(
        this.httpService.get<GitHubPR[]>(`${this.GITHUB_API_BASE}/repos/${owner}/${repo}/pulls`, {
          params: { per_page: limit, state: 'open' },
          headers: { Authorization: `token ${token.accessToken}` },
        })
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to list GitHub PRs: ${(error as Error).message}`);
      throw error;
    }
  }

  async addComment(
    agentId: string,
    owner: string,
    repo: string,
    issueNumber: number,
    body: string,
    userId?: string
  ): Promise<{ id: number; created_at: string }> {
    const token = await this.oauthService.getValidToken(agentId, userId);
    try {
      const response = await firstValueFrom(
        this.httpService.post<any>(
          `${this.GITHUB_API_BASE}/repos/${owner}/${repo}/issues/${issueNumber}/comments`,
          { body },
          {
            headers: { Authorization: `token ${token.accessToken}` },
          }
        )
      );
      return {
        id: response.data.id,
        created_at: response.data.created_at,
      };
    } catch (error) {
      this.logger.error(`Failed to add GitHub comment: ${(error as Error).message}`);
      throw error;
    }
  }
}
