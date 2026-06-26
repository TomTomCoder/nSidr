import type { IUserIntegrationItemVo } from '@teable/openapi';
import { useTranslation } from 'next-i18next';

/**
 * Generic connected-account item for providers whose identity metadata follows
 * the { userInfo: { name, email } } shape (Gmail, Outlook, GitHub, Google
 * Calendar/Drive/Chat/Meet, Discord). Null-safe: if identity couldn't be
 * fetched it just renders the name (children) without the detail lines.
 */
export const ProviderAccountItem = ({
  item,
  children,
}: {
  item: IUserIntegrationItemVo;
  children: React.ReactNode;
}) => {
  const { t } = useTranslation('common');
  const userInfo = (item.metadata as { userInfo?: { name?: string; email?: string } } | undefined)
    ?.userInfo;

  return (
    <div className="flex-1 space-y-1">
      {children}
      {userInfo?.name && (
        <div className="text-xs text-muted-foreground">
          {t('settings.integration.userIntegration.email.user')}: {userInfo.name}
        </div>
      )}
      {userInfo?.email && (
        <div className="text-xs text-muted-foreground">
          {t('settings.integration.userIntegration.email.email')}: {userInfo.email}
        </div>
      )}
    </div>
  );
};
