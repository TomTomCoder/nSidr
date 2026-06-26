import { Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { GmailOAuthService } from './gmail-oauth.service';

export interface GmailMessage {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  payload?: {
    headers: Array<{ name: string; value: string }>;
    parts?: Array<{ mimeType: string; body: { data?: string; attachmentId?: string } }>;
    body?: { data?: string };
  };
}

export interface GmailDraft {
  id: string;
  message: {
    id: string;
    threadId: string;
    labelIds: string[];
    snippet: string;
  };
}

/**
 * Gmail API Client
 * Provides methods for reading and sending emails via Gmail API
 * Uses OAuth token from GmailOAuthService for authentication
 *
 * API Reference: https://developers.google.com/gmail/api/reference/rest
 */
export class GmailClient {
  private readonly logger = new Logger(GmailClient.name);
  private readonly baseUrl = 'https://www.googleapis.com/gmail/v1/users/me';

  constructor(
    private readonly agentId: string,
    private readonly oauthService: GmailOAuthService,
    private readonly httpService: HttpService,
    private readonly userId?: string
  ) {}

  /**
   * Get Gmail profile info
   */
  async getProfile() {
    try {
      const token = await this.oauthService.getValidToken(this.agentId, this.userId);
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/profile`, {
          headers: { Authorization: `Bearer ${token.access_token}` },
        })
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get profile: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * List messages (emails)
   * @param maxResults - Number of messages to return (1-500)
   * @param query - Gmail search query (e.g., "from:user@example.com is:unread")
   */
  async listMessages(maxResults: number = 10, query?: string): Promise<GmailMessage[]> {
    try {
      this.logger.log(`Listing messages (maxResults: ${maxResults}, query: ${query})`);
      const token = await this.oauthService.getValidToken(this.agentId, this.userId);

      const params = new URLSearchParams({
        maxResults: Math.min(maxResults, 100).toString(),
      });
      if (query) params.append('q', query);

      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/messages?${params}`, {
          headers: { Authorization: `Bearer ${token.access_token}` },
        })
      );

      const messages = response.data.messages || [];
      this.logger.log(`Retrieved ${messages.length} message IDs`);

      // Get full message details for each message
      const fullMessages = await Promise.all(messages.map((msg: any) => this.getMessage(msg.id)));

      return fullMessages;
    } catch (error) {
      this.logger.error(`Failed to list messages: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Get full message content
   * @param messageId - Gmail message ID
   */
  async getMessage(messageId: string): Promise<GmailMessage> {
    try {
      const token = await this.oauthService.getValidToken(this.agentId, this.userId);
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/messages/${messageId}`, {
          headers: { Authorization: `Bearer ${token.access_token}` },
        })
      );

      return response.data as GmailMessage;
    } catch (error) {
      this.logger.error(`Failed to get message ${messageId}: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Extract readable text from message
   * Handles both simple text messages and complex MIME structures
   */
  extractMessageBody(message: GmailMessage): string {
    try {
      if (!message.payload) return message.snippet || '';

      // Handle simple text messages
      if (message.payload.body?.data) {
        const decoded = Buffer.from(message.payload.body.data, 'base64').toString('utf-8');
        return decoded;
      }

      // Handle multipart messages (find text/plain part)
      if (message.payload.parts) {
        const textPart = message.payload.parts.find((p) => p.mimeType === 'text/plain');
        if (textPart?.body?.data) {
          const decoded = Buffer.from(textPart.body.data, 'base64').toString('utf-8');
          return decoded;
        }
      }

      return message.snippet || '(No text content)';
    } catch (error) {
      this.logger.warn(`Failed to extract message body: ${(error as Error).message}`);
      return message.snippet || '';
    }
  }

  /**
   * Extract email headers (From, To, Subject, Date)
   */
  extractHeaders(message: GmailMessage): Record<string, string> {
    const headers: Record<string, string> = {};
    if (!message.payload?.headers) return headers;

    const relevantHeaders = ['From', 'To', 'Subject', 'Date', 'Cc', 'Bcc'];
    for (const header of message.payload.headers) {
      if (relevantHeaders.includes(header.name)) {
        headers[header.name.toLowerCase()] = header.value;
      }
    }

    return headers;
  }

  /**
   * Get unread messages
   * @param maxResults - Number of messages to return
   */
  async getUnreadMessages(maxResults: number = 10): Promise<GmailMessage[]> {
    return this.listMessages(maxResults, 'is:unread');
  }

  /**
   * Search messages
   * @param query - Gmail search query
   * @param maxResults - Number of results to return
   */
  async searchMessages(query: string, maxResults: number = 10): Promise<GmailMessage[]> {
    return this.listMessages(maxResults, query);
  }

  /**
   * Send email
   * @param to - Recipient email address
   * @param subject - Email subject
   * @param body - Email body (plain text)
   */
  async sendEmail(
    to: string,
    subject: string,
    body: string
  ): Promise<{ id: string; threadId: string }> {
    try {
      this.logger.log(`Sending email to ${to}`);
      const token = await this.oauthService.getValidToken(this.agentId, this.userId);

      // RFC 2822 email format
      const email = [`To: ${to}`, `Subject: ${subject}`, '', body].join('\r\n');

      const encodedEmail = Buffer.from(email)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');

      const response = await firstValueFrom(
        this.httpService.post(
          `${this.baseUrl}/messages/send`,
          { raw: encodedEmail },
          {
            headers: { Authorization: `Bearer ${token.access_token}` },
          }
        )
      );

      this.logger.log(`Email sent successfully (ID: ${response.data.id})`);
      return { id: response.data.id, threadId: response.data.threadId };
    } catch (error) {
      this.logger.error(`Failed to send email: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Mark message as read
   */
  async markAsRead(messageId: string): Promise<void> {
    try {
      const token = await this.oauthService.getValidToken(this.agentId, this.userId);
      await firstValueFrom(
        this.httpService.post(
          `${this.baseUrl}/messages/${messageId}/modify`,
          { removeLabelIds: ['UNREAD'] },
          {
            headers: { Authorization: `Bearer ${token.access_token}` },
          }
        )
      );
      this.logger.log(`Marked message ${messageId} as read`);
    } catch (error) {
      this.logger.error(`Failed to mark message as read: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Add label to message
   */
  async addLabel(messageId: string, labelId: string): Promise<void> {
    try {
      const token = await this.oauthService.getValidToken(this.agentId, this.userId);
      await firstValueFrom(
        this.httpService.post(
          `${this.baseUrl}/messages/${messageId}/modify`,
          { addLabelIds: [labelId] },
          {
            headers: { Authorization: `Bearer ${token.access_token}` },
          }
        )
      );
    } catch (error) {
      this.logger.error(`Failed to add label: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Get list of labels (folders)
   */
  async listLabels() {
    try {
      const token = await this.oauthService.getValidToken(this.agentId, this.userId);
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/labels`, {
          headers: { Authorization: `Bearer ${token.access_token}` },
        })
      );
      return response.data.labels || [];
    } catch (error) {
      this.logger.error(`Failed to list labels: ${(error as Error).message}`);
      throw error;
    }
  }
}
