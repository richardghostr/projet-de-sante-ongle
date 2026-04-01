import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { PageHeader } from '@/components/PageHeader';
import { Send, Inbox } from 'lucide-react';

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
      toast({ title: action === 'accept' ? 'Invitation acceptee' : 'Invitation refusee' });
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
          title="Mes demandes de suivi"
          subtitle="Gerez vos demandes et invitations"
        />

        <Tabs defaultValue="requests" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="requests" className="flex items-center gap-2">
              <Send className="h-4 w-4" />
              <span className="hidden sm:inline">Demandes</span> envoyees
            </TabsTrigger>
            <TabsTrigger value="invitations" className="flex items-center gap-2">
              <Inbox className="h-4 w-4" />
              <span className="hidden sm:inline">Invitations</span> recues
            </TabsTrigger>
          </TabsList>

          <TabsContent value="requests">
            <Card className="shadow-sm">
              <CardHeader className="p-4 md:p-6">
                <CardTitle className="text-base md:text-lg">Demandes envoyees</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
                {loading ? (
                  <div className="flex justify-center py-8">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </div>
                ) : requests.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">Vous n&apos;avez envoye aucune demande de suivi.</p>
                ) : (
                  <div className="space-y-3">
                    {requests.map(r => (
                      <div key={r.id} className="rounded-xl border p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <p className="truncate font-medium">{r.professional_prenom} {r.professional_nom}</p>
                            <p className="truncate text-sm text-muted-foreground">Analyse: {r.analysis_uuid || r.pathologie_label || '-'}</p>
                          </div>
                          <Badge variant="outline" className={statusColor(r.status)}>{r.status}</Badge>
                        </div>
                        {r.message && <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{r.message}</p>}
                        <p className="mt-3 text-xs text-muted-foreground">Envoyee: {new Date(r.created_at).toLocaleDateString('fr')}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invitations">
            <Card className="shadow-sm">
              <CardHeader className="p-4 md:p-6">
                <CardTitle className="text-base md:text-lg">Invitations recues</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
                {loading ? (
                  <div className="flex justify-center py-8">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </div>
                ) : invitations.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">Aucune invitation recue.</p>
                ) : (
                  <div className="space-y-3">
                    {invitations.map(i => (
                      <div key={i.id} className="rounded-xl border p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium">{i.prenom} {i.nom}</p>
                            <p className="line-clamp-2 text-sm text-muted-foreground">Message: {i.message || '-'}</p>
                          </div>
                          <div className="flex w-full gap-2 sm:w-auto">
                            <Button className="h-11 flex-1 sm:flex-none" onClick={() => respondInvitation(i.id, 'accept')}>Accepter</Button>
                            <Button variant="outline" className="h-11 flex-1 sm:flex-none" onClick={() => respondInvitation(i.id, 'reject')}>Refuser</Button>
                          </div>
                        </div>
                        <p className="mt-3 text-xs text-muted-foreground">Recue: {new Date(i.created_at).toLocaleDateString('fr')}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default PatientFollowRequests;
