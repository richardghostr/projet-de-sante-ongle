import { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileListItemProps {
  avatar?: ReactNode;
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  showChevron?: boolean;
  onClick?: () => void;
  className?: string;
}

export const MobileListItem = ({
  avatar,
  title,
  subtitle,
  badge,
  showChevron = true,
  onClick,
  className,
}: MobileListItemProps) => (
  <div
    onClick={onClick}
    className={cn(
      'flex min-h-[64px] items-center gap-3 rounded-xl border bg-card p-3 transition-colors',
      onClick && 'cursor-pointer hover:bg-muted/50',
      className
    )}
  >
    {avatar && <div className="flex-shrink-0">{avatar}</div>}
    <div className="min-w-0 flex-1">
      <p className="text-sm font-semibold truncate">{title}</p>
      {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
    </div>
    {badge && <div className="flex-shrink-0">{badge}</div>}
    {showChevron && <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />}
  </div>
);

export default MobileListItem;
