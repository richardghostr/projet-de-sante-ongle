import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Camera, Clock, Activity, TrendingUp, AlertTriangle, CheckCircle, ArrowRight } from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [recent, setRecent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      api.getStatistics().then(r => setStats(r.data || r)),
      api.getHistory(1, 5).then(r => setRecent(r.data?.analyses || r.data || [])),
    ]).finally(() => setLoading(false));
  }, []);

  const statCards = [
    { label: 'Analyses totales', value: stats?.total ?? 0, icon: Activity, color: 'text-primary' },
    { label: 'Résultats sains', value: stats?.healthy ?? 0, icon: CheckCircle, color: 'text-emerald-500' },
    { label: 'Pathologies détectées', value: stats?.pathologies ?? 0, icon: AlertTriangle, color: 'text-amber-500' },
    { label: 'Dernière analyse', value: stats?.last_analysis ? new Date(stats.last_analysis).toLocaleDateString('fr') : '—', icon: Clock, color: 'text-blue-500' },
  ];

  const riskColor = (risk: string) => {
    const m: Record<string, string> = { sain: 'bg-emerald-100 text-emerald-700', bas: 'bg-blue-100 text-blue-700', modere: 'bg-amber-100 text-amber-700', eleve: 'bg-orange-100 text-orange-700', critique: 'bg-red-100 text-red-700' };
    return m[risk] || 'bg-muted text-muted-foreground';
  };

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <Navbar />
      <main className="container flex-1 py-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Bonjour, {user?.prenom || user?.nom} 👋</h1>
            <p className="text-muted-foreground">Voici un résumé de vos analyses</p>
          </div>
          <Button asChild className="gap-2 rounded-xl">
            <Link to="/analyze"><Camera className="h-4 w-4" /> Nouvelle analyse</Link>
          </Button>
        </div>

        {/* Stats */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map(({ label, value, icon: Icon, color }) => (
            <Card key={label} className="shadow-sm">
              <CardContent className="flex items-center gap-4 p-5">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted ${color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className="text-xl font-bold tabular-nums">{value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent analyses */}
        <Card className="shadow-sm">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-lg">Analyses récentes</CardTitle>
            <Button variant="ghost" size="sm" asChild className="gap-1 text-primary">
              <Link to="/history">Tout voir <ArrowRight className="h-3.5 w-3.5" /></Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
            ) : recent.length === 0 ? (
              <div className="py-12 text-center">
                <Camera className="mx-auto h-12 w-12 text-muted-foreground/40" />
                <p className="mt-3 text-muted-foreground">Aucune analyse pour le moment</p>
                <Button asChild className="mt-4 gap-2 rounded-xl" size="sm">
                  <Link to="/analyze"><Camera className="h-4 w-4" /> Lancer une analyse</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {recent.map((a: any) => (
                  <Link
                    key={a.id || a.uuid}
                    to={`/history`}
                    className="flex items-center justify-between rounded-xl border p-4 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                        <Activity className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{a.pathologie_label || a.diagnostic || 'Analyse'}</p>
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
