import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { motion } from 'framer-motion';
import { Camera, Layers, FileText, Shield, Zap, Users, Activity, ArrowRight, CheckCircle } from 'lucide-react';

const fadeUp = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0 } };

const Landing = () => {
  const { isAuthenticated } = useAuth();
  const cta = isAuthenticated ? '/analyze' : '/register';

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/20" />
        <div className="container relative py-20 lg:py-32">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <motion.div initial="hidden" animate="visible" variants={fadeUp} transition={{ duration: 0.6 }}>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border bg-background px-4 py-1.5 text-sm font-medium text-muted-foreground">
                <Zap className="h-3.5 w-3.5 text-primary" />
                Diagnostic IA avancé
              </div>
              <h1 className="text-4xl font-extrabold tracking-tight lg:text-6xl">
                Diagnostiquez la santé de vos ongles avec{' '}
                <span className="text-gradient">l'Intelligence Artificielle</span>
              </h1>
              <p className="mt-6 text-lg text-muted-foreground max-w-lg">
                UngueaHealth utilise des algorithmes de deep learning pour analyser vos ongles et détecter
                les signes précoces de pathologies unguéales.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Button size="lg" asChild className="gap-2 rounded-xl shadow-lg">
                  <Link to={cta}><Camera className="h-4 w-4" /> Commencer l'analyse</Link>
                </Button>
                <Button size="lg" variant="outline" asChild className="gap-2 rounded-xl">
                  <Link to="/about">En savoir plus <ArrowRight className="h-4 w-4" /></Link>
                </Button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="hidden lg:flex items-center justify-center"
            >
              <div className="relative flex h-80 w-80 items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-primary/10 animate-pulse" />
                <div className="absolute inset-8 rounded-full bg-primary/20" />
                <div className="relative z-10 flex h-32 w-32 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl">
                  <Activity className="h-16 w-16" />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t bg-muted/30 py-20">
        <div className="container">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.5 }} className="text-center mb-14">
            <h2 className="text-3xl font-bold">Comment ça fonctionne ?</h2>
            <p className="mt-3 text-muted-foreground">Trois étapes simples pour un diagnostic intelligent</p>
          </motion.div>
          <div className="grid gap-8 md:grid-cols-3">
            {[
              { icon: Camera, title: '1. Prenez une photo', desc: 'Capturez une image claire de votre ongle avec votre smartphone.' },
              { icon: Layers, title: '2. Analyse IA', desc: 'Notre modèle de deep learning analyse l\'image en quelques secondes.' },
              { icon: FileText, title: '3. Résultats détaillés', desc: 'Recevez un diagnostic complet avec des recommandations personnalisées.' },
            ].map(({ icon: Icon, title, desc }, i) => (
              <motion.div
                key={title}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                transition={{ duration: 0.5, delay: i * 0.15 }}
                className="group rounded-2xl border bg-card p-8 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pathologies */}
      <section className="py-20">
        <div className="container">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold">Pathologies détectées</h2>
            <p className="mt-3 text-muted-foreground">Notre IA peut identifier plus de 10 types de pathologies unguéales</p>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            {[
              { label: 'Sain', color: 'bg-emerald-100 text-emerald-700' },
              { label: 'Mycose', color: 'bg-amber-100 text-amber-700' },
              { label: 'Psoriasis', color: 'bg-purple-100 text-purple-700' },
              { label: 'Mélanome', color: 'bg-red-100 text-red-700' },
              { label: 'Traumatisme', color: 'bg-orange-100 text-orange-700' },
              { label: 'Carence', color: 'bg-blue-100 text-blue-700' },
            ].map(({ label, color }) => (
              <div key={label} className="flex flex-col items-center gap-2 rounded-xl border bg-card p-5 text-center shadow-sm">
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${color}`}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-t bg-primary py-16 text-primary-foreground">
        <div className="container">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {[
              { value: '95%', label: 'Précision' },
              { value: '50K+', label: 'Analyses' },
              { value: '10K+', label: 'Utilisateurs' },
              { value: '15+', label: 'Pathologies' },
            ].map(({ value, label }) => (
              <div key={label} className="text-center">
                <div className="text-3xl font-extrabold lg:text-4xl">{value}</div>
                <div className="mt-1 text-sm opacity-80">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container">
          <div className="rounded-3xl bg-gradient-to-br from-primary to-primary/80 p-12 text-center text-primary-foreground shadow-xl">
            <h2 className="text-3xl font-bold">Prêt à prendre soin de vos ongles ?</h2>
            <p className="mx-auto mt-4 max-w-md text-primary-foreground/80">
              Rejoignez des milliers d'utilisateurs qui font confiance à UngueaHealth
            </p>
            <Button size="lg" variant="secondary" asChild className="mt-8 rounded-xl gap-2">
              <Link to={cta}><CheckCircle className="h-4 w-4" /> Commencer gratuitement</Link>
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Landing;
