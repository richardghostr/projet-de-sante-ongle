import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { Navbar } from '@/components/Navbar';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import AccessDenied from '@/components/AccessDenied';

const PatientAnalysisDetail = () => {
  const { patientId, id } = useParams<{ patientId: string; id: string }>();
  const navigate = useNavigate();
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
        
        const candidates: any[] = [];
        const pushIfArray = (v: any) => { if (Array.isArray(v)) candidates.push(...v); };
        pushIfArray(data.conseils || data.conseil || data.recommandations || data.recommendations);
        pushIfArray(a?.conseils || a?.recommandations || a?.recommendations || a?.result?.conseils || a?.result?.recommandations || a?.result?.recommendations || a?.result?.recommendation);

        let recs = candidates;

        if (recs.length === 0) {
          const ia = a?.result || a;
          const main = ia?.prediction || (Array.isArray(ia?.predictions) ? ia.predictions[0] : null) || null;
          const prob = main?.probability ?? ia?.score ?? a?.score_confiance ?? a?.score ?? null;
          const risk = ia?.risk_level || ia?.niveau_risque || a?.niveau_risque || a?.risk_level || null;

          if (prob !== null && Number(prob) < 0.5) {
            recs.push({ type: 'avertissement', titre: 'Confiance limitee', texte: 'Le score de confiance est faible. Interpretation prudente recommandee.', priorite: 0 });
          }
          if (risk && ['eleve', 'critique', 'high'].includes(String(risk))) {
            recs.push({ type: 'consultation', titre: 'Consultation recommandee', texte: 'Le niveau de risque detecte suggere de consulter un specialiste.', priorite: 1 });
          }
          const label = (main && (main.label || main.name)) || ia?.pathologie || ia?.pathologie_label || a?.pathologie;
          const adviceMap: Record<string, any[]> = {
            'onychomycose': [{ type: 'hygiene', titre: 'Hygiene', texte: 'Gardez vos ongles propres et secs.', priorite: 2 }],
            'psoriasis': [{ type: 'general', titre: 'Information', texte: 'Le psoriasis ungueal peut necessiter un suivi dermatologique.', priorite: 2 }],
            'sain': [{ type: 'general', titre: 'Bonne nouvelle', texte: 'Votre ongle semble sain. Continuez les soins preventifs.', priorite: 3 }]
          };
          if (label) {
            const key = String(label).toLowerCase();
            if (adviceMap[key]) recs.push(...adviceMap[key]);
          }
        }

        setConseils(recs.map((r: any) => ({ ...r })));

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
        } catch (e) {}
      } catch (err: any) {
        console.error('Failed to load analysis', err);
        const status = err?.status || err?.response?.status || err?.statusCode;
        if (status === 403) {
          setAccessDenied(true);
          setAccessMessage(err?.message || (err?.response?.data?.message) || 'Acces non autorise');
        }
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

  if (loading) return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </main>
    </div>
  );

  if (accessDenied) return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="px-4 py-8 md:container">
        <AccessDenied message={accessMessage} backTo="/professional" backLabel="Retour" />
      </main>
    </div>
  );

  if (!analysis) return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="px-4 py-8 text-center md:container">
        <p className="text-muted-foreground">Analyse introuvable</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>Retour</Button>
      </main>
    </div>
  );

  const ia = analysis.result || analysis;
  const main = ia?.prediction || ia?.predictions?.[0] || { label: ia?.pathologie || ia?.pathologie_label };
  const preds = ia?.predictions || [];
  const heat = ia?.heatmap_url || ia?.heatmap || analysis.heatmap_url || analysis.heatmap_path;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="px-4 py-4 pb-24 md:container md:py-8 md:pb-8">
        {/* Mobile Header */}
        <div className="mb-4 flex items-center gap-3 md:hidden">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-semibold">Analyse patient</h1>
            <p className="truncate text-sm text-muted-foreground">{analysis.pathologie || analysis.pathologie_label || 'Details'}</p>
          </div>
        </div>

        {/* Desktop Header */}
        <div className="mb-6 hidden items-center justify-between md:flex">
          <PageHeader
            title={`Analyse patient: ${analysis.uuid || analysis.id}`}
            subtitle={`Pathologie: ${analysis.pathologie || analysis.pathologie_label || '—'}`}
          />
          <Link to="/professional">
            <Button variant="outline">Retour</Button>
          </Link>
        </div>

        {/* Image */}
        <Card className="mb-4 overflow-hidden border-0 shadow-sm md:border md:mb-6">
          <CardContent className="p-0">
            {analysis.thumbnail_url || analysis.image_url ? (
              <img
                src={resolveStorageUrl(analysis.thumbnail_url || analysis.image_url)!}
                alt="Image analyse"
                className="h-48 w-full object-cover md:h-64"
              />
            ) : (
              <div className="flex h-48 items-center justify-center bg-muted md:h-64">
                <span className="text-muted-foreground">Aucune image</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="mb-4 grid grid-cols-2 gap-3 md:mb-6 md:grid-cols-4 md:gap-4">
          <div className="rounded-xl border bg-card p-3 md:p-4">
            <p className="text-xs text-muted-foreground md:text-sm">Statut</p>
            <p className="mt-1 font-semibold">{analysis.status}</p>
          </div>
          <div className="rounded-xl border bg-card p-3 md:p-4">
            <p className="text-xs text-muted-foreground md:text-sm">Confiance</p>
            <p className="mt-1 font-semibold">
              {('probability' in (main || {})) 
                ? Math.round((main.probability || 0) * 100) + '%' 
                : (ia?.score !== undefined 
                  ? Math.round(ia.score * 100) + '%' 
                  : (analysis.score_confiance ? Math.round(analysis.score_confiance * 100) + '%' : '—'))}
            </p>
          </div>
          <div className="rounded-xl border bg-card p-3 md:p-4">
            <p className="text-xs text-muted-foreground md:text-sm">Niveau risque</p>
            <Badge variant="outline" className="mt-1">
              {ia?.risk_level || ia?.niveau_risque || analysis.niveau_risque || '—'}
            </Badge>
          </div>
          <div className="rounded-xl border bg-card p-3 md:p-4">
            <p className="text-xs text-muted-foreground md:text-sm">Date</p>
            <p className="mt-1 text-sm font-medium">
              {analysis.date_analyse ? new Date(analysis.date_analyse).toLocaleDateString('fr') : '—'}
            </p>
          </div>
        </div>

        {/* Predictions */}
        {Array.isArray(preds) && preds.length > 0 && (
          <Card className="mb-4 border-0 shadow-sm md:border md:mb-6">
            <CardHeader className="px-4 pb-2 pt-4 md:px-6">
              <CardTitle className="text-base md:text-lg">Predictions IA</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 md:px-6">
              <div className="space-y-2">
                {preds.map((p: any, i: number) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{p.label}</p>
                      {p.description && <p className="truncate text-sm text-muted-foreground">{p.description}</p>}
                    </div>
                    <span className="ml-3 shrink-0 font-mono text-sm">
                      {p.probability ? Math.round(p.probability * 100) + '%' : '—'}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recommendations */}
        <Card className="border-0 shadow-sm md:border">
          <CardHeader className="px-4 pb-2 pt-4 md:px-6">
            <CardTitle className="text-base md:text-lg">Recommandations</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 md:px-6">
            {conseils && conseils.length > 0 ? (
              <div className="space-y-3">
                {[...conseils].sort((a: any, b: any) => (a.priorite ?? 0) - (b.priorite ?? 0)).map((c: any, idx: number) => {
                  const Icon = c.type === 'avertissement' ? AlertTriangle : c.type === 'consultation' ? Info : CheckCircle;
                  const iconColor = c.type === 'avertissement' ? 'text-amber-500' : c.type === 'consultation' ? 'text-blue-500' : 'text-emerald-500';
                  return (
                    <div key={idx} className="flex gap-3 rounded-lg border p-3 md:p-4">
                      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${iconColor}`} />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{c.titre || c.type || 'Recommandation'}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{c.texte || c.text || c.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Aucune recommandation disponible</p>
            )}
          </CardContent>
        </Card>

        {/* Additional Info */}
        {(ownerName || heat) && (
          <Card className="mt-4 border-0 shadow-sm md:border md:mt-6">
            <CardContent className="px-4 py-4 md:px-6">
              <div className="space-y-2">
                {ownerName && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Proprietaire</span>
                    <span className="font-medium">{ownerName}</span>
                  </div>
                )}
                {heat && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Heatmap</span>
                    <a href={resolveStorageUrl(heat)!} target="_blank" rel="noreferrer" className="text-primary">
                      Voir
                    </a>
                  </div>
                )}
                {(ia?.image_quality || ia?.image_quality_level) && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Qualite image</span>
                    <span className="font-medium">{ia.image_quality || ia.image_quality_level}</span>
                  </div>
                )}
                {(ia?.model_version || analysis.model_version) && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Version modele</span>
                    <span className="font-medium">{ia.model_version || analysis.model_version}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default PatientAnalysisDetail;
