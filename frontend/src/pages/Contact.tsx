import { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
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
      toast({ title: 'Message envoye!', description: 'Nous vous repondrons dans les plus brefs delais.' });
      setForm({ name: '', email: '', subject: '', message: '' });
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1 pb-20 md:pb-0">
        <section className="px-4 py-6 md:container md:py-16">
          <PageHeader
            title="Contactez-nous"
            subtitle="Une question ? N'hesitez pas a nous ecrire."
          />

          <Card className="mx-auto mt-6 max-w-2xl border-0 shadow-lg shadow-primary/5 md:mt-10">
            <CardContent className="p-5 md:p-8">
              <form onSubmit={handleSubmit} className="space-y-4 md:space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Nom</Label>
                    <Input 
                      placeholder="Votre nom" 
                      value={form.name} 
                      onChange={e => setForm(p => ({ ...p, name: e.target.value }))} 
                      required 
                      className="h-12 md:h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input 
                      type="email" 
                      placeholder="votre@email.com" 
                      value={form.email} 
                      onChange={e => setForm(p => ({ ...p, email: e.target.value }))} 
                      required 
                      className="h-12 md:h-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Sujet</Label>
                  <Input 
                    placeholder="Sujet de votre message" 
                    value={form.subject} 
                    onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} 
                    required 
                    className="h-12 md:h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Message</Label>
                  <Textarea 
                    placeholder="Votre message..." 
                    rows={5} 
                    value={form.message} 
                    onChange={e => setForm(p => ({ ...p, message: e.target.value }))} 
                    required 
                  />
                </div>
                <Button type="submit" className="h-12 w-full gap-2 rounded-xl md:h-11" disabled={loading}>
                  <Send className="h-4 w-4" /> {loading ? 'Envoi...' : 'Envoyer'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="mx-auto mt-6 grid max-w-2xl gap-4 sm:grid-cols-2 md:mt-10">
            <div className="flex items-start gap-3 rounded-xl border bg-card p-4 md:gap-4 md:p-6">
              <Mail className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <p className="font-medium">Email</p>
                <p className="text-sm text-muted-foreground">contact@unguealhealth.com</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl border bg-card p-4 md:gap-4 md:p-6">
              <MessageSquare className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <p className="font-medium">Support</p>
                <p className="text-sm text-muted-foreground">Reponse sous 24h</p>
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
