import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import logo from "@/assets/quickie-video-logo.png";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-gradient-dark">
      {/* Header */}
      <header className="border-b border-border bg-background/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src={logo} alt="Quickie Video" className="h-10 w-10" />
            <span className="text-2xl font-bold bg-gradient-gold bg-clip-text text-transparent">
              Quickie Video
            </span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost">Retour</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">Politique de Confidentialité</h1>
        
        <div className="prose prose-invert prose-lg max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-foreground">1. Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">
              QuickieVideo est un service fourni par la micro-entreprise Alpes IA – Christophe Havard 
              (SIRET 80123605000036). Le service permet aux utilisateurs d'uploader des photos et de 
              générer des vidéos promotionnelles. Cette politique décrit quelles données sont collectées, 
              comment elles sont utilisées et vos droits.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-foreground">2. Données collectées</h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Email</li>
              <li>Photo de profil Google</li>
              <li>Contenu utilisateur : photos, prompts, vidéos, nom de marque, lien Instagram, site web</li>
              <li>Logs techniques</li>
              <li>Données de facturation (via Stripe)</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              Aucune donnée sensible n'est collectée. Un cookie de session est utilisé.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-foreground">3. Utilisation des données</h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Authentification</li>
              <li>Fonctionnement du service</li>
              <li>Statistiques internes</li>
              <li>Support client</li>
              <li>Facturation</li>
              <li>Amélioration du produit</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              Les photos, le nom de marque et les prompts sont envoyés à Google Gemini pour générer 
              les vidéos. Les modèles n'utilisent pas vos données pour l'entraînement.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-foreground">4. Partage des données</h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Supabase (hébergement)</li>
              <li>Google AI (génération vidéo)</li>
              <li>Stripe (paiement)</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              Les données peuvent transiter hors UE (Google Gemini).
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-foreground">5. Conservation des données</h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Vidéos : supprimées automatiquement après 1 an</li>
              <li>Logs : 3 mois</li>
              <li>Données de facturation : 10 ans</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-foreground">6. Sécurité</h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Communications HTTPS</li>
              <li>Données accessibles uniquement à l'utilisateur et membres invités</li>
              <li>Modèles IA : aucune utilisation pour entraînement</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-foreground">7. Droits RGPD</h2>
            <p className="text-muted-foreground leading-relaxed">
              Vous disposez des droits d'accès, rectification, effacement, portabilité, opposition 
              et limitation. Vous pouvez contacter{" "}
              <a href="mailto:christophe@alpes-ia.fr" className="text-primary hover:underline">
                christophe@alpes-ia.fr
              </a>{" "}
              ou saisir la CNIL.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-foreground">8. Contact</h2>
            <div className="text-muted-foreground space-y-1">
              <p>Alpes IA – Christophe Havard</p>
              <p>23B impasse de la Fillière, 74370 Fillière</p>
              <p>
                Email :{" "}
                <a href="mailto:christophe@alpes-ia.fr" className="text-primary hover:underline">
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
              <img src={logo} alt="Quickie Video" className="h-8 w-8" />
              <span className="font-semibold text-foreground">Quickie Video</span>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <a 
                href="https://files.cloudron.alpes-ia.fr/AlpesIA/quickievideo_terms_of_service.pdf"
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
              © 2025 Quickie Video. Tous droits réservés.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PrivacyPolicy;
