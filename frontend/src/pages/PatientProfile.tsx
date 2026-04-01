import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import { PageHeader } from '@/components/PageHeader';
import { User, Shield, MapPin, Activity, RefreshCw } from 'lucide-react';

const PatientProfile = () => {
  const [profile, setProfile] = useState<any | null>(null);
  const [form, setForm] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pwdSaving, setPwdSaving] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    (async () => {
      setLoading(true);
        try {
        const res: any = await api.getProfile();
        const data = res?.data || res;
        const p = data?.profile || data;
          // attach stats if provided at top-level
          if (data?.stats) p.stats = data.stats;
          setProfile(p);
          setForm({
            prenom: p.prenom || '',
            nom: p.nom || '',
            email: p.email || '',
            telephone: p.telephone || '',
            date_naissance: p.date_naissance || '',
            sexe: p.sexe || '',
            nationalite: p.nationalite || '',
            groupe_sanguin: p.groupe_sanguin || '',
            allergies: Array.isArray(p.allergies) ? p.allergies.join(', ') : (p.allergies || ''),
            antecedents: p.antecedents || '',
            traitement_en_cours: p.traitement_en_cours || '',
            contact_urgence: p.contact_urgence || '',
            telephone_urgence: p.telephone_urgence || '',
            adresse: p.adresse || '',
            ville: p.ville || '',
            pays: p.pays || ''
          });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { ...form };
      if (typeof payload.allergies === 'string') {
        payload.allergies = payload.allergies.split(',').map((s: string) => s.trim()).filter(Boolean);
      }
      await api.updateProfile(payload);
      toast({ title: 'Profil sauvegarde', description: 'Les informations ont ete enregistrees.' });
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Erreur', description: err?.message || 'Echec de la sauvegarde', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!currentPassword || !newPassword || !newPasswordConfirm) {
      toast({ title: 'Erreur', description: 'Veuillez remplir tous les champs.', variant: 'destructive' });
      return;
    }
    if (newPassword !== newPasswordConfirm) {
      toast({ title: 'Erreur', description: 'La confirmation ne correspond pas.', variant: 'destructive' });
      return;
    }
    setPwdSaving(true);
    try {
      await api.changePassword({ current_password: currentPassword, new_password: newPassword, new_password_confirmation: newPasswordConfirm });
      setCurrentPassword(''); setNewPassword(''); setNewPasswordConfirm('');
      toast({ title: 'Mot de passe mis a jour', description: 'Votre mot de passe a ete modifie.' });
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Erreur', description: err?.message || 'Impossible de changer le mot de passe', variant: 'destructive' });
    } finally {
      setPwdSaving(false);
    }
  };

  if (loading) return (
    <div className="flex min-h-dvh flex-col bg-muted/30">
      <Navbar />
      <main className="container flex flex-1 items-center justify-center py-8 pb-24 md:pb-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </main>
    </div>
  );

  if (!profile) return (
    <div className="flex min-h-dvh flex-col bg-muted/30">
      <Navbar />
      <main className="container py-8 pb-24 md:pb-8">
        <p className="text-center text-muted-foreground">Profil introuvable</p>
      </main>
    </div>
  );

  return (
    <div className="flex min-h-dvh flex-col bg-muted/30">
      <Navbar />
      <main className="container flex-1 py-4 pb-24 md:py-8 md:pb-8">
        <PageHeader 
          title="Mon profil"
          subtitle="Donnees medicales et informations personnelles"
          action={
            <div className="flex w-full gap-2 sm:w-auto">
              <Button variant="ghost" size="icon" className="h-11 w-11" onClick={() => window.location.reload()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button className="h-12 flex-1 rounded-xl text-base sm:h-10 sm:flex-none sm:text-sm" onClick={handleSave} disabled={saving}>
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </div>
          }
        />

        {/* Profile Header Card */}
        <Card className="mb-6 shadow-sm">
          <CardContent className="p-4 md:p-6">
            <div className="flex flex-col items-center text-center">
              {profile.avatar_url ? (
                <img 
                  src={(profile.avatar_url.startsWith('http') ? profile.avatar_url : (import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, '') || 'http://localhost:8000') + profile.avatar_url)} 
                  alt="avatar" 
                  className="h-20 w-20 rounded-full object-cover md:h-24 md:w-24" 
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary md:h-24 md:w-24">
                  <User className="h-10 w-10" />
                </div>
              )}
              <h2 className="mt-3 text-lg font-semibold">{profile.prenom} {profile.nom}</h2>
              <p className="text-sm text-muted-foreground">{profile.email}</p>
              <div className="mt-2 flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
                <span>Analyses: {profile.stats?.total_analyses ?? '-'}</span>
                <span>|</span>
                <span>Derniere: {profile.stats?.derniere_analyse ?? '-'}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Accordion type="multiple" defaultValue={['identity', 'medical']} className="space-y-4">
          {/* Identity Section */}
          <AccordionItem value="identity" className="rounded-xl border bg-card shadow-sm">
            <AccordionTrigger className="px-4 py-4 hover:no-underline md:px-6">
              <span className="flex items-center gap-2 font-semibold">
                <User className="h-4 w-4 text-primary" />
                Identite
              </span>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4 md:px-6 md:pb-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Prenom</Label>
                  <Input className="h-12 text-base" value={form.prenom} onChange={(e) => setForm((f: any) => ({ ...f, prenom: e.target.value }))} />
                </div>
                <div>
                  <Label>Nom</Label>
                  <Input className="h-12 text-base" value={form.nom} onChange={(e) => setForm((f: any) => ({ ...f, nom: e.target.value }))} />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input className="h-12 text-base" value={form.email} onChange={(e) => setForm((f: any) => ({ ...f, email: e.target.value }))} />
                </div>
                <div>
                  <Label>Telephone</Label>
                  <Input className="h-12 text-base" value={form.telephone} onChange={(e) => setForm((f: any) => ({ ...f, telephone: e.target.value }))} />
                </div>
                <div>
                  <Label>Date de naissance</Label>
                  <Input className="h-12 text-base" type="date" value={form.date_naissance} onChange={(e) => setForm((f: any) => ({ ...f, date_naissance: e.target.value }))} />
                </div>
                <div>
                  <Label>Sexe</Label>
                  <Select value={form.sexe} onValueChange={(v) => setForm((f: any) => ({ ...f, sexe: v }))}>
                    <SelectTrigger className="h-12 text-base"><SelectValue placeholder="Choisir" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Non renseigne</SelectItem>
                      <SelectItem value="homme">Homme</SelectItem>
                      <SelectItem value="femme">Femme</SelectItem>
                      <SelectItem value="autre">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2">
                  <Label>Nationalite</Label>
                  <Input className="h-12 text-base" value={form.nationalite} onChange={(e) => setForm((f: any) => ({ ...f, nationalite: e.target.value }))} />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Medical Section */}
          <AccordionItem value="medical" className="rounded-xl border bg-card shadow-sm">
            <AccordionTrigger className="px-4 py-4 hover:no-underline md:px-6">
              <span className="flex items-center gap-2 font-semibold">
                <Activity className="h-4 w-4 text-primary" />
                Informations medicales
              </span>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4 md:px-6 md:pb-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Groupe sanguin</Label>
                  <Input className="h-12 text-base" value={form.groupe_sanguin} onChange={(e) => setForm((f: any) => ({ ...f, groupe_sanguin: e.target.value }))} />
                </div>
                <div>
                  <Label>Allergies (separees par des virgules)</Label>
                  <Input className="h-12 text-base" placeholder="Ex: pollen, penicilline" value={form.allergies} onChange={(e) => setForm((f: any) => ({ ...f, allergies: e.target.value }))} />
                </div>
                <div className="sm:col-span-2">
                  <Label>Antecedents medicaux</Label>
                  <Textarea className="text-base" value={form.antecedents} onChange={(e) => setForm((f: any) => ({ ...f, antecedents: e.target.value }))} />
                </div>
                <div className="sm:col-span-2">
                  <Label>Traitement en cours</Label>
                  <Textarea className="text-base" value={form.traitement_en_cours} onChange={(e) => setForm((f: any) => ({ ...f, traitement_en_cours: e.target.value }))} />
                </div>
                <div>
                  <Label>Contact urgence</Label>
                  <Input className="h-12 text-base" value={form.contact_urgence} onChange={(e) => setForm((f: any) => ({ ...f, contact_urgence: e.target.value }))} />
                </div>
                <div>
                  <Label>Telephone urgence</Label>
                  <Input className="h-12 text-base" value={form.telephone_urgence} onChange={(e) => setForm((f: any) => ({ ...f, telephone_urgence: e.target.value }))} />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Address Section */}
          <AccordionItem value="address" className="rounded-xl border bg-card shadow-sm">
            <AccordionTrigger className="px-4 py-4 hover:no-underline md:px-6">
              <span className="flex items-center gap-2 font-semibold">
                <MapPin className="h-4 w-4 text-primary" />
                Coordonnees
              </span>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4 md:px-6 md:pb-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label>Adresse</Label>
                  <Input className="h-12 text-base" value={form.adresse} onChange={(e) => setForm((f: any) => ({ ...f, adresse: e.target.value }))} />
                </div>
                <div>
                  <Label>Ville</Label>
                  <Input className="h-12 text-base" value={form.ville} onChange={(e) => setForm((f: any) => ({ ...f, ville: e.target.value }))} />
                </div>
                <div>
                  <Label>Pays</Label>
                  <Input className="h-12 text-base" value={form.pays} onChange={(e) => setForm((f: any) => ({ ...f, pays: e.target.value }))} />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Security Section */}
          <AccordionItem value="security" className="rounded-xl border bg-card shadow-sm">
            <AccordionTrigger className="px-4 py-4 hover:no-underline md:px-6">
              <span className="flex items-center gap-2 font-semibold">
                <Shield className="h-4 w-4 text-primary" />
                Securite
              </span>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4 md:px-6 md:pb-6">
              <div className="space-y-4">
                <div>
                  <Label>Mot de passe actuel</Label>
                  <Input className="h-12 text-base" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
                </div>
                <div>
                  <Label>Nouveau mot de passe</Label>
                  <Input className="h-12 text-base" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                </div>
                <div>
                  <Label>Confirmer le nouveau</Label>
                  <Input className="h-12 text-base" type="password" value={newPasswordConfirm} onChange={(e) => setNewPasswordConfirm(e.target.value)} />
                </div>
                <Button className="h-12 w-full rounded-xl text-base" onClick={handlePasswordChange} disabled={pwdSaving}>
                  {pwdSaving ? 'Traitement...' : 'Mettre a jour le mot de passe'}
                </Button>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </main>
    </div>
  );
};

export default PatientProfile;
