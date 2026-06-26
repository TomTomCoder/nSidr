import { HttpService } from '@nestjs/axios';
import { GmailOAuthService } from './gmail-oauth.service';
import { GmailClient } from './gmail-client';

/**
 * Gmail Agent Tools
 * These tools are registered with agents to enable Gmail integration
 * Agents can use these to read and send emails on behalf of the user
 */

export const gmailAgentTools = [
  {
    type: 'function',
    function: {
      name: 'read_unread_emails',
      description:
        'Fetch unread emails from Gmail inbox. Returns email metadata (from, subject, date) and a preview of the content.',
      parameters: {
        type: 'object',
        properties: {
          maxResults: {
            type: 'number',
            description: 'Maximum number of emails to return (default: 10, max: 100)',
            default: 10,
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_emails',
      description:
        'Search emails using Gmail search syntax. Examples: "from:user@example.com", "subject:meeting", "after:2024-01-01", "has:attachment"',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Gmail search query (e.g., "from:boss@company.com is:important")',
          },
          maxResults: {
            type: 'number',
            description: 'Maximum number of emails to return (default: 10, max: 100)',
            default: 10,
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'send_email',
      description: 'Send an email via Gmail. Requires a connected Gmail account.',
      parameters: {
        type: 'object',
        properties: {
          to: {
            type: 'string',
            description: 'Recipient email address',
          },
          subject: {
            type: 'string',
            description: 'Email subject line',
          },
          body: {
            type: 'string',
            description: 'Email body (plain text)',
          },
        },
        required: ['to', 'subject', 'body'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_email_details',
      description:
        'Get full content of a specific email by ID. Useful for reading complete email body after finding it with search.',
      parameters: {
        type: 'object',
        properties: {
          messageId: {
            type: 'string',
            description: 'Gmail message ID (provided by other email functions)',
          },
        },
        required: ['messageId'],
      },
    },
  },
];

/**
 * Execute Gmail tool calls from agent
 * This function is called by AgentExecutionService when agent calls a Gmail tool
 */
export async function executeGmailTool(
  toolName: string,
  input: Record<string, unknown>,
  agentId: string,
  oauthService: GmailOAuthService,
  httpService: HttpService,
  userId?: string
): Promise<unknown> {
  const client = new GmailClient(agentId, oauthService, httpService, userId);

  switch (toolName) {
    case 'read_unread_emails': {
      const maxResults = (input.maxResults as number) || 10;
      const messages = await client.getUnreadMessages(maxResults);

      return {
        count: messages.length,
        messages: messages.map((msg) => ({
          id: msg.id,
          threadId: msg.threadId,
          ...client.extractHeaders(msg),
          preview: msg.snippet,
        })),
      };
    }

    case 'search_emails': {
      const query = input.query as string;
      const maxResults = (input.maxResults as number) || 10;

      if (!query) {
        return { error: 'Search query is required' };
      }

      const messages = await client.searchMessages(query, maxResults);
      return {
        count: messages.length,
        query,
        messages: messages.map((msg) => ({
          id: msg.id,
          threadId: msg.threadId,
          ...client.extractHeaders(msg),
          preview: msg.snippet,
        })),
      };
    }

    case 'send_email': {
      const to = input.to as string;
      const subject = input.subject as string;
      const body = input.body as string;

      if (!to || !subject || !body) {
        return { error: 'Missing required fields: to, subject, body' };
      }

      const result = await client.sendEmail(to, subject, body);
      return {
        success: true,
        message: `Email sent to ${to}`,
        messageId: result.id,
        threadId: result.threadId,
      };
    }

    case 'get_email_details': {
      const messageId = input.messageId as string;

      if (!messageId) {
        return { error: 'Message ID is required' };
      }

      const message = await client.getMessage(messageId);
      return {
        id: message.id,
        threadId: message.threadId,
        ...client.extractHeaders(message),
        body: client.extractMessageBody(message),
        labels: message.labelIds,
      };
    }

    default:
      return { error: `Unknown Gmail tool: ${toolName}` };
  }
}
