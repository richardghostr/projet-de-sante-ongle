import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const AdminAnalysisDetail = () => {
  const { id } = useParams();
  const [analysis, setAnalysis] = useState<any | null>(null);
  const [conseils, setConseils] = useState<any[]>([]);
  const [ownerName, setOwnerName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [accessMessage, setAccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      try {
        const res = await api.getAnalysisDetail(id);
        const data = res.data || res;
        const a = data.analysis || data;
        setAnalysis(a);
        // collect recommendations/advices from multiple potential locations
        const candidates: any[] = [];
        const pushIfArray = (v: any) => { if (Array.isArray(v)) candidates.push(...v); };
        pushIfArray(data.conseils || data.conseil || data.recommandations || data.recommendations);
        pushIfArray(a?.conseils || a?.recommandations || a?.recommendations || a?.result?.conseils || a?.result?.recommandations || a?.result?.recommendations || a?.result?.recommendation);

        let recs = candidates;

        // If no recommandations found, try to infer simple recommendations from IA result (client-side fallback)
        if (recs.length === 0) {
          const ia = a?.result || a;
          const main = ia?.prediction || (Array.isArray(ia?.predictions) ? ia.predictions[0] : null) || null;
          const prob = main?.probability ?? ia?.score ?? a?.score_confiance ?? a?.score ?? null;
          const risk = ia?.risk_level || ia?.niveau_risque || a?.niveau_risque || a?.risk_level || null;

          // warning for low confidence
          if (prob !== null && Number(prob) < 0.5) {
            recs.push({ type: 'avertissement', titre: 'Confiance limitée', texte: 'Le score de confiance est faible. Ce résultat doit être interprété avec prudence. Une consultation professionnelle est recommandée.', priorite: 0 });
          }

          // urgent consultation for high risk
          if (risk && ['eleve', 'critique', 'high'].includes(String(risk))) {
            recs.push({ type: 'consultation', titre: 'Consultation recommandée', texte: 'Le niveau de risque détecté suggère de consulter un dermatologue.', priorite: 1 });
          }

          // basic advice per label
          const label = (main && (main.label || main.name)) || ia?.pathologie || ia?.pathologie_label || a?.pathologie;
          const adviceMap: Record<string, any[]> = {
            'onychomycose': [{ type: 'hygiene', titre: 'Hygiène', texte: 'Gardez vos ongles propres et secs. Évitez les environnements humides.' , priorite: 2 }],
            'psoriasis': [{ type: 'general', titre: 'Information', texte: 'Le psoriasis unguéal est souvent associé au psoriasis cutané. Un suivi dermatologique est recommandé.', priorite: 2 }],
            'sain': [{ type: 'general', titre: 'Bonne nouvelle', texte: 'Votre ongle semble sain. Continuez les soins préventifs.', priorite: 3 }]
          };
          if (label) {
            const key = String(label).toLowerCase();
            if (adviceMap[key]) recs.push(...adviceMap[key]);
          }
        }

        setConseils(recs.map((r: any) => ({ ...r })));

        // Resolve owner name when possible (use admin endpoint)
        try {
          const uid = a?.user_id ?? a?.userId ?? a?.user;
          if (uid) {
            const userRes = await api.getAdminUser(Number(uid));
            const ud = (userRes.data || userRes) || null;
            if (ud) setOwnerName(`${ud.prenom ?? ''} ${ud.nom ?? ud.name ?? ''}`.trim());
          } else if (a?.user_nom || a?.user_email) {
            setOwnerName(a.user_nom || a.user_email);
          }
        } catch (e) {
          // ignore if admin endpoint unavailable or not authorized
          if (a?.user_nom) setOwnerName(a.user_nom);
        }
      } catch (err: any) {
        console.error('Failed to load analysis', err);
        // If API returned 403, show access denied message to admin
        if (err?.status === 403) {
          setAccessDenied(true);
          setAccessMessage(err.message || 'Accès non autorisé');
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return (
    <div className="min-h-screen"><Navbar /><main className="container py-8">Chargement...</main></div>
  );

  if (accessDenied) return (
    <div className="min-h-screen"><Navbar /><main className="container py-8">
      <div className="max-w-2xl mx-auto p-6 text-center">
        <div className="mb-6 inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-50 mx-auto">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-red-600" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.401 2.066a1 1 0 01.198 0l6 1.5A1 1 0 0117 4.5v6.09a6.5 6.5 0 11-12 0V4.5a1 1 0 01.401-.934l6-1.5zM9 8a1 1 0 012 0v3a1 1 0 11-2 0V8z" clipRule="evenodd" />
          </svg>
        </div>
        <h2 className="text-2xl font-semibold mb-2">Accès refusé</h2>
        <p className="text-sm text-muted-foreground mb-6">{accessMessage ?? 'Vous n\'avez pas les permissions nécessaires pour accéder à cette analyse.'}</p>
        <div className="flex items-center justify-center">
          <Link to="/admin" className="inline-block bg-emerald-500 text-white px-4 py-2 rounded hover:bg-emerald-600">Retour au tableau de bord</Link>
        </div>
      </div>
    </main></div>
  );

  if (!analysis) return (
    <div className="min-h-screen"><Navbar /><main className="container py-8">Analyse introuvable</main></div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <Navbar />
      <main className="container py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Analyse: {analysis.uuid || analysis.id}</h1>
          <div className="flex gap-2">
            <Link to="/admin" className="text-muted-foreground">Retour</Link>
            <Button asChild><a href={analysis.image_url} target="_blank" rel="noreferrer">Image</a></Button>
          </div>
        </div>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Détails</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="col-span-1">
                {(() => {
                  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
                  const resolve = (p: string | null | undefined) => {
                    if (!p) return null;
                    if (p.startsWith('http://') || p.startsWith('https://')) return p;
                    // If path starts with /, prefix with API host (without duplicate /api)
                    if (p.startsWith('/')) {
                      // prefer base without trailing /api if present
                      const base = apiBase.replace(/\/api\/?$/, '');
                      return base + p;
                    }
                    return p;
                  };

                  const thumb = resolve(analysis.thumbnail_url);
                  const img = resolve(analysis.image_url);

                  if (thumb) return <img src={thumb} alt="thumb" className="w-full rounded" />;
                  if (img) return <img src={img} alt="image" className="w-full rounded" />;
                  return <div className="h-48 bg-slate-100 rounded flex items-center justify-center">Aucune image</div>;
                })()}
              </div>

              <div className="col-span-2 space-y-3">
                <p><strong>Pathologie:</strong> {analysis.pathologie || analysis.pathologie_detectee || '—'}</p>
                <p><strong>Statut:</strong> {analysis.status}</p>
                <p><strong>Date analyse:</strong> {analysis.date_analyse ? new Date(analysis.date_analyse).toLocaleString('fr') : '—'}</p>
                {analysis.completed_at && <p><strong>Terminée le:</strong> {new Date(analysis.completed_at).toLocaleString('fr')}</p>}

                {/* IA Details */}
                {(() => {
                  const ia = analysis.result || analysis;
                  if (!ia) return null;
                  const main = ia.prediction || ia.predictions?.[0] || { label: ia.pathologie || ia.pathologie_label };
                  const preds = ia.predictions || ia.predictions || (ia.predictions_from_model) || [];
                  const heat = ia.heatmap_url || ia.heatmap || analysis.heatmap_url || analysis.heatmap_path;

                  return (
                    <div className="space-y-3">
                      <h3 className="font-semibold">Détails IA</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <p><strong>Prédiction principale:</strong> {main?.label || '—'}</p>
                          <p><strong>Confiance:</strong> {('probability' in (main || {})) ? Math.round((main.probability || 0) * 100) + '%' : (ia.score !== undefined ? Math.round(ia.score * 100) + '%' : (analysis.score_confiance ? (Math.round(analysis.score_confiance * 100) + '%') : '—'))}</p>
                          <p><strong>Niveau risque:</strong> <Badge variant="outline">{ia.risk_level || ia.niveau_risque || analysis.niveau_risque || '—'}</Badge></p>
                        </div>
                        <div>
                          <p><strong>Qualité image:</strong> {ia.image_quality || ia.image_quality_level || '—'}</p>
                          <p><strong>Version modèle:</strong> {ia.model_version || analysis.model_version || '—'}</p>
                          <p><strong>Temps de traitement:</strong> {ia.processing_time_ms || analysis.processing_time_ms ? `${ia.processing_time_ms || analysis.processing_time_ms} ms` : '—'}</p>
                          {heat && (
                            <p><a href={(heat.startsWith('http') ? heat : (import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, '') || 'http://localhost:8000') + heat)} target="_blank" rel="noreferrer" className="text-primary">Voir heatmap</a></p>
                          )}
                        </div>
                      </div>

                      {Array.isArray(preds) && preds.length > 0 && (
                        <div>
                          <h4 className="font-medium">Prédictions</h4>
                          <div className="mt-2 space-y-1">
                            {preds.map((p: any, i: number) => (
                              <div key={i} className="flex items-center justify-between border rounded px-3 py-2">
                                <div>
                                  <div className="font-medium">{p.label}</div>
                                  {p.description && <div className="text-sm text-muted-foreground">{p.description}</div>}
                                </div>
                                <div className="text-sm font-mono">{p.probability ? Math.round(p.probability * 100) + '%' : '—'}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Recommendations / Conseils */}
                <div>
                  <h3 className="font-semibold">Recommandations</h3>
                  <div className="mt-2 space-y-2">
                    {conseils && conseils.length > 0 ? (
                      [...conseils].sort((a: any, b: any) => (a.priorite ?? 0) - (b.priorite ?? 0)).map((c: any, idx: number) => (
                        <div key={idx} className="rounded-md border p-3">
                          <div className="flex items-center justify-between">
                            <div className="font-medium">{c.titre || c.type || 'Recommandation'}</div>
                            <div className="text-xs text-muted-foreground">Priorité: {c.priorite ?? 0}</div>
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">{c.texte || c.text || c.description}</div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">Aucune recommandation disponible</p>
                    )}
                  </div>
                </div>

              </div>
            </div>
          </CardContent>
        </Card>

      </main>
    </div>
  );
};

export default AdminAnalysisDetail;
