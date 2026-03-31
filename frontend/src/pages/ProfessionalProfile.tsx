import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

const ProfessionalProfile = () => {
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<any | null>(null);
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdForm, setPwdForm] = useState({ current_password: '', new_password: '', new_password_confirmation: '' });
  const [documents, setDocuments] = useState<any[]>([]);
  const [uploadType, setUploadType] = useState<string>('diplome');
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res: any = await api.getProfile();
        const p = res?.data?.profile || res.profile || res?.data || res;
        setProfile(p);
        setForm({
          prenom: p.prenom || '',
          nom: p.nom || '',
          email: p.email || '',
          telephone: p.telephone || '',
          professional: {
            specialite: (p.professional && (p.professional.specialite || p.professional.speciality)) || '',
            sous_specialite: (p.professional && p.professional.sous_specialite) || '',
            matricule_professionnel: (p.professional && (p.professional.matricule_professionnel || p.professional.matricule)) || '',
            numero_ordre: (p.professional && p.professional.numero_ordre) || '',
            etablissement: (p.professional && p.professional.etablissement) || '',
            experience: (p.professional && (p.professional.experience || p.professional.annees_experience)) || '',
            biographie: (p.professional && (p.professional.biographie || p.professional.bio)) || '',
            telephone_professionnel: (p.professional && (p.professional.telephone_professionnel || p.professional.telephone_pro || p.professional.telephone)) || '',
            adresse_professionnelle: (p.professional && (p.professional.adresse_professionnelle || p.professional.adresse_pro || p.professional.adresse)) || '',
            ville: (p.professional && p.professional.ville) || p.ville || '',
            pays: (p.professional && p.professional.pays) || p.pays || '',
            statut_validation: (p.professional && p.professional.statut_validation) || 'pending',
            photo_profil: (p.professional && p.professional.photo_profil) || p.avatar_url || ''
          }
        });

        // load documents
        try {
          const docsRes: any = await api.listProfileDocuments();
          const docs = docsRes?.data?.documents || docsRes.documents || docsRes || [];
          setDocuments(docs);
        } catch (_) {}

        // load current user info
        try {
          const meRes: any = await api.me();
          const mu = meRes?.data?.user || meRes.user || meRes?.data || meRes;
          setMe(mu);
        } catch (_) { setMe(null); }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);


  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const fd = new FormData();
    fd.append('document', f);
    fd.append('type_document', uploadType);
    setUploading(true);
    try {
      const res: any = await api.uploadProfileDocument(fd);
      const doc = res.data?.document || res.document || res;
      setDocuments(d => [doc, ...d]);
      toast({ title: 'Document', description: 'Document envoyé', });
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Erreur', description: err?.message || 'Échec de l\'envoi', variant: 'destructive' });
    } finally { setUploading(false); }
  };

  if (loading) return (<div className="min-h-screen"><Navbar /><main className="container py-8">Chargement...</main></div>);
  if (!profile) return (<div className="min-h-screen"><Navbar /><main className="container py-8">Profil introuvable</main></div>);

  const prof = profile.professional ?? {};
  const normalize = (v: any) => (v === undefined || v === null) ? '' : String(v).toLowerCase();
  const isApprovedVal = (s: any) => {
    const ok = ['approved', 'active', 'validated', 'valide', 'validé', 'approuve', 'approuvé', 'approve', 'ok'];
    return ok.includes(normalize(s));
  };
  const isRejectedVal = (s: any) => {
    const nok = ['rejected', 'refused', 'refuse', 'refusé', 'refusee', 'no'];
    return nok.includes(normalize(s));
  };

  // Prefer server-provided canonical boolean when available
  let isApproved = false;
  if (profile && typeof profile.is_professional_validated !== 'undefined') {
    isApproved = !!profile.is_professional_validated;
  } else {
    // Robust approval detection: check several possible fields the API may return
    const extractStatusCandidates = (profObj: any, topProfile: any) => {
      const cand: any[] = [];
      if (topProfile) {
        cand.push(topProfile.status, topProfile.user_status, topProfile.state, topProfile.statut, topProfile.status_text);
      }
      if (profObj) {
        cand.push(profObj.statut_validation, profObj.statut, profObj.status, profObj.state, profObj.validation_status);
      }
      return cand.filter(c => c !== undefined && c !== null).map(c => String(c));
    };

    const statusCandidates = extractStatusCandidates(prof, profile);
    isApproved = statusCandidates.some(s => isApprovedVal(s));
    // Consider the authenticated user's own status as authoritative when viewing own profile
    if (!isApproved && me) {
      const meCandidates: any[] = [];
      meCandidates.push(me.status, me.user_status, me.state);
      if (me.professional) {
        meCandidates.push(me.professional.statut_validation, me.professional.statut, me.professional.status);
      }
      if (meCandidates.some((c: any) => isApprovedVal(c))) isApproved = true;
    }
  }
  const isOwner = me && (me.id === profile.id || me.id === profile.user_id);
  const canPatientFill = me && me.role === 'patient';
  const canEdit = Boolean(isOwner || canPatientFill || isApproved);

  const handleChange = (path: string, value: any) => {
    if (path.startsWith('professional.')) {
      const key = path.replace('professional.', '');
      setForm((f: any) => ({ ...f, professional: { ...(f.professional || {}), [key]: value } }));
    } else {
      setForm((f: any) => ({ ...f, [path]: value }));
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const payload: any = {
        prenom: form.prenom,
        nom: form.nom,
        telephone: form.telephone,
        professional: {
          specialite: form.professional?.specialite,
          sous_specialite: form.professional?.sous_specialite,
          matricule_professionnel: form.professional?.matricule_professionnel || form.professional?.matricule,
          numero_ordre: form.professional?.numero_ordre,
          etablissement: form.professional?.etablissement,
          experience: form.professional?.experience,
          biographie: form.professional?.biographie,
          telephone_professionnel: form.professional?.telephone_professionnel || form.professional?.telephone_pro,
          adresse_professionnelle: form.professional?.adresse_professionnelle || form.professional?.adresse_pro,
          ville: form.professional?.ville,
          pays: form.professional?.pays,
          photo_profil: form.professional?.photo_profil
        }
      };
      await api.updateProfile(payload);
      const res: any = await api.getProfile();
      const p = res?.data?.profile || res.profile || res?.data || res;
      setProfile(p);
      setForm((f: any) => ({ ...f }));
      toast({ title: 'Profil sauvegardé', description: 'Les informations professionnelles ont été enregistrées.' });
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Erreur lors de l\'enregistrement');
    } finally { setSaving(false); }
  };

  const changePassword = async () => {
    if (!pwdForm.current_password || !pwdForm.new_password || !pwdForm.new_password_confirmation) {
      toast({ title: 'Erreur', description: 'Veuillez remplir tous les champs du mot de passe.', variant: 'destructive' });
      return;
    }
    if (pwdForm.new_password !== pwdForm.new_password_confirmation) {
      toast({ title: 'Erreur', description: 'La confirmation ne correspond pas.', variant: 'destructive' });
      return;
    }
    setPwdSaving(true);
    try {
      await api.changePassword(pwdForm);
      toast({ title: 'Mot de passe', description: 'Mot de passe changé avec succès.' });
      setPwdForm({ current_password: '', new_password: '', new_password_confirmation: '' });
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Erreur', description: err?.message || 'Erreur lors du changement de mot de passe', variant: 'destructive' });
    } finally { setPwdSaving(false); }
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar />
      <main className="container py-8">
        {!isApproved && (
          <div className="mb-4 p-3 rounded bg-yellow-50 border-l-4 border-yellow-300 text-yellow-800">Votre compte professionnel est en attente de validation par un administrateur. L'accès complet au profil est restreint.</div>
        )}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Fiche professionnelle clinique</h1>
            <p className="text-muted-foreground">Données cliniques et documents</p>
          </div>
          <div>
            <Button variant="ghost" onClick={() => window.location.reload()}>Rafraîchir</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Identité</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center space-y-3">
                <div className="w-32 h-32 rounded-full overflow-hidden bg-slate-100 flex items-center justify-center">
                  {((profile.avatar_url || form.professional?.photo_profil) ? (
                    <img src={((form.professional?.photo_profil || profile.avatar_url).startsWith('http') ? (form.professional?.photo_profil || profile.avatar_url) : (import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, '') || 'http://localhost:8000') + (form.professional?.photo_profil || profile.avatar_url))} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">No photo</div>
                  ))}
                </div>
                <div className="text-center w-full">
                  <div className="mb-2 w-full">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <Label>Prénom</Label>
                        <Input className="text-lg font-semibold" value={form.prenom || ''} onChange={e => handleChange('prenom', e.target.value)} disabled={!canEdit} />
                      </div>
                      <div>
                        <Label>Nom</Label>
                        <Input className="text-lg font-semibold" value={form.nom || ''} onChange={e => handleChange('nom', e.target.value)} disabled={!canEdit} />
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground mt-2 w-full">
                    <Label>Email</Label>
                    <Input className="text-sm w-full" value={form.email || ''} disabled={true} />
                  </div>
                </div>
                <div className="w-full mt-2 space-y-2 text-left">
                  <div>
                    <Label>Sexe</Label>
                    <Select onValueChange={(v: string) => handleChange('sexe', v)}>
                      <SelectTrigger className="w-full"><SelectValue>{form.sexe || profile.sexe || 'Choisir'}</SelectValue></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Non renseigné</SelectItem>
                        <SelectItem value="homme">Homme</SelectItem>
                        <SelectItem value="femme">Femme</SelectItem>
                        <SelectItem value="autre">Autre</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Date de naissance</Label>
                    <Input type="date" value={form.date_naissance || profile.date_naissance || ''} onChange={(e: any) => handleChange('date_naissance', e.target.value)} />
                  </div>
                  <div>
                    <Label>Nationalité</Label>
                    <Input value={form.nationalite || profile.nationalite || ''} onChange={(e: any) => handleChange('nationalite', e.target.value)} />
                  </div>
                  <div className="mt-2">
                    {canEdit && (
                      <div className="flex items-center space-x-2">
                        <input type="file" accept="image/*" id="avatar_input" onChange={async (e) => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          const fd = new FormData();
                          fd.append('avatar', f);
                          try {
                            const res: any = await api.request('/profile/avatar', { method: 'POST', body: fd });
                            const url = res?.data?.url || res?.avatar_url || res?.url || res;
                            // update local state
                            setProfile(p => ({ ...(p || {}), avatar_url: url }));
                            setForm((s: any) => ({ ...(s || {}), professional: { ...(s.professional || {}), photo_profil: url } }));
                            toast({ title: 'Avatar', description: 'Avatar mis à jour.' });
                          } catch (err: any) {
                            console.error(err);
                            toast({ title: 'Erreur', description: err?.message || 'Échec de l\'upload de l\'avatar', variant: 'destructive' });
                          }
                        }} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Informations professionnelles</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block"><strong>Spécialité:</strong>
                    <Input className="w-full" value={form.professional?.specialite || ''} onChange={e => handleChange('professional.specialite', e.target.value)} disabled={!canEdit} />
                  </label>
                  <label className="block mt-2"><strong>Sous-spécialité:</strong>
                    <Input className="w-full" value={form.professional?.sous_specialite || ''} onChange={e => handleChange('professional.sous_specialite', e.target.value)} disabled={!canEdit} />
                  </label>
                  <label className="block mt-2"><strong>Numéro matricule:</strong>
                    <Input className="w-full" value={form.professional?.matricule_professionnel || form.professional?.matricule || ''} onChange={e => handleChange('professional.matricule_professionnel', e.target.value)} disabled={!canEdit} />
                  </label>
                  <label className="block mt-2"><strong>Numéro d'ordre:</strong>
                    <Input className="w-full" value={form.professional?.numero_ordre || ''} onChange={e => handleChange('professional.numero_ordre', e.target.value)} disabled={!canEdit} />
                  </label>
                  <label className="block mt-2"><strong>Établissement:</strong>
                    <Input className="w-full" value={form.professional?.etablissement || ''} onChange={e => handleChange('professional.etablissement', e.target.value)} disabled={!canEdit} />
                  </label>
                </div>
                <div>
                  <label className="block"><strong>Années d'expérience:</strong>
                    <Input className="w-full" value={form.professional?.experience || form.professional?.annees_experience || ''} onChange={e => handleChange('professional.experience', e.target.value)} disabled={!canEdit} />
                  </label>
                  <label className="block mt-2"><strong>Grade / Fonction:</strong>
                    <Input className="w-full" value={form.professional?.grade || ''} onChange={e => handleChange('professional.grade', e.target.value)} disabled={!canEdit} />
                  </label>
                  <label className="block mt-2"><strong>Email pro:</strong>
                    <Input className="w-full" value={form.professional?.email_pro || ''} onChange={e => handleChange('professional.email_pro', e.target.value)} disabled={!canEdit} />
                  </label>
                  <label className="block mt-2"><strong>Téléphone pro:</strong>
                    <Input className="w-full" value={form.professional?.telephone_professionnel || form.professional?.telephone_pro || ''} onChange={e => handleChange('professional.telephone_professionnel', e.target.value)} disabled={!canEdit} />
                  </label>
                  <label className="block mt-2"><strong>Adresse pro:</strong>
                    <Input className="w-full" value={form.professional?.adresse_professionnelle || form.professional?.adresse_pro || ''} onChange={e => handleChange('professional.adresse_professionnelle', e.target.value)} disabled={!canEdit} />
                  </label>
                </div>
              </div>

              <div className="mt-4">
                <h4 className="font-medium">Disponibilités</h4>
                <Textarea className="w-full mt-1" value={form.professional?.disponibilites_text || ''} onChange={e => handleChange('professional.disponibilites_text', e.target.value)} disabled={!canEdit} />
                <div className="mt-2">
                  <Badge variant="outline">{prof.statut === 'active' ? 'Actif' : (prof.statut === 'indisponible' ? 'Indisponible' : '—')}</Badge>
                </div>
              </div>

              <div className="mt-4">
                <h4 className="font-medium">Présentation professionnelle</h4>
                <Textarea className="w-full mt-1" value={form.professional?.biographie || ''} onChange={e => handleChange('professional.biographie', e.target.value)} disabled={!canEdit} />
              </div>

              <div className="mt-4 flex items-center space-x-2">
                <Button onClick={saveProfile} disabled={!canEdit || saving}>{saving ? 'Enregistrement...' : 'Enregistrer les modifications'}</Button>
                {!canEdit && <div className="text-sm text-muted-foreground">Vous ne pouvez pas modifier ce profil.</div>}
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
                        <Input className="w-full" type="password" value={pwdForm.current_password} onChange={(e) => setPwdForm(s => ({ ...s, current_password: e.target.value }))} />
                      </div>
                      <div>
                        <Label>Nouveau mot de passe</Label>
                        <Input className="w-full" type="password" value={pwdForm.new_password} onChange={(e) => setPwdForm(s => ({ ...s, new_password: e.target.value }))} />
                      </div>
                      <div>
                        <Label>Confirmer le nouveau</Label>
                        <Input className="w-full" type="password" value={pwdForm.new_password_confirmation} onChange={(e) => setPwdForm(s => ({ ...s, new_password_confirmation: e.target.value }))} />
                      </div>
                    </div>
                    <div className="mt-4">
                      <Button className="w-full sm:w-auto" onClick={changePassword} disabled={pwdSaving}>{pwdSaving ? 'Traitement...' : 'Mettre à jour le mot de passe'}</Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="mt-4">
                <h4 className="font-medium">Documents justificatifs</h4>
                  <div className="mt-2">
                  <div className="mb-2">
                    <Label>Type de document</Label>
                    <Select onValueChange={(v: string) => setUploadType(v)}>
                      <SelectTrigger className="w-full"><SelectValue>{uploadType}</SelectValue></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="diplome">Diplôme principal</SelectItem>
                        <SelectItem value="autorisation">Certificat d'autorisation</SelectItem>
                        <SelectItem value="carte">Carte professionnelle</SelectItem>
                        <SelectItem value="identite">Pièce d'identité</SelectItem>
                        <SelectItem value="attestation">Attestation complémentaire</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <input type="file" accept="application/pdf,image/*" onChange={handleUpload} disabled={uploading} />
                  {!isApproved && <div className="text-sm text-amber-700 mt-2">Votre compte professionnel est en attente : vous pouvez toutefois déposer des documents pour validation par un administrateur.</div>}
                  {uploading && <div className="text-sm text-muted-foreground mt-2">Envoi en cours...</div>}
                </div>

                <div className="mt-2 space-y-2">
                  {(documents && documents.length > 0) ? (
                    documents.map((d: any, i: number) => (
                      <div key={i} className="flex items-center justify-between border p-2 rounded">
                        <div>
                          <div className="font-medium">{d.filename}</div>
                          <div className="text-sm text-muted-foreground">{d.type_document || d.type || '—'}</div>
                          <div className="text-xs text-muted-foreground">{new Date(d.created_at).toLocaleString()}</div>
                          {d.commentaire_admin && <div className="text-sm text-rose-600">Commentaire: {d.commentaire_admin}</div>}
                        </div>
                        <div className="flex items-center space-x-2">
                          <a href={(d.url && d.url.startsWith('http') ? d.url : (import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, '') || 'http://localhost:8000') + (d.url || ''))} target="_blank" rel="noreferrer" className="text-primary">Ouvrir</a>
                                  {(() => {
                                    const dStatus = normalize(d.statut_validation || d.status || (d.verified ? 'approved' : 'pending'));
                                    const label = isApprovedVal(dStatus) ? 'Approuvé' : (isRejectedVal(dStatus) ? 'Refusé' : 'En attente');
                                    return <Badge variant="outline">{label}</Badge>;
                                  })()}
                                  {(isOwner || (me && me.role === 'admin')) && (normalize(d.statut_validation || d.status || (d.verified ? 'approved' : 'pending')) === 'pending') && (
                            <Button variant="ghost" onClick={async () => {
                              try {
                                await api.deleteProfileDocument(d.id);
                                setDocuments(old => old.filter(x => x.id !== d.id));
                                toast({ title: 'Document', description: 'Document supprimé.' });
                              } catch (err: any) {
                                toast({ title: 'Erreur', description: err?.message || 'Impossible de supprimer', variant: 'destructive' });
                              }
                            }}>Supprimer</Button>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">Aucun document</p>
                  )}
                </div>
              </div>

            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default ProfessionalProfile;
