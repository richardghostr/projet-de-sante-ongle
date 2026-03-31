import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

const AdminValidationProfessionals = () => {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedComment, setSelectedComment] = useState('');
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  const unwrap = (res: any) => {
    if (!res) return null;
    // ApiClient.request returns the raw JSON which may be wrapped as { success,message,data }
    if (res.data !== undefined) return res.data;
    return res;
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
        try {
          const uid = searchParams.get('userId');
          if (uid) {
            // If a specific userId is provided, fetch user info and documents directly
            const idNum = Number(uid);
            const [userResRaw, docsResRaw] = await Promise.all([
              api.getAdminUser(idNum),
              api.getAdminDocuments(idNum)
            ]);
            const userRes = unwrap(userResRaw) || {};
            const docsRes = unwrap(docsResRaw);

            const prof: any = userRes || {};
            // Normalize documents into an array no matter the response shape
            let docsArray: any[] = [];
            if (docsRes) {
              if (Array.isArray(docsRes.documents)) docsArray = docsRes.documents;
              else if (Array.isArray(docsRes)) docsArray = docsRes as any[];
              else if (docsRes.documents && typeof docsRes.documents === 'object') docsArray = Object.values(docsRes.documents);
              else if (typeof docsRes === 'object') docsArray = Object.values(docsRes);
            }
            prof.documents = docsArray;
            setList([prof]);
          } else {
            const resRaw: any = await api.getProfessionalsPending();
            const res = unwrap(resRaw) || {};
            setList(res.professionals || []);
          }
      } catch (err) {
        console.error(err);
      } finally { setLoading(false); }
    })();
  }, []);

  const handleAction = async (docId: number, action: 'approve' | 'reject', userId: number) => {
    try {
      await api.validateProfileDocument(docId, action, selectedComment || undefined);
      // refresh list
      const uid = searchParams.get('userId');
      if (uid) {
        const idNum = Number(uid);
        const [userResRaw, docsResRaw] = await Promise.all([
          api.getAdminUser(idNum),
          api.getAdminDocuments(idNum)
        ]);
        const userRes = unwrap(userResRaw) || {};
        const docsRes = unwrap(docsResRaw);

        let docsArray: any[] = [];
        if (docsRes) {
          if (Array.isArray(docsRes.documents)) docsArray = docsRes.documents;
          else if (Array.isArray(docsRes)) docsArray = docsRes as any[];
          else if (docsRes.documents && typeof docsRes.documents === 'object') docsArray = Object.values(docsRes.documents);
          else if (typeof docsRes === 'object') docsArray = Object.values(docsRes);
        }
        userRes.documents = docsArray;
        setList([userRes]);
      } else {
        const resRaw: any = await api.getProfessionalsPending();
        const res = unwrap(resRaw) || {};
        setList(res.professionals || []);
      }
      toast({ title: 'Succès', description: `Document ${action === 'approve' ? 'approuvé' : 'refusé'}` });
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Erreur', description: err?.message || 'Erreur', variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar />
      <main className="container py-8">
        <h1 className="text-2xl font-bold mb-4">Validation des professionnels</h1>
        <div className="space-y-4">
          {list.map((p: any) => {
            const normalize = (v: any) => (v === undefined || v === null) ? '' : String(v).toLowerCase();
            const isApprovedVal = (s: string) => {
              const ok = ['approved','active','validated','validated','valide','validé','approuve','approuvé','approve'];
              return ok.includes((s||'').toLowerCase());
            };
            const isRejectedVal = (s: string) => {
              const nok = ['rejected','refused','refuse','refusé','refusee'];
              return nok.includes((s||'').toLowerCase());
            };
            const statusVal = normalize(p.status || p.user_status || p.state || p.statut_validation);
            const docStatuses = (p.documents || []).map((dd: any) => normalize(dd.statut_validation || dd.status || dd.verification_status || dd.status_validation));
            const allDocsApproved = docStatuses.length > 0 && docStatuses.every(s => isApprovedVal(s));
            const profFullyValidated = isApprovedVal(statusVal) || allDocsApproved;
            return (
            <Card key={p.id}>
              <CardHeader className="flex items-center justify-between">
                <CardTitle>{p.prenom} {p.nom} — {p.email}</CardTitle>
                {profFullyValidated && (
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="bg-emerald-100 text-emerald-700">Professionnel validé</Badge>
                    <div className="text-sm text-muted-foreground">Notification envoyée</div>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-start">
                  <div>
                    <div>Spécialité: {p.specialite || '—'}</div>
                    <div>Inscription: {new Date(p.created_at).toLocaleString()}</div>
                    <div>Statut: <Badge>{p.status}</Badge></div>
                  </div>
                  <div className="w-1/2">
                    <div className="mb-2"><Label>Commentaire admin (optionnel)</Label>
                      <Input value={selectedComment} onChange={e => setSelectedComment(e.target.value)} disabled={profFullyValidated} /></div>
                    <div className="space-y-2">
                      {(p.documents || []).map((d: any) => {
                        const status = normalize(d.statut_validation || d.status || d.verification_status || d.status_validation);
                        const isFinalStatus = isApprovedVal(status) || isRejectedVal(status);
                        const isApproved = isApprovedVal(status);
                        return (
                          <div key={d.id} className="flex items-center justify-between border p-2 rounded">
                            <div>
                              <div className="font-medium">{d.filename}</div>
                              <div className="text-sm text-muted-foreground">{d.type_document || d.type}</div>
                              <div className="text-xs text-muted-foreground">{new Date(d.created_at).toLocaleString()}</div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <a href={(d.url && d.url.startsWith('http') ? d.url : (import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, '') || 'http://localhost:8000') + (d.url || ''))} target="_blank" rel="noreferrer" className="text-primary">Ouvrir</a>
                              {profFullyValidated ? (
                                <div className="flex items-center gap-3">
                                  <Badge variant="outline" className={'bg-emerald-100 text-emerald-700'}>Approuvé</Badge>
                                  {d.commentaire_admin && <div className="text-sm text-muted-foreground">{d.commentaire_admin}</div>}
                                  {d.date_validation && <div className="text-xs text-muted-foreground">{new Date(d.date_validation).toLocaleString()}</div>}
                                </div>
                              ) : isFinalStatus ? (
                                <div className="flex items-center gap-3">
                                  <Badge variant="outline" className={isApproved ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}>
                                    {isApproved ? 'Approuvé' : 'Refusé'}
                                  </Badge>
                                  {d.commentaire_admin && <div className="text-sm text-muted-foreground">{d.commentaire_admin}</div>}
                                  {d.date_validation && <div className="text-xs text-muted-foreground">{new Date(d.date_validation).toLocaleString()}</div>}
                                </div>
                              ) : (
                                <>
                                  <Button onClick={() => handleAction(d.id, 'approve', p.id)}>Approuver</Button>
                                  <Button variant="destructive" onClick={() => handleAction(d.id, 'reject', p.id)}>Refuser</Button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
};

export default AdminValidationProfessionals;
