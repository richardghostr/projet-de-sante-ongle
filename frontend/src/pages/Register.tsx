import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Navbar } from '@/components/Navbar';
import { Activity, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [form, setForm] = useState({ nom: '', prenom: '', email: '', password: '', password_confirmation: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(prev => ({ ...prev, [field]: e.target.value }));

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
    <div className="flex min-h-screen flex-col bg-muted/30">
      <Navbar />
      <div className="flex flex-1 items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg border-0 shadow-primary/5">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Activity className="h-6 w-6" />
            </div>
            <CardTitle className="text-2xl">Inscription</CardTitle>
            <CardDescription>Créez votre compte UngueaHealth</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Nom *</Label>
                  <Input placeholder="Dupont" value={form.nom} onChange={update('nom')} required />
                </div>
                <div className="space-y-2">
                  <Label>Prénom</Label>
                  <Input placeholder="Jean" value={form.prenom} onChange={update('prenom')} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input type="email" placeholder="votre@email.com" value={form.email} onChange={update('email')} required />
              </div>
              <div className="space-y-2">
                <Label>Mot de passe *</Label>
                <div className="relative">
                  <Input type={showPassword ? 'text' : 'password'} placeholder="Min. 8 caractères" value={form.password} onChange={update('password')} required minLength={8} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Confirmer le mot de passe *</Label>
                <Input type="password" placeholder="••••••••" value={form.password_confirmation} onChange={update('password_confirmation')} required />
              </div>
              <Button type="submit" className="w-full rounded-xl" disabled={loading}>
                {loading ? 'Inscription...' : 'Créer mon compte'}
              </Button>
            </form>
            <p className="mt-6 text-center text-sm text-muted-foreground">
              Déjà un compte ?{' '}
              <Link to="/login" className="font-medium text-primary hover:underline">Se connecter</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Register;
