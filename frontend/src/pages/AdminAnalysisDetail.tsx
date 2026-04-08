import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { Navbar } from '@/components/Navbar';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, AlertTriangle, CheckCircle, Info, ExternalLink } from 'lucide-react';
import AccessDenied from '@/components/AccessDenied';

const AdminAnalysisDetail = () => {
  const { id } = useParams();
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
            recs.push({ type: 'consultation', titre: 'Consultation recommandee', texte: 'Le niveau de risque detecte suggere de consulter un dermatologue.', priorite: 1 });
          }
          const label = (main && (main.label || main.name)) || ia?.pathologie || ia?.pathologie_label || a?.pathologie;
          const adviceMap: Record<string, any[]> = {
            'onychomycose': [{ type: 'hygiene', titre: 'Hygiene', texte: 'Gardez vos ongles propres et secs.', priorite: 2 }],
            'psoriasis': [{ type: 'general', titre: 'Information', texte: 'Le psoriasis ungueal necessiter un suivi dermatologique.', priorite: 2 }],
            'sain': [{ type: 'general', titre: 'Bonne nouvelle', texte: 'Ongle sain. Continuez les soins preventifs.', priorite: 3 }]
          };
          if (label) {
            const key = String(label).toLowerCase();
            if (adviceMap[key]) recs.push(...adviceMap[key]);
          }
        }
        setConseils(recs);

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
          if (a?.user_nom) setOwnerName(a.user_nom);
        }
      } catch (err: any) {
        console.error('Failed to load analysis', err);
        if (err?.status === 403) {
          setAccessDenied(true);
          setAccessMessage(err.message || 'Acces non autorise');
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const resolveUrl = (p: string | null | undefined) => {
    if (!p) return null;
    if (p.startsWith('http')) return p;
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
    const base = apiBase.replace(/\/api\/?$/, '');
    return p.startsWith('/') ? base + p : p;
  };

  if (loading) return (
    <div className="flex min-h-dvh flex-col bg-background">
      <Navbar />
      <main className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </main>
    </div>
  );

  if (accessDenied) return (
    <div className="flex min-h-dvh flex-col bg-background">
      <Navbar />
      <main className="px-4 py-8 md:container">
        <AccessDenied message={accessMessage} backTo="/admin" backLabel="Retour au tableau de bord" />
      </main>
    </div>
  );

  if (!analysis) return (
    <div className="flex min-h-dvh flex-col bg-background">
      <Navbar />
      <main className="px-4 py-8 text-center md:container">
        <p className="text-muted-foreground">Analyse introuvable</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/admin')}>Retour</Button>
      </main>
    </div>
  );

  const ia = analysis.result || analysis;
  const main = ia?.prediction || ia?.predictions?.[0] || { label: ia?.pathologie || ia?.pathologie_label };
  const preds = ia?.predictions || [];
  const heat = ia?.heatmap_url || ia?.heatmap || analysis.heatmap_url || analysis.heatmap_path;

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <Navbar />
      <main className="px-4 py-4 pb-24 md:container md:py-8 md:pb-8">
        {/* Mobile Header */}
        <div className="mb-4 flex items-center gap-3 md:hidden">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin')} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-semibold">Analyse</h1>
            <p className="truncate text-sm text-muted-foreground">{analysis.uuid || analysis.id}</p>
          </div>
          {analysis.image_url && (
            <Button variant="outline" size="icon" asChild>
              <a href={resolveUrl(analysis.image_url)!} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          )}
        </div>

        {/* Desktop Header */}
        <div className="mb-6 hidden items-center justify-between md:flex">
          <PageHeader title={`Analyse: ${analysis.uuid || analysis.id}`} />
          <div className="flex gap-2">
            <Link to="/admin" className="text-muted-foreground hover:text-foreground">Retour</Link>
            {analysis.image_url && (
              <Button asChild>
                <a href={resolveUrl(analysis.image_url)!} target="_blank" rel="noreferrer">Voir image</a>
              </Button>
            )}
          </div>
        </div>

        {/* Image */}
        <Card className="mb-4 overflow-hidden border-0 shadow-sm md:border md:mb-6">
          <CardContent className="p-0">
            {(analysis.thumbnail_url || analysis.image_url) ? (
              <img
                src={resolveUrl(analysis.thumbnail_url || analysis.image_url)!}
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
            <p className="text-xs text-muted-foreground md:text-sm">Pathologie</p>
            <p className="mt-1 truncate font-semibold">{analysis.pathologie || analysis.pathologie_detectee || '—'}</p>
          </div>
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
        </div>

        {/* Additional Info */}
        <Card className="mb-4 border-0 shadow-sm md:border md:mb-6">
          <CardContent className="px-4 py-4 md:px-6">
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date analyse</span>
                <span className="font-medium">{analysis.date_analyse ? new Date(analysis.date_analyse).toLocaleString('fr') : '—'}</span>
              </div>
              {analysis.completed_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Terminee le</span>
                  <span className="font-medium">{new Date(analysis.completed_at).toLocaleString('fr')}</span>
                </div>
              )}
              {ownerName && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Utilisateur</span>
                  <span className="font-medium">{ownerName}</span>
                </div>
              )}
              {(ia?.image_quality || ia?.image_quality_level) && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Qualite image</span>
                  <span className="font-medium">{ia.image_quality || ia.image_quality_level}</span>
                </div>
              )}
              {(ia?.model_version || analysis.model_version) && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Version modele</span>
                  <span className="font-medium">{ia.model_version || analysis.model_version}</span>
                </div>
              )}
              {(ia?.processing_time_ms || analysis.processing_time_ms) && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Temps traitement</span>
                  <span className="font-medium">{ia.processing_time_ms || analysis.processing_time_ms} ms</span>
                </div>
              )}
              {heat && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Heatmap</span>
                  <a href={resolveUrl(heat)!} target="_blank" rel="noreferrer" className="text-primary">Voir</a>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

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
      </main>
    </div>
  );
};

export default AdminAnalysisDetail;
