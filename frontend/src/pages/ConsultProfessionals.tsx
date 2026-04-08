import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '@/lib/api';
import ProfessionalCard from '@/components/ProfessionalCard';
import Navbar from '@/components/Navbar';
import { PageHeader } from '@/components/PageHeader';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Filter, Search, X } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

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

  const { toast } = useToast();

  useEffect(() => {
    setLoading(true);
    api.listProfessionals().then((res: any) => {
      setProfessionals(res.professionals || []);
    }).catch((e) => console.error(e)).finally(() => setLoading(false));
    api.getPatientActiveProfessionals().then((r: any) => {
      const pros = r?.professionals ?? [];
      const ids = pros.map((p: any) => p.id || p.professional_id).filter(Boolean);
      setFollowing(new Set(ids));
    }).catch(() => {});
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
      toast({ title: 'Erreur', description: err.message || "Impossible d'envoyer la demande" });
    }
  };

  const resetFilters = () => {
    setFilterSpecialty(null);
    setQuery('');
    setSortBy('relevance');
  };

  const FilterContent = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Specialite</label>
        <Select value={filterSpecialty || ''} onValueChange={(v) => setFilterSpecialty(v || null)}>
          <SelectTrigger className="h-12 md:h-10">
            <SelectValue placeholder="Toutes les specialites" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Toutes</SelectItem>
            {specialties.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Trier par</label>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
          <SelectTrigger className="h-12 md:h-10">
            <SelectValue placeholder="Trier" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="relevance">Pertinence</SelectItem>
            <SelectItem value="experience">Experience</SelectItem>
            <SelectItem value="alpha">Ordre alphabetique</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button variant="outline" onClick={resetFilters} className="w-full">
        Reinitialiser les filtres
      </Button>
    </div>
  );

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <Navbar />
      <main className="px-4 py-4 pb-24 md:container md:py-8 md:pb-8">
        {/* Mobile Header */}
        <div className="mb-4 flex items-center gap-3 md:hidden">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Consulter un professionnel</h1>
        </div>

        {/* Desktop Header */}
        <div className="hidden md:block">
          <div className="mb-6 flex items-center justify-between">
            <PageHeader
              title="Consulter un professionnel"
              subtitle="Choisissez un professionnel approuve par l'administrateur."
            />
            <Button variant="outline" onClick={() => navigate(-1)}>Retour</Button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="mb-4 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-12 pl-10 md:h-10"
              placeholder="Rechercher..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          
          {/* Mobile Filter Sheet */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="h-12 w-12 shrink-0 md:hidden">
                <Filter className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-auto rounded-t-2xl">
              <SheetHeader>
                <SheetTitle>Filtres</SheetTitle>
              </SheetHeader>
              <div className="py-4">
                <FilterContent />
              </div>
            </SheetContent>
          </Sheet>

          {/* Desktop Filters */}
          <div className="hidden gap-2 md:flex">
            <Select value={filterSpecialty || ''} onValueChange={(v) => setFilterSpecialty(v || null)}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Specialite" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Toutes</SelectItem>
                {specialties.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Trier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevance">Pertinence</SelectItem>
                <SelectItem value="experience">Experience</SelectItem>
                <SelectItem value="alpha">Alphabetique</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Active Filters */}
        {(filterSpecialty || sortBy !== 'relevance') && (
          <div className="mb-4 flex flex-wrap gap-2">
            {filterSpecialty && (
              <Badge variant="secondary" className="gap-1 pr-1">
                {filterSpecialty}
                <button onClick={() => setFilterSpecialty(null)} className="ml-1 rounded-full p-0.5 hover:bg-muted">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {sortBy !== 'relevance' && (
              <Badge variant="secondary" className="gap-1 pr-1">
                {sortBy === 'experience' ? 'Experience' : 'Alphabetique'}
                <button onClick={() => setSortBy('relevance')} className="ml-1 rounded-full p-0.5 hover:bg-muted">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
          </div>
        )}

        {/* Results */}
        {loading ? (
          <div className="py-12 text-center text-muted-foreground">Chargement...</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-lg font-medium">Aucun professionnel trouve</p>
            <p className="mt-1 text-sm text-muted-foreground">Essayez de modifier vos filtres</p>
            <Button variant="outline" onClick={resetFilters} className="mt-4">
              Reinitialiser les filtres
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p) => (
              <div key={p.id} className="transition-transform hover:scale-[1.01]">
                <ProfessionalCard professional={p} onRequest={handleRequest} isFollowing={following.has(p.id)} />
              </div>
            ))}
          </div>
        )}

        {/* Request Dialog */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="mx-4 max-w-lg rounded-2xl">
            <DialogHeader>
              <DialogTitle>Envoyer une demande de suivi</DialogTitle>
              <DialogDescription>Vous pouvez ajouter un message optionnel au professionnel.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium">Professionnel</label>
                <div className="mt-1 text-base">{selected ? `${selected.prenom || ''} ${selected.nom || ''}` : ''}</div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Message (optionnel)</label>
                <Input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Ajoutez un message..."
                  className="h-12 md:h-10"
                />
              </div>
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => setOpen(false)} className="h-12 sm:h-10">
                Annuler
              </Button>
              <Button onClick={sendRequest} className="h-12 sm:h-10">
                Envoyer la demande
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default ConsultProfessionals;