import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook pour synchroniser les images depuis Google Drive
 * 
 * @returns {Object} État et méthode de synchronisation
 * @returns {boolean} isSyncing - Indique si la synchronisation est en cours
 * @returns {Function} syncDrive - Fonction pour lancer la synchronisation
 * 
 * @example
 * ```tsx
 * const { syncDrive, isSyncing } = useDriveSync();
 * 
 * const handleSync = async () => {
 *   try {
 *     await syncDrive();
 *     toast.success('Synchronisation terminée !');
 *   } catch (error) {
 *     toast.error('Erreur lors de la synchronisation');
 *   }
 * };
 * ```
 */
export const useDriveSync = () => {
  const [isSyncing, setIsSyncing] = useState(false);

  const syncDrive = useCallback(async () => {
    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-google-drive', {
        body: { action: 'sync' }
      });

      if (error) {
        console.error('Error syncing drive:', error);
        throw error;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      return data;
    } catch (error) {
      console.error('Drive sync error:', error);
      throw error;
    } finally {
      setIsSyncing(false);
    }
  }, []);

  return {
    syncDrive,
    isSyncing,
  };
};
