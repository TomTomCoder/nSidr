import { dehydrate, QueryClient } from '@tanstack/react-query';
import { ReactQueryKeys } from '@teable/sdk/config';
import type { ReactElement } from 'react';
import { ChatContainer } from '@/components/AgentChat/ChatContainer';
import { BaseLayout } from '@/features/app/layouts/BaseLayout';
import { baseAllConfig } from '@/features/i18n/base-all.config';
import ensureLogin from '@/lib/ensureLogin';
import { getTranslationsProps } from '@/lib/i18n';
import type { IBasePageProps, NextPageWithLayout } from '@/lib/type';
import withAuthSSR from '@/lib/withAuthSSR';
import withEnv from '@/lib/withEnv';

interface AgentPageProps extends IBasePageProps {
  agentId: string;
}

const AgentPage: NextPageWithLayout<AgentPageProps> = ({ agentId }) => {
  return <ChatContainer agentId={agentId} />;
};

export const getServerSideProps = withEnv(
  ensureLogin(
    withAuthSSR(async (context, ssrApi) => {
      const { baseId, agentId } = context.query;
      const queryClient = new QueryClient();
      await Promise.all([
        queryClient.fetchQuery({
          queryKey: ReactQueryKeys.base(baseId as string),
          queryFn: () => ssrApi.getBaseById(baseId as string),
        }),
        queryClient.fetchQuery({
          queryKey: ReactQueryKeys.getBasePermission(baseId as string),
          queryFn: ({ queryKey }) => ssrApi.getBasePermission(queryKey[1]),
        }),
      ]);

      return {
        props: {
          agentId: agentId as string,
          dehydratedState: dehydrate(queryClient),
          ...(await getTranslationsProps(context, baseAllConfig.i18nNamespaces)),
        },
      };
    })
  )
);

AgentPage.getLayout = function getLayout(page: ReactElement, pageProps: AgentPageProps) {
  return <BaseLayout {...pageProps}>{page}</BaseLayout>;
};

export default AgentPage;
