import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';

type Props = {
  message?: string | null;
  backTo?: string;
  backLabel?: string;
};

const AccessDenied = ({ message = null, backTo = '/', backLabel = 'Retour au tableau de bord' }: Props) => {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-full max-w-3xl bg-white shadow-lg rounded-lg p-8">
        <div className="flex items-start gap-6">
          <div className="flex-shrink-0">
            <div className="flex items-center justify-center h-20 w-20 rounded-lg bg-red-50">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 17h.01" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>

          <div className="flex-1">
            <h2 className="text-2xl font-semibold mb-2">Accès refusé</h2>
            <p className="text-sm text-muted-foreground mb-4">{message ?? "Vous n'avez pas les permissions nécessaires pour accéder à cette page ou à ce contenu."}</p>

            <div className="flex flex-wrap items-center gap-3">
              <Link to={backTo} className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded shadow-sm hover:bg-emerald-700">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M9.707 14.707a1 1 0 01-1.414 0L3.586 10l4.707-4.707a1 1 0 111.414 1.414L6.414 10l3.293 3.293a1 1 0 010 1.414z"/></svg>
                {backLabel}
              </Link>

              <Link to="/contact" className="inline-flex items-center gap-2 border border-gray-200 px-4 py-2 rounded text-sm hover:bg-gray-50">
                Contacter l'administrateur
              </Link>

              <Badge variant="outline" className="bg-red-50 text-red-700">Accès restreint</Badge>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default AccessDenied;
