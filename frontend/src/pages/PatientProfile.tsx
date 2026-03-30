import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const PatientProfile = () => {
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

  const age = profile.date_naissance ? Math.floor((Date.now() - new Date(profile.date_naissance).getTime()) / (365.25*24*3600*1000)) : null;

  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar />
      <main className="container py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Fiche patient clinique</h1>
            <p className="text-muted-foreground">Données médicales et historique</p>
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
                  <p><strong>Âge:</strong> {age ?? '—'}</p>
                  <p><strong>Nationalité:</strong> {profile.nationalite ?? '—'}</p>
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
                <div>
                  <p><strong>Groupe sanguin:</strong> {profile.groupe_sanguin ?? '—'}</p>
                  <p><strong>Allergies:</strong> {Array.isArray(profile.allergies) ? profile.allergies.join(', ') : (profile.allergies || '—')}</p>
                  <p><strong>Antécédents médicaux:</strong> {profile.antecedents || '—'}</p>
                </div>
                <div>
                  <p><strong>Traitement en cours:</strong> {profile.traitement_en_cours || '—'}</p>
                  <p><strong>Personne à contacter (urgence):</strong> {profile.contact_urgence ?? '—'}</p>
                  <p><strong>Téléphone urgence:</strong> {profile.telephone_urgence ?? '—'}</p>
                </div>
              </div>

              <div className="mt-4">
                <h4 className="font-medium">Coordonnées</h4>
                <p><strong>Téléphone:</strong> {profile.telephone ?? '—'}</p>
                <p><strong>Email:</strong> {profile.email ?? '—'}</p>
                <p><strong>Adresse:</strong> {profile.adresse ?? '—'}</p>
                <p><strong>Ville / Pays:</strong> {(profile.ville ?? '—') + ' / ' + (profile.pays ?? '—')}</p>
              </div>

              <div className="mt-4">
                <h4 className="font-medium">Historique médical résumé</h4>
                <p><strong>Analyses totales:</strong> {profile.stats?.total_analyses ?? '—'}</p>
                <p><strong>Dernière analyse:</strong> {profile.stats?.derniere_analyse ?? '—'}</p>
                <p><strong>Évolution globale:</strong> {profile.stats ? `Total: ${profile.stats.total_analyses}, Risque élevé: ${profile.stats.analyses_a_risque}` : '—'}</p>
              </div>

            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default PatientProfile;
