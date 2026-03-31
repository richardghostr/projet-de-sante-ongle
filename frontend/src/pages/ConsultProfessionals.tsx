import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '@/lib/api';
import ProfessionalCard from '@/components/ProfessionalCard';
import Navbar from '@/components/Navbar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

const ConsultProfessionals: React.FC = () => {
  const { analysisId } = useParams();
  const navigate = useNavigate();
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<any | null>(null);
  const [message, setMessage] = useState('');
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [filterSpecialty, setFilterSpecialty] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'relevance'|'experience'|'alpha'>('relevance');
  const [following, setFollowing] = useState<Set<number>>(new Set());
  const [showFilters, setShowFilters] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    setLoading(true);
    api.listProfessionals().then((res: any) => {
      setProfessionals(res.professionals || []);
    }).catch((e) => console.error(e)).finally(() => setLoading(false));
    // load patient's active professionals to mark professionals already linked
    api.getPatientActiveProfessionals().then((r: any) => {
      const pros = r?.professionals ?? [];
      const ids = pros.map((p: any) => p.id || p.professional_id).filter(Boolean);
      setFollowing(new Set(ids));
    }).catch(() => {
      // ignore
    });
  }, []);

  const specialties = useMemo(() => {
    const s = new Set<string>();
    professionals.forEach(p => {
      if (p.specialite) s.add(p.specialite);
      if (p.sous_specialite) s.add(p.sous_specialite);
    });
    return Array.from(s).sort();
  }, [professionals]);

  const filtered = useMemo(() => {
    let list = professionals.slice();
    if (query) {
      const q = query.toLowerCase();
      list = list.filter(p => (`${p.prenom || ''} ${p.nom || ''} ${p.specialite || ''}`).toLowerCase().includes(q));
    }
    if (filterSpecialty) {
      list = list.filter(p => (p.specialite === filterSpecialty) || (p.sous_specialite === filterSpecialty));
    }
    if (sortBy === 'experience') list.sort((a,b) => (b.experience||0) - (a.experience||0));
    if (sortBy === 'alpha') list.sort((a,b) => ('' + (a.nom||'')).localeCompare(b.nom||''));
    return list;
  }, [professionals, query, filterSpecialty, sortBy]);

  const handleRequest = (professional: any) => {
    setSelected(professional);
    setMessage('');
    setOpen(true);
  };

  const sendRequest = async () => {
    if (!selected) return;
    try {
      await api.createFollowUpRequest({ professional_id: selected.id, analysis_uuid: analysisId, message });
      toast({ title: 'Demande envoyee', description: 'Le professionnel a ete notifie.' });
      setOpen(false);
      navigate('/profile');
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message || 'Impossible d envoyer la demande' });
    }
  };

  return (
    <div className="min-h-screen bg-surface-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow-sm rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold">Consulter un professionnel</h2>
              <p className="text-sm text-muted-foreground mt-1">Choisissez un professionnel approuvé par l'administrateur. Les spécialités pertinentes sont affichées en priorité.</p>
            </div>
            <Button variant="ghost" onClick={() => navigate(-1)}>Retour</Button>
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <h3 className="sr-only">Liste des professionnels</h3>
              </div>
              <div className="sm:hidden">
                <Button variant="ghost" onClick={() => setShowFilters(v => !v)} aria-expanded={showFilters} aria-controls="filters-panel">Filtres</Button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              <div className={`lg:col-span-2 space-y-4 ${showFilters ? '' : ''}`}>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <Input className="flex-1" placeholder="Rechercher par nom ou spécialité" value={query} onChange={(e:any) => setQuery(e.target.value)} />
                  <Select onValueChange={(v) => setFilterSpecialty(v || null)}>
                    <SelectTrigger className="w-48"><SelectValue placeholder="Filtrer par spécialité" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Toutes</SelectItem>
                      {specialties.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select onValueChange={(v) => setSortBy(v as any)}>
                    <SelectTrigger className="w-44"><SelectValue placeholder="Trier" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="relevance">Pertinence</SelectItem>
                      <SelectItem value="experience">Expérience</SelectItem>
                      <SelectItem value="alpha">Ordre alphabétique</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="mt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {loading && <div className="col-span-full text-center py-8">Chargement...</div>}
                    {filtered.map((p) => (
                      <div key={p.id} className="transition-transform transform hover:scale-[1.01] hover:shadow-md rounded-lg">
                        <ProfessionalCard professional={p} onRequest={handleRequest} isFollowing={following.has(p.id)} />
                      </div>
                    ))}
                  </div>

                  {!loading && filtered.length === 0 && (
                    <div className="col-span-full text-center py-12 text-muted-foreground">
                      <h3 className="text-lg font-semibold mb-2">Aucun professionnel trouvé</h3>
                      <p className="max-w-xl mx-auto">Essayez de modifier vos filtres ou revenez plus tard. Si vous avez besoin d'aide, contactez l'administrateur.</p>
                    </div>
                  )}
                </div>
              </div>

              <aside id="filters-panel" className="space-y-4">
                <div className="p-4 bg-surface-100 rounded-md sticky top-24">
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700">Professionnels approuvés</Badge>
                  <div className="mt-4 text-sm text-muted-foreground">Affinez la recherche par spécialité ou triez par expérience pour trouver le professionnel adapté.</div>
                </div>

                <div className="p-4 bg-surface-100 rounded-md">
                  <h4 className="text-sm font-medium mb-2">Filtres rapides</h4>
                  <div className="flex flex-col gap-2">
                    <Button variant="outline" onClick={() => { setFilterSpecialty(null); setQuery(''); setSortBy('relevance'); }}>Réinitialiser</Button>
                  </div>
                </div>
              </aside>
            </div>
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Envoyer une demande de suivi</DialogTitle>
                <DialogDescription>Vous pouvez ajouter un message optionnel au professionnel.</DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div>
                  <label className="text-sm font-medium">Professionnel</label>
                  <div className="mt-1 text-base">{selected ? `${selected.prenom || ''} ${selected.nom || ''}` : ''}</div>
                </div>
                <div>
                  <label className="text-sm font-medium">Message (optionnel)</label>
                  <Input value={message} onChange={(e:any) => setMessage(e.target.value)} placeholder="Ajoutez un message au professionnel" />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
                <Button onClick={sendRequest}>Envoyer la demande</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </main>
    </div>
  );
};

export default ConsultProfessionals;
