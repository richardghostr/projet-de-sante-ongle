import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

interface BottomNavProps {
  links: NavItem[];
}

export const BottomNav = ({ links }: BottomNavProps) => {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur-md md:hidden safe-bottom">
      <div className="grid h-[60px]" style={{ gridTemplateColumns: `repeat(${links.length}, 1fr)` }}>
        {links.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className={cn(
              'flex flex-col items-center justify-center gap-0.5 transition-colors',
              isActive(to)
                ? 'text-primary'
                : 'text-muted-foreground'
            )}
          >
            <Icon className={cn('transition-transform', isActive(to) ? 'h-6 w-6' : 'h-5 w-5')} />
            <span className={cn('text-[11px]', isActive(to) && 'font-semibold')}>{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;
