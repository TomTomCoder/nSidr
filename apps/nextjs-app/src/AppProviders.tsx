import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@teable/next-themes';
import { createQueryClient } from '@teable/sdk/context';
import { ConfirmModalProvider } from '@teable/ui-lib';
import { Toaster as SoonerToaster } from '@teable/ui-lib/shadcn/ui/sonner';
import { Toaster } from '@teable/ui-lib/shadcn/ui/toaster';
import { useSearchParams } from 'next/navigation';
import { useMemo, type FC, type PropsWithChildren } from 'react';
import { GlobalDocSearchPanel } from './features/app/blocks/doc-search/GlobalDocSearchPanel';
import { useDocSearchKeyboardShortcut } from './features/app/blocks/doc-search/useDocSearchKeyboardShortcut';
import type { IServerEnv } from './lib/server-env';
import { EnvContext } from './lib/server-env';

type Props = PropsWithChildren;

const KeyboardShortcutInitializer = ({ children }: { children: React.ReactNode }) => {
  useDocSearchKeyboardShortcut();
  return children;
};

export const AppProviders: FC<Props & { env: IServerEnv }> = (props) => {
  const { children, env } = props;
  const searchParams = useSearchParams();
  const docSearchQueryClient = useMemo(() => createQueryClient(), []);
  const theme = searchParams?.get('theme') ?? undefined;

  return (
    <ThemeProvider
      attribute="class"
      themeColor={{
        light: '#ffffff',
        dark: '#09090b',
      }}
      forcedTheme={theme}
    >
      <EnvContext.Provider value={env}>
        <ConfirmModalProvider>
          <KeyboardShortcutInitializer>{children}</KeyboardShortcutInitializer>
          <Toaster />
          <SoonerToaster />
          <QueryClientProvider client={docSearchQueryClient}>
            <GlobalDocSearchPanel />
          </QueryClientProvider>
        </ConfirmModalProvider>
      </EnvContext.Provider>
    </ThemeProvider>
  );
};
