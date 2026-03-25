import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Shield, Brain, Heart, Users } from 'lucide-react';

const About = () => (
  <div className="flex min-h-screen flex-col">
    <Navbar />
    <main className="flex-1">
      <section className="container py-20">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold">À propos d'UngueaHealth</h1>
          <p className="mt-6 text-lg text-muted-foreground">
            UngueaHealth est une plateforme innovante de diagnostic des pathologies unguéales utilisant
            l'intelligence artificielle et le deep learning pour analyser les images d'ongles et fournir
            des résultats fiables et rapides.
          </p>
        </div>

        <div className="mx-auto mt-16 grid max-w-4xl gap-8 md:grid-cols-2">
          {[
            { icon: Brain, title: 'IA de pointe', desc: 'Nos modèles de deep learning sont entraînés sur des milliers d\'images cliniques pour une précision optimale.' },
            { icon: Shield, title: 'Données sécurisées', desc: 'Vos données personnelles et médicales sont protégées par un chiffrement de bout en bout.' },
            { icon: Heart, title: 'Mission santé', desc: 'Notre objectif est de rendre le dépistage précoce accessible à tous, partout dans le monde.' },
            { icon: Users, title: 'Communauté', desc: 'Rejoignez des milliers d\'utilisateurs qui prennent soin de leur santé unguéale au quotidien.' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-2xl border bg-card p-8 shadow-sm">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
    <Footer />
  </div>
);

export default About;
