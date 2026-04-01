import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { PageHeader } from '@/components/PageHeader';
import { Inbox } from 'lucide-react';

const ProfessionalFollowRequests: React.FC = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.getProfessionalFollowRequests();
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
      toast({ title: action === 'accept' ? 'Accepte' : 'Refuse' });
      load();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message || 'Action impossible' });
    }
  };

  const statusColor = (status: string) => {
    const m: Record<string, string> = {
      pending: 'bg-amber-50 text-amber-700',
      accepted: 'bg-emerald-50 text-emerald-700',
      rejected: 'bg-red-50 text-red-700',
    };
    return m[status] || 'bg-muted text-muted-foreground';
  };

  return (
    <div className="flex min-h-dvh flex-col bg-muted/30">
      <Navbar />
      <main className="container flex-1 py-4 pb-24 md:py-8 md:pb-8">
        <PageHeader 
          title="Demandes de suivi"
          subtitle="Demandes recues de vos patients"
        />

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : requests.length === 0 ? (
          <Card className="shadow-sm">
            <CardContent className="py-16 text-center">
              <Inbox className="mx-auto h-14 w-14 text-muted-foreground/30" />
              <p className="mt-4 text-muted-foreground">Aucune demande de suivi pour le moment.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {requests.map((r) => (
              <Card key={r.id} className="shadow-sm">
                <CardContent className="p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{r.prenom} {r.nom}</span>
                        <Badge variant="outline" className={statusColor(r.status)}>{r.status}</Badge>
                      </div>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <p>Analyse: {r.pathologie_label ?? r.analysis_uuid ?? '-'}</p>
                        <p>Date: {new Date(r.created_at).toLocaleDateString('fr')}</p>
                      </div>
                      {r.message && (
                        <p className="mt-2 line-clamp-2 rounded-lg bg-muted/50 p-2 text-sm">{r.message}</p>
                      )}
                    </div>
                    {r.status === 'pending' && (
                      <div className="flex w-full gap-2 sm:w-auto">
                        <Button className="h-11 flex-1 sm:flex-none" onClick={() => handle(r.id, 'accept')}>Accepter</Button>
                        <Button variant="outline" className="h-11 flex-1 sm:flex-none" onClick={() => handle(r.id, 'reject')}>Refuser</Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default ProfessionalFollowRequests;
