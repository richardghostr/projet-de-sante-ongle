import { useEffect, useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Link } from 'react-router-dom';
import { Eye, MessageSquare, FileText } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

const ProfessionalPatients = () => {
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
  const [patientDossier, setPatientDossier] = useState<any | null>(null);
  const [note, setNote] = useState('');
  const { toast } = useToast();

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.getProfessionalPatients('active');
      const data = res.data || res;
      setPatients(data.patients || data || []);
    } catch (e: any) {
      toast({ title: 'Erreur', description: e.message || 'Impossible de charger les patients' });
    } finally { setLoading(false); }
  };

  const openPatientDossier = async (patient: any) => {
    setSelectedPatient(patient);
    try {
      const res = await api.getPatientDossier(patient.id);
      setPatientDossier(res.data || res);
    } catch (e: any) {
      toast({ title: 'Erreur', description: e.message || 'Impossible de charger le dossier' });
    }
  };

  const handleAddNote = async () => {
    if (!note.trim() || !selectedPatient) return;
    try {
      await api.addProfessionalNote({ patient_id: selectedPatient.id, contenu: note.trim(), type: 'note' });
      toast({ title: 'Succès', description: 'Note ajoutée' });
      setNote('');
      openPatientDossier(selectedPatient);
    } catch (e: any) {
      toast({ title: 'Erreur', description: e.message || 'Impossible d\'ajouter la note' });
    }
  };

  return (
    <div className="flex min-h-dvh flex-col bg-muted/30">
      <Navbar />
      <main className="container flex-1 py-4 pb-24 md:py-8 md:pb-8">
        <div className="mb-4">
          <h1 className="text-2xl font-bold">Patients</h1>
          <p className="text-sm text-muted-foreground">Liste des patients liés et actifs</p>
        </div>

        <Card className="shadow-sm">
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
            ) : patients.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">Aucun patient lié</div>
            ) : (
              <div className="space-y-3">
                {patients.map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-xl border p-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-medium text-sm">
                        {p.avatar_url ? (
                          <img src={p.avatar_url} alt={`${p.nom}`} className="h-10 w-10 rounded-full object-cover" />
                        ) : (
                          <span>{(p.prenom?.[0] || p.nom?.[0] || '?').toUpperCase()}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{p.prenom} {p.nom}</p>
                        <p className="text-xs text-muted-foreground truncate">{p.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right text-sm">
                        <p className="text-sm">{p.date_naissance ? new Date(p.date_naissance).toLocaleDateString('fr') : '-'}</p>
                        <p className="text-xs text-muted-foreground">Dernière analyse: {p.last_analysis_date ? new Date(p.last_analysis_date).toLocaleDateString('fr') : '-'}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-9 w-9 p-0" onClick={() => openPatientDossier(p)} title="Dossier">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Link to={`/patients/${p.id}/history`} className="inline-flex">
                        <Button variant="ghost" size="icon" className="h-9 w-9 p-0" title="Analyses">
                          <FileText className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dossier dialog reused locally */}
        <Dialog open={!!selectedPatient} onOpenChange={(open) => !open && setSelectedPatient(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>Dossier de {selectedPatient?.prenom} {selectedPatient?.nom}</DialogTitle>
              <DialogDescription>Consultez les informations et ajoutez une note</DialogDescription>
            </DialogHeader>
            {patientDossier ? (
              <div>
                <div className="mb-3">
                  <p className="font-medium">Informations</p>
                  <p className="text-sm text-muted-foreground">Sexe: {patientDossier.sexe || '-'}</p>
                  <p className="text-sm text-muted-foreground">Naissance: {patientDossier.date_naissance ? new Date(patientDossier.date_naissance).toLocaleDateString('fr') : '-'}</p>
                </div>

                <div className="mb-3">
                  <p className="font-medium">Analyses récentes</p>
                  <div className="space-y-2">
                    {(patientDossier.analyses || []).slice(0,5).map((a: any) => (
                      <div key={a.uuid} className="flex items-center justify-between rounded-lg border p-3">
                        <div>
                          <p className="font-medium">{a.pathologie_label || 'Analyse'}</p>
                          <p className="text-xs text-muted-foreground">{new Date(a.date_analyse).toLocaleDateString('fr')}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={a.niveau_risque ? 'bg-blue-100 text-blue-700' : ''}>{a.niveau_risque || ''}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="font-medium mb-2">Ajouter une note</p>
                  <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
                  <div className="mt-2 flex justify-end">
                    <Button onClick={handleAddNote} className="h-11">Ajouter</Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-muted-foreground">Chargement...</div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default ProfessionalPatients;
