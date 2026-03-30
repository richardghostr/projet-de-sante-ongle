import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const ProfessionalProfile = () => {
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res: any = await api.getProfile();
        const p = res.profile || res;
        setProfile(p);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return (<div className="min-h-screen"><Navbar /><main className="container py-8">Chargement...</main></div>);
  if (!profile) return (<div className="min-h-screen"><Navbar /><main className="container py-8">Profil introuvable</main></div>);

  const prof = profile.professional ?? {};

  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar />
      <main className="container py-8">
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
                {profile.avatar_url ? (
                  <img src={(profile.avatar_url.startsWith('http') ? profile.avatar_url : (import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, '') || 'http://localhost:8000') + profile.avatar_url)} alt="avatar" className="w-32 h-32 rounded-full object-cover" />
                ) : (
                  <div className="w-32 h-32 rounded-full bg-slate-100 flex items-center justify-center">No photo</div>
                )}
                <div className="text-center">
                  <div className="text-lg font-semibold">{profile.prenom} {profile.nom}</div>
                  <div className="text-sm text-muted-foreground">{profile.email}</div>
                </div>
                <div className="w-full">
                  <p><strong>Sexe:</strong> {profile.sexe ?? '—'}</p>
                  <p><strong>Date de naissance:</strong> {profile.date_naissance ?? '—'}</p>
                  <p><strong>Nationalité:</strong> {profile.nationalite ?? '—'}</p>
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
                  <p><strong>Spécialité:</strong> {prof.specialite ?? prof.speciality ?? '—'}</p>
                  <p><strong>Sous-spécialité:</strong> {prof.sous_specialite ?? '—'}</p>
                  <p><strong>Numéro matricule:</strong> {prof.matricule ?? '—'}</p>
                  <p><strong>Numéro d'ordre:</strong> {prof.numero_ordre ?? '—'}</p>
                  <p><strong>Établissement:</strong> {prof.etablissement ?? '—'}</p>
                </div>
                <div>
                  <p><strong>Années d'expérience:</strong> {prof.annees_experience ?? '—'}</p>
                  <p><strong>Grade / Fonction:</strong> {prof.grade ?? '—'}</p>
                  <p><strong>Email pro:</strong> {prof.email_pro ?? profile.email ?? '—'}</p>
                  <p><strong>Téléphone pro:</strong> {prof.telephone_pro ?? profile.telephone ?? '—'}</p>
                  <p><strong>Adresse pro:</strong> {prof.adresse_pro ?? '—'}</p>
                </div>
              </div>

              <div className="mt-4">
                <h4 className="font-medium">Disponibilités</h4>
                <p className="text-sm text-muted-foreground">{prof.disponibilites_text ?? 'Non renseignées'}</p>
                <div className="mt-2">
                  <Badge variant="outline">{prof.statut === 'active' ? 'Actif' : (prof.statut === 'indisponible' ? 'Indisponible' : '—')}</Badge>
                </div>
              </div>

              <div className="mt-4">
                <h4 className="font-medium">Présentation professionnelle</h4>
                <p className="text-sm text-muted-foreground">{prof.biographie ?? prof.bio ?? 'Aucun texte fourni'}</p>
              </div>

              <div className="mt-4">
                <h4 className="font-medium">Documents justificatifs</h4>
                {prof.documents && prof.documents.length > 0 ? (
                  prof.documents.map((d: any, i: number) => (
                    <div key={i} className="flex items-center justify-between border p-2 rounded mt-2">
                      <div>
                        <div className="font-medium">{d.nom || d.filename}</div>
                        <div className="text-sm text-muted-foreground">{d.type || '—'}</div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <a href={(d.url && d.url.startsWith('http') ? d.url : (import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, '') || 'http://localhost:8000') + (d.url || ''))} target="_blank" rel="noreferrer" className="text-primary">Ouvrir</a>
                        <Badge variant="outline">{d.verified ? 'Vérifié' : 'Non vérifié'}</Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Aucun document fourni</p>
                )}
              </div>

            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default ProfessionalProfile;
