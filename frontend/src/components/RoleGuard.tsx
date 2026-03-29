import { Navigate } from 'react-router-dom';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { Loader2, ShieldX } from 'lucide-react';

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
      <div className="flex min-h-screen items-center justify-center">
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
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
        <ShieldX className="h-16 w-16 text-destructive" />
        <h1 className="text-2xl font-bold text-foreground">Acces refuse</h1>
        <p className="text-center text-muted-foreground">
          Vous n&apos;avez pas les permissions necessaires pour acceder a cette page.
        </p>
        <a 
          href="/dashboard" 
          className="mt-4 rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
        >
          Retour au tableau de bord
        </a>
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
