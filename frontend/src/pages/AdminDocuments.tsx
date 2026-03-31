import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

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
    <div className="min-h-screen bg-muted/30">
      <Navbar />
      <main className="container py-8">
        <h1 className="text-2xl font-bold mb-4">Validation des documents professionnels</h1>
        <Card>
          <CardHeader><CardTitle>Documents reçus</CardTitle></CardHeader>
          <CardContent>
            {loading ? <div>Chargement...</div> : (
              docs.length === 0 ? <div>Aucun document</div> : (
                <div className="space-y-3">
                  {docs.map(d => (
                    <div key={d.id} className="flex items-center justify-between border p-3 rounded">
                      <div>
                        <div className="font-medium">{d.filename}</div>
                        <div className="text-sm text-muted-foreground">Par: {d.prenom} {d.nom} — {d.email}</div>
                        <div className="text-sm text-muted-foreground">Reçu: {d.created_at}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <a href={(d.url && d.url.startsWith('http') ? d.url : (import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, '') || 'http://localhost:8000') + d.url)} target="_blank" rel="noreferrer" className="text-primary">Ouvrir</a>
                        {d.verified ? <span className="text-sm">Vérifié</span> : <Button onClick={() => handleVerify(d.id)}>Vérifier</Button>}
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AdminDocuments;
