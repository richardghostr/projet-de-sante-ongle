import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { Navbar } from '@/components/Navbar';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { User, Lock, Trash2, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

const Profile = () => {
  const { user, updateUser, logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ nom: '', prenom: '', telephone: '', date_naissance: '' });
  const [extra, setExtra] = useState<any>({});
  const [passwords, setPasswords] = useState({ current_password: '', new_password: '', new_password_confirmation: '' });
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingPwd, setLoadingPwd] = useState(false);
  const [passwordSheetOpen, setPasswordSheetOpen] = useState(false);

  useEffect(() => {
    if (user) setForm({ nom: user.nom || '', prenom: user.prenom || '', telephone: user.telephone || '', date_naissance: user.date_naissance || '' });
    if (user) setExtra({
      nationalite: user.nationalite || '',
      groupe_sanguin: user.groupe_sanguin || '',
      allergies: Array.isArray(user.allergies) ? user.allergies.join(', ') : (user.allergies || ''),
      antecedents: user.antecedents || '',
      traitement_en_cours: user.traitement_en_cours || '',
      contact_urgence: user.contact_urgence || '',
      telephone_urgence: user.telephone_urgence || '',
      profession: user.profession || '',
      adresse: user.adresse || user.adresse_pro || '',
      ville: user.ville || '',
      pays: user.pays || '',
      specialite: user.specialite || '',
      sous_specialite: user.sous_specialite || '',
      matricule: user.matricule || '',
      numero_ordre: user.numero_ordre || '',
      etablissement: user.etablissement || '',
      annees_experience: user.annees_experience || '',
      grade: user.grade || '',
      disponibilites_text: user.disponibilites_text || '',
      statut: user.statut || '',
      email_pro: user.email_pro || '',
      telephone_pro: user.telephone_pro || ''
    });
  }, [user]);

  const handleProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingProfile(true);
    try {
      const payload = { ...form, ...extra };
      if (payload.allergies && typeof payload.allergies === 'string') {
        payload.allergies = payload.allergies.split(',').map((s: string) => s.trim()).filter(Boolean);
      }
      const res = await api.updateProfile(payload);
      updateUser(res.data?.user || { ...user!, ...payload });
      toast({ title: 'Profil mis a jour' });
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setLoadingProfile(false);
    }
  };

  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.new_password !== passwords.new_password_confirmation) {
      toast({ title: 'Les mots de passe ne correspondent pas', variant: 'destructive' });
      return;
    }
    setLoadingPwd(true);
    try {
      await api.changePassword(passwords);
      toast({ title: 'Mot de passe modifie' });
      setPasswords({ current_password: '', new_password: '', new_password_confirmation: '' });
      setPasswordSheetOpen(false);
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setLoadingPwd(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Etes-vous sur de vouloir supprimer votre compte ? Cette action est irreversible.')) return;
    try {
      await api.deleteAccount();
      await logout();
      navigate('/');
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    }
  };

  const FormField = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}</Label>
      {children}
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1 px-4 py-4 pb-24 md:container md:py-8 md:pb-8">
        <PageHeader title="Mon profil" className="mb-6" />

        <div className="mx-auto max-w-2xl space-y-4 md:space-y-6">
          {/* Profile info */}
          <Card className="border-0 shadow-sm md:border">
            <CardHeader className="px-4 pb-2 pt-4 md:px-6 md:pt-6">
              <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                <User className="h-5 w-5 text-primary" /> Informations personnelles
              </CardTitle>
              <CardDescription className="text-sm">Modifiez vos informations de profil</CardDescription>
            </CardHeader>
            <CardContent className="px-4 pb-4 md:px-6 md:pb-6">
              <form onSubmit={handleProfile} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Nom">
                    <Input value={form.nom} onChange={e => setForm(p => ({ ...p, nom: e.target.value }))} required className="h-12 md:h-10" />
                  </FormField>
                  <FormField label="Prenom">
                    <Input value={form.prenom} onChange={e => setForm(p => ({ ...p, prenom: e.target.value }))} className="h-12 md:h-10" />
                  </FormField>
                </div>
                <FormField label="Email">
                  <Input value={user?.email || ''} disabled className="h-12 bg-muted md:h-10" />
                </FormField>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Telephone">
                    <Input value={form.telephone} onChange={e => setForm(p => ({ ...p, telephone: e.target.value }))} className="h-12 md:h-10" />
                  </FormField>
                  <FormField label="Date de naissance">
                    <Input type="date" value={form.date_naissance} onChange={e => setForm(p => ({ ...p, date_naissance: e.target.value }))} className="h-12 md:h-10" />
                  </FormField>
                </div>

                {user?.role === 'user' && (
                  <>
                    <FormField label="Groupe sanguin">
                      <Input value={extra.groupe_sanguin} onChange={e => setExtra((p:any) => ({ ...p, groupe_sanguin: e.target.value }))} className="h-12 md:h-10" />
                    </FormField>
                    <FormField label="Allergies (separees par des virgules)">
                      <Input value={extra.allergies} onChange={e => setExtra((p:any) => ({ ...p, allergies: e.target.value }))} className="h-12 md:h-10" />
                    </FormField>
                    <FormField label="Antecedents medicaux">
                      <Input value={extra.antecedents} onChange={e => setExtra((p:any) => ({ ...p, antecedents: e.target.value }))} className="h-12 md:h-10" />
                    </FormField>
                    <FormField label="Traitement en cours">
                      <Input value={extra.traitement_en_cours} onChange={e => setExtra((p:any) => ({ ...p, traitement_en_cours: e.target.value }))} className="h-12 md:h-10" />
                    </FormField>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField label="Contact urgence">
                        <Input value={extra.contact_urgence} onChange={e => setExtra((p:any) => ({ ...p, contact_urgence: e.target.value }))} className="h-12 md:h-10" />
                      </FormField>
                      <FormField label="Telephone urgence">
                        <Input value={extra.telephone_urgence} onChange={e => setExtra((p:any) => ({ ...p, telephone_urgence: e.target.value }))} className="h-12 md:h-10" />
                      </FormField>
                    </div>
                  </>
                )}

                {user?.role === 'professional' && (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField label="Specialite">
                        <Input value={extra.specialite} onChange={e => setExtra((p:any) => ({ ...p, specialite: e.target.value }))} className="h-12 md:h-10" />
                      </FormField>
                      <FormField label="Sous-specialite">
                        <Input value={extra.sous_specialite} onChange={e => setExtra((p:any) => ({ ...p, sous_specialite: e.target.value }))} className="h-12 md:h-10" />
                      </FormField>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField label="Numero matricule">
                        <Input value={extra.matricule} onChange={e => setExtra((p:any) => ({ ...p, matricule: e.target.value }))} className="h-12 md:h-10" />
                      </FormField>
                      <FormField label="Numero d'ordre">
                        <Input value={extra.numero_ordre} onChange={e => setExtra((p:any) => ({ ...p, numero_ordre: e.target.value }))} className="h-12 md:h-10" />
                      </FormField>
                    </div>
                    <FormField label="Etablissement">
                      <Input value={extra.etablissement} onChange={e => setExtra((p:any) => ({ ...p, etablissement: e.target.value }))} className="h-12 md:h-10" />
                    </FormField>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField label="Annees d'experience">
                        <Input value={extra.annees_experience} onChange={e => setExtra((p:any) => ({ ...p, annees_experience: e.target.value }))} className="h-12 md:h-10" />
                      </FormField>
                      <FormField label="Grade / Fonction">
                        <Input value={extra.grade} onChange={e => setExtra((p:any) => ({ ...p, grade: e.target.value }))} className="h-12 md:h-10" />
                      </FormField>
                    </div>
                    <FormField label="Disponibilites (texte)">
                      <Input value={extra.disponibilites_text} onChange={e => setExtra((p:any) => ({ ...p, disponibilites_text: e.target.value }))} className="h-12 md:h-10" />
                    </FormField>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField label="Email professionnel">
                        <Input value={extra.email_pro} onChange={e => setExtra((p:any) => ({ ...p, email_pro: e.target.value }))} className="h-12 md:h-10" />
                      </FormField>
                      <FormField label="Telephone professionnel">
                        <Input value={extra.telephone_pro} onChange={e => setExtra((p:any) => ({ ...p, telephone_pro: e.target.value }))} className="h-12 md:h-10" />
                      </FormField>
                    </div>
                  </>
                )}
                <Button type="submit" className="h-12 w-full rounded-xl md:h-10 md:w-auto" disabled={loadingProfile}>
                  {loadingProfile ? 'Sauvegarde...' : 'Sauvegarder'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Quick actions for mobile */}
          <div className="space-y-2 md:hidden">
            <Sheet open={passwordSheetOpen} onOpenChange={setPasswordSheetOpen}>
              <SheetTrigger asChild>
                <button className="flex w-full items-center justify-between rounded-xl border bg-card p-4 text-left">
                  <div className="flex items-center gap-3">
                    <Lock className="h-5 w-5 text-primary" />
                    <span className="font-medium">Changer le mot de passe</span>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-auto rounded-t-2xl">
                <SheetHeader>
                  <SheetTitle>Changer le mot de passe</SheetTitle>
                </SheetHeader>
                <form onSubmit={handlePassword} className="space-y-4 py-4">
                  <FormField label="Mot de passe actuel">
                    <Input type="password" value={passwords.current_password} onChange={e => setPasswords(p => ({ ...p, current_password: e.target.value }))} required className="h-12" />
                  </FormField>
                  <FormField label="Nouveau mot de passe">
                    <Input type="password" value={passwords.new_password} onChange={e => setPasswords(p => ({ ...p, new_password: e.target.value }))} required minLength={8} className="h-12" />
                  </FormField>
                  <FormField label="Confirmer">
                    <Input type="password" value={passwords.new_password_confirmation} onChange={e => setPasswords(p => ({ ...p, new_password_confirmation: e.target.value }))} required className="h-12" />
                  </FormField>
                  <Button type="submit" className="h-12 w-full rounded-xl" disabled={loadingPwd}>
                    {loadingPwd ? 'Modification...' : 'Modifier le mot de passe'}
                  </Button>
                </form>
              </SheetContent>
            </Sheet>

            <button
              onClick={handleDelete}
              className="flex w-full items-center justify-between rounded-xl border border-destructive/30 bg-card p-4 text-left text-destructive"
            >
              <div className="flex items-center gap-3">
                <Trash2 className="h-5 w-5" />
                <span className="font-medium">Supprimer mon compte</span>
              </div>
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {/* Desktop password change */}
          <Card className="hidden shadow-sm md:block">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-primary" /> Changer le mot de passe
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePassword} className="space-y-4">
                <FormField label="Mot de passe actuel">
                  <Input type="password" value={passwords.current_password} onChange={e => setPasswords(p => ({ ...p, current_password: e.target.value }))} required />
                </FormField>
                <FormField label="Nouveau mot de passe">
                  <Input type="password" value={passwords.new_password} onChange={e => setPasswords(p => ({ ...p, new_password: e.target.value }))} required minLength={8} />
                </FormField>
                <FormField label="Confirmer">
                  <Input type="password" value={passwords.new_password_confirmation} onChange={e => setPasswords(p => ({ ...p, new_password_confirmation: e.target.value }))} required />
                </FormField>
                <Button type="submit" className="rounded-xl" disabled={loadingPwd}>
                  {loadingPwd ? 'Modification...' : 'Modifier le mot de passe'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Desktop danger zone */}
          <Card className="hidden border-destructive/30 shadow-sm md:block">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <Trash2 className="h-5 w-5" /> Zone dangereuse
              </CardTitle>
              <CardDescription>La suppression de votre compte est irreversible</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="destructive" onClick={handleDelete} className="gap-2 rounded-xl">
                <Trash2 className="h-4 w-4" /> Supprimer mon compte
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Profile;
