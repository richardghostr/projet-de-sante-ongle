import { useEffect, useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { PageHeader } from '@/components/PageHeader';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Send } from 'lucide-react';

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
    const key = treatmentUuid;
    const msg = messageMap[key] || '';
    if (!msg.trim()) return toast({ title: 'Erreur', description: 'Message vide' });
    try {
      if (key === 'general') {
        await api.sendPatientMessage({ message: msg.trim() });
      } else if (key.startsWith('analysis:')) {
        const analysisUuid = key.replace('analysis:', '');
        await api.sendPatientMessage({ message: msg.trim(), analysis_uuid: analysisUuid });
      } else {
        await api.postTreatmentMessage(key, msg.trim());
      }

      toast({ title: 'Succes', description: 'Message envoye' });
      setMessageMap(m => ({ ...m, [key]: '' }));
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
    <div className="flex min-h-dvh flex-col bg-muted/30">
      <Navbar />
      <main className="container flex-1 py-4 pb-24 md:py-8 md:pb-8">
        <PageHeader 
          title="Notes du professionnel"
          subtitle="Consultez les notes et echangez avec votre professionnel"
          action={
            <Button variant="ghost" className="h-12 gap-2 rounded-xl text-base md:h-10 md:text-sm" onClick={() => navigate('/treatments')}>
              <ArrowLeft className="h-4 w-4" /> Traitements
            </Button>
          }
        />

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : Object.keys(groups).length === 0 ? (
          <Card className="shadow-sm">
            <CardContent className="py-16 text-center">
              <FileText className="mx-auto h-14 w-14 text-muted-foreground/30" />
              <p className="mt-4 text-muted-foreground">Aucune note disponible</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {Object.entries(groups).map(([key, items]) => (
              <Card key={key} className="shadow-sm">
                <CardContent className="p-4 md:p-6">
                  <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="font-medium">
                      {key.startsWith('analysis:') ? (
                        <span>Analyse: <Link to={`/history/${key.replace('analysis:','')}`} className="text-primary underline">Voir l&apos;analyse</Link></span>
                      ) : key === 'general' ? (
                        <span>General</span>
                      ) : (
                        <span>Traitement: <Link to={`/treatments/${items[0].treatment_uuid}`} className="text-primary underline">Voir le traitement</Link></span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    {items.map((n: any) => (
                      <div key={n.id} className="rounded-xl border p-3">
                        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                          <span className="text-sm font-medium">{n.professional_prenom ? `${n.professional_prenom} ${n.professional_nom}` : n.professional_nom}</span>
                          <span className="text-xs text-muted-foreground">{new Date(n.created_at).toLocaleDateString('fr')}</span>
                        </div>
                        {n.titre && <h5 className="font-medium">{n.titre}</h5>}
                        <p className="mt-1 text-sm text-muted-foreground">{n.contenu}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4">
                    <Textarea 
                      value={messageMap[key] || ''} 
                      onChange={(e) => setMessageMap(m => ({ ...m, [key]: e.target.value }))} 
                      rows={3}
                      placeholder="Ecrire un message..."
                      className="text-base"
                    />
                    <div className="mt-2 flex justify-end">
                      <Button className="h-11 gap-2" onClick={() => handleSend(key)}>
                        <Send className="h-4 w-4" /> Envoyer
                      </Button>
                    </div>
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

export default ProfessionalNotes;
