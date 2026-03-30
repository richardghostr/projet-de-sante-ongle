import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

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
      toast({ title: 'Succès', description: 'Message envoyé' });
      load();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err?.message || 'Erreur' });
    }
  };

  const sendAdvice = async () => {
    if (!adviceText.trim() || !treatment) return toast({ title: 'Erreur', description: 'Conseil vide' });
    try {
      // use addProfessionalNote to create a shared note tied to the treatment
      await api.addProfessionalNote({ patient_id: treatment.user_id, contenu: adviceText.trim(), treatment_plan_id: treatment.id, type: 'follow_up', visibilite: 'shared_with_patient' });
      setAdviceText('');
      toast({ title: 'Succès', description: 'Conseil ajouté' });
      load();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err?.message || 'Erreur' });
    }
  };

  if (loading) return (<div className="min-h-screen"><Navbar /><main className="container py-8">Chargement...</main></div>);
  if (!treatment) return (<div className="min-h-screen"><Navbar /><main className="container py-8">Traitement introuvable</main></div>);

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <Navbar />
      <main className="container py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{treatment.titre}</h1>
            <p className="text-muted-foreground">{treatment.pathologie_nom || ''}</p>
          </div>
          <div>
            <Button variant="ghost" onClick={() => navigate(-1)}>Retour</Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <Card className="shadow-sm mb-4">
              <CardHeader>
                <CardTitle>Journal ({entries.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {entries.length === 0 ? <p className="text-sm text-muted-foreground">Aucune entree</p> : (
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

            <Card className="shadow-sm mb-4">
              <CardHeader>
                <CardTitle>Notes professionnelles</CardTitle>
              </CardHeader>
              <CardContent>
                {notes.length === 0 ? <p className="text-sm text-muted-foreground">Aucune note</p> : (
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

          <div>
            <Card className="shadow-sm mb-4">
              <CardHeader>
                <CardTitle>Messages</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 mb-3">
                  {messages.length === 0 ? <p className="text-sm text-muted-foreground">Aucun message</p> : (
                    messages.map(m => (
                      <div key={m.uuid} className="rounded-lg border p-3">
                        <div className="text-sm text-muted-foreground">{m.sender_prenom ? `${m.sender_prenom} ${m.sender_nom}` : m.sender_nom} — {new Date(m.created_at).toLocaleString('fr')}</div>
                        <p className="mt-1">{m.contenu}</p>
                      </div>
                    ))
                  )}
                </div>

                <Textarea value={messageText} onChange={(e) => setMessageText(e.target.value)} rows={3} placeholder="Envoyer un message au patient" />
                <div className="flex justify-end mt-2">
                  <Button onClick={sendMessage}>Envoyer</Button>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Ajouter un conseil</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea value={adviceText} onChange={(e) => setAdviceText(e.target.value)} rows={4} placeholder="Rédiger un conseil pour ce traitement" />
                <div className="flex justify-end mt-2">
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
