import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { PageHeader } from '@/components/PageHeader';
import { Clock, Activity, Trash2, ChevronLeft, ChevronRight, Camera } from 'lucide-react';
import { Link } from 'react-router-dom';

const History = () => {
  const { toast } = useToast();
  const [analyses, setAnalyses] = useState<any[]>([]);
  const [profileId, setProfileId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const limit = 10;

  const load = async (p: number) => {
    setLoading(true);
    try {
      const res = await api.getHistory(p, limit);
      const data = res.data || res;
      const analysesList = data.analyses || data || [];
      setAnalyses(analysesList);
      const totalCount = data.pagination?.total ?? data.total ?? (Array.isArray(analysesList) ? analysesList.length : 0);
      setTotal(Number(totalCount || 0));
      setPage(p);
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(1); }, []);

  useEffect(() => {
    (async () => {
      try {
        const meRes: any = await api.getProfile();
        const prof = (meRes.data || meRes)?.profile || (meRes.data || meRes)?.user || (meRes.data || meRes);
        if (prof && prof.id) setProfileId(Number(prof.id));
      } catch (e) {
        // ignore
      }
    })();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette analyse ?')) return;
    try {
      await api.deleteAnalysis(id);
      toast({ title: 'Analyse supprimee' });
      load(page);
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    }
  };

  const toggleVisibility = async (analysisId: string | number, current: number) => {
    const newVis = current === 1 ? 0 : 1;
    try {
      // Optimistic update
      setAnalyses(prev => prev.map(a => (a.id === analysisId || a.uuid === analysisId ? { ...a, visibility_status: newVis } : a)));
      await api.updateAnalysisVisibility(analysisId, newVis as 0 | 1);
      toast({ title: 'Visibilite mise a jour' });
    } catch (err: any) {
      // Revert on error
      setAnalyses(prev => prev.map(a => (a.id === analysisId || a.uuid === analysisId ? { ...a, visibility_status: current } : a)));
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    }
  };

  const riskColor = (r: string) => {
    const m: Record<string, string> = { sain: 'bg-emerald-100 text-emerald-700', bas: 'bg-blue-100 text-blue-700', modere: 'bg-amber-100 text-amber-700', eleve: 'bg-orange-100 text-orange-700', critique: 'bg-red-100 text-red-700' };
    return m[r] || 'bg-muted text-muted-foreground';
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="flex min-h-dvh flex-col bg-muted/30">
      <Navbar />
      <main className="container flex-1 py-4 pb-24 md:py-8 md:pb-8">
        <PageHeader 
          title="Historique"
          subtitle={`${total} analyse${total > 1 ? 's' : ''} au total`}
          action={
            <Button asChild className="h-12 w-full gap-2 rounded-xl text-base md:h-10 md:w-auto md:text-sm">
              <Link to="/analyze"><Camera className="h-4 w-4" /> Nouvelle analyse</Link>
            </Button>
          }
        />

        {loading ? (
          <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
        ) : analyses.length === 0 ? (
          <Card className="shadow-sm">
            <CardContent className="py-16 text-center">
              <Clock className="mx-auto h-14 w-14 text-muted-foreground/30" />
              <p className="mt-4 text-lg font-medium text-muted-foreground">Aucune analyse dans l&apos;historique</p>
              <Button asChild className="mt-4 h-11 gap-2 rounded-xl"><Link to="/analyze"><Camera className="h-4 w-4" /> Lancer une analyse</Link></Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="space-y-3">
              {analyses.map((a: any) => (
                <Card key={a.id || a.uuid} className="shadow-sm transition-shadow hover:shadow-md">
                  <CardContent className="p-4">
                    {/* Mobile layout */}
                    <div className="flex items-start gap-3 md:hidden">
                      <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Activity className="h-6 w-6" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{a.pathologie_label || a.diagnostic || 'Analyse'}</p>
                        <p className="text-xs text-muted-foreground">
                          {a.date_analyse ? new Date(a.date_analyse).toLocaleDateString('fr', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${riskColor(a.niveau_risque)}`}>
                            {a.niveau_risque || a.status}
                          </span>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${a.visibility_status === 1 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                            {a.visibility_status === 1 ? 'Visible' : 'Prive'}
                          </span>
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Partager</span>
                            <Switch
                              aria-label="Autoriser la consultation"
                              checked={!!(a.visibility_status === 1)}
                              onCheckedChange={() => toggleVisibility(a.id || a.uuid, a.visibility_status ?? 0)}
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            {profileId && (
                              <Link to={`/patients/${profileId}/history/${a.id || a.uuid}`} className="text-sm text-primary">Voir</Link>
                            )}
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(a.id || a.uuid)} className="h-11 w-11 text-muted-foreground hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Desktop layout */}
                    <div className="hidden items-center justify-between gap-4 md:flex">
                      <div className="flex items-center gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <Activity className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium">{a.pathologie_label || a.diagnostic || 'Analyse'}</p>
                          <p className="text-xs text-muted-foreground">
                            {a.date_analyse ? new Date(a.date_analyse).toLocaleDateString('fr', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}
                            {a.score_confiance ? ` - Confiance: ${Math.round(a.score_confiance * 100)}%` : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {profileId ? (
                          <Link to={`/patients/${profileId}/history/${a.id || a.uuid}`} className="text-primary mr-2">Voir</Link>
                        ) : null}
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${riskColor(a.niveau_risque)}`}>
                          {a.niveau_risque || a.status}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground mr-1">Confidentialite</span>
                          <Switch
                            aria-label="Autoriser la consultation par les professionnels et administrateurs"
                            checked={!!(a.visibility_status === 1)}
                            onCheckedChange={() => toggleVisibility(a.id || a.uuid, a.visibility_status ?? 0)}
                          />
                        </div>
                        <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-semibold ${a.visibility_status === 1 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                          {a.visibility_status === 1 ? 'visible aux professionnels' : 'prive'}
                        </span>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(a.id || a.uuid)} className="text-muted-foreground hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-center gap-2">
                <Button variant="outline" size="sm" className="h-10 px-4" disabled={page <= 1} onClick={() => load(page - 1)}>
                  <ChevronLeft className="mr-1 h-4 w-4" /> Prec.
                </Button>
                <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
                <Button variant="outline" size="sm" className="h-10 px-4" disabled={page >= totalPages} onClick={() => load(page + 1)}>
                  Suiv. <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default History;
