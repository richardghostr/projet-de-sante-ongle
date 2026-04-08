import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color?: string;
}

export const StatCard = ({ label, value, icon: Icon, color = 'text-primary' }: StatCardProps) => (
  <Card className="shadow-sm">
    <CardContent className="flex items-center gap-2 p-3 sm:gap-3 sm:p-3 md:gap-4 md:p-5">
      <div
        className={cn(
          'flex shrink-0 items-center justify-center rounded-xl bg-muted',
          'h-8 w-8 sm:h-9 sm:w-9 md:h-11 md:w-11',
          color
        )}
      >
        <Icon className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] sm:text-xs text-muted-foreground truncate">{label}</p>
        <p className="text-base sm:text-lg md:text-2xl font-bold tabular-nums truncate">{value}</p>
      </div>
    </CardContent>
  </Card>
);

export default StatCard;
