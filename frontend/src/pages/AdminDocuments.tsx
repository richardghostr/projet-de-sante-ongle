import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/PageHeader';
import { FileText, ExternalLink, CheckCircle } from 'lucide-react';

const AdminDocuments = () => {
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res: any = await api.listAllProfileDocuments();
        setDocs(res.documents || []);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  const handleVerify = async (id: number) => {
    try {
      await api.verifyProfileDocument(id);
      setDocs(d => d.map((x: any) => x.id === id ? { ...x, verified: 1 } : x));
    } catch (e) { console.error(e); }
  };

  return (
    <div className="flex min-h-dvh flex-col bg-muted/30">
      <Navbar />
      <main className="container flex-1 py-4 pb-24 md:py-8 md:pb-8">
        <PageHeader 
          title="Documents professionnels"
          subtitle="Validez les documents recus"
        />

        <Card className="shadow-sm">
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="text-base md:text-lg">Documents recus</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : docs.length === 0 ? (
              <div className="py-16 text-center">
                <FileText className="mx-auto h-14 w-14 text-muted-foreground/30" />
                <p className="mt-4 text-muted-foreground">Aucun document</p>
              </div>
            ) : (
              <div className="space-y-3">
                {docs.map(d => (
                  <Card key={d.id} className="shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{d.filename}</p>
                          <p className="text-sm text-muted-foreground">Par: {d.prenom} {d.nom}</p>
                          <p className="text-xs text-muted-foreground">{d.email}</p>
                          <p className="mt-1 text-xs text-muted-foreground">Recu: {new Date(d.created_at).toLocaleDateString('fr')}</p>
                        </div>
                        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                          <a 
                            href={(d.url && d.url.startsWith('http') ? d.url : (import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, '') || 'http://localhost:8000') + d.url)} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="inline-flex h-11 items-center gap-1 text-sm text-primary sm:h-auto"
                          >
                            <ExternalLink className="h-4 w-4" /> Ouvrir
                          </a>
                          {d.verified ? (
                            <Badge className="bg-emerald-100 text-emerald-700">
                              <CheckCircle className="mr-1 h-3 w-3" /> Verifie
                            </Badge>
                          ) : (
                            <Button className="h-11 flex-1 sm:h-10 sm:flex-none" onClick={() => handleVerify(d.id)}>Verifier</Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AdminDocuments;
