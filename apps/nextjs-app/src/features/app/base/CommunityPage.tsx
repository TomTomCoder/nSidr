import { useBase } from '@teable/sdk/hooks/use-base';
import { UnifiedChatContainer } from '@/components/AgentChat/UnifiedChatContainer';

export const CommunityPage = () => {
  const base = useBase();
  const spaceId = base?.spaceId;

  if (!spaceId) return null;

  return (
    <div className="flex h-full w-full flex-col">
      <UnifiedChatContainer spaceId={spaceId} className="h-full" />
    </div>
  );
};
