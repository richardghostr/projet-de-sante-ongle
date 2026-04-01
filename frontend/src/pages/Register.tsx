import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [form, setForm] = useState({ nom: '', prenom: '', email: '', password: '', password_confirmation: '', role: 'user' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.password_confirmation) {
      toast({ title: 'Erreur', description: 'Les mots de passe ne correspondent pas', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      await register(form);
      toast({ title: 'Inscription réussie!', description: 'Vous pouvez maintenant vous connecter.' });
      navigate('/login');
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col bg-muted/30">
      {/* Minimal header with centered logo */}
      <header className="flex h-14 items-center justify-center border-b bg-background/95 safe-top md:h-16">
        <Link to="/" className="flex items-center gap-2 font-bold">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Activity className="h-5 w-5" />
          </div>
          <span className="font-['Outfit'] font-bold tracking-tight">UngueaHealth</span>
        </Link>
      </header>

      <div className="flex flex-1 items-center justify-center p-4">
        <Card className="w-full max-w-sm border-0 shadow-lg shadow-primary/5 md:max-w-md">
          <CardHeader className="p-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Activity className="h-6 w-6" />
            </div>
            <CardTitle className="text-2xl">Inscription</CardTitle>
            <CardDescription>Créez votre compte UngueaHealth</CardDescription>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Stack nom/prenom on mobile, side-by-side on sm+ */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Nom *</Label>
                  <Input
                    placeholder="Dupont"
                    value={form.nom}
                    onChange={update('nom')}
                    required
                    className="h-12 text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Prénom</Label>
                  <Input
                    placeholder="Jean"
                    value={form.prenom}
                    onChange={update('prenom')}
                    className="h-12 text-base"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Vous êtes</Label>
                <select
                  value={form.role}
                  onChange={update('role')}
                  className="h-12 w-full rounded-md border bg-background px-3 text-base"
                >
                  <option value="user">Patient</option>
                  <option value="professional">Professionnel de santé</option>
                </select>
                {form.role === 'professional' && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    Un administrateur devra valider votre compte avant d&apos;accéder au profil professionnel complet.
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input
                  type="email"
                  placeholder="votre@email.com"
                  value={form.email}
                  onChange={update('email')}
                  required
                  className="h-12 text-base"
                />
              </div>
              <div className="space-y-2">
                <Label>Mot de passe *</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Min. 8 caractères"
                    value={form.password}
                    onChange={update('password')}
                    required
                    minLength={8}
                    className="h-12 pr-10 text-base"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Confirmer le mot de passe *</Label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={form.password_confirmation}
                  onChange={update('password_confirmation')}
                  required
                  className="h-12 text-base"
                />
              </div>
              <Button type="submit" className="h-12 w-full rounded-xl text-base" disabled={loading}>
                {loading ? 'Inscription...' : 'Créer mon compte'}
              </Button>
            </form>
            <p className="mt-4 block text-center text-sm text-muted-foreground">
              Déjà un compte ?{' '}
              <Link to="/login" className="font-medium text-primary hover:underline">
                Se connecter
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Register;
