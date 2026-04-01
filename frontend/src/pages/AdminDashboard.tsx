import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { Navbar } from '@/components/Navbar';
import { PageHeader } from '@/components/PageHeader';
import { StatCard } from '@/components/StatCard';
import { MobileListItem } from '@/components/MobileListItem';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Users, Activity, MessageSquare, FileText, Shield,
  Search, MoreVertical, ChevronLeft, ChevronRight,
  AlertTriangle, CheckCircle, Clock, TrendingUp
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface DashboardStats {
  users: { total: number; active: number; by_role: Record<string, number> };
  analyses: { total: number; today: number; by_risk: Record<string, number> };
  treatments: { active: number; total: number };
  feedback: { pending: number; total: number };
}

interface User {
  id: number;
  nom: string;
  prenom?: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
  last_login?: string;
}

const AdminDashboard = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [usersPagination, setUsersPagination] = useState({ page: 1, total: 0, pages: 0 });
  const [usersFilter, setUsersFilter] = useState({ role: '', status: '', search: '' });
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [analyses, setAnalyses] = useState<any[]>([]);
  const [analysesPagination, setAnalysesPagination] = useState({ page: 1, total: 0, pages: 0 });
  const [analysesFilter, setAnalysesFilter] = useState({ risk: '', status: '' });

  useEffect(() => { loadDashboard(); }, []);
  useEffect(() => { loadUsers(); }, [usersFilter, usersPagination.page]);
  useEffect(() => { loadAnalyses(); }, [analysesFilter, analysesPagination.page]);

  const loadDashboard = async () => {
    try {
      const res = await api.getAdminDashboard();
      setStats(res.data || res);
    } catch (err) {
      console.error('Failed to load dashboard', err);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const res = await api.getAdminUsers({ page: usersPagination.page, limit: 10, ...usersFilter });
      const data = res.data || res;
      setUsers(data.users || []);
      setUsersPagination(p => ({ ...p, total: data.total || 0, pages: data.pages || 0 }));
    } catch (err) {
      console.error('Failed to load users', err);
    }
  };

  const loadAnalyses = async () => {
    try {
      const res = await api.getAdminAnalyses({
        page: analysesPagination.page, limit: 10,
        risk: analysesFilter.risk || undefined,
        status: analysesFilter.status || undefined,
      });
      const data = res.data || res;
      setAnalyses(data.analyses || []);
      setAnalysesPagination(p => ({ ...p, total: data.total || 0, pages: data.pages || 0 }));
    } catch (err) {
      console.error('Failed to load analyses', err);
    }
  };

  const navigate = useNavigate();

  const handleRoleChange = async (userId: number, newRole: string) => {
    try {
      await api.updateUserRole(userId, newRole as any);
      loadUsers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleStatusChange = async (userId: number, newStatus: string) => {
    try {
      await api.updateUserStatus(userId, newStatus);
      loadUsers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const roleColor = (role: string) => {
    const m: Record<string, string> = {
      admin: 'bg-purple-100 text-purple-700 border-purple-200',
      professional: 'bg-blue-100 text-blue-700 border-blue-200',
      student: 'bg-amber-100 text-amber-700 border-amber-200',
      user: 'bg-slate-100 text-slate-700 border-slate-200'
    };
    return m[role] || 'bg-muted text-muted-foreground';
  };

  const statusColor = (status: string) => {
    const m: Record<string, string> = {
      active: 'bg-emerald-100 text-emerald-700',
      inactive: 'bg-slate-100 text-slate-700',
      suspended: 'bg-red-100 text-red-700',
      pending_verification: 'bg-amber-100 text-amber-700',
      pending: 'bg-amber-100 text-amber-700',
      approved: 'bg-emerald-100 text-emerald-700'
    };
    return m[status] || 'bg-muted text-muted-foreground';
  };

  const riskColor = (risk: string) => {
    const m: Record<string, string> = {
      sain: 'bg-emerald-100 text-emerald-700',
      bas: 'bg-blue-100 text-blue-700',
      modere: 'bg-amber-100 text-amber-700',
      eleve: 'bg-orange-100 text-orange-700',
      critique: 'bg-red-100 text-red-700',
    };
    return m[risk] || 'bg-muted text-muted-foreground';
  };

  const statCards = [
    { label: 'Utilisateurs', value: stats?.users.total ?? 0, sub: `${stats?.users.active ?? 0} actifs`, icon: Users, color: 'text-blue-500' },
    { label: 'Analyses', value: stats?.analyses.total ?? 0, sub: `+${stats?.analyses.today ?? 0} auj.`, icon: Activity, color: 'text-emerald-500' },
    { label: 'Traitements', value: stats?.treatments.total ?? 0, sub: `${stats?.treatments.active ?? 0} actifs`, icon: TrendingUp, color: 'text-purple-500' },
    { label: 'Feedbacks', value: stats?.feedback.total ?? 0, sub: `${stats?.feedback.pending ?? 0} en attente`, icon: MessageSquare, color: 'text-amber-500' },
  ];

  // ── Composant user action menu (réutilisé mobile + desktop) ───────────────
  const UserActionMenu = ({ user }: { user: User }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleStatusChange(user.id, 'active')}>
          <CheckCircle className="h-4 w-4 mr-2 text-emerald-500" /> Activer
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleStatusChange(user.id, 'suspended')}>
          <AlertTriangle className="h-4 w-4 mr-2 text-red-500" /> Suspendre
        </DropdownMenuItem>
        {user.role === 'professional' && (
          <>
            <DropdownMenuItem onClick={() => navigate(`/admin/validate-professionals?userId=${user.id}`)}>
              <Activity className="h-4 w-4 mr-2 text-primary" /> Voir / Valider
            </DropdownMenuItem>
            <DropdownMenuItem onClick={async () => {
              try {
                await api.verifyProfessional(user.id, true);
                loadUsers();
                alert('Professionnel approuvé');
              } catch (e: any) {
                if (e?.status === 409 && e?.data?.redirect) {
                  if (confirm(e.message + '\n\nVoulez-vous aller valider les documents maintenant ?')) {
                    navigate(e.data.redirect);
                  }
                } else {
                  alert(e.message || e);
                }
              }
            }}>
              <CheckCircle className="h-4 w-4 mr-2 text-emerald-500" /> Approuver
            </DropdownMenuItem>
            <DropdownMenuItem onClick={async () => {
              try { await api.verifyProfessional(user.id, false); loadUsers(); alert('Remis en attente'); }
              catch (e: any) { alert(e.message || e); }
            }}>
              <AlertTriangle className="h-4 w-4 mr-2 text-red-500" /> Refuser
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="flex min-h-dvh flex-col bg-muted/30">
      <Navbar />
      <main className="container flex-1 py-4 pb-24 md:py-8 md:pb-8">

        {/* Header */}
        <PageHeader
          title="Administration"
          subtitle="Gestion et supervision de la plateforme"
          action={
            <Button asChild className="h-12 w-full gap-2 rounded-xl text-base md:h-10 md:w-auto md:text-sm">
              <Link to="/admin/validate-professionals">
                <Shield className="h-4 w-4" /> Valider les pros
              </Link>
            </Button>
          }
        />

        {/* Stats — 2 colonnes mobile, 4 colonnes desktop */}
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          {statCards.map(({ label, value, sub, icon: Icon, color }) => (
            <div key={label}>
              <StatCard label={label} value={value} icon={Icon} color={color} />
              <p className="mt-1 text-center text-xs text-muted-foreground">{sub}</p>
            </div>
          ))}
        </div>

        {/* Répartition des rôles */}
        {stats?.users.by_role && (
          <div className="mb-6 flex flex-wrap gap-2">
            {Object.entries(stats.users.by_role).map(([role, count]) => (
              <Badge key={role} variant="outline" className={`${roleColor(role)} px-3 py-1`}>
                {role}: {count}
              </Badge>
            ))}
          </div>
        )}

        {/* Tabs — grid pleine largeur */}
        <Tabs defaultValue="users" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="users" className="gap-1 text-xs sm:gap-2 sm:text-sm">
              <Users className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Utilisateurs</span>
              <span className="sm:hidden">Users</span>
            </TabsTrigger>
            <TabsTrigger value="analyses" className="gap-1 text-xs sm:gap-2 sm:text-sm">
              <Activity className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Analyses</span>
              <span className="sm:hidden">IA</span>
            </TabsTrigger>
            <TabsTrigger value="feedback" className="gap-1 text-xs sm:gap-2 sm:text-sm">
              <MessageSquare className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Feedbacks</span>
              <span className="sm:hidden">Avis</span>
            </TabsTrigger>
            <TabsTrigger value="logs" className="gap-1 text-xs sm:gap-2 sm:text-sm">
              <FileText className="h-4 w-4 shrink-0" />
              <span>Logs</span>
            </TabsTrigger>
          </TabsList>

          {/* ── TAB UTILISATEURS ─────────────────────────────────────────── */}
          <TabsContent value="users">
            <Card className="shadow-sm">
              <CardHeader className="p-4 md:p-6">
                <CardTitle className="text-base md:text-lg">Gestion des utilisateurs</CardTitle>

                {/* Filtres — empilés sur mobile */}
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <div className="relative w-full sm:w-48">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher..."
                      className="h-11 w-full pl-9 text-base"
                      value={usersFilter.search}
                      onChange={(e) => setUsersFilter(f => ({ ...f, search: e.target.value }))}
                    />
                  </div>
                  <Select value={usersFilter.role} onValueChange={(v) => setUsersFilter(f => ({ ...f, role: v === 'all' ? '' : v }))}>
                    <SelectTrigger className="h-11 w-full text-base sm:w-36">
                      <SelectValue placeholder="Rôle" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les rôles</SelectItem>
                      <SelectItem value="user">Utilisateur</SelectItem>
                      <SelectItem value="student">Etudiant</SelectItem>
                      <SelectItem value="professional">Professionnel</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={usersFilter.status} onValueChange={(v) => setUsersFilter(f => ({ ...f, status: v === 'all' ? '' : v }))}>
                    <SelectTrigger className="h-11 w-full text-base sm:w-36">
                      <SelectValue placeholder="Statut" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les statuts</SelectItem>
                      <SelectItem value="active">Actif</SelectItem>
                      <SelectItem value="inactive">Inactif</SelectItem>
                      <SelectItem value="suspended">Suspendu</SelectItem>
                      <SelectItem value="pending">En attente</SelectItem>
                      <SelectItem value="approved">Approuvé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>

              <CardContent className="p-0 md:p-6 md:pt-0">

                {/* ── Liste cards mobile (md:hidden) ────────────────────── */}
                <div className="divide-y md:hidden">
                  {users.length === 0 ? (
                    <p className="py-10 text-center text-sm text-muted-foreground">Aucun utilisateur</p>
                  ) : users.map(user => (
                    <div key={user.id} className="flex items-center gap-3 px-4 py-3">
                      {/* Avatar initiales */}
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                        {((user.prenom?.[0] || user.nom?.[0] || '?')).toUpperCase()}
                      </div>

                      {/* Infos */}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">
                          {`${user.prenom || ''} ${user.nom || ''}`.trim()}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          <Badge variant="outline" className={`${roleColor(user.role)} text-[10px] px-1.5 py-0`}>
                            {user.role}
                          </Badge>
                          <Badge variant="outline" className={`${statusColor(user.status)} text-[10px] px-1.5 py-0`}>
                            {user.status}
                          </Badge>
                        </div>
                      </div>

                      {/* Action menu */}
                      <UserActionMenu user={user} />
                    </div>
                  ))}
                </div>

                {/* ── Table desktop (hidden md:block) ───────────────────── */}
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Utilisateur</TableHead>
                        <TableHead>Rôle</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Inscription</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map(user => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{user.prenom} {user.nom}</p>
                              <p className="text-sm text-muted-foreground">{user.email}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Select defaultValue={user.role} onValueChange={(v) => handleRoleChange(user.id, v)}>
                              <SelectTrigger className={`w-32 ${roleColor(user.role)}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="user">Utilisateur</SelectItem>
                                <SelectItem value="student">Etudiant</SelectItem>
                                <SelectItem value="professional">Professionnel</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={statusColor(user.status)}>
                              {user.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(user.created_at).toLocaleDateString('fr')}
                          </TableCell>
                          <TableCell>
                            <UserActionMenu user={user} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {usersPagination.pages > 1 && (
                  <div className="flex items-center justify-between border-t p-4">
                    <p className="text-sm text-muted-foreground">
                      {usersPagination.page} / {usersPagination.pages}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-10 w-10 p-0"
                        disabled={usersPagination.page <= 1}
                        onClick={() => setUsersPagination(p => ({ ...p, page: p.page - 1 }))}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-10 w-10 p-0"
                        disabled={usersPagination.page >= usersPagination.pages}
                        onClick={() => setUsersPagination(p => ({ ...p, page: p.page + 1 }))}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── TAB ANALYSES ─────────────────────────────────────────────── */}
          <TabsContent value="analyses">
            <Card className="shadow-sm">
              <CardHeader className="p-4 md:p-6">
                <CardTitle className="text-base md:text-lg">Analyses</CardTitle>

                {/* Filtres analyses */}
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                  <Select value={analysesFilter.risk || 'all'} onValueChange={(v) => setAnalysesFilter(f => ({ ...f, risk: v === 'all' ? '' : v }))}>
                    <SelectTrigger className="h-11 w-full text-base sm:w-36">
                      <SelectValue placeholder="Risque" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous</SelectItem>
                      <SelectItem value="sain">Sain</SelectItem>
                      <SelectItem value="bas">Bas</SelectItem>
                      <SelectItem value="modere">Modéré</SelectItem>
                      <SelectItem value="eleve">Élevé</SelectItem>
                      <SelectItem value="critique">Critique</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={analysesFilter.status || 'all'} onValueChange={(v) => setAnalysesFilter(f => ({ ...f, status: v === 'all' ? '' : v }))}>
                    <SelectTrigger className="h-11 w-full text-base sm:w-36">
                      <SelectValue placeholder="Statut" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous</SelectItem>
                      <SelectItem value="pending">En attente</SelectItem>
                      <SelectItem value="completed">Terminé</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    className="h-11 w-full rounded-xl text-base sm:w-auto"
                    onClick={() => { setAnalysesPagination(p => ({ ...p, page: 1 })); loadAnalyses(); }}
                  >
                    Filtrer
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="p-0 md:p-6 md:pt-0">

                {/* ── Cards mobile analyses ─────────────────────────────── */}
                <div className="divide-y md:hidden">
                  {analyses.length === 0 ? (
                    <p className="py-10 text-center text-sm text-muted-foreground">Aucune analyse</p>
                  ) : analyses.map(a => (
                    <div key={a.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Activity className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">
                          {a.pathologie_label || a.pathologie || 'Analyse'}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {a.user_nom || a.user_email || 'Anonyme'} · {a.date_analyse ? new Date(a.date_analyse).toLocaleDateString('fr') : '—'}
                        </p>
                        <div className="mt-1 flex gap-1">
                          {a.niveau_risque && (
                            <Badge variant="outline" className={`${riskColor(a.niveau_risque)} text-[10px] px-1.5 py-0`}>
                              {a.niveau_risque}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Link
                        to={`/admin/analyses/${a.id}`}
                        className="shrink-0 text-sm font-medium text-primary hover:underline"
                      >
                        Voir
                      </Link>
                    </div>
                  ))}
                </div>

                {/* ── Table desktop analyses ────────────────────────────── */}
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>UUID</TableHead>
                        <TableHead>Propriétaire</TableHead>
                        <TableHead>Risque</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Créée</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analyses.map(a => (
                        <TableRow key={a.id}>
                          <TableCell className="font-mono text-xs">{(a.uuid || a.id)?.toString().slice(0, 8)}…</TableCell>
                          <TableCell>{a.user_nom || a.user_email || '—'}</TableCell>
                          <TableCell>
                            {a.niveau_risque && (
                              <Badge variant="outline" className={riskColor(a.niveau_risque)}>
                                {a.niveau_risque}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>{a.status || '—'}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {a.date_analyse ? new Date(a.date_analyse).toLocaleDateString('fr') : (a.created_at ? new Date(a.created_at).toLocaleDateString('fr') : '—')}
                          </TableCell>
                          <TableCell>
                            <Link to={`/admin/analyses/${a.id}`} className="text-primary hover:underline">Voir</Link>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination analyses */}
                {analysesPagination.pages > 1 && (
                  <div className="flex items-center justify-between border-t p-4">
                    <p className="text-sm text-muted-foreground">
                      {analysesPagination.page} / {analysesPagination.pages}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline" size="sm" className="h-10 w-10 p-0"
                        disabled={analysesPagination.page <= 1}
                        onClick={() => setAnalysesPagination(p => ({ ...p, page: p.page - 1 }))}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline" size="sm" className="h-10 w-10 p-0"
                        disabled={analysesPagination.page >= analysesPagination.pages}
                        onClick={() => setAnalysesPagination(p => ({ ...p, page: p.page + 1 }))}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── TAB FEEDBACK ─────────────────────────────────────────────── */}
          <TabsContent value="feedback">
            <FeedbackTab />
          </TabsContent>

          {/* ── TAB LOGS ─────────────────────────────────────────────────── */}
          <TabsContent value="logs">
            <LogsTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

// ── Feedback Tab ──────────────────────────────────────────────────────────────
const FeedbackTab = () => {
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('new');

  useEffect(() => { loadFeedbacks(); }, [filter]);

  const loadFeedbacks = async () => {
    setLoading(true);
    try {
      const res = await api.getAdminFeedback({ status: filter, limit: 20 });
      setFeedbacks((res.data || res).feedbacks || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id: number, status: string) => {
    try {
      await api.updateFeedback(id, { status });
      loadFeedbacks();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="p-4 md:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base md:text-lg">Feedbacks utilisateurs</CardTitle>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="h-11 w-full text-base sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new">Nouveaux</SelectItem>
              <SelectItem value="reviewed">Examinés</SelectItem>
              <SelectItem value="resolved">Résolus</SelectItem>
              <SelectItem value="ignored">Ignorés</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : feedbacks.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Aucun feedback</p>
        ) : (
          <div className="space-y-3">
            {feedbacks.map((fb: any) => (
              <div key={fb.id} className="rounded-xl border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="text-xs">{fb.type}</Badge>
                      {fb.rating && (
                        <span className="text-xs text-muted-foreground">Note : {fb.rating}/5</span>
                      )}
                    </div>
                    <p className="text-sm">{fb.commentaire}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {fb.user_nom || 'Anonyme'} · {new Date(fb.created_at).toLocaleDateString('fr')}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleStatusUpdate(fb.id, 'reviewed')}>
                        Marquer examiné
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleStatusUpdate(fb.id, 'resolved')}>
                        Marquer résolu
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleStatusUpdate(fb.id, 'ignored')}>
                        Ignorer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ── Logs Tab ──────────────────────────────────────────────────────────────────
const LogsTab = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [severity, setSeverity] = useState('');

  useEffect(() => { loadLogs(); }, [severity]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const res = await api.getAdminLogs({ severity, limit: 50 });
      setLogs((res.data || res).logs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const severityColor = (sev: string) => {
    const m: Record<string, string> = {
      debug: 'bg-slate-100 text-slate-700',
      info: 'bg-blue-100 text-blue-700',
      warning: 'bg-amber-100 text-amber-700',
      error: 'bg-red-100 text-red-700',
      critical: 'bg-red-200 text-red-800'
    };
    return m[sev] || 'bg-muted text-muted-foreground';
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="p-4 md:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base md:text-lg">Logs système</CardTitle>
          <Select value={severity} onValueChange={(v) => setSeverity(v === 'all' ? '' : v)}>
            <SelectTrigger className="h-11 w-full text-base sm:w-40">
              <SelectValue placeholder="Tous niveaux" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous niveaux</SelectItem>
              <SelectItem value="debug">Debug</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="error">Error</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : logs.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Aucun log</p>
        ) : (
          <div className="max-h-[480px] space-y-2 overflow-y-auto">
            {logs.map((log: any) => (
              <div key={log.id} className="flex items-start gap-3 rounded-lg border p-3">
                <Badge className={`${severityColor(log.severity)} shrink-0 text-[10px]`}>
                  {log.severity}
                </Badge>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{log.action}</p>
                  <p className="truncate text-xs text-muted-foreground">{log.description}</p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {new Date(log.created_at).toLocaleTimeString('fr')}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminDashboard;