import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { Navbar } from '@/components/Navbar';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/PageHeader';
import { StatCard } from '@/components/StatCard';
import { Camera, Clock, Activity, AlertTriangle, CheckCircle, ArrowRight } from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [recent, setRecent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [invLoading, setInvLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [confirmingInvite, setConfirmingInvite] = useState<{ link_id: number; profName?: string } | null>(null);

  useEffect(() => {
    Promise.allSettled([
      api.getStatistics().then(r => setStats(r.data || r)),
      api.getHistory(1, 5).then(r => setRecent(r.data?.analyses || r.data || [])),
    ]).finally(() => setLoading(false));

    // Charger invitations patient
    (async () => {
      try {
        setInvLoading(true);
        const res: any = await api.getMyInvitations();
        setInvitations(res?.data?.invitations || res?.invitations || []);
      } catch (e: any) {
        console.error('Failed to load invitations', e);
        toast({ title: 'Erreur', description: e?.message || 'Erreur lors du chargement des invitations' });
      } finally {
        setInvLoading(false);
      }
    })();
  }, []);

  // Map API stats shape to dashboard cards
  const totalAnalyses = stats?.total_analyses ?? 0;
  const resultsSains = stats?.par_niveau_risque?.sain ?? 0;
  const pathologiesDetected = Array.isArray(stats?.par_pathologie) ? (stats.par_pathologie.reduce((acc:any, p:any) => acc + (p.count || 0), 0)) : 0;
  const lastAnalysisDate = stats?.derniere_analyse?.date_analyse ? new Date(stats.derniere_analyse.date_analyse).toLocaleDateString('fr') : '-';

  const statCards = [
    { label: 'Analyses totales', value: totalAnalyses, icon: Activity, color: 'text-primary' },
    { label: 'Resultats sains', value: resultsSains, icon: CheckCircle, color: 'text-emerald-500' },
    { label: 'Pathologies', value: pathologiesDetected, icon: AlertTriangle, color: 'text-amber-500' },
    { label: 'Derniere analyse', value: lastAnalysisDate, icon: Clock, color: 'text-blue-500' },
  ];

  const riskColor = (risk: string) => {
    const m: Record<string, string> = { sain: 'bg-emerald-100 text-emerald-700', bas: 'bg-blue-100 text-blue-700', modere: 'bg-amber-100 text-amber-700', eleve: 'bg-orange-100 text-orange-700', critique: 'bg-red-100 text-red-700' };
    return m[risk] || 'bg-muted text-muted-foreground';
  };

  return (
    <div className="flex min-h-dvh flex-col bg-muted/30">
      <Navbar />
      <main className="container flex-1 py-4 pb-24 md:py-8 md:pb-8">
        <PageHeader 
          title={`Bonjour, ${user?.prenom || user?.nom}`}
          subtitle="Voici un resume de vos analyses"
          action={
            <Button asChild className="h-12 w-full gap-2 rounded-xl text-base md:h-10 md:w-auto md:text-sm">
              <Link to="/analyze"><Camera className="h-4 w-4" /> Nouvelle analyse</Link>
            </Button>
          }
        />

        {/* Invitations */}
        <div className="mb-6">
          <Card className="shadow-sm">
            <CardHeader className="flex-row items-center justify-between p-4 md:p-6">
              <CardTitle className="text-base md:text-lg">Invitations de suivi</CardTitle>
              <Button variant="ghost" size="sm" asChild className="gap-1 text-xs md:text-sm">
                <Link to="/patient/follow-requests">Mes demandes</Link>
              </Button>
            </CardHeader>
            <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
              {invLoading ? (
                <div className="flex justify-center py-6"><div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
              ) : invitations.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">Vous n&apos;avez aucune invitation pour le moment.</div>
              ) : (
                <div className="space-y-3">
                  {invitations.map((inv: any) => (
                    <div key={inv.link_id} className="flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-medium">{inv.professional_prenom ? `${inv.professional_prenom} ${inv.professional_nom}` : inv.professional_nom}</p>
                        <p className="text-xs text-muted-foreground">{inv.professional_email}</p>
                        <p className="text-xs text-muted-foreground">Recue le {new Date(inv.created_at).toLocaleDateString('fr')}</p>
                      </div>
                      <div className="flex w-full gap-2 sm:w-auto">
                        <Button size="sm" className="h-11 flex-1 sm:flex-none" onClick={() => setConfirmingInvite({ link_id: inv.link_id, profName: inv.professional_prenom ? `${inv.professional_prenom} ${inv.professional_nom}` : inv.professional_nom })}>Accepter</Button>
                        <Button size="sm" variant="outline" className="h-11 flex-1 sm:flex-none" onClick={async () => {
                          try {
                            await api.respondInvitation(inv.link_id, 'reject');
                            toast({ title: 'Invitation refusee', description: 'Vous avez refuse l\'invitation.' });
                            const res: any = await api.getMyInvitations();
                            setInvitations(res?.data?.invitations || res?.invitations || []);
                          } catch (err) {
                            toast({ title: 'Erreur', description: (err as any)?.message || 'Erreur' });
                          }
                        }}>Refuser</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Confirmation modal for accepting an invitation */}
        <Dialog open={!!confirmingInvite} onOpenChange={(open) => { if (!open) setConfirmingInvite(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmer l&apos;invitation</DialogTitle>
            </DialogHeader>
            <div className="py-2">
              <p>Accepter l&apos;invitation de suivi{confirmingInvite?.profName ? ` de ${confirmingInvite.profName}` : ''} ?</p>
            </div>
            <DialogFooter>
              <div className="flex w-full gap-2 sm:justify-end">
                <Button variant="outline" className="flex-1 sm:flex-none" onClick={() => setConfirmingInvite(null)}>Annuler</Button>
                <Button className="flex-1 sm:flex-none" onClick={async () => {
                  if (!confirmingInvite) return;
                    try {
                      await api.respondInvitation(confirmingInvite.link_id, 'accept');
                      toast({ title: 'Invitation acceptee', description: 'Vous etes maintenant lie au professionnel.' });
                      setConfirmingInvite(null);
                      navigate('/treatments');
                    } catch (err) {
                      toast({ title: 'Erreur', description: (err as any)?.message || 'Erreur' });
                  }
                }}>Confirmer</Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {statCards.map(({ label, value, icon, color }) => (
            <StatCard key={label} label={label} value={value} icon={icon} color={color} />
          ))}
        </div>

        {/* Recent analyses */}
        <Card className="shadow-sm">
          <CardHeader className="flex-row items-center justify-between p-4 md:p-6">
            <CardTitle className="text-base md:text-lg">Analyses recentes</CardTitle>
            <Button variant="ghost" size="sm" asChild className="gap-1 text-primary">
              <Link to="/history">Tout voir <ArrowRight className="h-3.5 w-3.5" /></Link>
            </Button>
          </CardHeader>
          <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
            {loading ? (
              <div className="flex justify-center py-8"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
            ) : recent.length === 0 ? (
              <div className="py-12 text-center">
                <Camera className="mx-auto h-12 w-12 text-muted-foreground/40" />
                <p className="mt-3 text-muted-foreground">Aucune analyse pour le moment</p>
                <Button asChild className="mt-4 h-11 gap-2 rounded-xl" size="sm">
                  <Link to="/analyze"><Camera className="h-4 w-4" /> Lancer une analyse</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {recent.map((a: any) => (
                  <Link
                    key={a.id || a.uuid}
                    to={`/history`}
                    className="flex min-h-[64px] items-center justify-between rounded-xl border p-3 transition-colors hover:bg-muted/50 md:p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-muted md:h-10 md:w-10">
                        <Activity className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{a.pathologie_label || a.diagnostic || 'Analyse'}</p>
                        <p className="text-xs text-muted-foreground">
                          {a.date_analyse ? new Date(a.date_analyse).toLocaleDateString('fr') : ''}
                        </p>
                      </div>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${riskColor(a.niveau_risque)}`}>
                      {a.niveau_risque || a.status}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Dashboard;
