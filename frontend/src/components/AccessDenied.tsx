import { Link } from 'react-router-dom';

type Props = {
  message?: string | null;
  backTo?: string;
  backLabel?: string;
};

const AccessDenied = ({ message = null, backTo = '/', backLabel = 'Retour' }: Props) => {
  return (
    <div className="max-w-2xl mx-auto p-6 text-center">
      <div className="mb-6 inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-50 mx-auto">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-red-600" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M9.401 2.066a1 1 0 01.198 0l6 1.5A1 1 0 0117 4.5v6.09a6.5 6.5 0 11-12 0V4.5a1 1 0 01.401-.934l6-1.5zM9 8a1 1 0 012 0v3a1 1 0 11-2 0V8z" clipRule="evenodd" />
        </svg>
      </div>
      <h2 className="text-2xl font-semibold mb-2">Accès refusé</h2>
      <p className="text-sm text-muted-foreground mb-6">{message ?? "Vous n'avez pas les permissions nécessaires pour accéder à cette page."}</p>
      <div className="flex items-center justify-center">
        <Link to={backTo} className="inline-block bg-emerald-500 text-white px-4 py-2 rounded hover:bg-emerald-600">{backLabel}</Link>
      </div>
    </div>
  );
};

export default AccessDenied;
