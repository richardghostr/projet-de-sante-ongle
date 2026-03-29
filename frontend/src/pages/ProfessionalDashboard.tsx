import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Users, FileText, Stethoscope, UserPlus, Mail, 
  CheckCircle, XCircle, Clock, Activity, Eye,
  Plus, ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';

interface DashboardStats {
  patients: { total: number; pending_requests: number };
  notes: { total: number; this_week: number };
  treatments_supervised: number;
  recent_activity: Array<{ id: number; type: string; titre: string; created_at: string; patient_nom: string }>;
}

interface Patient {
  id: number;
  nom: string;
  prenom?: string;
  email: string;
  telephone?: string;
  avatar_url?: string;
  link_id: number;
  link_status: string;
  linked_at: string;
  total_analyses: number;
  active_treatments: number;
}

interface PatientRequest {
  id: number;
  patient_id: number;
  nom: string;
  prenom?: string;
  email: string;
  requested_by: string;
  created_at: string;
}

const ProfessionalDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [requests, setRequests] = useState<PatientRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientDossier, setPatientDossier] = useState<any>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const [statsRes, patientsRes, requestsRes] = await Promise.all([
        api.getProfessionalDashboard(),
        api.getProfessionalPatients(),
        api.getPendingRequests()
      ]);
      setStats(statsRes.data || statsRes);
      setPatients((patientsRes.data || patientsRes).patients || []);
      setRequests((requestsRes.data || requestsRes).requests || []);
    } catch (err) {
      console.error('Failed to load dashboard', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;
    setInviteLoading(true);
    try {
      await api.invitePatient(inviteEmail);
      toast.success('Invitation envoyee');
      setInviteEmail('');
      loadDashboard();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setInviteLoading(false);
    }
  };

  const handleRequest = async (linkId: number, action: 'accept' | 'reject') => {
    try {
      await api.handleLinkRequest(linkId, action);
      toast.success(action === 'accept' ? 'Demande acceptee' : 'Demande refusee');
      loadDashboard();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const openPatientDossier = async (patient: Patient) => {
    setSelectedPatient(patient);
    try {
      const res = await api.getPatientDossier(patient.id);
      setPatientDossier(res.data || res);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const statCards = [
    { label: 'Patients suivis', value: stats?.patients.total ?? 0, icon: Users, color: 'text-blue-500' },
    { label: 'Demandes en attente', value: stats?.patients.pending_requests ?? 0, icon: Clock, color: 'text-amber-500' },
    { label: 'Notes cette semaine', value: stats?.notes.this_week ?? 0, icon: FileText, color: 'text-emerald-500' },
    { label: 'Traitements supervises', value: stats?.treatments_supervised ?? 0, icon: Activity, color: 'text-purple-500' },
  ];

  const riskColor = (risk: string) => {
    const m: Record<string, string> = { 
      sain: 'bg-emerald-100 text-emerald-700', 
      bas: 'bg-blue-100 text-blue-700', 
      modere: 'bg-amber-100 text-amber-700', 
      eleve: 'bg-orange-100 text-orange-700', 
      critique: 'bg-red-100 text-red-700' 
    };
    return m[risk] || 'bg-muted text-muted-foreground';
  };

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <Navbar />
      <main className="container flex-1 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Stethoscope className="h-4 w-4" />
            <span>Espace Professionnel</span>
          </div>
          <h1 className="text-3xl font-bold">Bonjour, Dr. {user?.nom}</h1>
          <p className="text-muted-foreground">Gerez vos patients et leurs traitements</p>
        </div>

        {/* Stats */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map(({ label, value, icon: Icon, color }) => (
            <Card key={label} className="shadow-sm">
              <CardContent className="flex items-center gap-4 p-5">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-muted ${color}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className="text-2xl font-bold tabular-nums">{value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Patients list */}
          <div className="lg:col-span-2">
            <Card className="shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Mes patients</CardTitle>
                    <CardDescription>Patients que vous suivez actuellement</CardDescription>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button className="gap-2"><UserPlus className="h-4 w-4" /> Inviter</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Inviter un patient</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleInvite} className="space-y-4">
                        <div>
                          <label className="text-sm font-medium">Email du patient</label>
                          <div className="flex gap-2 mt-1">
                            <Input
                              type="email"
                              placeholder="patient@example.com"
                              value={inviteEmail}
                              onChange={(e) => setInviteEmail(e.target.value)}
                            />
                            <Button type="submit" disabled={inviteLoading}>
                              {inviteLoading ? 'Envoi...' : 'Inviter'}
                            </Button>
                          </div>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </div>
                ) : patients.length === 0 ? (
                  <div className="py-12 text-center">
                    <Users className="mx-auto h-12 w-12 text-muted-foreground/40" />
                    <p className="mt-3 text-muted-foreground">Aucun patient pour le moment</p>
                    <p className="text-sm text-muted-foreground">Invitez des patients pour commencer leur suivi</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {patients.map((patient) => (
                      <div
                        key={patient.id}
                        className="flex items-center justify-between rounded-xl border p-4 transition-colors hover:bg-muted/50"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-medium">
                            {(patient.prenom?.[0] || patient.nom[0]).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium">{patient.prenom} {patient.nom}</p>
                            <p className="text-sm text-muted-foreground">{patient.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right text-sm">
                            <p>{patient.total_analyses} analyses</p>
                            <p className="text-muted-foreground">{patient.active_treatments} traitements</p>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => openPatientDossier(patient)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Side panel */}
          <div className="space-y-6">
            {/* Pending requests */}
            {requests.length > 0 && (
              <Card className="shadow-sm border-amber-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="h-4 w-4 text-amber-500" />
                    Demandes en attente
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {requests.map((req) => (
                    <div key={req.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="font-medium text-sm">{req.prenom} {req.nom}</p>
                        <p className="text-xs text-muted-foreground">{req.email}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button 
                          size="icon" 
                          variant="ghost"
                          className="h-8 w-8 text-emerald-600 hover:bg-emerald-50"
                          onClick={() => handleRequest(req.id, 'accept')}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost"
                          className="h-8 w-8 text-red-600 hover:bg-red-50"
                          onClick={() => handleRequest(req.id, 'reject')}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Recent activity */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Activite recente</CardTitle>
              </CardHeader>
              <CardContent>
                {!stats?.recent_activity || stats.recent_activity.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Aucune activite recente</p>
                ) : (
                  <div className="space-y-3">
                    {stats.recent_activity.slice(0, 5).map((act) => (
                      <div key={act.id} className="flex items-start gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{act.titre || act.type}</p>
                          <p className="text-xs text-muted-foreground">
                            {act.patient_nom} - {new Date(act.created_at).toLocaleDateString('fr')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Patient Dossier Dialog */}
        <Dialog open={!!selectedPatient} onOpenChange={(open) => !open && setSelectedPatient(null)}>
          <DialogContent className="max-w-3xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>Dossier de {selectedPatient?.prenom} {selectedPatient?.nom}</DialogTitle>
            </DialogHeader>
            {patientDossier ? (
              <Tabs defaultValue="analyses" className="mt-4">
                <TabsList>
                  <TabsTrigger value="analyses">Analyses</TabsTrigger>
                  <TabsTrigger value="treatments">Traitements</TabsTrigger>
                  <TabsTrigger value="notes">Mes notes</TabsTrigger>
                </TabsList>

                <TabsContent value="analyses">
                  <ScrollArea className="h-80">
                    {patientDossier.analyses?.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">Aucune analyse</p>
                    ) : (
                      <div className="space-y-2">
                        {patientDossier.analyses?.map((a: any) => (
                          <div key={a.uuid} className="flex items-center justify-between rounded-lg border p-3">
                            <div>
                              <p className="font-medium">{a.pathologie_label || 'Analyse'}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(a.date_analyse).toLocaleDateString('fr')}
                              </p>
                            </div>
                            <Badge className={riskColor(a.niveau_risque)}>{a.niveau_risque}</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="treatments">
                  <ScrollArea className="h-80">
                    {patientDossier.treatments?.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">Aucun traitement</p>
                    ) : (
                      <div className="space-y-2">
                        {patientDossier.treatments?.map((t: any) => (
                          <div key={t.uuid} className="flex items-center justify-between rounded-lg border p-3">
                            <div>
                              <p className="font-medium">{t.titre}</p>
                              <p className="text-xs text-muted-foreground">
                                {t.pathologie_nom} - {t.total_entries} entrees
                              </p>
                            </div>
                            <Badge variant="outline">{t.status}</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="notes">
                  <ScrollArea className="h-80">
                    <AddNoteForm patientId={selectedPatient?.id || 0} onSuccess={() => openPatientDossier(selectedPatient!)} />
                    <div className="mt-4 space-y-2">
                      {patientDossier.notes?.map((n: any) => (
                        <div key={n.uuid} className="rounded-lg border p-3">
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant="outline">{n.type}</Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(n.created_at).toLocaleDateString('fr')}
                            </span>
                          </div>
                          {n.titre && <p className="font-medium text-sm">{n.titre}</p>}
                          <p className="text-sm text-muted-foreground">{n.contenu}</p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            ) : (
              <div className="flex justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

// Add Note Form Component
const AddNoteForm = ({ patientId, onSuccess }: { patientId: number; onSuccess: () => void }) => {
  const [note, setNote] = useState('');
  const [type, setType] = useState('general');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim()) return;
    setLoading(true);
    try {
      await api.addProfessionalNote({
        patient_id: patientId,
        contenu: note,
        type
      });
      setNote('');
      toast.success('Note ajoutee');
      onSuccess();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 p-3 rounded-lg border bg-muted/30">
      <div className="flex gap-2">
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="general">General</SelectItem>
            <SelectItem value="diagnosis">Diagnostic</SelectItem>
            <SelectItem value="recommendation">Recommandation</SelectItem>
            <SelectItem value="prescription">Prescription</SelectItem>
            <SelectItem value="follow_up">Suivi</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Textarea
        placeholder="Ajouter une note..."
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
      />
      <Button type="submit" size="sm" disabled={loading || !note.trim()}>
        {loading ? 'Ajout...' : 'Ajouter la note'}
      </Button>
    </form>
  );
};

export default ProfessionalDashboard;
