import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Menu, X, Activity, LogOut, User, BarChart3, Camera, Clock } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const authLinks = [
    { to: '/dashboard', label: 'Dashboard', icon: BarChart3 },
    { to: '/analyze', label: 'Analyse', icon: Camera },
    { to: '/history', label: 'Historique', icon: Clock },
    { to: '/profile', label: 'Profil', icon: User },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between">
        <Link to={isAuthenticated ? '/dashboard' : '/'} className="flex items-center gap-2.5 font-bold text-lg">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Activity className="h-5 w-5" />
          </div>
          <span className="font-['Outfit'] font-bold tracking-tight">UngueaHealth</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {isAuthenticated ? (
            <>
              {authLinks.map(({ to, label, icon: Icon }) => (
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
                <span className="text-sm text-muted-foreground">{user?.prenom || user?.nom}</span>
                <Button variant="ghost" size="icon" onClick={logout} title="Déconnexion">
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </>
          ) : (
            <>
              <Link to="/about" className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                À propos
              </Link>
              <Link to="/contact" className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Contact
              </Link>
              <div className="ml-2 flex items-center gap-2">
                <Button variant="outline" asChild><Link to="/login">Connexion</Link></Button>
                <Button asChild><Link to="/register">Inscription</Link></Button>
              </div>
            </>
          )}
        </nav>

        {/* Mobile toggle */}
        <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t bg-background p-4 md:hidden">
          <nav className="flex flex-col gap-1">
            {isAuthenticated ? (
              <>
                {authLinks.map(({ to, label, icon: Icon }) => (
                  <Link
                    key={to}
                    to={to}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                      isActive(to) ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-muted'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </Link>
                ))}
                <button
                  onClick={() => { logout(); setMobileOpen(false); }}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Déconnexion
                </button>
              </>
            ) : (
              <>
                <Link to="/about" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted">À propos</Link>
                <Link to="/contact" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted">Contact</Link>
                <div className="mt-2 flex flex-col gap-2">
                  <Button variant="outline" asChild><Link to="/login" onClick={() => setMobileOpen(false)}>Connexion</Link></Button>
                  <Button asChild><Link to="/register" onClick={() => setMobileOpen(false)}>Inscription</Link></Button>
                </div>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
};
