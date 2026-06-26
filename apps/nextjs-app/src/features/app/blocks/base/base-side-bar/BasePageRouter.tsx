import { Lock, Settings, Trash2 } from '@teable/icons';
import { BillingProductLevel } from '@teable/openapi';
import { useBasePermission, useIsReadOnlyPreview } from '@teable/sdk/hooks';
import { cn } from '@teable/ui-lib/shadcn';
import { Button } from '@teable/ui-lib/shadcn/ui/button';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { useMemo } from 'react';
import { UpgradeWrapper } from '@/features/app/components/billing/UpgradeWrapper';
import { ShareBaseDialog } from '@/features/app/components/collaborator/share/ShareBaseDialog';
import { tableConfig } from '@/features/i18n/table.config';

const BaseActions = () => {
  const router = useRouter();
  const { baseId } = router.query;
  const { t } = useTranslation(tableConfig.i18nNamespaces);
  const basePermission = useBasePermission();

  const canUpdateBase = Boolean(basePermission?.['base|update']);
  if (!canUpdateBase) {
    return null;
  }

  return (
    <>
      {basePermission?.['base|delete'] && (
        <Button
          variant="ghost"
          size="xs"
          asChild
          className="my-[2px] w-full justify-start text-sm font-normal"
        >
          <Link href={`/base/${baseId}/trash`} className="font-normal">
            <Trash2 className="size-4 shrink-0" />
            <p className="truncate">{t('common:noun.trash')}</p>
            <div className="grow basis-0"></div>
          </Link>
        </Button>
      )}
      <Button
        variant="ghost"
        size="xs"
        asChild
        className="my-[2px] w-full justify-start text-sm font-normal"
      >
        <Link href={`/base/${baseId}/design`} className="font-normal">
          <Settings className="size-4 shrink-0" />
          <p className="truncate">{t('common:noun.design')}</p>
          <div className="grow basis-0"></div>
        </Link>
      </Button>
    </>
  );
};

export const BasePageRouter = () => {
  const router = useRouter();
  const { baseId } = router.query;
  const { t } = useTranslation(tableConfig.i18nNamespaces);
  const basePermission = useBasePermission();
  const isReadOnlyPreview = useIsReadOnlyPreview();

  const pageRoutes: {
    href: string;
    label: string;
    Icon: React.FC<{ className?: string }>;
    billingLevel?: BillingProductLevel;
  }[] = useMemo(
    () =>
      [
        {
          href: `/base/${baseId}/authority-matrix`,
          label: t('common:noun.authorityMatrix'),
          Icon: Lock,
          hidden: !basePermission?.['base|authority_matrix_config'],
          billingLevel: BillingProductLevel.Business,
        },
      ].filter((item) => !item.hidden),
    [baseId, basePermission, t]
  );

  if (isReadOnlyPreview) {
    return null;
  }

  return (
    <>
      <div className="flex flex-col gap-2 px-3">
        <ul>
          {pageRoutes.map(({ href, label, Icon, billingLevel }) => {
            return (
              <UpgradeWrapper
                key={href}
                baseId={baseId as string}
                targetBillingLevel={billingLevel}
              >
                {({ badge }) => (
                  <li key={href}>
                    <Button
                      variant="ghost"
                      size="xs"
                      asChild
                      className={cn(
                        'w-full justify-start text-sm my-[2px]',
                        router.asPath.startsWith(href) && 'bg-secondary'
                      )}
                    >
                      <Link href={href} className="font-normal">
                        <Icon className="size-4 shrink-0" />
                        <p className="truncate">{label}</p>
                        <div className="grow basis-0"></div>
                        {badge}
                      </Link>
                    </Button>
                  </li>
                )}
              </UpgradeWrapper>
            );
          })}
          <ShareBaseDialog />
          <BaseActions />
        </ul>
      </div>
    </>
  );
};
