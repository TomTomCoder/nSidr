import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { SlackOAuthService } from './slack-oauth.service';

interface SlackMessage {
  type: string;
  user: string;
  text: string;
  ts: string;
  thread_ts?: string;
}

interface SlackChannel {
  id: string;
  name: string;
  is_channel: boolean;
  is_private: boolean;
  is_im: boolean;
  created: number;
  is_member: boolean;
  unlinked: number;
}

interface SlackUser {
  id: string;
  team_id: string;
  name: string;
  deleted: boolean;
  real_name: string;
  profile: {
    title?: string;
    phone?: string;
    skype?: string;
    real_name: string;
    display_name: string;
    email?: string;
  };
}

@Injectable()
export class SlackClient {
  private readonly logger = new Logger(SlackClient.name);
  private readonly SLACK_API_BASE = 'https://slack.com/api';

  constructor(
    private readonly httpService: HttpService,
    private readonly oauthService: SlackOAuthService
  ) {}

  async getProfile(agentId: string): Promise<SlackUser> {
    const token = await this.oauthService.getValidToken(agentId);
    try {
      const response = await firstValueFrom(
        this.httpService.get<any>(`${this.SLACK_API_BASE}/auth.test`, {
          headers: { Authorization: `Bearer ${token.accessToken}` },
        })
      );

      if (!response.data.ok) {
        throw new Error(`Slack API error: ${response.data.error}`);
      }

      return response.data as SlackUser;
    } catch (error) {
      this.logger.error(`Failed to get Slack profile: ${(error as Error).message}`);
      throw error;
    }
  }

  async listChannels(
    agentId: string,
    limit: number = 20,
    userId?: string
  ): Promise<SlackChannel[]> {
    const token = await this.oauthService.getValidToken(agentId, userId);
    try {
      const response = await firstValueFrom(
        this.httpService.get<any>(`${this.SLACK_API_BASE}/conversations.list`, {
          params: { limit, exclude_archived: true },
          headers: { Authorization: `Bearer ${token.accessToken}` },
        })
      );

      if (!response.data.ok) {
        throw new Error(`Slack API error: ${response.data.error}`);
      }

      return response.data.channels || [];
    } catch (error) {
      this.logger.error(`Failed to list Slack channels: ${(error as Error).message}`);
      throw error;
    }
  }

  async getChannelMessages(
    agentId: string,
    channelId: string,
    limit: number = 10,
    userId?: string
  ): Promise<SlackMessage[]> {
    const token = await this.oauthService.getValidToken(agentId, userId);
    try {
      const response = await firstValueFrom(
        this.httpService.get<any>(`${this.SLACK_API_BASE}/conversations.history`, {
          params: { channel: channelId, limit },
          headers: { Authorization: `Bearer ${token.accessToken}` },
        })
      );

      if (!response.data.ok) {
        throw new Error(`Slack API error: ${response.data.error}`);
      }

      return response.data.messages || [];
    } catch (error) {
      this.logger.error(`Failed to get channel messages: ${(error as Error).message}`);
      throw error;
    }
  }

  async postMessage(
    agentId: string,
    channelId: string,
    text: string,
    threadTs?: string,
    userId?: string
  ): Promise<{ ok: boolean; ts: string; channel: string }> {
    const token = await this.oauthService.getValidToken(agentId, userId);
    try {
      const payload: any = {
        channel: channelId,
        text,
      };

      if (threadTs) {
        payload.thread_ts = threadTs;
      }

      const response = await firstValueFrom(
        this.httpService.post<any>(`${this.SLACK_API_BASE}/chat.postMessage`, payload, {
          headers: { Authorization: `Bearer ${token.accessToken}` },
        })
      );

      if (!response.data.ok) {
        throw new Error(`Slack API error: ${response.data.error}`);
      }

      return {
        ok: true,
        ts: response.data.ts,
        channel: response.data.channel,
      };
    } catch (error) {
      this.logger.error(`Failed to post Slack message: ${(error as Error).message}`);
      throw error;
    }
  }

  async listUsers(agentId: string, limit: number = 100): Promise<SlackUser[]> {
    const token = await this.oauthService.getValidToken(agentId);
    try {
      const response = await firstValueFrom(
        this.httpService.get<any>(`${this.SLACK_API_BASE}/users.list`, {
          params: { limit },
          headers: { Authorization: `Bearer ${token.accessToken}` },
        })
      );

      if (!response.data.ok) {
        throw new Error(`Slack API error: ${response.data.error}`);
      }

      return response.data.members || [];
    } catch (error) {
      this.logger.error(`Failed to list Slack users: ${(error as Error).message}`);
      throw error;
    }
  }

  async searchMessages(
    agentId: string,
    query: string,
    count: number = 20,
    userId?: string
  ): Promise<SlackMessage[]> {
    const token = await this.oauthService.getValidToken(agentId, userId);
    try {
      const response = await firstValueFrom(
        this.httpService.get<any>(`${this.SLACK_API_BASE}/search.messages`, {
          params: { query, count },
          headers: { Authorization: `Bearer ${token.accessToken}` },
        })
      );

      if (!response.data.ok) {
        throw new Error(`Slack API error: ${response.data.error}`);
      }

      return response.data.messages?.matches || [];
    } catch (error) {
      this.logger.error(`Failed to search Slack messages: ${(error as Error).message}`);
      throw error;
    }
  }

  async addReaction(
    agentId: string,
    channelId: string,
    timestamp: string,
    emoji: string
  ): Promise<void> {
    const token = await this.oauthService.getValidToken(agentId);
    try {
      const response = await firstValueFrom(
        this.httpService.post<any>(
          `${this.SLACK_API_BASE}/reactions.add`,
          {
            channel: channelId,
            timestamp,
            name: emoji,
          },
          {
            headers: { Authorization: `Bearer ${token.accessToken}` },
          }
        )
      );

      if (!response.data.ok) {
        throw new Error(`Slack API error: ${response.data.error}`);
      }
    } catch (error) {
      this.logger.error(`Failed to add reaction: ${(error as Error).message}`);
      throw error;
    }
  }
}
