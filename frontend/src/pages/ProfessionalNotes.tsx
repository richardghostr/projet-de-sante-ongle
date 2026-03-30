import { useEffect, useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Link, useNavigate } from 'react-router-dom';

const ProfessionalNotes = () => {
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [messageMap, setMessageMap] = useState<Record<string,string>>({});
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.getPatientNotes();
      const data = res.data || res;
      setNotes(data.notes || []);
    } catch (e) {
      toast({ title: 'Erreur', description: (e as any)?.message || 'Impossible de charger les notes' });
    } finally { setLoading(false); }
  };

  const handleSend = async (treatmentUuid: string) => {
    const msg = messageMap[treatmentUuid] || '';
    if (!msg.trim()) return toast({ title: 'Erreur', description: 'Message vide' });
    try {
      await api.postTreatmentMessage(treatmentUuid, msg.trim());
      toast({ title: 'Succès', description: 'Message envoyé' });
      setMessageMap(m => ({ ...m, [treatmentUuid]: '' }));
      load();
    } catch (e) {
      toast({ title: 'Erreur', description: (e as any)?.message || 'Erreur lors de l\'envoi' });
    }
  };

  const groupByTreatment = (items: any[]) => {
    const groups: Record<string, any[]> = {};
    items.forEach(n => {
      let key = 'general';
      if (n.treatment_uuid) key = n.treatment_uuid;
      else if (n.analysis_uuid) key = `analysis:${n.analysis_uuid}`;
      (groups[key] = groups[key] || []).push(n);
    });
    return groups;
  };

  const groups = groupByTreatment(notes);

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <Navbar />
      <main className="container flex-1 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Notes du professionnel</h1>
            <p className="text-muted-foreground">Consultez les notes et échangez avec votre professionnel</p>
          </div>
          <div>
            <Button variant="ghost" onClick={() => navigate('/treatments')}>Retour aux traitements</Button>
          </div>
        </div>

        {loading ? (
          <div>Chargement...</div>
        ) : (
          Object.keys(groups).length === 0 ? (
            <Card className="shadow-sm"><CardContent className="p-6">Aucune note disponible</CardContent></Card>
          ) : (
            <div className="space-y-6">
              {Object.entries(groups).map(([key, items]) => (
                <Card key={key} className="shadow-sm">
                  <CardContent>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        {key.startsWith('analysis:') ? (
                          <div className="font-medium">Analyse: <Link to={`/history/${key.replace('analysis:','')}`} className="underline">Voir l'analyse</Link></div>
                        ) : key === 'general' ? (
                          <div className="font-medium">Général</div>
                        ) : (
                          <div className="font-medium">Traitement: <Link to={`/treatments/${items[0].treatment_uuid}`} className="underline">Voir le traitement</Link></div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3">
                      {items.map((n: any) => (
                        <div key={n.id} className="rounded-lg border p-3">
                          <div className="flex items-center justify-between mb-1">
                            <div className="text-sm font-medium">{n.professional_prenom ? `${n.professional_prenom} ${n.professional_nom}` : n.professional_nom}</div>
                            <div className="text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString('fr')}</div>
                          </div>
                          {n.titre && <h5 className="font-medium">{n.titre}</h5>}
                          <p className="text-sm text-muted-foreground mt-1">{n.contenu}</p>
                        </div>
                      ))}
                    </div>

                    {/* Message composer only if linked to a treatment */}
                    {key !== 'general' && !key.startsWith('analysis:') && (
                      <div className="mt-4">
                        <Textarea value={messageMap[key] || ''} onChange={(e) => setMessageMap(m => ({ ...m, [key]: e.target.value }))} rows={3} />
                        <div className="flex justify-end mt-2">
                          <Button onClick={() => handleSend(key)}>Envoyer un message au professionnel</Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )
        )}
      </main>
    </div>
  );
};

export default ProfessionalNotes;
