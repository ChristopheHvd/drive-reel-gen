import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import logo from "@/assets/daft-funk-logo.png";

const Pricing = () => {
  const plans = [
    {
      name: "Free",
      price: "0€",
      period: "gratuit",
      videos: "6 vidéos/mois",
      features: [
        "6 vidéos par mois",
        "Format 9:16 et 16:9",
        "Synchronisation Google Drive",
        "Génération IA de prompts",
        "Support communautaire",
      ],
      cta: "Commencer",
      variant: "outline" as const,
      popular: false,
    },
    {
      name: "Pro",
      price: "100€",
      period: "par mois",
      videos: "50 vidéos/mois",
      features: [
        "50 vidéos par mois",
        "Tous les formats",
        "Synchronisation automatique",
        "Analyse de marque",
        "Génération avancée",
        "Support prioritaire",
      ],
      cta: "S'abonner",
      variant: "premium" as const,
      popular: true,
    },
    {
      name: "Business",
      price: "350€",
      period: "par mois",
      videos: "Illimité",
      features: [
        "Vidéos illimitées",
        "Tous les formats",
        "Synchronisation temps réel",
        "Analyse de marque avancée",
        "API dédiée",
        "Support dédié 24/7",
        "Personnalisation poussée",
      ],
      cta: "S'abonner",
      variant: "neon" as const,
      popular: false,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-dark">
      {/* Header */}
      <header className="border-b border-border bg-background/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src={logo} alt="Daft Funk" className="h-10 w-10" />
            <span className="text-2xl font-bold bg-gradient-gold bg-clip-text text-transparent">
              Daft Funk
            </span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost">Retour</Button>
            </Link>
            <Link to="/auth">
              <Button variant="premium">Commencer</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Pricing Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 space-y-4">
            <h1 className="text-4xl md:text-6xl font-bold">
              Choisissez votre{" "}
              <span className="bg-gradient-gold bg-clip-text text-transparent">
                plan
              </span>
            </h1>
            <p className="text-xl text-muted-foreground">
              Des tarifs simples et transparents pour tous vos besoins
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {plans.map((plan, index) => (
              <div
                key={index}
                className={`relative p-8 rounded-2xl bg-card border ${
                  plan.popular
                    ? "border-primary shadow-gold"
                    : "border-border"
                } hover:border-primary/50 transition-all`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="px-4 py-1 rounded-full bg-gradient-gold text-primary-foreground text-sm font-semibold shadow-gold">
                      Populaire
                    </span>
                  </div>
                )}

                <div className="space-y-6">
                  <div>
                    <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-bold">{plan.price}</span>
                      <span className="text-muted-foreground">{plan.period}</span>
                    </div>
                    <p className="text-sm text-primary mt-2 font-semibold">
                      {plan.videos}
                    </p>
                  </div>

                  <ul className="space-y-3">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        <span className="text-sm text-foreground/90">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Link to="/auth" className="block">
                    <Button variant={plan.variant} className="w-full" size="lg">
                      {plan.cta}
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-16 text-center">
            <p className="text-muted-foreground mb-6">
              Tous les plans incluent l'accès à la plateforme et la synchronisation Google Drive
            </p>
            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <span className="flex items-center gap-2">
                <Check className="h-4 w-4 text-accent" />
                Pas de période d'engagement
              </span>
              <span className="flex items-center gap-2">
                <Check className="h-4 w-4 text-accent" />
                Résiliation à tout moment
              </span>
              <span className="flex items-center gap-2">
                <Check className="h-4 w-4 text-accent" />
                Support en français
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Pricing;
