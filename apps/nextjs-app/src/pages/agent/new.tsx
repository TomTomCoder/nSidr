import type { IUser } from '@teable/sdk/context';
import { AppProvider, SessionProvider } from '@teable/sdk/context';
import type { GetServerSideProps } from 'next';
import { useTranslation } from 'next-i18next';
import type { ReactElement } from 'react';
import { AgentBuilder } from '@/components/AgentChat/AgentBuilder';
import { useSdkLocale } from '@/features/app/hooks/useSdkLocale';
import { getTranslationsProps } from '@/lib/i18n/getTranslationsProps';
import type { NextPageWithLayout } from '@/lib/type';
import withAuthSSR from '@/lib/withAuthSSR';

interface NewAgentPageProps {
  baseId: string;
}

const NewAgentPage: NextPageWithLayout<NewAgentPageProps> = ({ baseId }) => {
  return <AgentBuilder baseId={baseId} />;
};

const NewAgentPageLayout = ({ children, user }: { children: React.ReactNode; user?: IUser }) => {
  const sdkLocale = useSdkLocale();
  const { i18n } = useTranslation();
  return (
    <AppProvider lang={i18n.language} locale={sdkLocale}>
      <SessionProvider user={user}>{children}</SessionProvider>
    </AppProvider>
  );
};

export const getServerSideProps: GetServerSideProps = withAuthSSR(async (context, ssrApi) => {
  // Pick baseId from the URL first, then fall back to the user's most recently
  // visited base, then to the first base in their list. The conversational
  // wizard cannot run without a baseId (tool registry + model resolution both
  // key off it), so SSR resolves a default rather than letting the user create
  // an unrunnable agent.
  let baseId = (context.query?.baseId as string) || '';
  if (!baseId) {
    try {
      const bases = await ssrApi.getBaseList();
      baseId = bases?.[0]?.id ?? '';
    } catch {
      baseId = '';
    }
  }
  return {
    props: {
      baseId,
      ...(await getTranslationsProps(context, ['common'])),
    },
  };
});

NewAgentPage.getLayout = function getLayout(page: ReactElement, pageProps) {
  return <NewAgentPageLayout {...pageProps}>{page}</NewAgentPageLayout>;
};

export default NewAgentPage;
