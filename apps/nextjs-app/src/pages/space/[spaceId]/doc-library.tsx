import { dehydrate, QueryClient } from '@tanstack/react-query';
import { ReactQueryKeys } from '@teable/sdk';
import type { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import type { ReactElement } from 'react';
import { DocLibrary } from '@/features/app/blocks/doc-search';
import { SpaceInnerLayout } from '@/features/app/layouts/SpaceInnerLayout';
import { spaceConfig } from '@/features/i18n/space.config';
import ensureLogin from '@/lib/ensureLogin';
import { getTranslationsProps } from '@/lib/i18n';
import type { NextPageWithLayout } from '@/lib/type';
import withAuthSSR from '@/lib/withAuthSSR';
import withEnv from '@/lib/withEnv';

const DocLibraryPage: NextPageWithLayout = () => {
  const router = useRouter();
  const spaceId = router.query.spaceId as string;
  return <DocLibrary spaceId={spaceId} />;
};

export const getServerSideProps: GetServerSideProps = withEnv(
  ensureLogin(
    withAuthSSR(async (context, ssrApi) => {
      const { spaceId } = context.query;
      const queryClient = new QueryClient();

      await queryClient.fetchQuery({
        queryKey: ReactQueryKeys.space(spaceId as string),
        queryFn: ({ queryKey }) => ssrApi.getSpaceById(queryKey[1]),
      });

      return {
        props: {
          dehydratedState: dehydrate(queryClient),
          ...(await getTranslationsProps(context, spaceConfig.i18nNamespaces)),
        },
      };
    })
  )
);

DocLibraryPage.getLayout = function getLayout(page: ReactElement, pageProps) {
  return <SpaceInnerLayout {...pageProps}>{page}</SpaceInnerLayout>;
};

export default DocLibraryPage;
