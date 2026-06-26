import { ChevronsLeft } from '@teable/icons';
import { TeableLogo } from '@/components/TeableLogo';
import { useBrand } from '../../hooks/useBrand';

interface ISidebarBackButtonProps {
  title?: string;
  icon?: React.ReactNode;
  onBack?: () => void;
}

export const SidebarHeaderLeft = (props: ISidebarBackButtonProps) => {
  const { title, icon, onBack } = props;
  const displayIcon = icon ?? <TeableLogo className="size-5 shrink-0" />;
  const { brandName } = useBrand();

  return (
    <>
      {onBack ? (
        <div
          className="size-5 shrink-0 cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => onBack?.()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              onBack?.();
            }
          }}
          role="button"
          tabIndex={0}
        >
          <ChevronsLeft className="size-5" />
        </div>
      ) : (
        displayIcon
      )}

      <p className="ml-[2px] truncate text-sm">{title ?? brandName}</p>
    </>
  );
};
