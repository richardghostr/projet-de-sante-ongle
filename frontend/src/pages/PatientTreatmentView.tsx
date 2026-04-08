import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { Navbar } from '@/components/Navbar';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Send, FileText, MessageSquare, Lightbulb } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const PatientTreatmentView = () => {
  const { patientId, id: uuid } = useParams<{ patientId: string; id: string }>();
  const navigate = useNavigate();
  const [treatment, setTreatment] = useState<any | null>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [messageText, setMessageText] = useState('');
  const [adviceText, setAdviceText] = useState('');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => { load(); }, [uuid]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.getTreatment(uuid!);
      const data = res.data || res;
      if (!data || !data.treatment) throw new Error('Donnees invalides');
      setTreatment(data.treatment);
      setEntries(data.entries || []);
      setNotes(data.notes || []);
      setMessages(data.messages || []);
    } catch (err: any) {
      toast({ title: 'Erreur', description: err?.message || 'Impossible de charger le traitement' });
    } finally { setLoading(false); }
  };

  const sendMessage = async () => {
    if (!messageText.trim()) return toast({ title: 'Erreur', description: 'Message vide' });
    try {
      await api.postTreatmentMessage(uuid!, messageText.trim());
      setMessageText('');
      toast({ title: 'Succes', description: 'Message envoye' });
      load();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err?.message || 'Erreur' });
    }
  };

  const sendAdvice = async () => {
    if (!adviceText.trim() || !treatment) return toast({ title: 'Erreur', description: 'Conseil vide' });
    try {
      await api.addProfessionalNote({ 
        patient_id: treatment.user_id, 
        contenu: adviceText.trim(), 
        treatment_plan_id: treatment.id, 
        type: 'follow_up', 
        visibilite: 'shared_with_patient' 
      });
      setAdviceText('');
      toast({ title: 'Succes', description: 'Conseil ajoute' });
      load();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err?.message || 'Erreur' });
    }
  };

  if (loading) return (
    <div className="flex min-h-dvh flex-col bg-background">
      <Navbar />
      <main className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </main>
    </div>
  );

  if (!treatment) return (
    <div className="flex min-h-dvh flex-col bg-background">
      <Navbar />
      <main className="px-4 py-8 text-center md:container">
        <p className="text-muted-foreground">Traitement introuvable</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>Retour</Button>
      </main>
    </div>
  );

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <Navbar />
      <main className="px-4 py-4 pb-24 md:container md:py-8 md:pb-8">
        {/* Mobile Header */}
        <div className="mb-4 flex items-center gap-3 md:hidden">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-semibold">{treatment.titre}</h1>
            <p className="truncate text-sm text-muted-foreground">{treatment.pathologie_nom || 'Traitement patient'}</p>
          </div>
        </div>

        {/* Desktop Header */}
        <div className="mb-6 hidden items-center justify-between md:flex">
          <PageHeader
            title={treatment.titre}
            subtitle={treatment.pathologie_nom || ''}
          />
          <Button variant="outline" onClick={() => navigate(-1)}>Retour</Button>
        </div>

        {/* Mobile Tabs */}
        <div className="md:hidden">
          <Tabs defaultValue="journal" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="journal" className="gap-1.5 text-xs">
                <FileText className="h-4 w-4" />
                Journal
              </TabsTrigger>
              <TabsTrigger value="messages" className="gap-1.5 text-xs">
                <MessageSquare className="h-4 w-4" />
                Messages
              </TabsTrigger>
              <TabsTrigger value="conseil" className="gap-1.5 text-xs">
                <Lightbulb className="h-4 w-4" />
                Conseil
              </TabsTrigger>
            </TabsList>

            <TabsContent value="journal" className="space-y-4">
              <Card className="border-0 shadow-sm">
                <CardHeader className="px-4 pb-2 pt-4">
                  <CardTitle className="text-base">Journal ({entries.length})</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  {entries.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aucune entree</p>
                  ) : (
                    <div className="space-y-3">
                      {entries.map(e => (
                        <div key={e.uuid} className="rounded-lg border p-3">
                          <div className="text-xs text-muted-foreground">{e.date_entry}</div>
                          {e.note && <p className="mt-1 text-sm">{e.note}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardHeader className="px-4 pb-2 pt-4">
                  <CardTitle className="text-base">Notes professionnelles</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  {notes.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aucune note</p>
                  ) : (
                    <div className="space-y-3">
                      {notes.map(n => (
                        <div key={n.uuid} className="rounded-lg border p-3">
                          <div className="text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString('fr')}</div>
                          <p className="mt-1 text-sm">{n.contenu}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="messages">
              <Card className="border-0 shadow-sm">
                <CardHeader className="px-4 pb-2 pt-4">
                  <CardTitle className="text-base">Messages</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="mb-4 max-h-64 space-y-3 overflow-y-auto">
                    {messages.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Aucun message</p>
                    ) : (
                      messages.map(m => (
                        <div key={m.uuid} className="rounded-lg border p-3">
                          <div className="text-xs text-muted-foreground">
                            {m.sender_prenom ? `${m.sender_prenom} ${m.sender_nom}` : m.sender_nom} — {new Date(m.created_at).toLocaleString('fr')}
                          </div>
                          <p className="mt-1 text-sm">{m.contenu}</p>
                        </div>
                      ))
                    )}
                  </div>
                  <Textarea 
                    value={messageText} 
                    onChange={(e) => setMessageText(e.target.value)} 
                    rows={3} 
                    placeholder="Envoyer un message au patient"
                    className="mb-2"
                  />
                  <Button onClick={sendMessage} className="h-12 w-full gap-2 rounded-xl">
                    <Send className="h-4 w-4" /> Envoyer
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="conseil">
              <Card className="border-0 shadow-sm">
                <CardHeader className="px-4 pb-2 pt-4">
                  <CardTitle className="text-base">Ajouter un conseil</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <Textarea 
                    value={adviceText} 
                    onChange={(e) => setAdviceText(e.target.value)} 
                    rows={5} 
                    placeholder="Rediger un conseil pour ce traitement"
                    className="mb-2"
                  />
                  <Button onClick={sendAdvice} className="h-12 w-full gap-2 rounded-xl">
                    <Lightbulb className="h-4 w-4" /> Ajouter conseil
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Desktop Layout */}
        <div className="hidden gap-6 md:grid lg:grid-cols-2">
          <div className="space-y-4">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Journal ({entries.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {entries.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucune entree</p>
                ) : (
                  <div className="space-y-3">
                    {entries.map(e => (
                      <div key={e.uuid} className="rounded-lg border p-3">
                        <div className="text-sm text-muted-foreground">{e.date_entry}</div>
                        {e.note && <p className="mt-1">{e.note}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Notes professionnelles</CardTitle>
              </CardHeader>
              <CardContent>
                {notes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucune note</p>
                ) : (
                  <div className="space-y-3">
                    {notes.map(n => (
                      <div key={n.uuid} className="rounded-lg border p-3">
                        <div className="text-sm text-muted-foreground">{new Date(n.created_at).toLocaleString('fr')}</div>
                        <p className="mt-1">{n.contenu}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Messages</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4 max-h-48 space-y-3 overflow-y-auto">
                  {messages.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aucun message</p>
                  ) : (
                    messages.map(m => (
                      <div key={m.uuid} className="rounded-lg border p-3">
                        <div className="text-sm text-muted-foreground">
                          {m.sender_prenom ? `${m.sender_prenom} ${m.sender_nom}` : m.sender_nom} — {new Date(m.created_at).toLocaleString('fr')}
                        </div>
                        <p className="mt-1">{m.contenu}</p>
                      </div>
                    ))
                  )}
                </div>
                <Textarea value={messageText} onChange={(e) => setMessageText(e.target.value)} rows={3} placeholder="Envoyer un message au patient" />
                <div className="mt-2 flex justify-end">
                  <Button onClick={sendMessage}>Envoyer</Button>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Ajouter un conseil</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea value={adviceText} onChange={(e) => setAdviceText(e.target.value)} rows={4} placeholder="Rediger un conseil pour ce traitement" />
                <div className="mt-2 flex justify-end">
                  <Button onClick={sendAdvice}>Ajouter conseil</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PatientTreatmentView;
