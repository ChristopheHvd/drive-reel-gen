import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";

const formSchema = z.object({
  companyName: z.string().min(2, "Le nom de l'entreprise doit contenir au moins 2 caractères"),
  websiteUrl: z.string().url("URL invalide").optional().or(z.literal("")),
  businessDescription: z.string().optional(),
  targetAudience: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface BrandSettingsDialogProps {
  trigger?: React.ReactNode;
}

export const BrandSettingsDialog = ({ trigger }: BrandSettingsDialogProps) => {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      companyName: "",
      websiteUrl: "",
      businessDescription: "",
      targetAudience: "",
    },
  });

  // Load existing brand profile when dialog opens
  const loadBrandProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile, error } = await supabase
        .from('brand_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error loading brand profile:', error);
        return;
      }

      if (profile) {
        form.reset({
          companyName: profile.company_name || "",
          websiteUrl: profile.website_url || "",
          businessDescription: profile.business_description || "",
          targetAudience: profile.target_audience || "",
        });
      }
    } catch (error) {
      console.error('Error loading brand profile:', error);
    }
  };

  const handleAnalyzeBrand = async () => {
    const websiteUrl = form.getValues("websiteUrl");
    
    if (!websiteUrl) {
      toast.error("Veuillez entrer l'URL du site web");
      return;
    }

    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-brand', {
        body: { websiteUrl }
      });

      if (error) {
        console.error('Error analyzing brand:', error);
        throw error;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      toast.success("Analyse de la marque terminée !");
      
      // Reload the brand profile to get the updated data
      await loadBrandProfile();
      
    } catch (error) {
      console.error('Error:', error);
      toast.error(error instanceof Error ? error.message : "Erreur lors de l'analyse");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const onSubmit = async (values: FormData) => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      // Get existing profile
      const { data: existingProfile } = await supabase
        .from('brand_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      const profileData = {
        user_id: user.id,
        company_name: values.companyName,
        website_url: values.websiteUrl || null,
        business_description: values.businessDescription || null,
        target_audience: values.targetAudience || null,
      };

      if (existingProfile) {
        // Update
        const { error } = await supabase
          .from('brand_profiles')
          .update(profileData)
          .eq('id', existingProfile.id);

        if (error) throw error;
      } else {
        // Insert
        const { error } = await supabase
          .from('brand_profiles')
          .insert(profileData);

        if (error) throw error;
      }

      toast.success("Paramètres de marque mis à jour !");
      setOpen(false);
    } catch (error) {
      console.error('Error saving brand settings:', error);
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      setOpen(newOpen);
      if (newOpen) {
        loadBrandProfile();
      }
    }}>
      <DialogTrigger asChild>
        {trigger || <Button variant="outline">Paramètres de marque</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Paramètres de marque</DialogTitle>
          <DialogDescription>
            Gérez les informations de votre marque pour générer des vidéos personnalisées
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="companyName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom de l'entreprise</FormLabel>
                  <FormControl>
                    <Input placeholder="Votre entreprise" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="websiteUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Site web</FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <Input 
                        placeholder="https://votre-site.com" 
                        {...field} 
                      />
                    </FormControl>
                    <Button
                      type="button"
                      variant="premium"
                      size="sm"
                      onClick={handleAnalyzeBrand}
                      disabled={isAnalyzing || !field.value}
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Analyse...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Analyser
                        </>
                      )}
                    </Button>
                  </div>
                  <FormDescription>
                    Cliquez sur "Analyser" pour extraire automatiquement les infos de votre marque
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="businessDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description de l'activité</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Décrivez votre activité..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="targetAudience"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Audience cible</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Qui sont vos clients ?"
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setOpen(false)}
                disabled={isLoading}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Enregistrement...
                  </>
                ) : (
                  "Enregistrer"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};