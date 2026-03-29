import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, Camera, Plus, Calendar, Activity, Target, Pill,
  TrendingUp, TrendingDown, Minus, Clock, FileText, Image,
  ChevronLeft, ChevronRight, Play, Pause, Trash2, Edit2, MoreVertical
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const TreatmentDetail = () => {
  const { uuid } = useParams<{ uuid: string }>();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [treatment, setTreatment] = useState<any>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addEntryOpen, setAddEntryOpen] = useState(false);
  const [photoCompareOpen, setPhotoCompareOpen] = useState(false);

  useEffect(() => {
    if (uuid) loadTreatment();
  }, [uuid]);

  const loadTreatment = async () => {
    setLoading(true);
    try {
      const [treatmentRes, statsRes, timelineRes] = await Promise.all([
        api.getTreatment(uuid!),
        api.getTreatmentStats(uuid!),
        api.getTreatmentTimeline(uuid!)
      ]);
      
      const data = treatmentRes.data || treatmentRes;
      setTreatment(data.treatment);
      setEntries(data.entries || []);
      setNotes(data.notes || []);
      setStats((statsRes.data || statsRes));
      setTimeline((timelineRes.data || timelineRes).photos || []);
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      await api.updateTreatmentStatus(uuid!, newStatus as any);
      toast.success('Statut mis a jour');
      loadTreatment();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDeleteTreatment = async () => {
    if (!confirm('Supprimer ce traitement ?')) return;
    try {
      await api.deleteTreatment(uuid!);
      toast.success('Traitement supprime');
      navigate('/treatments');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      await api.uploadTreatmentPhoto(uuid!, file, {
        date_entry: new Date().toISOString().split('T')[0]
      });
      toast.success('Photo ajoutee');
      loadTreatment();
    } catch (err: any) {
      toast.error(err.message);
    }
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const statusColor = (status: string) => {
    const m: Record<string, string> = {
      active: 'bg-emerald-100 text-emerald-700',
      paused: 'bg-amber-100 text-amber-700',
      completed: 'bg-blue-100 text-blue-700',
      abandoned: 'bg-slate-100 text-slate-700'
    };
    return m[status] || 'bg-muted text-muted-foreground';
  };

  const ameliorationIcon = (value: string) => {
    if (value === 'pire') return <TrendingDown className="h-4 w-4 text-red-500" />;
    if (value === 'stable') return <Minus className="h-4 w-4 text-slate-500" />;
    return <TrendingUp className="h-4 w-4 text-emerald-500" />;
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!treatment) {
    return (
      <div className="flex min-h-screen flex-col bg-muted/30">
        <Navbar />
        <main className="container flex-1 py-8 text-center">
          <p className="text-muted-foreground">Traitement non trouve</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/treatments')}>
            Retour aux traitements
          </Button>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <Navbar />
      <main className="container flex-1 py-8">
        {/* Header */}
        <div className="mb-6">
          <Button variant="ghost" size="sm" className="mb-4 gap-2" onClick={() => navigate('/treatments')}>
            <ArrowLeft className="h-4 w-4" /> Retour
          </Button>
          
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold">{treatment.titre}</h1>
                <Badge className={statusColor(treatment.status)}>{treatment.status}</Badge>
              </div>
              {treatment.pathologie_nom && (
                <p className="text-muted-foreground">{treatment.pathologie_nom}</p>
              )}
              <p className="text-sm text-muted-foreground mt-1">
                Debut: {new Date(treatment.date_debut).toLocaleDateString('fr')}
                {treatment.date_fin_prevue && ` - Fin prevue: ${new Date(treatment.date_fin_prevue).toLocaleDateString('fr')}`}
              </p>
            </div>
            
            <div className="flex gap-2">
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*"
                onChange={handlePhotoUpload}
              />
              <Button variant="outline" className="gap-2" onClick={() => fileInputRef.current?.click()}>
                <Camera className="h-4 w-4" /> Photo
              </Button>
              <Dialog open={addEntryOpen} onOpenChange={setAddEntryOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2"><Plus className="h-4 w-4" /> Entree</Button>
                </DialogTrigger>
                <DialogContent>
                  <AddEntryForm uuid={uuid!} onSuccess={() => { setAddEntryOpen(false); loadTreatment(); }} />
                </DialogContent>
              </Dialog>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {treatment.status === 'active' && (
                    <DropdownMenuItem onClick={() => handleStatusChange('paused')}>
                      Mettre en pause
                    </DropdownMenuItem>
                  )}
                  {treatment.status === 'paused' && (
                    <DropdownMenuItem onClick={() => handleStatusChange('active')}>
                      Reprendre
                    </DropdownMenuItem>
                  )}
                  {treatment.status !== 'completed' && (
                    <DropdownMenuItem onClick={() => handleStatusChange('completed')}>
                      Marquer comme termine
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem className="text-red-600" onClick={handleDeleteTreatment}>
                    Supprimer
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Stats cards */}
        {stats && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
            <Card className="shadow-sm">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Duree</p>
                  <p className="text-lg font-bold">{stats.duree_jours} jours</p>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Entrees</p>
                  <p className="text-lg font-bold">{stats.total_entries}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-600">
                  <Image className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Photos</p>
                  <p className="text-lg font-bold">{stats.photos_count}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                  <Activity className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Freq. reelle</p>
                  <p className="text-lg font-bold">{stats.frequence_reelle}/sem</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Photo comparison */}
        {timeline.length >= 2 && (
          <Card className="shadow-sm mb-6">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Comparaison photos</CardTitle>
                <Dialog open={photoCompareOpen} onOpenChange={setPhotoCompareOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">Voir la timeline</Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl">
                    <PhotoTimeline photos={timeline} treatmentUuid={uuid!} />
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <PhotoCompare 
                photo1={timeline[0]} 
                photo2={timeline[timeline.length - 1]} 
                treatmentUuid={uuid!}
              />
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs defaultValue="entries" className="space-y-4">
          <TabsList>
            <TabsTrigger value="entries" className="gap-2">
              <FileText className="h-4 w-4" /> Journal ({entries.length})
            </TabsTrigger>
            <TabsTrigger value="details" className="gap-2">
              <Target className="h-4 w-4" /> Details
            </TabsTrigger>
            {notes.length > 0 && (
              <TabsTrigger value="notes" className="gap-2">
                <Pill className="h-4 w-4" /> Notes pro ({notes.length})
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="entries">
            <Card className="shadow-sm">
              <CardContent className="p-0">
                {entries.length === 0 ? (
                  <div className="py-12 text-center">
                    <FileText className="mx-auto h-12 w-12 text-muted-foreground/30" />
                    <p className="mt-3 text-muted-foreground">Aucune entree pour le moment</p>
                    <Button className="mt-4 gap-2" onClick={() => setAddEntryOpen(true)}>
                      <Plus className="h-4 w-4" /> Ajouter une entree
                    </Button>
                  </div>
                ) : (
                  <ScrollArea className="h-[500px]">
                    <div className="divide-y">
                      {entries.map((entry: any) => (
                        <EntryItem 
                          key={entry.uuid} 
                          entry={entry} 
                          treatmentUuid={uuid!}
                          onDelete={() => loadTreatment()}
                        />
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="details">
            <Card className="shadow-sm">
              <CardContent className="p-6 space-y-6">
                {treatment.objectif && (
                  <div>
                    <h3 className="font-medium flex items-center gap-2 mb-2">
                      <Target className="h-4 w-4" /> Objectif
                    </h3>
                    <p className="text-muted-foreground">{treatment.objectif}</p>
                  </div>
                )}
                {treatment.traitement_prescrit && (
                  <div>
                    <h3 className="font-medium flex items-center gap-2 mb-2">
                      <Pill className="h-4 w-4" /> Traitement prescrit
                    </h3>
                    <p className="text-muted-foreground whitespace-pre-wrap">{treatment.traitement_prescrit}</p>
                  </div>
                )}
                {treatment.description && (
                  <div>
                    <h3 className="font-medium mb-2">Description</h3>
                    <p className="text-muted-foreground">{treatment.description}</p>
                  </div>
                )}
                {treatment.professional_nom && (
                  <div>
                    <h3 className="font-medium mb-2">Professionnel supervisant</h3>
                    <p className="text-muted-foreground">
                      Dr. {treatment.professional_prenom} {treatment.professional_nom}
                      {treatment.professional_specialite && ` - ${treatment.professional_specialite}`}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {notes.length > 0 && (
            <TabsContent value="notes">
              <Card className="shadow-sm">
                <CardContent className="p-4 space-y-4">
                  {notes.map((note: any) => (
                    <div key={note.uuid} className="rounded-lg border p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{note.type}</Badge>
                          {note.importance === 'urgent' && (
                            <Badge className="bg-red-100 text-red-700">Urgent</Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(note.created_at).toLocaleDateString('fr')}
                        </span>
                      </div>
                      {note.titre && <h4 className="font-medium">{note.titre}</h4>}
                      <p className="text-sm text-muted-foreground mt-1">{note.contenu}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Par Dr. {note.professional_nom}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  );
};

// Entry Item Component
const EntryItem = ({ entry, treatmentUuid, onDelete }: { entry: any; treatmentUuid: string; onDelete: () => void }) => {
  const handleDelete = async () => {
    if (!confirm('Supprimer cette entree ?')) return;
    try {
      await api.deleteTreatmentEntry(treatmentUuid, entry.uuid);
      toast.success('Entree supprimee');
      onDelete();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="flex gap-4 p-4">
      {entry.image_path && (
        <img
          src={api.getTreatmentPhotoUrl(treatmentUuid, entry.uuid, 'thumb')}
          alt="Photo"
          className="h-20 w-20 rounded-lg object-cover shrink-0"
        />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">{entry.type}</Badge>
              <span className="text-sm text-muted-foreground">
                {new Date(entry.date_entry).toLocaleDateString('fr')}
              </span>
            </div>
            {entry.note && <p className="mt-2 text-sm">{entry.note}</p>}
          </div>
          <Button variant="ghost" size="icon" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
        
        <div className="flex flex-wrap gap-3 mt-2 text-sm">
          {entry.amelioration_percue && (
            <span className="flex items-center gap-1">
              {entry.amelioration_percue === 'pire' && <TrendingDown className="h-4 w-4 text-red-500" />}
              {entry.amelioration_percue === 'stable' && <Minus className="h-4 w-4 text-slate-500" />}
              {['legere', 'notable', 'guerison'].includes(entry.amelioration_percue) && <TrendingUp className="h-4 w-4 text-emerald-500" />}
              {entry.amelioration_percue}
            </span>
          )}
          {entry.douleur_niveau !== null && (
            <span className="text-muted-foreground">Douleur: {entry.douleur_niveau}/10</span>
          )}
          {entry.humeur && (
            <span className="text-muted-foreground">Humeur: {entry.humeur}</span>
          )}
        </div>
      </div>
    </div>
  );
};

// Add Entry Form
const AddEntryForm = ({ uuid, onSuccess }: { uuid: string; onSuccess: () => void }) => {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    type: 'note',
    note: '',
    douleur_niveau: 5,
    amelioration_percue: '',
    humeur: '',
    date_entry: new Date().toISOString().split('T')[0]
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.addTreatmentEntry(uuid, {
        ...form,
        douleur_niveau: form.douleur_niveau
      });
      toast.success('Entree ajoutee');
      onSuccess();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Nouvelle entree</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4 mt-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Type</label>
            <Select value={form.type} onValueChange={(v) => setForm(f => ({ ...f, type: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="note">Note</SelectItem>
                <SelectItem value="symptom">Symptome</SelectItem>
                <SelectItem value="medication">Medicament</SelectItem>
                <SelectItem value="appointment">RDV</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">Date</label>
            <Input
              type="date"
              value={form.date_entry}
              onChange={(e) => setForm(f => ({ ...f, date_entry: e.target.value }))}
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">Note</label>
          <Textarea
            placeholder="Decrivez votre observation..."
            value={form.note}
            onChange={(e) => setForm(f => ({ ...f, note: e.target.value }))}
            rows={3}
          />
        </div>

        <div>
          <label className="text-sm font-medium">Niveau de douleur: {form.douleur_niveau}/10</label>
          <Slider
            value={[form.douleur_niveau]}
            onValueChange={([v]) => setForm(f => ({ ...f, douleur_niveau: v }))}
            max={10}
            step={1}
            className="mt-2"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Amelioration</label>
            <Select value={form.amelioration_percue} onValueChange={(v) => setForm(f => ({ ...f, amelioration_percue: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Selectionner" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pire">Pire</SelectItem>
                <SelectItem value="stable">Stable</SelectItem>
                <SelectItem value="legere">Legere</SelectItem>
                <SelectItem value="notable">Notable</SelectItem>
                <SelectItem value="guerison">Guerison</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">Humeur</label>
            <Select value={form.humeur} onValueChange={(v) => setForm(f => ({ ...f, humeur: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Selectionner" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tres_mal">Tres mal</SelectItem>
                <SelectItem value="mal">Mal</SelectItem>
                <SelectItem value="neutre">Neutre</SelectItem>
                <SelectItem value="bien">Bien</SelectItem>
                <SelectItem value="tres_bien">Tres bien</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button type="submit" disabled={loading}>
            {loading ? 'Ajout...' : 'Ajouter'}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
};

// Photo Compare Component
const PhotoCompare = ({ photo1, photo2, treatmentUuid }: { photo1: any; photo2: any; treatmentUuid: string }) => {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="text-center">
        <img
          src={api.getTreatmentPhotoUrl(treatmentUuid, photo1.uuid)}
          alt="Debut"
          className="w-full aspect-square object-cover rounded-lg"
        />
        <p className="text-sm text-muted-foreground mt-2">
          Debut - {new Date(photo1.date_entry).toLocaleDateString('fr')}
        </p>
      </div>
      <div className="text-center">
        <img
          src={api.getTreatmentPhotoUrl(treatmentUuid, photo2.uuid)}
          alt="Actuel"
          className="w-full aspect-square object-cover rounded-lg"
        />
        <p className="text-sm text-muted-foreground mt-2">
          Actuel - {new Date(photo2.date_entry).toLocaleDateString('fr')}
        </p>
      </div>
    </div>
  );
};

// Photo Timeline Component
const PhotoTimeline = ({ photos, treatmentUuid }: { photos: any[]; treatmentUuid: string }) => {
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing) return;
    const interval = setInterval(() => {
      setCurrent(c => (c + 1) % photos.length);
    }, 1500);
    return () => clearInterval(interval);
  }, [playing, photos.length]);

  return (
    <>
      <DialogHeader>
        <DialogTitle>Timeline photos</DialogTitle>
      </DialogHeader>
      <div className="mt-4">
        <div className="relative aspect-square max-w-md mx-auto">
          <img
            src={api.getTreatmentPhotoUrl(treatmentUuid, photos[current].uuid)}
            alt={`Photo ${current + 1}`}
            className="w-full h-full object-cover rounded-lg"
          />
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-background/90 rounded-full px-4 py-2">
            <span className="text-sm font-medium">
              {new Date(photos[current].date_entry).toLocaleDateString('fr')}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-4 mt-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrent(c => Math.max(0, c - 1))}
            disabled={current === 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setPlaying(!playing)}
          >
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrent(c => Math.min(photos.length - 1, c + 1))}
            disabled={current === photos.length - 1}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
          {photos.map((photo, i) => (
            <button
              key={photo.uuid}
              onClick={() => setCurrent(i)}
              className={`shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 ${
                i === current ? 'border-primary' : 'border-transparent'
              }`}
            >
              <img
                src={api.getTreatmentPhotoUrl(treatmentUuid, photo.uuid, 'thumb')}
                alt={`Thumbnail ${i + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      </div>
    </>
  );
};

export default TreatmentDetail;
