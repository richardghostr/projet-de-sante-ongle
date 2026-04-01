import { Navigate } from 'react-router-dom';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { Loader2, ShieldX } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: UserRole | UserRole[];
  fallback?: React.ReactNode;
  redirectTo?: string;
}

/**
 * RoleGuard - Protects routes based on user roles
 * 
 * Usage:
 * <RoleGuard allowedRoles="admin">
 *   <AdminDashboard />
 * </RoleGuard>
 * 
 * <RoleGuard allowedRoles={['professional', 'admin']}>
 *   <ProfessionalDashboard />
 * </RoleGuard>
 */
export const RoleGuard = ({ 
  children, 
  allowedRoles, 
  fallback,
  redirectTo 
}: RoleGuardProps) => {
  const { isAuthenticated, isLoading, hasRole } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-muted/30">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!hasRole(allowedRoles)) {
    if (redirectTo) {
      return <Navigate to={redirectTo} replace />;
    }
    
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-muted/30 p-6">
        <ShieldX className="h-14 w-14 text-destructive md:h-16 md:w-16" />
        <h1 className="text-center text-xl font-bold md:text-2xl">Accès refusé</h1>
        <p className="max-w-xs text-center text-sm text-muted-foreground">
          Vous n&apos;avez pas les permissions nécessaires pour accéder à cette page.
        </p>
        <Button asChild className="h-12 w-full max-w-xs rounded-xl text-base">
          <a href="/dashboard">Retour au tableau de bord</a>
        </Button>
      </div>
    );
  }

  return <>{children}</>;
};

/**
 * AdminGuard - Shortcut for admin-only routes
 */
export const AdminGuard = ({ children }: { children: React.ReactNode }) => (
  <RoleGuard allowedRoles="admin">
    {children}
  </RoleGuard>
);

/**
 * ProfessionalGuard - For professional and admin routes
 */
export const ProfessionalGuard = ({ children }: { children: React.ReactNode }) => (
  <RoleGuard allowedRoles={['professional', 'admin']}>
    {children}
  </RoleGuard>
);

/**
 * StudentGuard - For student, professional, and admin routes
 */
export const StudentGuard = ({ children }: { children: React.ReactNode }) => (
  <RoleGuard allowedRoles={['student', 'professional', 'admin']}>
    {children}
  </RoleGuard>
);
