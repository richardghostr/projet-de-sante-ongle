import { Link } from 'react-router-dom';
import { Activity } from 'lucide-react';

export const Footer = () => (
  <footer className="border-t bg-muted/30">
    <div className="container py-10">
      <div className="grid gap-8 md:grid-cols-3">
        <div>
          <Link to="/" className="flex items-center gap-2 font-bold text-lg mb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Activity className="h-4 w-4" />
            </div>
            <span className="font-['Outfit']">UngueaHealth</span>
          </Link>
          <p className="text-sm text-muted-foreground max-w-xs">
            Diagnostic intelligent des pathologies unguéales par Intelligence Artificielle.
          </p>
        </div>
        <div>
          <h4 className="font-semibold mb-3 text-sm">Navigation</h4>
          <div className="flex flex-col gap-2">
            <Link to="/about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">À propos</Link>
            <Link to="/contact" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Contact</Link>
          </div>
        </div>
        <div>
          <h4 className="font-semibold mb-3 text-sm">Mentions</h4>
          <p className="text-xs text-muted-foreground">
            Cette application fournit des analyses indicatives et ne remplace pas un diagnostic médical professionnel.
          </p>
        </div>
      </div>
      <div className="mt-8 border-t pt-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} UngueaHealth. Tous droits réservés.
      </div>
    </div>
  </footer>
);
