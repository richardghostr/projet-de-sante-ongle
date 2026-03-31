import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { User, Lock, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Profile = () => {
  const { user, updateUser, logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ nom: '', prenom: '', telephone: '', date_naissance: '' });
  const [extra, setExtra] = useState<any>({});
  const [passwords, setPasswords] = useState({ current_password: '', new_password: '', new_password_confirmation: '' });
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingPwd, setLoadingPwd] = useState(false);

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
      // professional
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
      // normalize allergies
      if (payload.allergies && typeof payload.allergies === 'string') {
        payload.allergies = payload.allergies.split(',').map((s: string) => s.trim()).filter(Boolean);
      }
      const res = await api.updateProfile(payload);
      updateUser(res.data?.user || { ...user!, ...payload });
      toast({ title: 'Profil mis à jour' });
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
      toast({ title: 'Mot de passe modifié' });
      setPasswords({ current_password: '', new_password: '', new_password_confirmation: '' });
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setLoadingPwd(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer votre compte ? Cette action est irréversible.')) return;
    try {
      await api.deleteAccount();
      await logout();
      navigate('/');
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <Navbar />
      <main className="container flex-1 py-8">
        <h1 className="mb-8 text-3xl font-bold">Mon profil</h1>

        <div className="mx-auto max-w-2xl space-y-6">
          {/* Profile info */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><User className="h-5 w-5 text-primary" /> Informations personnelles</CardTitle>
              <CardDescription>Modifiez vos informations de profil</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfile} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2"><Label>Nom</Label><Input value={form.nom} onChange={e => setForm(p => ({ ...p, nom: e.target.value }))} required /></div>
                  <div className="space-y-2"><Label>Prénom</Label><Input value={form.prenom} onChange={e => setForm(p => ({ ...p, prenom: e.target.value }))} /></div>
                </div>
                <div className="space-y-2"><Label>Email</Label><Input value={user?.email || ''} disabled className="bg-muted" /></div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2"><Label>Téléphone</Label><Input value={form.telephone} onChange={e => setForm(p => ({ ...p, telephone: e.target.value }))} /></div>
                  <div className="space-y-2"><Label>Date de naissance</Label><Input type="date" value={form.date_naissance} onChange={e => setForm(p => ({ ...p, date_naissance: e.target.value }))} /></div>
                </div>

                {/* Extra clinical fields for patients and professionals */}
                {user?.role === 'user' && (
                  <>
                    <div className="space-y-2"><Label>Groupe sanguin</Label><Input value={extra.groupe_sanguin} onChange={e => setExtra((p:any) => ({ ...p, groupe_sanguin: e.target.value }))} /></div>
                    <div className="space-y-2"><Label>Allergies (séparées par des virgules)</Label><Input value={extra.allergies} onChange={e => setExtra((p:any) => ({ ...p, allergies: e.target.value }))} /></div>
                    <div className="space-y-2"><Label>Antécédents médicaux</Label><Input value={extra.antecedents} onChange={e => setExtra((p:any) => ({ ...p, antecedents: e.target.value }))} /></div>
                    <div className="space-y-2"><Label>Traitement en cours</Label><Input value={extra.traitement_en_cours} onChange={e => setExtra((p:any) => ({ ...p, traitement_en_cours: e.target.value }))} /></div>
                    <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label>Contact urgence</Label><Input value={extra.contact_urgence} onChange={e => setExtra((p:any) => ({ ...p, contact_urgence: e.target.value }))} /></div><div className="space-y-2"><Label>Téléphone urgence</Label><Input value={extra.telephone_urgence} onChange={e => setExtra((p:any) => ({ ...p, telephone_urgence: e.target.value }))} /></div></div>
                  </>
                )}

                {user?.role === 'professional' && (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label>Spécialité</Label><Input value={extra.specialite} onChange={e => setExtra((p:any) => ({ ...p, specialite: e.target.value }))} /></div><div className="space-y-2"><Label>Sous-spécialité</Label><Input value={extra.sous_specialite} onChange={e => setExtra((p:any) => ({ ...p, sous_specialite: e.target.value }))} /></div></div>
                    <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label>Numéro matricule</Label><Input value={extra.matricule} onChange={e => setExtra((p:any) => ({ ...p, matricule: e.target.value }))} /></div><div className="space-y-2"><Label>Numéro d'ordre</Label><Input value={extra.numero_ordre} onChange={e => setExtra((p:any) => ({ ...p, numero_ordre: e.target.value }))} /></div></div>
                    <div className="space-y-2"><Label>Établissement</Label><Input value={extra.etablissement} onChange={e => setExtra((p:any) => ({ ...p, etablissement: e.target.value }))} /></div>
                    <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label>Années d'expérience</Label><Input value={extra.annees_experience} onChange={e => setExtra((p:any) => ({ ...p, annees_experience: e.target.value }))} /></div><div className="space-y-2"><Label>Grade / Fonction</Label><Input value={extra.grade} onChange={e => setExtra((p:any) => ({ ...p, grade: e.target.value }))} /></div></div>
                    <div className="space-y-2"><Label>Disponibilités (texte)</Label><Input value={extra.disponibilites_text} onChange={e => setExtra((p:any) => ({ ...p, disponibilites_text: e.target.value }))} /></div>
                    <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label>Email professionnel</Label><Input value={extra.email_pro} onChange={e => setExtra((p:any) => ({ ...p, email_pro: e.target.value }))} /></div><div className="space-y-2"><Label>Téléphone professionnel</Label><Input value={extra.telephone_pro} onChange={e => setExtra((p:any) => ({ ...p, telephone_pro: e.target.value }))} /></div></div>
                  </>
                )}
                <Button type="submit" className="rounded-xl" disabled={loadingProfile}>
                  {loadingProfile ? 'Sauvegarde...' : 'Sauvegarder'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Change password */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Lock className="h-5 w-5 text-primary" /> Changer le mot de passe</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePassword} className="space-y-4">
                <div className="space-y-2"><Label>Mot de passe actuel</Label><Input type="password" value={passwords.current_password} onChange={e => setPasswords(p => ({ ...p, current_password: e.target.value }))} required /></div>
                <div className="space-y-2"><Label>Nouveau mot de passe</Label><Input type="password" value={passwords.new_password} onChange={e => setPasswords(p => ({ ...p, new_password: e.target.value }))} required minLength={8} /></div>
                <div className="space-y-2"><Label>Confirmer</Label><Input type="password" value={passwords.new_password_confirmation} onChange={e => setPasswords(p => ({ ...p, new_password_confirmation: e.target.value }))} required /></div>
                <Button type="submit" className="rounded-xl" disabled={loadingPwd}>
                  {loadingPwd ? 'Modification...' : 'Modifier le mot de passe'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Danger zone */}
          <Card className="border-destructive/30 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive"><Trash2 className="h-5 w-5" /> Zone dangereuse</CardTitle>
              <CardDescription>La suppression de votre compte est irréversible</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="destructive" onClick={handleDelete} className="rounded-xl gap-2">
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
