import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

const PatientFollowRequests: React.FC = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const [rRes, iRes] = await Promise.all([api.getMyFollowRequests(), api.getMyInvitations()]);
      const r = rRes?.data?.requests ?? rRes?.requests ?? [];
      const i = iRes?.data?.invitations ?? iRes?.invitations ?? [];
      setRequests(r);
      setInvitations(i);
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message || 'Impossible de charger' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const respondInvitation = async (id: number, action: 'accept' | 'reject') => {
    try {
      await api.respondInvitation(id, action);
      toast({ title: action === 'accept' ? 'Invitation acceptée' : 'Invitation refusée' });
      load();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message || 'Action impossible' });
    }
  };

  return (
    <div className="min-h-screen bg-surface-50">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-semibold mb-4">Mes demandes de suivi</h1>

        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Demandes envoyées</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="py-8 text-center">Chargement...</div>
                ) : requests.length === 0 ? (
                  <p className="text-muted-foreground">Vous n'avez envoyé aucune demande de suivi.</p>
                ) : (
                  <div className="space-y-3">
                    {requests.map(r => (
                      <div key={r.id} className="rounded-lg border p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">Professionnel: {r.professional_prenom} {r.professional_nom}</p>
                            <p className="text-sm text-muted-foreground">Analyse: {r.analysis_uuid || r.pathologie_label || '—'}</p>
                          </div>
                          <div className="text-right">
                            <Badge variant="outline" className={r.status === 'pending' ? 'bg-amber-50 text-amber-700' : r.status === 'accepted' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}>{r.status}</Badge>
                          </div>
                        </div>
                        {r.message && <div className="mt-2 text-sm text-muted-foreground">{r.message}</div>}
                        <div className="mt-3 text-xs text-muted-foreground">Envoyée: {new Date(r.created_at).toLocaleString('fr')}</div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle>Invitations reçues</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="py-8 text-center">Chargement...</div>
                ) : invitations.length === 0 ? (
                  <p className="text-muted-foreground">Aucune invitation reçue.</p>
                ) : (
                  <div className="space-y-3">
                    {invitations.map(i => (
                      <div key={i.id} className="rounded-lg border p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">Professionnel: {i.prenom} {i.nom}</p>
                            <p className="text-sm text-muted-foreground">Message: {i.message || '—'}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button onClick={() => respondInvitation(i.id, 'accept')} className="bg-emerald-600 text-white">Accepter</Button>
                            <Button variant="outline" onClick={() => respondInvitation(i.id, 'reject')}>Refuser</Button>
                          </div>
                        </div>
                        <div className="mt-3 text-xs text-muted-foreground">Reçue: {new Date(i.created_at).toLocaleString('fr')}</div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PatientFollowRequests;
