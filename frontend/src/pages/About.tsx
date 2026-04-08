import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { PageHeader } from '@/components/PageHeader';
import { Shield, Brain, Heart, Users } from 'lucide-react';

const About = () => (
  <div className="flex min-h-dvh flex-col bg-background">
    <Navbar />
    <main className="flex-1 pb-20 md:pb-0">
      <section className="px-4 py-6 md:container md:py-16">
        <PageHeader
          title="A propos d'UngueaHealth"
          subtitle="UngueaHealth est une plateforme innovante de diagnostic des pathologies ungueales utilisant l'intelligence artificielle et le deep learning pour analyser les images d'ongles et fournir des resultats fiables et rapides."
        />

        <div className="mt-8 grid gap-4 md:mt-12 md:grid-cols-2 md:gap-6">
          {[
            { icon: Brain, title: 'IA de pointe', desc: "Nos modeles de deep learning sont entraines sur des milliers d'images cliniques pour une precision optimale." },
            { icon: Shield, title: 'Donnees securisees', desc: 'Vos donnees personnelles et medicales sont protegees par un chiffrement de bout en bout.' },
            { icon: Heart, title: 'Mission sante', desc: "Notre objectif est de rendre le depistage precoce accessible a tous, partout dans le monde." },
            { icon: Users, title: 'Communaute', desc: "Rejoignez des milliers d'utilisateurs qui prennent soin de leur sante ungueale au quotidien." },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-xl border bg-card p-5 md:rounded-2xl md:p-8">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary md:mb-4 md:h-12 md:w-12 md:rounded-xl">
                <Icon className="h-5 w-5 md:h-6 md:w-6" />
              </div>
              <h3 className="text-base font-semibold md:text-lg">{title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground md:mt-2">{desc}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
    <Footer />
  </div>
);

export default About;