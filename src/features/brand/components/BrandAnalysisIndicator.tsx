import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBrandAnalysisStatus } from "../hooks/useBrandAnalysisStatus";

/**
 * Indicateur visuel du statut de l'analyse de marque
 * S'affiche à côté du bouton "Paramètres de marque"
 */
export const BrandAnalysisIndicator = () => {
  const { status, clearCompletedStatus } = useBrandAnalysisStatus();
  const [showCompleted, setShowCompleted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // Gérer l'affichage du statut "completed" puis sa disparition
  useEffect(() => {
    if (status === 'completed') {
      setShowCompleted(true);
      setIsVisible(true);
      
      // Disparaître après 5 secondes
      const timer = setTimeout(() => {
        setIsVisible(false);
        // Attendre la fin de l'animation avant de nettoyer
        setTimeout(() => {
          setShowCompleted(false);
          clearCompletedStatus();
        }, 300);
      }, 5000);

      return () => clearTimeout(timer);
    } else if (status === 'pending') {
      setIsVisible(true);
      setShowCompleted(false);
    } else if (status === 'failed') {
      setIsVisible(true);
      setShowCompleted(false);
    } else {
      setIsVisible(false);
    }
  }, [status, clearCompletedStatus]);

  if (!status && !showCompleted) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300",
        isVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2",
        status === 'pending' && "bg-primary/10 text-primary border border-primary/20",
        (status === 'completed' || showCompleted) && "bg-green-500/10 text-green-600 border border-green-500/20",
        status === 'failed' && "bg-destructive/10 text-destructive border border-destructive/20"
      )}
    >
      {status === 'pending' && (
        <>
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>Analyse en cours...</span>
        </>
      )}
      
      {(status === 'completed' || showCompleted) && (
        <>
          <CheckCircle2 className="w-3 h-3" />
          <span>Analyse terminée !</span>
        </>
      )}
      
      {status === 'failed' && (
        <>
          <AlertCircle className="w-3 h-3" />
          <span>Échec de l'analyse</span>
        </>
      )}
    </div>
  );
};
