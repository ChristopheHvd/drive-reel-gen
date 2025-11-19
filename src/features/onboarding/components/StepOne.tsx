import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const formSchema = z.object({
  companyName: z.string().min(2, "Le nom de l'entreprise doit contenir au moins 2 caractères"),
  websiteUrl: z.string().url("URL invalide").optional().or(z.literal("")),
  instagramUrl: z.string().url("URL Instagram invalide").optional().or(z.literal("")),
});

type FormData = z.infer<typeof formSchema>;

interface StepOneProps {
  onComplete: () => void;
}

const StepOne = ({ onComplete }: StepOneProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      companyName: "",
      websiteUrl: "",
      instagramUrl: "",
    },
  });

  const triggerBrandAnalysis = async (websiteUrl?: string, instagramUrl?: string, userId?: string) => {
    await supabase.functions.invoke('analyze-brand', {
      body: { 
        websiteUrl,
        instagramUrl,
        userId 
      }
    });
  };

  const onSubmit = async (values: FormData) => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { error } = await supabase
        .from('brand_profiles')
        .upsert({
          user_id: user.id,
          company_name: values.companyName,
          website_url: values.websiteUrl,
          instagram_url: values.instagramUrl,
        });

      if (error) throw error;

      // Déclencher l'analyse IA en BACKGROUND (sans await)
      if (values.websiteUrl || values.instagramUrl) {
        triggerBrandAnalysis(values.websiteUrl, values.instagramUrl, user.id)
          .catch(err => console.error('Background analysis error:', err));
      }

      toast.success("Profil créé avec succès !");
      onComplete();
    } catch (error) {
      console.error('Error:', error);
      toast.error("Erreur lors de la création du profil");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      await supabase
        .from('brand_profiles')
        .upsert({
          user_id: user.id,
          company_name: "Mon Entreprise",
        });

      toast.success("Étape passée !");
      onComplete();
    } catch (error) {
      console.error('Error:', error);
      toast.error("Erreur lors de la configuration");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Informations de l'entreprise</h2>
        <p className="text-muted-foreground">
          Commencez par nous parler de votre entreprise
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="companyName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nom de l'entreprise *</FormLabel>
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
                <FormLabel>Site web (optionnel)</FormLabel>
                <FormControl>
                  <Input placeholder="https://votre-site.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="instagramUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Instagram (optionnel)</FormLabel>
                <FormControl>
                  <Input placeholder="https://instagram.com/votre_entreprise" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex gap-4">
            <Button
              type="button"
              variant="ghost"
              onClick={handleSkip}
              className="flex-1"
              disabled={isLoading}
            >
              Passer cette étape
            </Button>
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Chargement...
                </>
              ) : (
                'Continuer'
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default StepOne;
