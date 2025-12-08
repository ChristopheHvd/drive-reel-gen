import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Video, Sparkles, Zap, TrendingUp } from "lucide-react";
import logo from "@/assets/quickquick-logo.png";

const Landing = () => {
  return (
    <div className="min-h-screen bg-gradient-dark">
      {/* Header */}
      <header className="border-b border-border bg-background/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src={logo} alt="QuickQuick" className="h-10 w-10" />
            <span className="text-2xl font-bold bg-gradient-gold bg-clip-text text-transparent">
              QuickQuick
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/pricing" className="text-foreground/80 hover:text-foreground transition-colors">
              Tarifs
            </Link>
            <Link to="/auth">
              <Button variant="outline">Connexion</Button>
            </Link>
            <Link to="/auth">
              <Button variant="premium">Commencer</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="container mx-auto px-4 py-20 md:py-32">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/10 backdrop-blur-sm">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm text-primary font-medium">Génération automatique de vidéos marketing</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold leading-tight">
            Créez des{" "}
            <span className="bg-gradient-gold bg-clip-text text-transparent">
              Reels Instagram
            </span>
            {" "}en quelques clics
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            QuickQuick transforme vos photos en vidéos marketing percutantes grâce à l'intelligence artificielle.
            Synchronisez votre Google Drive et laissez la magie opérer.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link to="/auth">
              <Button variant="premium" size="lg" className="text-base">
                <Video className="h-5 w-5" />
                Commencer gratuitement
              </Button>
            </Link>
            <Link to="/pricing">
              <Button variant="outline" size="lg" className="text-base">
                Voir les tarifs
              </Button>
            </Link>
          </div>

          <div className="flex items-center justify-center gap-8 pt-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-accent" />
              <span>6 vidéos gratuites</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-accent" />
              <span>Format Instagram Reels</span>
            </div>
          </div>
        </div>
      </section>

        {/* Features Section */}
        <section className="container mx-auto px-4 py-20">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
            Une solution{" "}
            <span className="bg-gradient-neon bg-clip-text text-transparent">
              complète
            </span>
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="p-6 rounded-xl bg-card border border-border hover:border-primary/50 transition-all group"
              >
                <div className="h-12 w-12 rounded-lg bg-gradient-gold flex items-center justify-center mb-4 group-hover:shadow-gold transition-all">
                  <feature.icon className="h-6 w-6 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

        {/* CTA Section */}
        <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center space-y-8 p-12 rounded-2xl bg-card border border-border shadow-subtle">
          <h2 className="text-3xl md:text-5xl font-bold">
            Prêt à{" "}
            <span className="bg-gradient-gold bg-clip-text text-transparent">
              transformer
            </span>
            {" "}vos contenus ?
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Rejoignez les créateurs qui utilisent QuickQuick pour automatiser leur production de vidéos marketing.
          </p>
          <Link to="/auth">
            <Button variant="premium" size="lg" className="text-base">
              <Video className="h-5 w-5" />
              Commencer maintenant
            </Button>
          </Link>
        </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-background/50 backdrop-blur-sm mt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <img src={logo} alt="QuickQuick" className="h-8 w-8" />
              <span className="font-semibold text-foreground">QuickQuick</span>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <a 
                href="https://files.cloudron.alpes-ia.fr/AlpesIA/quickquick_terms_of_service.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Conditions d'utilisation
              </a>
              <Link 
                to="/privacy"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Politique de confidentialité
              </Link>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2025 QuickQuick. Tous droits réservés.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

const features = [
  {
    icon: Video,
    title: "Génération automatique",
    description: "Créez des vidéos professionnelles à partir de vos images en quelques secondes grâce à l'IA.",
  },
  {
    icon: Sparkles,
    title: "Synchronisation Drive",
    description: "Connectez votre Google Drive et synchronisez automatiquement vos nouvelles images.",
  },
  {
    icon: TrendingUp,
    title: "Optimisé pour Instagram",
    description: "Vidéos au format 9:16 parfaites pour les Reels Instagram et TikTok.",
  },
];

export default Landing;
