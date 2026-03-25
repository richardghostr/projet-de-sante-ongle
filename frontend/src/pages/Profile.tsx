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
  const [passwords, setPasswords] = useState({ current_password: '', new_password: '', new_password_confirmation: '' });
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingPwd, setLoadingPwd] = useState(false);

  useEffect(() => {
    if (user) setForm({ nom: user.nom || '', prenom: user.prenom || '', telephone: user.telephone || '', date_naissance: user.date_naissance || '' });
  }, [user]);

  const handleProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingProfile(true);
    try {
      const res = await api.updateProfile(form);
      updateUser(res.data?.user || { ...user!, ...form });
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
