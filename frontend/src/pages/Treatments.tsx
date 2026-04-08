import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageHeader } from '@/components/PageHeader';
import { 
  Plus, Activity, Camera, 
  Clock, ChevronRight, Pill, AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Treatment {
  id: number;
  uuid: string;
  titre: string;
  description?: string;
  pathologie_nom?: string;
  pathologie_code?: string;
  status: 'active' | 'paused' | 'completed' | 'abandoned';
  date_debut: string;
  date_fin_prevue?: string;
  frequence_suivi: string;
  total_entries: number;
  derniere_entree?: string;
  derniere_photo?: string;
  professional_nom?: string;
}

const Treatments = () => {
  const navigate = useNavigate();
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('');
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    loadTreatments();
  }, [filter]);

  const loadTreatments = async () => {
    setLoading(true);
    try {
      const res = await api.getTreatments(filter || undefined);
      setTreatments((res.data || res).treatments || []);
    } catch (err) {
      console.error('Failed to load treatments', err);
    } finally {
      setLoading(false);
    }
  };

  const statusColor = (status: string) => {
    const m: Record<string, string> = {
      active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      paused: 'bg-amber-100 text-amber-700 border-amber-200',
      completed: 'bg-blue-100 text-blue-700 border-blue-200',
      abandoned: 'bg-slate-100 text-slate-700 border-slate-200'
    };
    return m[status] || 'bg-muted text-muted-foreground';
  };

  const statusLabel = (status: string) => {
    const m: Record<string, string> = {
      active: 'En cours',
      paused: 'En pause',
      completed: 'Termine',
      abandoned: 'Abandonne'
    };
    return m[status] || status;
  };

  const frequencyLabel = (freq: string) => {
    const m: Record<string, string> = {
      daily: 'Quotidien',
      every_2_days: 'Tous les 2 jours',
      weekly: 'Hebdomadaire',
      biweekly: 'Bi-mensuel',
      monthly: 'Mensuel'
    };
    return m[freq] || freq;
  };

  const calculateProgress = (treatment: Treatment) => {
    if (!treatment.date_fin_prevue) return 0;
    const start = new Date(treatment.date_debut).getTime();
    const end = new Date(treatment.date_fin_prevue).getTime();
    const now = Date.now();
    if (now >= end) return 100;
    if (now <= start) return 0;
    return Math.round(((now - start) / (end - start)) * 100);
  };

  const daysSinceLastEntry = (treatment: Treatment) => {
    if (!treatment.derniere_entree) return null;
    const diff = Date.now() - new Date(treatment.derniere_entree).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  const activeTreatments = treatments.filter(t => t.status === 'active');
  const otherTreatments = treatments.filter(t => t.status !== 'active');

  return (
    <div className="flex min-h-dvh flex-col bg-muted/30">
      <Navbar />
      <main className="container flex-1 py-4 pb-24 md:py-8 md:pb-8">
        <PageHeader 
          title="Mes traitements"
          subtitle="Suivez l'evolution de vos traitements"
          action={
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <Button variant="outline" className="h-12 w-full rounded-xl text-base sm:h-10 sm:w-auto sm:text-sm" onClick={() => navigate('/professional/patients')}>Patients</Button>
              <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogTrigger asChild>
                  <Button className="h-12 w-full gap-2 rounded-xl text-base sm:h-10 sm:w-auto sm:text-sm"><Plus className="h-4 w-4" /> Nouveau</Button>
                </DialogTrigger>
                <DialogContent className="max-h-[90vh] overflow-y-auto">
                  <CreateTreatmentForm onSuccess={() => { setCreateOpen(false); loadTreatments(); }} />
                </DialogContent>
              </Dialog>
            </div>
          }
        />

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : treatments.length === 0 ? (
          <Card className="shadow-sm">
            <CardContent className="py-16 text-center">
              <Pill className="mx-auto h-16 w-16 text-muted-foreground/30" />
              <h3 className="mt-4 text-lg font-medium">Aucun traitement</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Commencez a suivre vos traitements pour observer votre progression
              </p>
              <Button className="mt-6 h-12 gap-2 rounded-xl text-base" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" /> Creer mon premier traitement
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Active treatments */}
            {activeTreatments.length > 0 && (
              <div>
                <h2 className="mb-4 flex items-center gap-2 text-base font-semibold md:text-lg">
                  <Activity className="h-5 w-5 text-emerald-500" />
                  Traitements actifs ({activeTreatments.length})
                </h2>
                <div className="grid gap-3 md:grid-cols-2 md:gap-4">
                  {activeTreatments.map((treatment) => {
                    const daysSince = daysSinceLastEntry(treatment);
                    const needsUpdate = daysSince !== null && daysSince >= 2;
                    
                    return (
                      <Card 
                        key={treatment.uuid} 
                        className={`cursor-pointer shadow-sm transition-all hover:shadow-md ${needsUpdate ? 'border-amber-300' : ''}`}
                        onClick={() => navigate(`/treatments/${treatment.uuid}`)}
                      >
                        <CardContent className="p-4">
                          <div className="mb-3 flex items-start justify-between">
                            <div className="min-w-0 flex-1">
                              <h3 className="truncate font-semibold">{treatment.titre}</h3>
                              {treatment.pathologie_nom && (
                                <p className="truncate text-sm text-muted-foreground">{treatment.pathologie_nom}</p>
                              )}
                            </div>
                            <Badge variant="outline" className={statusColor(treatment.status)}>
                              {statusLabel(treatment.status)}
                            </Badge>
                          </div>

                          {treatment.date_fin_prevue && (
                            <div className="mb-3">
                              <div className="mb-1 flex justify-between text-sm">
                                <span className="text-muted-foreground">Progression</span>
                                <span>{calculateProgress(treatment)}%</span>
                              </div>
                              <Progress value={calculateProgress(treatment)} className="h-2" />
                            </div>
                          )}

                          <div className="flex flex-wrap items-center gap-2 text-sm">
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <Camera className="h-4 w-4" />
                              {treatment.total_entries}
                            </span>
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              {frequencyLabel(treatment.frequence_suivi)}
                            </span>
                            {needsUpdate && (
                              <span className="flex items-center gap-1 text-amber-600">
                                <AlertCircle className="h-4 w-4" />
                                {daysSince}j
                              </span>
                            )}
                          </div>

                          {treatment.professional_nom && (
                            <p className="mt-3 truncate text-xs text-muted-foreground">
                              Dr. {treatment.professional_nom}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Other treatments */}
            {otherTreatments.length > 0 && (
              <div>
                <h2 className="mb-4 text-base font-semibold text-muted-foreground md:text-lg">
                  Autres traitements ({otherTreatments.length})
                </h2>
                <div className="space-y-3">
                  {otherTreatments.map((treatment) => (
                    <Card 
                      key={treatment.uuid} 
                      className="cursor-pointer shadow-sm transition-colors hover:bg-muted/50"
                      onClick={() => navigate(`/treatments/${treatment.uuid}`)}
                    >
                      <CardContent className="flex min-h-[64px] items-center justify-between p-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-muted">
                            <Pill className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="truncate font-medium">{treatment.titre}</h3>
                            <p className="truncate text-sm text-muted-foreground">
                              {treatment.pathologie_nom} - {treatment.total_entries} entrees
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={`hidden sm:inline-flex ${statusColor(treatment.status)}`}>
                            {statusLabel(treatment.status)}
                          </Badge>
                          <ChevronRight className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

// Create Treatment Form
const CreateTreatmentForm = ({ onSuccess }: { onSuccess: () => void }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    titre: '',
    description: '',
    doigt_concerne: '',
    main_pied: '',
    objectif: '',
    traitement_prescrit: '',
    date_fin_prevue: '',
    frequence_suivi: 'weekly'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.titre.trim()) {
      toast({ title: 'Erreur', description: 'Le titre est requis' });
      return;
    }
    setLoading(true);
    try {
      await api.createTreatment(form);
      toast({ title: 'Succes', description: 'Traitement cree' });
      onSuccess();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Une erreur est survenue';
      toast({ title: 'Erreur', description: message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Nouveau traitement</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div>
          <label className="text-sm font-medium">Titre *</label>
          <Input
            placeholder="Ex: Traitement onychomycose pouce droit"
            value={form.titre}
            onChange={(e) => setForm(f => ({ ...f, titre: e.target.value }))}
            className="h-12 text-base"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Doigt concerne</label>
            <Select value={form.doigt_concerne} onValueChange={(v) => setForm(f => ({ ...f, doigt_concerne: v }))}>
              <SelectTrigger className="h-12 text-base">
                <SelectValue placeholder="Selectionner" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pouce">Pouce</SelectItem>
                <SelectItem value="index">Index</SelectItem>
                <SelectItem value="majeur">Majeur</SelectItem>
                <SelectItem value="annulaire">Annulaire</SelectItem>
                <SelectItem value="auriculaire">Auriculaire</SelectItem>
                <SelectItem value="orteil">Orteil</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">Main/Pied</label>
            <Select value={form.main_pied} onValueChange={(v) => setForm(f => ({ ...f, main_pied: v }))}>
              <SelectTrigger className="h-12 text-base">
                <SelectValue placeholder="Selectionner" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="main_gauche">Main gauche</SelectItem>
                <SelectItem value="main_droite">Main droite</SelectItem>
                <SelectItem value="pied_gauche">Pied gauche</SelectItem>
                <SelectItem value="pied_droit">Pied droit</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">Objectif</label>
          <Textarea
            placeholder="Quel est votre objectif pour ce traitement ?"
            value={form.objectif}
            onChange={(e) => setForm(f => ({ ...f, objectif: e.target.value }))}
            rows={2}
            className="text-base"
          />
        </div>

        <div>
          <label className="text-sm font-medium">Traitement prescrit</label>
          <Textarea
            placeholder="Medicaments, soins, frequence..."
            value={form.traitement_prescrit}
            onChange={(e) => setForm(f => ({ ...f, traitement_prescrit: e.target.value }))}
            rows={2}
            className="text-base"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Date de fin prevue</label>
            <Input
              type="date"
              value={form.date_fin_prevue}
              onChange={(e) => setForm(f => ({ ...f, date_fin_prevue: e.target.value }))}
              className="h-12 text-base"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Frequence de suivi</label>
            <Select value={form.frequence_suivi} onValueChange={(v) => setForm(f => ({ ...f, frequence_suivi: v }))}>
              <SelectTrigger className="h-12 text-base">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Quotidien</SelectItem>
                <SelectItem value="every_2_days">Tous les 2 jours</SelectItem>
                <SelectItem value="weekly">Hebdomadaire</SelectItem>
                <SelectItem value="biweekly">Bi-mensuel</SelectItem>
                <SelectItem value="monthly">Mensuel</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button type="submit" className="h-12 w-full text-base sm:h-10 sm:w-auto sm:text-sm" disabled={loading}>
            {loading ? 'Creation...' : 'Creer le traitement'}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
};

export default Treatments;
