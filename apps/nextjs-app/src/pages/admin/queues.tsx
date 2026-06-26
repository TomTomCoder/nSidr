import type { GetServerSideProps } from 'next';
import type { ReactElement } from 'react';
import { QueueDashboard } from '@/features/app/blocks/admin/queues/QueueDashboard';
import { AdminLayout } from '@/features/app/layouts/AdminLayout';
import ensureLogin from '@/lib/ensureLogin';
import { getTranslationsProps } from '@/lib/i18n';
import type { NextPageWithLayout } from '@/lib/type';
import withAuthSSR, { ForbiddenError } from '@/lib/withAuthSSR';
import withEnv from '@/lib/withEnv';

const QueuesPage: NextPageWithLayout = () => {
  return <QueueDashboard />;
};

export const getServerSideProps: GetServerSideProps = withEnv(
  ensureLogin(
    withAuthSSR(async (context, ssrApi) => {
      const userMe = await ssrApi.getUserMe();

      if (!userMe?.isAdmin) {
        throw new ForbiddenError();
      }

      // When Redis is configured, BullBoard Express middleware intercepts
      // /admin/queues before Next.js sees it. This page renders for the
      // in-memory fallback mode (no Redis).
      return {
        props: {
          ...(await getTranslationsProps(context, 'common')),
        },
      };
    })
  )
);

QueuesPage.getLayout = function getLayout(page: ReactElement, pageProps) {
  return <AdminLayout {...pageProps}>{page}</AdminLayout>;
};

export default QueuesPage;
