import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import logo from "@/assets/daft-funk-logo.png";
import { BrandSettingsDialog } from "@/features/brand";

const Dashboard = () => {
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
          <div className="flex items-center gap-4">
            <div className="hidden md:block">
              <div className="px-4 py-2 rounded-lg bg-card border border-border">
                <span className="text-sm text-muted-foreground">Plan: </span>
                <span className="text-sm font-semibold text-primary">Free</span>
                <span className="text-sm text-muted-foreground ml-2">• 6/6 vidéos</span>
              </div>
            </div>
            <BrandSettingsDialog trigger={<Button variant="outline" size="sm">Paramètres</Button>} />
          </div>
        </div>
      </header>

      {/* Dashboard Content - 3 columns layout */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-12 gap-6 h-[calc(100vh-120px)]">
          {/* Left Sidebar - Images */}
          <div className="col-span-3 bg-card border border-border rounded-xl p-4 overflow-y-auto">
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Images</h2>
                <Button variant="outline" size="sm">Dossier</Button>
              </div>
              
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-sm">Connectez Google Drive pour voir vos images</p>
                <Button variant="premium" size="sm" className="mt-4">
                  Connecter Drive
                </Button>
              </div>
            </div>
          </div>

          {/* Center - Media Gallery */}
          <div className="col-span-6 bg-card border border-border rounded-xl p-6 overflow-y-auto">
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-4 text-muted-foreground">
                <div className="h-24 w-24 rounded-full bg-gradient-gold/10 border border-primary/30 flex items-center justify-center mx-auto">
                  <svg className="h-12 w-12 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p>Sélectionnez une image pour commencer</p>
              </div>
            </div>
          </div>

          {/* Right Sidebar - Video Generation */}
          <div className="col-span-3 bg-card border border-border rounded-xl p-4 overflow-y-auto">
            <div className="space-y-4">
              <h2 className="text-lg font-semibold mb-4">Génération</h2>
              
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-sm">Sélectionnez une image pour configurer la génération</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
