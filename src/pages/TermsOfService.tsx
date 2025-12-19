import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/quickquick-logo.png";

const TermsOfService = () => {
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
          <Link to="/">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-3xl">
        <h1 className="text-4xl font-bold mb-8">Conditions Générales d'Utilisation</h1>

        <div className="space-y-8 text-foreground/90">
          <section>
            <h2 className="text-xl font-semibold mb-3 text-foreground">1. Objet</h2>
            <p>
              QuickQuick est un service de génération de vidéos promotionnelles à partir de photos 
              et prompts fournis par l'utilisateur.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-foreground">2. Inscription</h2>
            <p>
              L'utilisateur crée un compte via email/mot de passe ou Google OAuth. 
              L'identité Google n'est utilisée que pour l'authentification.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-foreground">3. Utilisation du service</h2>
            <p className="mb-3">Sont interdits :</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Contenus illégaux</li>
              <li>Harcèlement, haine, discrimination</li>
              <li>Contenus violents ou sexuels</li>
              <li>Usurpation d'identité, spam</li>
              <li>Tentatives d'attaque, reverse engineering</li>
            </ul>
            <p className="mt-3">Le service peut suspendre un compte en cas d'abus.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-foreground">4. Propriété intellectuelle</h2>
            <p className="mb-2">
              L'utilisateur conserve la propriété de ses photos et contenus fournis. 
              Les vidéos générées lui sont entièrement cédées.
            </p>
            <p>
              Le code, UI et éléments du service restent la propriété de QuickQuick.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-foreground">5. Paiement & Remboursement</h2>
            <p>
              Les abonnements sont gérés par Stripe. Aucun remboursement n'est possible 
              après activation de l'abonnement.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-foreground">6. Limitation de responsabilité</h2>
            <p className="mb-3">
              Le service ne garantit pas une disponibilité continue. 
              Aucune responsabilité n'est assumée pour :
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Pertes de données</li>
              <li>Mauvaise utilisation des vidéos</li>
            </ul>
            <p className="mt-3">
              Les vidéos étant stockées sur serveur tiers, l'utilisateur doit les télécharger et les conserver.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-foreground">7. Données & Confidentialité</h2>
            <p>
              Voir la{" "}
              <Link to="/privacy" className="text-primary hover:underline">
                Politique de Confidentialité
              </Link>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-foreground">8. Contact</h2>
            <div className="space-y-1">
              <p className="font-medium">Alpes IA – Christophe Havard</p>
              <p>SIRET 80123605000036</p>
              <p>23B impasse de la Fillière, 74370 Fillière</p>
              <p>
                Email :{" "}
                <a 
                  href="mailto:christophe@alpes-ia.fr" 
                  className="text-primary hover:underline"
                >
                  christophe@alpes-ia.fr
                </a>
              </p>
            </div>
          </section>
        </div>
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
              <Link 
                to="/terms"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Conditions d'utilisation
              </Link>
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

export default TermsOfService;