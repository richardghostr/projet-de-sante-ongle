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
      <div className="flex min-h-dvh items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 bg-muted/30">
        <ShieldX className="h-14 w-14 md:h-16 md:w-16 text-destructive" />
        <h1 className="text-xl font-bold md:text-2xl text-center">Accès refusé</h1>
        <p className="text-center text-sm text-muted-foreground max-w-xs">
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
