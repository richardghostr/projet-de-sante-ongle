import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

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
        const p = res.profile || res;
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

  if (loading) return (<div className="min-h-screen"><Navbar /><main className="container py-8">Chargement...</main></div>);
  if (!profile) return (<div className="min-h-screen"><Navbar /><main className="container py-8">Profil introuvable</main></div>);

  const age = profile.date_naissance ? Math.floor((Date.now() - new Date(profile.date_naissance).getTime()) / (365.25*24*3600*1000)) : null;

  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar />
      <main className="container max-w-4xl mx-auto py-8 px-4 sm:px-6">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Fiche patient clinique</h1>
            <p className="text-muted-foreground">Données médicales et historique</p>
          </div>
          <div className="flex w-full sm:w-auto items-center gap-2">
            <Button variant="ghost" onClick={() => window.location.reload()}>Rafraîchir</Button>
            <Button className="ml-auto sm:ml-0" onClick={async () => {
              setSaving(true);
              try {
                // prepare payload: convert allergies CSV -> array
                const payload = { ...form };
                if (typeof payload.allergies === 'string') {
                  payload.allergies = payload.allergies.split(',').map((s: string) => s.trim()).filter(Boolean);
                }
                await api.updateProfile(payload);
                toast({ title: 'Profil sauvegardé', description: 'Les informations ont été enregistrées.' });
              } catch (err: any) {
                console.error(err);
                toast({ title: 'Erreur', description: err?.message || 'Échec de la sauvegarde', variant: 'destructive' });
              } finally {
                setSaving(false);
              }
            }} disabled={saving} className="w-full sm:w-auto">{saving ? 'Enregistrement...' : 'Enregistrer'}</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Identité</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center space-y-3">
                {profile.avatar_url ? (
                  <img src={(profile.avatar_url.startsWith('http') ? profile.avatar_url : (import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, '') || 'http://localhost:8000') + profile.avatar_url)} alt="avatar" className="w-24 h-24 sm:w-32 sm:h-32 rounded-full object-cover" />
                ) : (
                  <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-slate-100 flex items-center justify-center">No photo</div>
                )}
                <div className="text-center">
                  <div className="text-lg font-semibold">{profile.prenom} {profile.nom}</div>
                  <div className="text-sm text-muted-foreground">{profile.email}</div>
                </div>
                <div className="w-full mt-4 space-y-2 text-left">
                  <div>
                    <Label>Prénom</Label>
                    <Input className="w-full" value={form.prenom} onChange={(e) => setForm((f: any) => ({ ...f, prenom: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Nom</Label>
                    <Input className="w-full" value={form.nom} onChange={(e) => setForm((f: any) => ({ ...f, nom: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input className="w-full" value={form.email} onChange={(e) => setForm((f: any) => ({ ...f, email: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Téléphone</Label>
                    <Input className="w-full" value={form.telephone} onChange={(e) => setForm((f: any) => ({ ...f, telephone: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Date de naissance</Label>
                    <Input className="w-full" type="date" value={form.date_naissance} onChange={(e) => setForm((f: any) => ({ ...f, date_naissance: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Sexe</Label>
                    <Select onValueChange={(v) => setForm((f: any) => ({ ...f, sexe: v }))}>
                      <SelectTrigger className="w-full"><SelectValue>{form.sexe || 'Choisir'}</SelectValue></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Non renseigné</SelectItem>
                        <SelectItem value="homme">Homme</SelectItem>
                        <SelectItem value="femme">Femme</SelectItem>
                        <SelectItem value="autre">Autre</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Nationalité</Label>
                    <Input className="w-full" value={form.nationalite} onChange={(e) => setForm((f: any) => ({ ...f, nationalite: e.target.value }))} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Informations médicales</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <Label>Groupe sanguin</Label>
                    <Input className="w-full" value={form.groupe_sanguin} onChange={(e) => setForm((f: any) => ({ ...f, groupe_sanguin: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Allergies (séparées par des virgules)</Label>
                    <Input className="w-full" placeholder="Ex: pollen, pénicilline" value={form.allergies} onChange={(e) => setForm((f: any) => ({ ...f, allergies: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Antécédents médicaux</Label>
                    <Textarea className="w-full" value={form.antecedents} onChange={(e) => setForm((f: any) => ({ ...f, antecedents: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <Label>Traitement en cours</Label>
                    <Textarea className="w-full" value={form.traitement_en_cours} onChange={(e) => setForm((f: any) => ({ ...f, traitement_en_cours: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Personne à contacter (urgence)</Label>
                    <Input className="w-full" value={form.contact_urgence} onChange={(e) => setForm((f: any) => ({ ...f, contact_urgence: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Téléphone urgence</Label>
                    <Input className="w-full" value={form.telephone_urgence} onChange={(e) => setForm((f: any) => ({ ...f, telephone_urgence: e.target.value }))} />
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium">Coordonnées</h4>
                  <div className="space-y-2 mt-2">
                    <div>
                      <Label>Adresse</Label>
                      <Input className="w-full" value={form.adresse} onChange={(e) => setForm((f: any) => ({ ...f, adresse: e.target.value }))} />
                    </div>
                    <div>
                      <Label>Ville</Label>
                      <Input className="w-full" value={form.ville} onChange={(e) => setForm((f: any) => ({ ...f, ville: e.target.value }))} />
                    </div>
                    <div>
                      <Label>Pays</Label>
                      <Input className="w-full" value={form.pays} onChange={(e) => setForm((f: any) => ({ ...f, pays: e.target.value }))} />
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium">Contact</h4>
                  <div className="space-y-2 mt-2">
                    <div>
                      <Label>Téléphone</Label>
                      <Input className="w-full" value={form.telephone} onChange={(e) => setForm((f: any) => ({ ...f, telephone: e.target.value }))} />
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input className="w-full" value={form.email} onChange={(e) => setForm((f: any) => ({ ...f, email: e.target.value }))} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <h4 className="font-medium">Historique médical résumé</h4>
                <p><strong>Analyses totales:</strong> {profile.stats?.total_analyses ?? '—'}</p>
                <p><strong>Dernière analyse:</strong> {profile.stats?.derniere_analyse ?? '—'}</p>
                <p><strong>Évolution globale:</strong> {profile.stats ? `Total: ${profile.stats.total_analyses}, Risque élevé: ${profile.stats.analyses_a_risque}` : '—'}</p>
              </div>

              <div className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Changer le mot de passe</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <Label>Mot de passe actuel</Label>
                        <Input className="w-full" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
                      </div>
                      <div>
                        <Label>Nouveau mot de passe</Label>
                        <Input className="w-full" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                      </div>
                      <div>
                        <Label>Confirmer le nouveau</Label>
                        <Input className="w-full" type="password" value={newPasswordConfirm} onChange={(e) => setNewPasswordConfirm(e.target.value)} />
                      </div>
                    </div>
                    <div className="mt-4">
                      <Button className="w-full sm:w-auto" onClick={async () => {
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
                          toast({ title: 'Mot de passe mis à jour', description: 'Votre mot de passe a été modifié.' });
                        } catch (err: any) {
                          console.error(err);
                          toast({ title: 'Erreur', description: err?.message || 'Impossible de changer le mot de passe', variant: 'destructive' });
                        } finally {
                          setPwdSaving(false);
                        }
                      }} disabled={pwdSaving}>{pwdSaving ? 'Traitement...' : 'Mettre à jour le mot de passe'}</Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default PatientProfile;
