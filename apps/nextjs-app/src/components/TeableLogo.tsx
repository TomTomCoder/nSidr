import { cn } from '@teable/ui-lib/shadcn';
import { useBrand } from '@/features/app/hooks/useBrand';

export const TeableLogo = ({ className }: { className: string }) => {
  const { brandName, brandLogo } = useBrand();

  return (
    <img
      src={brandLogo ?? '/images/nsidr.png'}
      alt={brandName}
      className={cn('object-contain', className)}
    />
  );
};
