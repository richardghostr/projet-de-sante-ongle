import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const PatientAnalysisDetail = () => {
  const { patientId, id } = useParams<{ patientId: string; id: string }>();
  const [analysis, setAnalysis] = useState<any | null>(null);
  const [conseils, setConseils] = useState<any[]>([]);
  const [ownerName, setOwnerName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      try {
        const res = await api.getAnalysisDetail(id);
        const data = res.data || res;
        const a = data.analysis || data;
        setAnalysis(a);
        // collect recommendations from several possible fields
        const candidates: any[] = [];
        const pushIfArray = (v: any) => { if (Array.isArray(v)) candidates.push(...v); };
        pushIfArray(data.conseils || data.conseil || data.recommandations || data.recommendations);
        pushIfArray(a?.conseils || a?.recommandations || a?.recommendations || a?.result?.conseils || a?.result?.recommandations || a?.result?.recommendations || a?.result?.recommendation);

        let recs = candidates;

        if (recs.length === 0) {
          // fallback inference from IA result
          const ia = a?.result || a;
          const main = ia?.prediction || (Array.isArray(ia?.predictions) ? ia.predictions[0] : null) || null;
          const prob = main?.probability ?? ia?.score ?? a?.score_confiance ?? a?.score ?? null;
          const risk = ia?.risk_level || ia?.niveau_risque || a?.niveau_risque || a?.risk_level || null;

          if (prob !== null && Number(prob) < 0.5) {
            recs.push({ type: 'avertissement', titre: 'Confiance limitée', texte: 'Le score de confiance est faible. Interprétation prudente recommandée.' , priorite: 0 });
          }
          if (risk && ['eleve', 'critique', 'high'].includes(String(risk))) {
            recs.push({ type: 'consultation', titre: 'Consultation recommandée', texte: 'Le niveau de risque détecté suggère de consulter un spécialiste.', priorite: 1 });
          }
          const label = (main && (main.label || main.name)) || ia?.pathologie || ia?.pathologie_label || a?.pathologie;
          const adviceMap: Record<string, any[]> = {
            'onychomycose': [{ type: 'hygiene', titre: 'Hygiène', texte: 'Gardez vos ongles propres et secs.' , priorite: 2 }],
            'psoriasis': [{ type: 'general', titre: 'Information', texte: 'Le psoriasis unguéal peut nécessiter un suivi dermatologique.', priorite: 2 }],
            'sain': [{ type: 'general', titre: 'Bonne nouvelle', texte: 'Votre ongle semble sain. Continuez les soins préventifs.', priorite: 3 }]
          };
          if (label) {
            const key = String(label).toLowerCase();
            if (adviceMap[key]) recs.push(...adviceMap[key]);
          }
        }

        setConseils(recs.map((r: any) => ({ ...r })));

        // resolve owner name when possible
        try {
          const uid = a?.user_id ?? a?.userId ?? a?.user;
          if (uid) {
            try {
              const userRes = await api.getAdminUser(Number(uid));
              const ud = (userRes.data || userRes) || null;
              if (ud) setOwnerName(`${ud.prenom ?? ''} ${ud.nom ?? ud.name ?? ''}`.trim());
            } catch (e) {
              if (a?.user_nom) setOwnerName(a.user_nom);
            }
          } else if (a?.user_nom || a?.user_email) {
            setOwnerName(a.user_nom || a.user_email);
          }
        } catch (e) {
          // ignore owner resolution failures
        }
      } catch (err) {
        console.error('Failed to load analysis', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const resolveStorageUrl = (url?: string | null) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    const apiRoot = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api').replace(/\/api\/?$/, '');
    return apiRoot + url;
  };

  if (loading) return (<div className="min-h-screen"><Navbar /><main className="container py-8">Chargement...</main></div>);
  if (!analysis) return (<div className="min-h-screen"><Navbar /><main className="container py-8">Analyse introuvable</main></div>);

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <Navbar />
      <main className="container py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Analyse patient: {analysis.uuid || analysis.id}</h1>
            <p className="text-muted-foreground">Pathologie: {analysis.pathologie || analysis.pathologie_label || '—'}</p>
          </div>
          <div>
            <Link to={`/professional`}>
              <Button variant="ghost">Retour</Button>
            </Link>
          </div>
        </div>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Détails</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="col-span-1">
                {analysis.thumbnail_url ? (
                  <img src={resolveStorageUrl(analysis.thumbnail_url)} alt="thumb" className="w-full rounded" />
                ) : analysis.image_url ? (
                  <img src={resolveStorageUrl(analysis.image_url)} alt="image" className="w-full rounded" />
                ) : (
                  <div className="h-48 bg-slate-100 rounded flex items-center justify-center">Aucune image</div>
                )}
              </div>
              <div className="col-span-2 space-y-3">
                      <p><strong>Statut:</strong> {analysis.status}</p>
                      <p><strong>Date analyse:</strong> {analysis.date_analyse ? new Date(analysis.date_analyse).toLocaleString('fr') : '—'}</p>
                      <p><strong>Score confiance:</strong> {analysis.score_confiance ?? '—'}</p>
                      <p><strong>Niveau risque:</strong> {analysis.niveau_risque ?? '—'}</p>
                      {ownerName && <p><strong>Propriétaire:</strong> {ownerName}</p>}

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
                                <p><strong>Prédiction principale:</strong> {main?.label}</p>
                                <p><strong>Confiance:</strong> {('probability' in (main || {})) ? Math.round((main.probability || 0) * 100) + '%' : (ia.score !== undefined ? Math.round(ia.score * 100) + '%' : (analysis.score_confiance ? (Math.round(analysis.score_confiance * 100) + '%') : '—'))}</p>
                                <p><strong>Niveau risque:</strong> <Badge variant="outline">{ia.risk_level || ia.niveau_risque || analysis.niveau_risque || '—'}</Badge></p>
                              </div>
                              <div>
                                <p><strong>Qualité image:</strong> {ia.image_quality || ia.image_quality_level || '—'}</p>
                                <p><strong>Version modèle:</strong> {ia.model_version || analysis.model_version || '—'}</p>
                                {heat && (
                                  <p><a href={resolveStorageUrl(heat.startsWith('http') ? heat : heat)} target="_blank" rel="noreferrer" className="text-primary">Voir heatmap</a></p>
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

export default PatientAnalysisDetail;
