import { useBase } from '@teable/sdk/hooks/use-base';
import dynamic from 'next/dynamic';

const UnifiedChatContainer = dynamic(() =>
  import('@/components/AgentChat/UnifiedChatContainer').then((m) => m.UnifiedChatContainer)
);

export const CommunityPage = () => {
  const base = useBase();
  const spaceId = base?.spaceId;

  if (!spaceId) return null;

  return (
    <div className="flex h-full w-full flex-col">
      <UnifiedChatContainer spaceId={spaceId} activeBaseId={base?.id} className="h-full" />
    </div>
  );
};
