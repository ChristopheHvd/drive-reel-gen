import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DriveFolder, ConnectFolderDto } from "../types";

/**
 * Hook pour gérer les dossiers Google Drive connectés
 * 
 * @returns {Object} État et méthodes des dossiers Drive
 * @returns {DriveFolder | null} folder - Dossier connecté
 * @returns {boolean} loading - Indique si le chargement est en cours
 * @returns {Error | null} error - Erreur éventuelle
 * @returns {Function} connectFolder - Fonction pour connecter un nouveau dossier
 * @returns {Function} loadFolder - Fonction pour recharger le dossier
 * 
 * @example
 * ```tsx
 * const { folder, loading, connectFolder } = useDriveFolders();
 * 
 * const handleConnect = async (folderId: string, folderName: string) => {
 *   await connectFolder({ folderId, folderName });
 * };
 * ```
 */
export const useDriveFolders = () => {
  const [folder, setFolder] = useState<DriveFolder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadFolder = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("Non authentifié");
      }

      const { data: driveFolder, error: fetchError } = await supabase
        .from('drive_folders')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      setFolder(driveFolder);
    } catch (err) {
      setError(err as Error);
      console.error('Error loading drive folder:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const connectFolder = useCallback(async (data: ConnectFolderDto) => {
    try {
      setLoading(true);
      setError(null);

      const { data: responseData, error: invokeError } = await supabase.functions.invoke(
        'sync-google-drive',
        {
          body: {
            folderId: data.folderId,
            folderName: data.folderName,
            action: 'connect',
          },
        }
      );

      if (invokeError) throw invokeError;
      if (responseData?.error) throw new Error(responseData.error);

      await loadFolder();
    } catch (err) {
      setError(err as Error);
      console.error('Error connecting folder:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loadFolder]);

  useEffect(() => {
    loadFolder();
  }, [loadFolder]);

  return {
    folder,
    loading,
    error,
    connectFolder,
    loadFolder,
  };
};
