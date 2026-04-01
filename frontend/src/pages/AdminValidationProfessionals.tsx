import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { PageHeader } from '@/components/PageHeader';
import { ExternalLink, CheckCircle, XCircle, Users } from 'lucide-react';

const AdminValidationProfessionals = () => {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedComment, setSelectedComment] = useState('');
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  const unwrap = (res: any) => {
    if (!res) return null;
    if (res.data !== undefined) return res.data;
    return res;
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
        try {
          const uid = searchParams.get('userId');
          if (uid) {
            const idNum = Number(uid);
            const [userResRaw, docsResRaw] = await Promise.all([
              api.getAdminUser(idNum),
              api.getAdminDocuments(idNum)
            ]);
            const userRes = unwrap(userResRaw) || {};
            const docsRes = unwrap(docsResRaw);

            const prof: any = userRes || {};
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
      toast({ title: 'Succes', description: `Document ${action === 'approve' ? 'approuve' : 'refuse'}` });
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Erreur', description: err?.message || 'Erreur', variant: 'destructive' });
    }
  };

  const normalize = (v: any) => (v === undefined || v === null) ? '' : String(v).toLowerCase();
  const isApprovedVal = (s: string) => {
    const ok = ['approved','active','validated','valide','approuve','approve'];
    return ok.includes((s||'').toLowerCase());
  };
  const isRejectedVal = (s: string) => {
    const nok = ['rejected','refused','refuse'];
    return nok.includes((s||'').toLowerCase());
  };

  return (
    <div className="flex min-h-dvh flex-col bg-muted/30">
      <Navbar />
      <main className="container flex-1 py-4 pb-24 md:py-8 md:pb-8">
        <PageHeader 
          title="Validation professionnels"
          subtitle="Validez les documents des professionnels"
        />

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : list.length === 0 ? (
          <Card className="shadow-sm">
            <CardContent className="py-16 text-center">
              <Users className="mx-auto h-14 w-14 text-muted-foreground/30" />
              <p className="mt-4 text-muted-foreground">Aucun professionnel en attente</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {list.map((p: any) => {
              const statusVal = normalize(p.status || p.user_status || p.state || p.statut_validation);
              const docStatuses = (p.documents || []).map((dd: any) => normalize(dd.statut_validation || dd.status || dd.verification_status || dd.status_validation));
              const allDocsApproved = docStatuses.length > 0 && docStatuses.every(s => isApprovedVal(s));
              const profFullyValidated = isApprovedVal(statusVal) || allDocsApproved;
              
              return (
                <Card key={p.id} className="shadow-sm">
                  <CardHeader className="p-4 md:p-6">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <CardTitle className="text-base md:text-lg">{p.prenom} {p.nom}</CardTitle>
                        <p className="text-sm text-muted-foreground">{p.email}</p>
                      </div>
                      {profFullyValidated && (
                        <Badge className="w-fit bg-emerald-100 text-emerald-700">Valide</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 p-4 pt-0 md:p-6 md:pt-0">
                    <div className="flex flex-wrap gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Specialite:</span> {p.specialite || '-'}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Inscription:</span> {new Date(p.created_at).toLocaleDateString('fr')}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Statut:</span> <Badge variant="outline">{p.status}</Badge>
                      </div>
                    </div>

                    {!profFullyValidated && (
                      <div>
                        <Label>Commentaire admin (optionnel)</Label>
                        <Input 
                              value={selectedComment} 
                              onChange={e => setSelectedComment(e.target.value)} 
                              className="mt-1 h-11 text-base"
                            />
                      </div>
                    )}

                    <div className="space-y-3">
                      <p className="text-sm font-medium">Documents</p>
                      {(p.documents || []).map((d: any) => {
                        const status = normalize(d.statut_validation || d.status || d.verification_status || d.status_validation);
                        const isFinalStatus = isApprovedVal(status) || isRejectedVal(status);
                        const isApproved = isApprovedVal(status);
                        
                        return (
                          <Card key={d.id} className="shadow-sm">
                            <CardContent className="p-3">
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="min-w-0 flex-1">
                                  <p className="truncate font-medium">{d.filename}</p>
                                  <p className="text-xs text-muted-foreground">{d.type_document || d.type}</p>
                                  <p className="text-xs text-muted-foreground">{new Date(d.created_at).toLocaleDateString('fr')}</p>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <a 
                                    href={(d.url && d.url.startsWith('http') ? d.url : (import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, '') || 'http://localhost:8000') + (d.url || ''))} 
                                    target="_blank" 
                                    rel="noreferrer" 
                                    className="inline-flex h-11 items-center gap-1 text-sm text-primary sm:h-auto"
                                  >
                                    <ExternalLink className="h-4 w-4" /> Ouvrir
                                  </a>
                                  {profFullyValidated || isFinalStatus ? (
                                    <Badge className={isApproved ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}>
                                      {isApproved ? <><CheckCircle className="mr-1 h-3 w-3" /> Approuve</> : <><XCircle className="mr-1 h-3 w-3" /> Refuse</>}
                                    </Badge>
                                  ) : (
                                    <div className="flex w-full gap-2 sm:w-auto">
                                      <Button className="h-11 flex-1 sm:h-10 sm:flex-none" onClick={() => handleAction(d.id, 'approve', p.id)}>Approuver</Button>
                                      <Button variant="destructive" className="h-11 flex-1 sm:h-10 sm:flex-none" onClick={() => handleAction(d.id, 'reject', p.id)}>Refuser</Button>
                                    </div>
                                  )}
                                </div>
                              </div>
                              {d.commentaire_admin && (
                                <p className="mt-2 text-sm text-muted-foreground">{d.commentaire_admin}</p>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminValidationProfessionals;
