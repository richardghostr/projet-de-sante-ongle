import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-primary md:text-8xl">404</h1>
        <p className="mt-4 text-lg text-muted-foreground md:text-xl">
          Oups ! Page introuvable
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          La page que vous cherchez n&apos;existe pas ou a ete deplacee.
        </p>
        <Button asChild className="mt-6 h-12 gap-2 rounded-xl px-6">
          <Link to="/">
            <Home className="h-4 w-4" />
            Retour a l&apos;accueil
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
