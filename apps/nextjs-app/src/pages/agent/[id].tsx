import type { IUser } from '@teable/sdk/context';
import { AppProvider, SessionProvider } from '@teable/sdk/context';
import type { GetServerSideProps } from 'next';
import { useTranslation } from 'next-i18next';
import type { ReactElement } from 'react';
import { ChatContainer } from '@/components/AgentChat/ChatContainer';
import { useSdkLocale } from '@/features/app/hooks/useSdkLocale';
import ensureLogin from '@/lib/ensureLogin';
import { getTranslationsProps } from '@/lib/i18n/getTranslationsProps';
import type { NextPageWithLayout } from '@/lib/type';
import withEnv from '@/lib/withEnv';

interface AgentPageProps {
  id: string;
  conversationId?: string;
}

const AgentPage: NextPageWithLayout<AgentPageProps> = ({ id, conversationId }) => {
  return <ChatContainer agentId={id} conversationId={conversationId} />;
};

const AgentPageLayout = ({ children, user }: { children: React.ReactNode; user?: IUser }) => {
  const sdkLocale = useSdkLocale();
  const { i18n } = useTranslation();

  return (
    <AppProvider lang={i18n.language} locale={sdkLocale}>
      <SessionProvider user={user}>{children}</SessionProvider>
    </AppProvider>
  );
};

export const getServerSideProps: GetServerSideProps<AgentPageProps> = withEnv(
  ensureLogin(async (context) => {
    const conversationId = (context.query?.conversationId as string) || null;
    const id = (context.params?.id as string) || '';
    return {
      props: {
        id,
        ...(conversationId ? { conversationId } : {}),
        ...(await getTranslationsProps(context, ['common'])),
      },
    };
  })
);

AgentPage.getLayout = function getLayout(page: ReactElement, pageProps) {
  return <AgentPageLayout {...pageProps}>{page}</AgentPageLayout>;
};

export default AgentPage;
