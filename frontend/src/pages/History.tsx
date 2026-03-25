import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Clock, Activity, Trash2, ChevronLeft, ChevronRight, Camera } from 'lucide-react';
import { Link } from 'react-router-dom';

const History = () => {
  const { toast } = useToast();
  const [analyses, setAnalyses] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const limit = 10;

  const load = async (p: number) => {
    setLoading(true);
    try {
      const res = await api.getHistory(p, limit);
      const data = res.data || res;
      setAnalyses(data.analyses || data || []);
      setTotal(data.total || 0);
      setPage(p);
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(1); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette analyse ?')) return;
    try {
      await api.deleteAnalysis(id);
      toast({ title: 'Analyse supprimée' });
      load(page);
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    }
  };

  const riskColor = (r: string) => {
    const m: Record<string, string> = { sain: 'bg-emerald-100 text-emerald-700', bas: 'bg-blue-100 text-blue-700', modere: 'bg-amber-100 text-amber-700', eleve: 'bg-orange-100 text-orange-700', critique: 'bg-red-100 text-red-700' };
    return m[r] || 'bg-muted text-muted-foreground';
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <Navbar />
      <main className="container flex-1 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Historique</h1>
            <p className="text-muted-foreground">{total} analyse{total > 1 ? 's' : ''} au total</p>
          </div>
          <Button asChild className="gap-2 rounded-xl">
            <Link to="/analyze"><Camera className="h-4 w-4" /> Nouvelle analyse</Link>
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
        ) : analyses.length === 0 ? (
          <Card className="shadow-sm">
            <CardContent className="py-16 text-center">
              <Clock className="mx-auto h-14 w-14 text-muted-foreground/30" />
              <p className="mt-4 text-lg font-medium text-muted-foreground">Aucune analyse dans l'historique</p>
              <Button asChild className="mt-4 gap-2 rounded-xl"><Link to="/analyze"><Camera className="h-4 w-4" /> Lancer une analyse</Link></Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="space-y-3">
              {analyses.map((a: any) => (
                <Card key={a.id || a.uuid} className="shadow-sm transition-shadow hover:shadow-md">
                  <CardContent className="flex items-center justify-between gap-4 p-5">
                    <div className="flex items-center gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Activity className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">{a.pathologie_label || a.diagnostic || 'Analyse'}</p>
                        <p className="text-xs text-muted-foreground">
                          {a.date_analyse ? new Date(a.date_analyse).toLocaleDateString('fr', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}
                          {a.score_confiance ? ` — Confiance: ${Math.round(a.score_confiance * 100)}%` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${riskColor(a.niveau_risque)}`}>
                        {a.niveau_risque || a.status}
                      </span>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(a.id || a.uuid)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-center gap-2">
                <Button variant="outline" size="icon" disabled={page <= 1} onClick={() => load(page - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">Page {page} / {totalPages}</span>
                <Button variant="outline" size="icon" disabled={page >= totalPages} onClick={() => load(page + 1)}>
                  <ChevronRight className="h-4 w-4" />
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
