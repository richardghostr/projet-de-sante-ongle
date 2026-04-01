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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
  // Admin: analyses list + pagination/filters
  const [analyses, setAnalyses] = useState<any[]>([]);
  const [analysesPagination, setAnalysesPagination] = useState({ page: 1, total: 0, pages: 0 });
  const [analysesFilter, setAnalysesFilter] = useState({ risk: '', status: '' });

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    loadUsers();
  }, [usersFilter, usersPagination.page]);

  useEffect(() => {
    loadAnalyses();
  }, [analysesFilter, analysesPagination.page]);

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
      const res = await api.getAdminUsers({
        page: usersPagination.page,
        limit: 10,
        ...usersFilter
      });
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
        page: analysesPagination.page,
        limit: 10,
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

  const statCards = [
    { label: 'Utilisateurs', value: stats?.users.total ?? 0, sub: `${stats?.users.active ?? 0} actifs`, icon: Users, color: 'text-blue-500' },
    { label: 'Analyses', value: stats?.analyses.total ?? 0, sub: `${stats?.analyses.today ?? 0} aujourd'hui`, icon: Activity, color: 'text-emerald-500' },
    { label: 'Traitements', value: stats?.treatments.total ?? 0, sub: `${stats?.treatments.active ?? 0} actifs`, icon: TrendingUp, color: 'text-purple-500' },
    { label: 'Feedbacks', value: stats?.feedback.total ?? 0, sub: `${stats?.feedback.pending ?? 0} en attente`, icon: MessageSquare, color: 'text-amber-500' },
  ];

  return (
    <div className="flex min-h-dvh flex-col bg-muted/30">
      <Navbar />
      <main className="container flex-1 py-4 pb-24 md:py-8 md:pb-8">
        <PageHeader
          title="Tableau de bord Admin"
          subtitle="Gestion et supervision de la plateforme"
        />

        {/* Stats */}
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          {statCards.map(({ label, value, sub, icon: Icon, color }) => (
            <StatCard key={label} label={label} value={value} icon={Icon} color={color} />
          ))}
        </div>

        {/* Role distribution */}
        {stats?.users.by_role && (
          <div className="mb-8 flex flex-wrap gap-2">
            {Object.entries(stats.users.by_role).map(([role, count]) => (
              <Badge key={role} variant="outline" className={`${roleColor(role)} px-3 py-1`}>
                {role}: {count}
              </Badge>
            ))}
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="users" className="gap-1.5 text-xs sm:text-sm">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Utilisateurs</span>
              <span className="sm:hidden">Users</span>
            </TabsTrigger>
            <TabsTrigger value="analyses" className="gap-1.5 text-xs sm:text-sm">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">Analyses</span>
              <span className="sm:hidden">IA</span>
            </TabsTrigger>
            <TabsTrigger value="feedback" className="gap-1.5 text-xs sm:text-sm">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Feedbacks</span>
              <span className="sm:hidden">Avis</span>
            </TabsTrigger>
            <TabsTrigger value="logs" className="gap-1.5 text-xs sm:text-sm">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Logs</span>
              <span className="sm:hidden">Logs</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <Card className="shadow-sm">
              <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <CardTitle>Gestion des utilisateurs</CardTitle>
                    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                      <div className="relative w-full sm:w-48">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          placeholder="Rechercher..."
                          className="h-11 pl-9 text-base w-full sm:w-48"
                          value={usersFilter.search}
                          onChange={(e) => setUsersFilter(f => ({ ...f, search: e.target.value }))}
                        />
                      </div>
                      <Select value={usersFilter.role} onValueChange={(v) => setUsersFilter(f => ({ ...f, role: v === 'all' ? '' : v }))}>
                        <SelectTrigger className="h-11 w-full text-base sm:w-36">
                          <SelectValue placeholder="Role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tous les roles</SelectItem>
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
                  </div>
              </CardHeader>
              <CardContent>
                {/* Liste mobile — visible uniquement sur mobile */}
                <div className="space-y-2 md:hidden">
                  {users.map((user) => (
                    <div key={user.id} className="relative">
                      <MobileListItem
                        avatar={
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
                            {(user.prenom?.[0] || user.nom?.[0] || '?').toUpperCase()}
                          </div>
                        }
                        title={`${user.prenom || ''} ${user.nom || ''}`.trim()}
                        subtitle={user.email}
                        badge={
                          <div className="flex flex-col items-end gap-1">
                            <Badge variant="outline" className={roleColor(user.role)}>{user.role}</Badge>
                            <Badge variant="outline" className={statusColor(user.status)} style={{fontSize:'10px'}}>{user.status}</Badge>
                          </div>
                        }
                        showChevron={false}
                        className="relative"
                      />
                      <div className="absolute top-2 right-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleStatusChange(user.id, 'active')}>
                              <CheckCircle className="h-4 w-4 mr-2 text-emerald-500" /> Activer
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStatusChange(user.id, 'suspended')}>
                              <AlertTriangle className="h-4 w-4 mr-2 text-red-500" /> Suspendre
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate(`/admin/validate-professionals?userId=${user.id}`)}>
                              <Activity className="h-4 w-4 mr-2 text-primary" /> Voir / Valider
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="hidden md:block">
                  <div className="overflow-auto">
                  <Table className="w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-sm text-muted-foreground">Utilisateur</TableHead>
                      <TableHead className="text-sm text-muted-foreground">Role</TableHead>
                      <TableHead className="text-sm text-muted-foreground">Statut</TableHead>
                      <TableHead className="text-sm text-muted-foreground">Inscription</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map(user => (
                      <TableRow key={user.id} className="hover:bg-muted/40">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
                              {(user.prenom?.[0] || user.nom?.[0] || '?').toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium">{user.prenom} {user.nom}</p>
                              <p className="text-sm text-muted-foreground">{user.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Select defaultValue={user.role} onValueChange={(v) => handleRoleChange(user.id, v)}>
                            <SelectTrigger className={`w-32 h-10 text-sm ${roleColor(user.role)}`}>
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
                          <Badge variant="outline" className={`${statusColor(user.status)} px-2 py-1 text-xs`}>
                            {user.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(user.created_at).toLocaleDateString('fr')}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
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
                                      alert('Professionnel approuve');
                                    } catch (e:any) {
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
                                  <DropdownMenuItem onClick={async () => { try { await api.verifyProfessional(user.id, false); loadUsers(); alert('Professionnel remis en attente'); } catch (e:any) { alert(e.message || e); } }}>
                                    <AlertTriangle className="h-4 w-4 mr-2 text-red-500" /> Refuser
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
                </div>

                {/* Pagination */}
                {usersPagination.pages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      Page {usersPagination.page} sur {usersPagination.pages}
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

          <TabsContent value="analyses">
            <Card className="shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Analyses</CardTitle>
                  <div className="flex items-center gap-2">
                    <Select value={analysesFilter.risk || 'all'} onValueChange={(v) => setAnalysesFilter(f => ({ ...f, risk: v === 'all' ? '' : v }))}>
                      <SelectTrigger className="w-36"><SelectValue placeholder="Risque" /></SelectTrigger>
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
                      <SelectTrigger className="w-36"><SelectValue placeholder="Statut" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous</SelectItem>
                        <SelectItem value="pending">En attente</SelectItem>
                        <SelectItem value="completed">Termine</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button onClick={() => { setAnalysesPagination(p => ({ ...p, page: 1 })); loadAnalyses(); }}>Filtrer</Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Mobile list for analyses */}
                <div className="space-y-2 md:hidden">
                  {analyses.map((a) => (
                    <MobileListItem
                      key={a.id}
                      avatar={<div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">{(a.user_nom?.[0] || '?').toUpperCase()}</div>}
                      title={a.user_nom || a.user_email || (a.uuid || a.id)}
                      subtitle={a.niveau_risque || a.risk || a.risque || '—'}
                      badge={<div className="flex flex-col items-end gap-1"><Badge variant="outline">{a.status || '—'}</Badge></div>}
                      showChevron={false}
                      className="relative"
                    />
                  ))}
                </div>

                <div className="hidden md:block">
                  <div className="overflow-auto">
                    <Table className="w-full">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-sm text-muted-foreground">UUID</TableHead>
                          <TableHead className="text-sm text-muted-foreground">Propriétaire</TableHead>
                          <TableHead className="text-sm text-muted-foreground">Risque</TableHead>
                          <TableHead className="text-sm text-muted-foreground">Statut</TableHead>
                          <TableHead className="text-sm text-muted-foreground">Créée</TableHead>
                          <TableHead className="w-12"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analyses.map(a => (
                          <TableRow key={a.id} className="hover:bg-muted/40">
                            <TableCell className="text-sm">{a.uuid || a.id}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">{(a.user_nom?.[0] || '?').toUpperCase()}</div>
                                <div>
                                  <div className="font-medium text-sm">{a.user_nom || a.user_email || '—'}</div>
                                  <div className="text-xs text-muted-foreground">{a.user_email || ''}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${analysisRiskClass(a.niveau_risque || a.risk || a.risque || '')}`}>
                                {a.niveau_risque || a.risk || a.risque || '—'}
                              </span>
                            </TableCell>
                            <TableCell className="text-sm">{a.status || '—'}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{a.date_analyse ? new Date(a.date_analyse).toLocaleDateString('fr') : (a.created_at ? new Date(a.created_at).toLocaleDateString('fr') : '—')}</TableCell>
                            <TableCell>
                              <Link to={`/admin/analyses/${a.id}`} className="text-primary">Voir</Link>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {analysesPagination.pages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <p className="text-sm text-muted-foreground">Page {analysesPagination.page} sur {analysesPagination.pages}</p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="h-10 w-10 p-0" disabled={analysesPagination.page <= 1} onClick={() => setAnalysesPagination(p => ({ ...p, page: p.page - 1 }))}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" className="h-10 w-10 p-0" disabled={analysesPagination.page >= analysesPagination.pages} onClick={() => setAnalysesPagination(p => ({ ...p, page: p.page + 1 }))}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="feedback">
            <FeedbackTab />
          </TabsContent>

          <TabsContent value="logs">
            <LogsTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

const analysisRiskClass = (risk: string) => {
  const m: Record<string, string> = {
    sain: 'text-emerald-700 bg-emerald-100',
    bas: 'text-blue-700 bg-blue-100',
    modere: 'text-amber-700 bg-amber-100',
    eleve: 'text-orange-700 bg-orange-100',
    critique: 'text-red-700 bg-red-100',
  };
  return m[risk] || 'text-muted-foreground bg-muted/30';
};

// Feedback Tab Component
const FeedbackTab = () => {
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('new');

  useEffect(() => {
    loadFeedbacks();
  }, [filter]);

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
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Feedbacks utilisateurs</CardTitle>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new">Nouveaux</SelectItem>
              <SelectItem value="reviewed">Examines</SelectItem>
              <SelectItem value="resolved">Resolus</SelectItem>
              <SelectItem value="ignored">Ignores</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : feedbacks.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Aucun feedback</p>
        ) : (
          <div className="space-y-4">
            {feedbacks.map((fb: any) => (
              <div key={fb.id} className="rounded-lg border p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">{fb.type}</Badge>
                      {fb.rating && <span className="text-sm">Note: {fb.rating}/5</span>}
                    </div>
                    <p className="text-sm">{fb.commentaire}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Par {fb.user_nom || 'Anonyme'} - {new Date(fb.created_at).toLocaleDateString('fr')}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">Actions</Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleStatusUpdate(fb.id, 'reviewed')}>
                        Marquer comme examine
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleStatusUpdate(fb.id, 'resolved')}>
                        Marquer comme resolu
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

// Logs Tab Component
const LogsTab = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [severity, setSeverity] = useState('');

  useEffect(() => {
    loadLogs();
  }, [severity]);

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
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Logs systeme</CardTitle>
          <Select value={severity} onValueChange={(v) => setSeverity(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-40">
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
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : logs.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Aucun log</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {logs.map((log: any) => (
              <div key={log.id} className="flex items-start gap-3 rounded border p-3 text-sm">
                <Badge className={`${severityColor(log.severity)} shrink-0`}>
                  {log.severity}
                </Badge>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{log.action}</p>
                  <p className="text-muted-foreground truncate">{log.description}</p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
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
