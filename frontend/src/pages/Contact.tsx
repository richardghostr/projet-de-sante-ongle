import { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Mail, MessageSquare, Send } from 'lucide-react';

const Contact = () => {
  const { toast } = useToast();
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      toast({ title: 'Message envoyé!', description: 'Nous vous répondrons dans les plus brefs délais.' });
      setForm({ name: '', email: '', subject: '', message: '' });
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <section className="container py-20">
          <div className="mx-auto max-w-2xl">
            <div className="mb-10 text-center">
              <h1 className="text-4xl font-bold">Contactez-nous</h1>
              <p className="mt-4 text-muted-foreground">Une question ? N'hésitez pas à nous écrire.</p>
            </div>

            <Card className="shadow-lg border-0 shadow-primary/5">
              <CardContent className="p-8">
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2"><Label>Nom</Label><Input placeholder="Votre nom" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required /></div>
                    <div className="space-y-2"><Label>Email</Label><Input type="email" placeholder="votre@email.com" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required /></div>
                  </div>
                  <div className="space-y-2"><Label>Sujet</Label><Input placeholder="Sujet de votre message" value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} required /></div>
                  <div className="space-y-2"><Label>Message</Label><Textarea placeholder="Votre message..." rows={6} value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} required /></div>
                  <Button type="submit" className="w-full gap-2 rounded-xl" size="lg" disabled={loading}>
                    <Send className="h-4 w-4" /> {loading ? 'Envoi...' : 'Envoyer'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <div className="mt-10 grid gap-6 sm:grid-cols-2">
              <div className="flex items-start gap-4 rounded-xl border bg-card p-6">
                <Mail className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium">Email</p>
                  <p className="text-sm text-muted-foreground">contact@unguealhealth.com</p>
                </div>
              </div>
              <div className="flex items-start gap-4 rounded-xl border bg-card p-6">
                <MessageSquare className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium">Support</p>
                  <p className="text-sm text-muted-foreground">Réponse sous 24h</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Contact;
