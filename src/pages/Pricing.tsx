import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Gift, Sparkles, Star, Building2 } from "lucide-react";
import logo from "@/assets/quickquick-logo.png";
import { useAuth } from "@/features/auth";

const Pricing = () => {
  const { user } = useAuth();

  const plans = [
    {
      name: "Free",
      price: "0€",
      period: "",
      icon: Gift,
      features: [
        "6 vidéos",
        "Format 9:16 et 16:9",
        "Support communautaire",
        "Watermark QuickQuick ??",
      ],
      cta: "Commencer",
      variant: "outline" as const,
      popular: false,
      includesPrevious: null,
    },
    {
      name: "Starter",
      price: "29€",
      period: "/mois",
      icon: Sparkles,
      features: [
        "20 vidéos par mois*",
        "Brand Kit",
        "Upload illimité",
        "Tous les formats : 8sec, 16sec, 24sec",
      ],
      cta: "S'abonner",
      variant: "outline" as const,
      popular: false,
      includesPrevious: null,
    },
    {
      name: "Pro",
      price: "79€",
      period: "/mois",
      icon: Star,
      features: [
        "Vidéos illimitées*",
        "Multi-utilisateur",
        "Support email",
      ],
      cta: "S'abonner",
      variant: "premium" as const,
      popular: true,
      includesPrevious: "Tout de Starter +",
    },
    {
      name: "Business",
      price: "199€",
      period: "/mois",
      icon: Building2,
      features: [
        "API access",
        "Formation équipe",
        "Support dédié",
      ],
      cta: "S'abonner",
      variant: "outline" as const,
      popular: false,
      includesPrevious: "Tout de Pro +",
    },
  ];

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
          <nav className="flex items-center gap-4">
            <Link to={user ? "/app" : "/"}>
              <Button variant="ghost">Retour</Button>
            </Link>
            <Link to="/auth">
              <Button variant="premium">Commencer</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main>
        {/* Pricing Section */}
        <section className="container mx-auto px-4 py-20">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h1 className="text-4xl md:text-5xl font-bold">
                <span className="bg-gradient-gold bg-clip-text text-transparent">
                  Des tarifs adaptés à chaque ambition
                </span>
              </h1>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {plans.map((plan, index) => {
                const IconComponent = plan.icon;
                return (
                  <div
                    key={index}
                    className={`relative rounded-xl overflow-hidden ${
                      plan.popular
                        ? "border-2 border-primary"
                        : "border border-border"
                    }`}
                  >
                    {/* Header with icon */}
                    <div
                      className={`flex items-center justify-center py-3 ${
                        plan.popular
                          ? "bg-primary"
                          : "bg-muted/30"
                      }`}
                    >
                      <IconComponent
                        className={`h-5 w-5 ${
                          plan.popular ? "text-primary-foreground" : "text-muted-foreground"
                        }`}
                      />
                    </div>

                    {/* Content */}
                    <div className="p-6 bg-card">
                      <div className="mb-4">
                        <h3 className="text-lg font-semibold text-foreground">
                          {plan.name}
                        </h3>
                        <div className="flex items-baseline">
                          <span className="text-2xl font-bold text-primary">
                            {plan.price}
                          </span>
                          <span className="text-muted-foreground text-sm">
                            {plan.period}
                          </span>
                        </div>
                      </div>

                      {plan.includesPrevious && (
                        <p className="text-sm text-foreground mb-3">
                          {plan.includesPrevious}
                        </p>
                      )}

                      <ul className="space-y-2">
                        {plan.features.map((feature, featureIndex) => (
                          <li
                            key={featureIndex}
                            className="flex items-start gap-2 text-sm text-muted-foreground"
                          >
                            <span className="text-muted-foreground">•</span>
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>

                      <Link to="/auth" className="block mt-6">
                        <Button
                          variant={plan.variant}
                          className="w-full"
                          size="default"
                        >
                          {plan.cta}
                        </Button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer note */}
            <div className="mt-8 text-center">
              <p className="text-sm text-muted-foreground italic">
                *considérez 2 à 3 itérations pour obtenir la{" "}
                <span className="underline text-primary">vidéo</span> parfaite.
                **dans un maximum de 500
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Pricing;
