import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { BottomNav } from '@/components/BottomNav';
import {
  Menu,
  X,
  Activity,
  LogOut,
  User,
  LayoutDashboard,
  Camera,
  Clock,
  TrendingUp,
  Shield,
  Stethoscope,
  Inbox,
  FileText,
  CheckSquare,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export const Navbar = () => {
  const { isAuthenticated, user, logout, hasRole } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  // Determine profile route depending on role
  const profileRoute = hasRole('professional') ? '/professional/profile' : '/patient/profile';

  // Navigation links by role for bottom nav
  const getBottomNavLinks = () => {
    if (hasRole('admin')) {
      return [
        { to: '/admin', label: 'Dashboard', icon: Shield },
        { to: '/admin/documents', label: 'Documents', icon: FileText },
        { to: '/admin/validate-professionals', label: 'Validation', icon: CheckSquare },
      ];
    }
    if (hasRole('professional')) {
      return [
        { to: '/professional', label: 'Tableau', icon: Stethoscope },
        { to: '/professional/follow-requests', label: 'Demandes', icon: Inbox },
        { to: '/professional-notes', label: 'Notes', icon: FileText },
        { to: '/professional/profile', label: 'Profil', icon: User },
      ];
    }
    // Patient (user)
    return [
      { to: '/dashboard', label: 'Accueil', icon: LayoutDashboard },
      { to: '/analyze', label: 'Analyser', icon: Camera },
      { to: '/treatments', label: 'Suivis', icon: TrendingUp },
      { to: '/history', label: 'Historique', icon: Clock },
      { to: '/patient/profile', label: 'Profil', icon: User },
    ];
  };

  // Desktop nav links (same logic as before)
  const authLinks = hasRole('admin')
    ? []
    : hasRole('professional')
    ? [{ to: profileRoute, label: 'Profil', icon: User }]
    : [
        { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/analyze', label: 'Analyse', icon: Camera },
        { to: '/treatments', label: 'Suivis', icon: TrendingUp },
        { to: '/history', label: 'Historique', icon: Clock },
        { to: profileRoute, label: 'Profil', icon: User },
      ];

  const roleLinks = [];
  if (hasRole('admin')) {
    roleLinks.push({ to: '/admin', label: 'Admin', icon: Shield });
  } else if (hasRole('professional')) {
    roleLinks.push({ to: '/professional', label: 'Pro', icon: Stethoscope });
  }

  const allLinks = [...authLinks, ...roleLinks];
  const bottomNavLinks = getBottomNavLinks();

  return (
    <>
      {/* Mobile Top Bar - only for authenticated users */}
      {isAuthenticated && (
        <header className="sticky top-0 z-50 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur-md md:hidden safe-top">
          <Link to={'/dashboard'} className="flex items-center gap-2 font-bold">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Activity className="h-4 w-4" />
            </div>
            <span className="font-['Outfit'] text-sm font-bold tracking-tight">UngueaHealth</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{user?.prenom || user?.nom}</span>
            <Button variant="ghost" size="icon" onClick={logout} className="h-9 w-9" title="Deconnexion">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>
      )}

      {/* Desktop Top Navbar */}
      <header className="sticky top-0 z-50 hidden w-full border-b bg-background/80 backdrop-blur-md md:block">
        <div className="container flex h-16 items-center justify-between">
          <Link to={isAuthenticated ? '/dashboard' : '/'} className="flex items-center gap-2.5 font-bold text-lg">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Activity className="h-5 w-5" />
            </div>
            <span className="font-['Outfit'] font-bold tracking-tight">UngueaHealth</span>
          </Link>

          <nav className="flex items-center gap-1">
            {isAuthenticated ? (
              <>
                {allLinks.map(({ to, label, icon: Icon }) => (
                  <Link
                    key={to}
                    to={to}
                    className={cn(
                      'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      isActive(to)
                        ? 'bg-accent text-accent-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </Link>
                ))}
                <div className="ml-2 flex items-center gap-2 border-l pl-3">
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-medium">{user?.prenom || user?.nom}</span>
                    {user?.role && user.role !== 'user' && (
                      <span className="text-xs text-muted-foreground capitalize">{user.role}</span>
                    )}
                  </div>
                  <Button variant="ghost" size="icon" onClick={logout} title="Deconnexion">
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              </>
            ) : (
              <>
                <Link
                  to="/about"
                  className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  A propos
                </Link>
                <Link
                  to="/contact"
                  className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Contact
                </Link>
                <div className="ml-2 flex items-center gap-2">
                  <Button variant="outline" asChild>
                    <Link to="/login">Connexion</Link>
                  </Button>
                  <Button asChild>
                    <Link to="/register">Inscription</Link>
                  </Button>
                </div>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Mobile Menu for unauthenticated users */}
      {!isAuthenticated && (
        <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md md:hidden">
          <div className="flex h-14 items-center justify-between px-4">
            <Link to="/" className="flex items-center gap-2 font-bold">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Activity className="h-4 w-4" />
              </div>
              <span className="font-['Outfit'] text-sm font-bold tracking-tight">UngueaHealth</span>
            </Link>
            <Button variant="ghost" size="icon" className="h-11 w-11" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>

          {mobileOpen && (
            <div className="border-t bg-background p-4">
              <nav className="flex flex-col gap-1">
                <Link
                  to="/about"
                  onClick={() => setMobileOpen(false)}
                  className="flex h-11 items-center rounded-lg px-3 text-sm font-medium text-muted-foreground hover:bg-muted"
                >
                  A propos
                </Link>
                <Link
                  to="/contact"
                  onClick={() => setMobileOpen(false)}
                  className="flex h-11 items-center rounded-lg px-3 text-sm font-medium text-muted-foreground hover:bg-muted"
                >
                  Contact
                </Link>
                <div className="mt-2 flex flex-col gap-2">
                  <Button variant="outline" asChild className="h-12 w-full rounded-xl text-base">
                    <Link to="/login" onClick={() => setMobileOpen(false)}>
                      Connexion
                    </Link>
                  </Button>
                  <Button asChild className="h-12 w-full rounded-xl text-base">
                    <Link to="/register" onClick={() => setMobileOpen(false)}>
                      Inscription
                    </Link>
                  </Button>
                </div>
              </nav>
            </div>
          )}
        </header>
      )}

      {/* Mobile Bottom Tab Bar - only for authenticated users */}
      {isAuthenticated && <BottomNav links={bottomNavLinks} />}
    </>
  );
};

export default Navbar;
