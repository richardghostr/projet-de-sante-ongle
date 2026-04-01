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
    <CardContent className="flex items-center gap-3 p-4 md:gap-4 md:p-5">
      <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted md:h-11 md:w-11', color)}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-bold tabular-nums md:text-2xl">{value}</p>
      </div>
    </CardContent>
  </Card>
);

export default StatCard;
