import type { GetServerSideProps } from 'next';
import withEnv from '@/lib/withEnv';

// Removed as a standalone page — space settings now live exclusively in the
// SpaceInnerSettingModal dialog. Deep-link via ?setting=extensions.
export const getServerSideProps: GetServerSideProps = withEnv(async (context) => {
  const { spaceId } = context.query;
  return {
    redirect: {
      destination: `/space/${spaceId as string}?setting=extensions`,
      permanent: true,
    },
  };
});

export default function Integration() {
  return null;
}
