import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { StatCard } from '@/components/StatCard';
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
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import useProtectedImage from '@/hooks/useProtectedImage';

interface Treatment {
  uuid: string;
  titre: string;
  status: 'active' | 'paused' | 'completed' | 'abandoned';
  pathologie_nom?: string;
  date_debut: string;
  date_fin_prevue?: string;
  objectif?: string;
  traitement_prescrit?: string;
  description?: string;
  professional_nom?: string;
  professional_prenom?: string;
}

interface TreatmentEntry {
  uuid: string;
  type: string;
  note?: string;
  date_entry: string;
  image_path?: string;
  amelioration_percue?: string;
  douleur_niveau?: number;
  humeur?: string;
}

interface TreatmentNote {
  uuid: string;
  type: string;
  titre?: string;
  contenu: string;
  importance?: string;
  created_at: string;
  professional_nom: string;
}

interface TreatmentMessage {
  uuid: string;
  contenu: string;
  created_at: string;
  sender_id: number;
  sender_nom: string;
  sender_prenom: string;
}

interface TreatmentStats {
  duree_jours: number;
  total_entries: number;
  photos_count: number;
  frequence_reelle: number;
}

interface Photo {
  uuid: string;
  date_entry: string;
}
function ProtectedImg({
  url,
  alt,
  className,
  placeholderClass
}: {
  url?: string | null;
  alt?: string;
  className?: string;
  placeholderClass?: string;
}) {
  const { src, loading, error } = useProtectedImage(url || null);
  if (loading) return <div className={placeholderClass || 'rounded-lg bg-muted/30 animate-pulse'} />;
  if (error || !src) return <div className="rounded-lg bg-muted-foreground/10 flex items-center justify-center text-xs text-muted-foreground">Erreur</div>;
  return <img src={src} alt={alt || 'Photo'} className={className} />;
}

const TreatmentDetail = () => {
  const { id: uuid } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [treatment, setTreatment] = useState<Treatment | null>(null);
  const [entries, setEntries] = useState<TreatmentEntry[]>([]);
  const [notes, setNotes] = useState<TreatmentNote[]>([]);
  const [messages, setMessages] = useState<TreatmentMessage[]>([]);
  const [stats, setStats] = useState<TreatmentStats | null>(null);
  const [timeline, setTimeline] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
    const { toast } = useToast();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [showWebcam, setShowWebcam] = useState(false);
  const [webcamError, setWebcamError] = useState<string | null>(null);
  const [photoCompareOpen, setPhotoCompareOpen] = useState(false);
  const [addEntryOpen, setAddEntryOpen] = useState(false);

    useEffect(() => { loadTreatment(); }, [uuid]);

  const loadTreatment = async () => {
    setLoading(true);
    try {
      const [treatmentRes, timelineRes] = await Promise.all([
        api.getTreatment(uuid!),
        api.getTreatmentTimeline(uuid!)
      ]);
      const treatmentData = treatmentRes?.data || treatmentRes;
      const timelineData = timelineRes?.data || timelineRes;
      const statsData = null;

      if (!treatmentData || !treatmentData.treatment) {
        throw new Error('Donnees de traitement invalides');
      }

      setTreatment(treatmentData.treatment);
      setEntries(treatmentData.entries || []);
      setNotes(treatmentData.notes || []);
      setMessages(treatmentData.messages || []);
      setStats(statsData || null);
      setTimeline(timelineData?.photos || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      toast({ title: 'Erreur', description: message });
      console.error('Treatment loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      await api.updateTreatmentStatus(uuid!, newStatus as Treatment['status']);
      toast({ title: 'Succès', description: 'Statut mis a jour' });
      loadTreatment();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      toast({ title: 'Erreur', description: message });
    }
  };

  const handleDeleteTreatment = async () => {
    if (!confirm('Supprimer ce traitement ?')) return;
    try {
      await api.deleteTreatment(uuid!);
      toast({ title: 'Succès', description: 'Traitement supprime' });
      navigate('/treatments');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      toast({ title: 'Erreur', description: message });
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      await api.uploadTreatmentPhoto(uuid!, file, {
        date_entry: new Date().toISOString().split('T')[0]
      });
      toast({ title: 'Succès', description: 'Photo ajoutee' });
      loadTreatment();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      toast({ title: 'Erreur', description: message });
    }
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // New handlers for gallery / camera selection that show preview first
  const validateFile = (file: File) => {
    setFileError(null);
    const allowed = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!allowed.includes(file.type)) return 'Format non supporté (jpg/png uniquement)';
    const maxBytes = 5 * 1024 * 1024;
    if (file.size > maxBytes) return 'Fichier trop volumineux (max 5MB)';
    return null;
  };

  const handleSelectFromGallery = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (!file) return;
    const err = validateFile(file);
    if (err) {
      setFileError(err);
      if (galleryInputRef.current) galleryInputRef.current.value = '';
      return;
    }
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setPreviewOpen(true);
  };

  const handleCapturePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (!file) return;
    const err = validateFile(file);
    if (err) {
      setFileError(err);
      if (cameraInputRef.current) cameraInputRef.current.value = '';
      return;
    }
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setPreviewOpen(true);
  };

  const isMobileDevice = () => {
    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent || navigator.vendor || (window as any).opera || '';
    return /Mobi|Android|iPhone|iPad|iPod|Phone/i.test(ua) || window.matchMedia?.('(pointer:coarse)').matches;
  };

  const handleTakePhotoClick = async () => {
    if (isMobileDevice()) {
      // let mobile input open camera via capture attr
      cameraInputRef.current?.click();
      return;
    }
    // desktop path: open webcam dialog and request camera
    setWebcamError(null);
    setShowWebcam(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err: any) {
      console.error('Webcam error', err);
      setWebcamError(err?.message || 'Impossible d\'accéder à la webcam');
      // fallback to gallery input if webcam denied
      if (galleryInputRef.current) galleryInputRef.current.click();
    }
  };

  const stopWebcam = () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      }
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    if (!showWebcam) stopWebcam();
    return () => stopWebcam();
  }, [showWebcam]);

  const captureFromWebcam = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const w = video.videoWidth || 1280;
    const h = video.videoHeight || 720;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, w, h);
    return new Promise<void>((resolve) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          setWebcamError('Erreur lors de la capture');
          resolve();
          return;
        }
        const file = new File([blob], `capture_${Date.now()}.jpg`, { type: blob.type });
        setSelectedFile(file);
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        setPreviewOpen(true);
        setShowWebcam(false);
        stopWebcam();
        resolve();
      }, 'image/jpeg', 0.92);
    });
  };

  const cancelPreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setSelectedFile(null);
    setPreviewOpen(false);
    setFileError(null);
    if (galleryInputRef.current) galleryInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const sendSelectedPhoto = async () => {
    if (!selectedFile) return;
    setUploading(true);
    try {
      await api.uploadTreatmentPhoto(uuid!, selectedFile, { date_entry: new Date().toISOString().split('T')[0] });
      toast({ title: 'Succès', description: 'Photo envoyée' });
      cancelPreview();
      loadTreatment();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      toast({ title: 'Erreur', description: message });
    } finally {
      setUploading(false);
    }
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
      <div className="flex min-h-dvh items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!treatment) {
    return (
      <div className="flex min-h-dvh flex-col bg-muted/30">
        <Navbar />
        <main className="container flex-1 py-4 pb-24 md:py-8 md:pb-8 text-center">
          <p className="text-muted-foreground">Traitement non trouve</p>
          <Button variant="outline" className="mt-4 w-full max-w-xs mx-auto" onClick={() => navigate('/treatments')}>
            Retour aux traitements
          </Button>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-muted/30">
      <Navbar />
      <main className="container flex-1 py-4 pb-24 md:py-8 md:pb-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold md:text-2xl">{treatment.titre}</h1>
              <Badge className={statusColor(treatment.status)}>{treatment.status}</Badge>
            </div>
            {treatment.pathologie_nom && (
              <p className="text-sm text-muted-foreground">{treatment.pathologie_nom}</p>
            )}
            <p className="text-xs text-muted-foreground mt-0.5">
              Début : {new Date(treatment.date_debut).toLocaleDateString('fr')}
              {treatment.date_fin_prevue && ` · Fin prévue : ${new Date(treatment.date_fin_prevue).toLocaleDateString('fr')}`}
            </p>
            <div className="flex flex-wrap gap-2 mt-1">
              <input
                type="file"
                ref={galleryInputRef}
                className="hidden"
                accept="image/*"
                onChange={(e) => handleSelectFromGallery(e)}
                aria-label="Choisir depuis la galerie"
              />
              <input
                type="file"
                ref={cameraInputRef}
                className="hidden"
                accept="image/*"
                capture="environment"
                onChange={(e) => handleCapturePhoto(e)}
                aria-label="Prendre une photo"
              />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="h-11 flex-1 gap-2 min-w-[140px]"><Camera className="h-4 w-4" /> Ajouter une image</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                      <DropdownMenuItem onClick={() => galleryInputRef.current?.click()}>Choisir depuis la galerie</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleTakePhotoClick()}>Prendre une photo</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Dialog open={addEntryOpen} onOpenChange={setAddEntryOpen}>
                <DialogTrigger asChild>
                  <Button className="h-11 flex-1 gap-2 min-w-[140px]"><Plus className="h-4 w-4" /> Entrée</Button>
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

            <Dialog open={showWebcam} onOpenChange={setShowWebcam}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Webcam</DialogTitle>
                </DialogHeader>
                {webcamError && <p className="text-sm text-red-600">{webcamError}</p>}
                <div className="mt-2">
                  <div className="w-full h-64 bg-black rounded-md overflow-hidden">
                    <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
                  </div>
                </div>
                <div className="mt-4 flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => { setShowWebcam(false); stopWebcam(); }}>Annuler</Button>
                  <Button onClick={async () => { await captureFromWebcam(); }}>Capturer</Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Prévisualisation</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground">Prenez une photo nette, bien éclairée et centrée sur votre ongle</p>
                {previewUrl ? (
                  <img src={previewUrl} alt="Prévisualisation" className="w-full mt-4 rounded-lg object-contain" />
                ) : (
                  <div className="w-full mt-4 h-40 rounded-lg bg-muted/30 flex items-center justify-center">Aucune image</div>
                )}
                {fileError && <p className="text-sm text-red-600 mt-2">{fileError}</p>}
                <div className="mt-4 flex gap-2 justify-end">
                  <Button variant="outline" onClick={cancelPreview}>Supprimer</Button>
                  <Button onClick={sendSelectedPhoto} disabled={uploading || !selectedFile}>{uploading ? 'Envoi...' : 'Envoyer'}</Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Stats cards */}
        {stats && (
          <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard label="Durée" value={`${stats.duree_jours}j`} icon={Calendar} color="text-blue-600" />
            <StatCard label="Entrées" value={stats.total_entries} icon={FileText} color="text-emerald-600" />
            <StatCard label="Photos" value={stats.photos_count} icon={Image} color="text-purple-600" />
            <StatCard label="Jours suivi" value={stats.frequence_reelle ?? 0} icon={Clock} color="text-amber-600" />
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
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
            <TabsTrigger value="entries" className="text-xs md:text-sm"> <FileText className="h-4 w-4" /> Journal ({entries.length})</TabsTrigger>
            <TabsTrigger value="details" className="text-xs md:text-sm"> <Target className="h-4 w-4" /> Détails</TabsTrigger>
            {notes.length > 0 && (
              <TabsTrigger value="notes" className="text-xs md:text-sm"> <Pill className="h-4 w-4" /> Notes pro ({notes.length})</TabsTrigger>
            )}
          {treatment?.professional_nom && (
            <TabsTrigger value="professional" className="text-xs md:text-sm"> <Activity className="h-4 w-4" /> Professionnel</TabsTrigger>
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
                      {entries.map((entry: TreatmentEntry) => (
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
                  {notes.map((note: TreatmentNote) => (
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

          {treatment?.professional_nom && (
            <TabsContent value="professional">
              <Card className="shadow-sm">
                <CardContent className="p-4 space-y-4">
                  <div>
                    <h3 className="font-medium mb-2">Professionnel supervisant</h3>
                    <p className="text-muted-foreground">Dr. {treatment?.professional_prenom} {treatment?.professional_nom}{treatment?.professional_specialite && ` - ${treatment?.professional_specialite}`}</p>
                  </div>

                  {notes.length > 0 && (
                    <div>
                      <h4 className="font-medium">Notes du professionnel</h4>
                      <div className="mt-2 space-y-3">
                        {notes.map(n => (
                          <div key={n.uuid} className="rounded-lg border p-3">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">{n.type}</Badge>
                                {n.importance === 'urgent' && <Badge className="bg-red-100 text-red-700">Urgent</Badge>}
                                {!n.read_at && <Badge className="bg-blue-100 text-blue-700">Nouvelle</Badge>}
                              </div>
                              <span className="text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString('fr')}</span>
                            </div>
                            {n.titre && <h5 className="font-medium">{n.titre}</h5>}
                            <p className="text-sm text-muted-foreground mt-1">{n.contenu}</p>
                            <p className="text-xs text-muted-foreground mt-2">Par Dr. {n.professional_prenom ? `${n.professional_prenom} ${n.professional_nom}` : n.professional_nom}</p>
                            {!n.read_at && (
                              <div className="mt-3 text-right">
                                <Button size="sm" variant="ghost" onClick={async () => {
                                  try {
                                    await api.request(`/patient/notes/${n.id}/read`, { method: 'POST' });
                                    // mark local state as read
                                    n.read_at = new Date().toISOString();
                                  } catch (e) { /* ignore */ }
                                }}>Marquer comme lu</Button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* If current user is a professional, allow adding a treatment note */}
                  {treatment && (
                    <AddTreatmentNoteSection treatment={treatment} onAdded={() => loadTreatment()} />
                  )}

                  <div>
                    <h4 className="font-medium">Messages</h4>
                    <div className="mt-3 space-y-3 max-h-64 overflow-auto">
                      {messages.length === 0 ? (
                        <div className="text-sm text-muted-foreground">Aucun message pour le moment</div>
                      ) : (
                        // show messages oldest first
                        [...messages].reverse().map(m => {
                          const isMine = m.sender_id === (user?.id ?? 0);
                          return (
                            <div key={m.uuid} className={`rounded-lg p-3 ${isMine ? 'bg-primary/10 ml-auto max-w-[75%]' : 'bg-slate-50 mr-auto max-w-[75%]'} border`}>
                              <div className="flex items-center justify-between mb-1">
                                <div className="text-sm font-medium">{m.sender_prenom ? `${m.sender_prenom} ${m.sender_nom}` : m.sender_nom}</div>
                                <div className="text-xs text-muted-foreground">{new Date(m.created_at).toLocaleString('fr')}</div>
                              </div>
                              <p className="text-sm text-muted-foreground">{m.contenu}</p>
                            </div>
                          );
                        })
                      )}
                    </div>

                    <div className="mt-4">
                      <MessageComposer treatmentUuid={uuid!} onSent={() => loadTreatment()} />
                    </div>
                  </div>
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
const EntryItem = ({ entry, treatmentUuid, onDelete }: { entry: TreatmentEntry; treatmentUuid: string; onDelete: () => void }) => {
  const { toast } = useToast();
  const handleDelete = async () => {
    if (!confirm('Supprimer cette entree ?')) return;
    try {
      await api.deleteTreatmentEntry(treatmentUuid, entry.uuid);
      toast({ title: 'Succès', description: 'Entree supprimee' });
      onDelete();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      toast({ title: 'Erreur', description: message });
    }
  };

  return (
    <div className="flex gap-4 p-4">
      {entry.image_path && (
        <ProtectedImg
          url={api.getTreatmentPhotoUrl(treatmentUuid, entry.uuid, 'thumb')}
          alt="Photo"
          className="h-14 w-14 rounded-lg object-cover shrink-0"
          placeholderClass="h-14 w-14 rounded-lg bg-muted/40 animate-pulse"
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
          <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive" onClick={handleDelete}>
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
  const { toast } = useToast();
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
      toast({ title: 'Succès', description: 'Entree ajoutee' });
      onSuccess();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      toast({ title: 'Erreur', description: message });
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
              className="h-12 text-base"
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
            className="text-base"
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
              <SelectTrigger className="h-12 text-base">
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
              <SelectTrigger className="h-12 text-base">
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

// Message Composer Component
const MessageComposer = ({ treatmentUuid, onSent }: { treatmentUuid: string; onSent: () => void }) => {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSend = async () => {
    if (!message.trim()) return;
    setLoading(true);
    try {
      await api.postTreatmentMessage(treatmentUuid, message.trim());
      toast({ title: 'Succès', description: 'Message envoyé' });
      setMessage('');
      onSent();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de l\'envoi';
      toast({ title: 'Erreur', description: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-2">
      <Textarea
        placeholder="Ecrire un message au professionnel..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={3}
      />
      <div className="flex items-center justify-end gap-2 mt-2">
        <Button size="sm" onClick={handleSend} disabled={loading || !message.trim()}>
          {loading ? 'Envoi...' : 'Envoyer'}
        </Button>
      </div>
    </div>
  );
};

// Photo Compare Component
const PhotoCompare = ({ photo1, photo2, treatmentUuid }: { photo1: Photo; photo2: Photo; treatmentUuid: string }) => {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="text-center">
        <ProtectedImg
          url={api.getTreatmentPhotoUrl(treatmentUuid, photo1.uuid)}
          alt="Debut"
          className="w-full aspect-square object-cover rounded-lg"
          placeholderClass="w-full aspect-square rounded-lg bg-muted/30 animate-pulse"
        />
        <p className="text-sm text-muted-foreground mt-2">
          Debut - {new Date(photo1.date_entry).toLocaleDateString('fr')}
        </p>
      </div>
      <div className="text-center">
        <ProtectedImg
          url={api.getTreatmentPhotoUrl(treatmentUuid, photo2.uuid)}
          alt="Actuel"
          className="w-full aspect-square object-cover rounded-lg"
          placeholderClass="w-full aspect-square rounded-lg bg-muted/30 animate-pulse"
        />
        <p className="text-sm text-muted-foreground mt-2">
          Actuel - {new Date(photo2.date_entry).toLocaleDateString('fr')}
        </p>
      </div>
    </div>
  );
};

// Section for professionals to add a treatment note
const AddTreatmentNoteSection = ({ treatment, onAdded }: { treatment: any; onAdded: () => void }) => {
  const { user, isProfessional } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState('');

  if (!isProfessional) return null;

  const canEdit = user && (user.id === (treatment.professional_id || treatment.professionalId) || user.role === 'admin');

  const handleAdd = async () => {
    if (!note.trim()) return toast({ title: 'Erreur', description: 'Le contenu est requis' });
    setLoading(true);
    try {
      // treatment.id is numeric id required by the professional route
      await api.addTreatmentNote(treatment.id, note.trim());
      toast({ title: 'Succès', description: 'Note ajoutée au traitement' });
      setNote('');
      setOpen(false);
      onAdded();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err?.message || 'Erreur lors de l\'ajout' });
    } finally {
      setLoading(false);
    }
  };

  if (!canEdit) return null;

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-2">
        <h5 className="font-medium">Ajouter une note de suivi</h5>
        <Button variant="outline" size="sm" onClick={() => setOpen(o => !o)}>{open ? 'Fermer' : 'Ajouter'}</Button>
      </div>
      {open && (
        <div className="space-y-2">
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={4} />
          <div className="flex justify-end">
            <Button onClick={handleAdd} disabled={loading || !note.trim()}>{loading ? 'Envoi...' : 'Ajouter la note'}</Button>
          </div>
        </div>
      )}
    </div>
  );
};

// Photo Timeline Component
const PhotoTimeline = ({ photos, treatmentUuid }: { photos: Photo[]; treatmentUuid: string }) => {
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
              <ProtectedImg
                url={api.getTreatmentPhotoUrl(treatmentUuid, photos[current].uuid)}
                alt={`Photo ${current + 1}`}
                className="w-full h-full object-cover rounded-lg"
                placeholderClass="w-full h-full rounded-lg bg-muted/30 animate-pulse"
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
              <ProtectedImg
                url={api.getTreatmentPhotoUrl(treatmentUuid, photo.uuid, 'thumb')}
                alt={`Thumbnail ${i + 1}`}
                className="w-full h-full object-cover"
                placeholderClass="w-full h-full bg-muted/30 animate-pulse"
              />
            </button>
          ))}
        </div>
      </div>
    </>
  );
};

export default TreatmentDetail;
