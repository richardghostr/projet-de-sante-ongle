import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

type Props = {
  professional: any;
  onRequest: (professional: any) => void;
  isFollowing?: boolean;
};

const ProfessionalCard: React.FC<Props> = ({ professional, onRequest, isFollowing = false }) => {
  const name = `${professional.prenom || ''} ${professional.nom || ''}`.trim();
  return (
    <Card className="p-0 hover:shadow-lg transition-shadow">
      <CardContent className="p-3 md:p-4">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3 md:gap-4">
          <div className="h-16 w-16 sm:h-20 sm:w-20 flex-shrink-0 overflow-hidden rounded-full bg-gray-100 ring-1 ring-gray-100">
            {professional.avatar_url ? (
              <img src={professional.avatar_url} alt={name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted-foreground font-medium">{(professional.prenom || '').charAt(0)}{(professional.nom || '').charAt(0)}</div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div className="truncate">
                <div className="font-semibold text-base truncate">{name}</div>
                <div className="text-sm text-muted-foreground truncate">{professional.specialite || professional.sous_specialite || 'Spécialité non renseignée'}</div>
              </div>
            </div>

            <div className="mt-3 sm:mt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-4">
                <div className="text-sm text-muted-foreground">{professional.matricule_professionnel || '—'}</div>
                <div className="text-sm text-muted-foreground">{professional.experience ? `${professional.experience} ans` : 'Expérience non renseignée'}</div>
              </div>

              <div className="flex items-center gap-3">
                <div>
                  {professional.statut_validation === 'approved' ? (
                    <Badge variant="outline" className="bg-emerald-100 text-emerald-700">Approuvé</Badge>
                  ) : (
                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700">En attente</Badge>
                  )}
                </div>
                <div className="w-full sm:w-auto">
                  {isFollowing ? (
                    <Button disabled variant="outline" className="whitespace-nowrap w-full sm:w-auto" title="Vous êtes déjà en relation avec ce professionnel">Déjà en relation</Button>
                  ) : (
                    <Button onClick={() => onRequest(professional)} className="whitespace-nowrap w-full sm:w-auto h-11">Envoyer demande</Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProfessionalCard;
