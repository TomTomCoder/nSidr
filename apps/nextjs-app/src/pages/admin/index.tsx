import type { GetServerSideProps } from 'next';
import ensureLogin from '@/lib/ensureLogin';
import withAuthSSR, { ForbiddenError } from '@/lib/withAuthSSR';
import withEnv from '@/lib/withEnv';

// Redirect /admin → /admin/setting (the primary admin entry point)
export const getServerSideProps: GetServerSideProps = withEnv(
  ensureLogin(
    withAuthSSR(async (_context, ssrApi) => {
      const userMe = await ssrApi.getUserMe();
      if (!userMe?.isAdmin) {
        throw new ForbiddenError();
      }
      return {
        redirect: {
          destination: '/admin/setting',
          permanent: false,
        },
      };
    })
  )
);

export default function AdminIndex() {
  return null;
}
