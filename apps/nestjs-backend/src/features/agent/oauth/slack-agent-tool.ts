import { SlackClient } from './slack-client';

// Tool definitions (OpenAI function format) — used only for documentation/reference.
// Dispatch is handled by executeSlackTool below.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const slackAgentTools: any[] = [
  {
    type: 'function',
    function: {
      name: 'list_slack_channels',
      description: 'List all Slack channels the user has access to',
      parameters: {
        type: 'object' as const,
        properties: {
          limit: {
            type: 'number',
            description: 'Maximum number of channels to return (default: 20)',
            default: 20,
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'read_slack_messages',
      description: 'Read messages from a Slack channel',
      parameters: {
        type: 'object' as const,
        properties: {
          channelId: {
            type: 'string',
            description: 'The Slack channel ID',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of messages to return (default: 10)',
            default: 10,
          },
        },
        required: ['channelId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'send_slack_message',
      description: 'Send a message to a Slack channel',
      parameters: {
        type: 'object' as const,
        properties: {
          channelId: {
            type: 'string',
            description: 'The Slack channel ID to send to',
          },
          text: {
            type: 'string',
            description: 'The message text to send',
          },
          threadTs: {
            type: 'string',
            description: 'Optional: Send as a reply to a thread (use message timestamp)',
          },
        },
        required: ['channelId', 'text'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_slack_messages',
      description: 'Search Slack messages across all channels',
      parameters: {
        type: 'object' as const,
        properties: {
          query: {
            type: 'string',
            description: 'Search query (supports Slack search syntax)',
          },
          count: {
            type: 'number',
            description: 'Maximum number of results (default: 20)',
            default: 20,
          },
        },
        required: ['query'],
      },
    },
  },
];

export async function executeSlackTool(
  toolName: string,
  toolInput: Record<string, unknown>,
  agentId: string,
  slackClient: SlackClient,
  userId?: string
): Promise<unknown> {
  switch (toolName) {
    case 'list_slack_channels': {
      const channels = await slackClient.listChannels(
        agentId,
        (toolInput.limit as number) || 20,
        userId
      );
      return {
        count: channels.length,
        channels: channels.map((ch) => ({
          id: ch.id,
          name: ch.name,
          isPrivate: ch.is_private,
          isMember: ch.is_member,
        })),
      };
    }

    case 'read_slack_messages': {
      const messages = await slackClient.getChannelMessages(
        agentId,
        toolInput.channelId as string,
        (toolInput.limit as number) || 10,
        userId
      );
      return {
        count: messages.length,
        messages: messages.map((msg) => ({
          timestamp: msg.ts,
          user: msg.user,
          text: msg.text,
          type: msg.type,
        })),
      };
    }

    case 'send_slack_message': {
      const result = await slackClient.postMessage(
        agentId,
        toolInput.channelId as string,
        toolInput.text as string,
        toolInput.threadTs as string | undefined,
        userId
      );
      return {
        success: result.ok,
        timestamp: result.ts,
        channel: result.channel,
        message: `Message sent to Slack channel ${result.channel}`,
      };
    }

    case 'search_slack_messages': {
      const results = await slackClient.searchMessages(
        agentId,
        toolInput.query as string,
        (toolInput.count as number) || 20,
        userId
      );
      return {
        count: results.length,
        query: toolInput.query,
        results: results.map((msg) => ({
          timestamp: msg.ts,
          user: msg.user,
          text: msg.text,
        })),
      };
    }

    default:
      throw new Error(`Unknown Slack tool: ${toolName}`);
  }
}
