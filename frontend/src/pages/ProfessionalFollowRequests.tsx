import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

const ProfessionalFollowRequests: React.FC = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.getProfessionalFollowRequests();
      // API returns { requests: [...] } or { data: { requests: [...] } }
      const rows = res?.data?.requests ?? res?.requests ?? [];
      setRequests(rows);
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message || 'Impossible de charger les demandes' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handle = async (id: number, action: 'accept' | 'reject') => {
    try {
      await api.handleFollowRequestAction(id, action);
      toast({ title: action === 'accept' ? 'Accepté' : 'Refusé' });
      load();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message || 'Action impossible' });
    }
  };

  return (
    <div className="min-h-screen bg-surface-50">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-semibold mb-4">Demandes de suivi reçues</h1>

        <div className="grid gap-4">
          {loading && <div className="text-center py-8">Chargement...</div>}
          {!loading && requests.length === 0 && (
            <Card>
              <CardContent>
                <p className="text-muted-foreground">Aucune demande de suivi pour le moment.</p>
              </CardContent>
            </Card>
          )}

          {requests.map((r) => (
            <Card key={r.id} className="shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Demande de {r.prenom} {r.nom}</span>
                  <Badge variant="outline" className={r.status === 'pending' ? 'bg-amber-50 text-amber-700' : r.status === 'accepted' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}>{r.status}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Patient</p>
                    <p className="font-medium">{r.prenom} {r.nom}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Analyse</p>
                    <p className="font-medium">{r.pathologie_label ?? r.analysis_uuid ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Date</p>
                    <p className="font-medium">{new Date(r.created_at).toLocaleString('fr')}</p>
                  </div>
                </div>

                {r.message && (
                  <div className="mt-3">
                    <p className="text-sm text-muted-foreground">Message du patient</p>
                    <p className="mt-1 bg-muted/20 p-3 rounded">{r.message}</p>
                  </div>
                )}

                <div className="mt-4 flex gap-2">
                  {r.status === 'pending' && (
                    <>
                      <Button onClick={() => handle(r.id, 'accept')} className="bg-emerald-600 text-white">Accepter</Button>
                      <Button variant="outline" onClick={() => handle(r.id, 'reject')}>Refuser</Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
};

export default ProfessionalFollowRequests;
