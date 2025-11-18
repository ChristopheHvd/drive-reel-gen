import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  company_name: z.string().min(1, "Le nom de l'entreprise est requis"),
  website_url: z.string().url("URL invalide").optional().or(z.literal("")),
  business_description: z.string().min(10, "Minimum 10 caractères"),
  target_audience: z.string().min(5, "Minimum 5 caractères"),
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
      company_name: "",
      website_url: "",
      business_description: "",
      target_audience: "",
    },
  });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      // Insert brand profile
      const { error: brandError } = await supabase
        .from("brand_profiles")
        .insert({
          user_id: user.id,
          company_name: data.company_name,
          website_url: data.website_url || null,
          business_description: data.business_description,
          target_audience: data.target_audience,
        });

      if (brandError) throw brandError;

      toast.success("Informations enregistrées avec succès");

      // Trigger brand analysis if website URL is provided
      if (data.website_url) {
        toast.info("Analyse de votre marque en cours...");
        
        // Call analyze-brand edge function
        const { error: analyzeError } = await supabase.functions.invoke('analyze-brand', {
          body: { websiteUrl: data.website_url }
        });

        if (analyzeError) {
          console.error('Error analyzing brand:', analyzeError);
          toast.error("L'analyse de la marque a échoué, mais vos informations sont sauvegardées");
        } else {
          toast.success("Analyse de la marque terminée !");
        }
      }

      onComplete();
    } catch (error: any) {
      console.error("Error saving brand profile:", error);
      toast.error(error.message || "Erreur lors de l'enregistrement");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-2">Parlez-nous de votre entreprise</h2>
      <p className="text-muted-foreground mb-6">
        Ces informations nous aideront à créer des vidéos parfaitement alignées avec votre marque
      </p>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="company_name"
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
            name="website_url"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Site web</FormLabel>
                <FormControl>
                  <Input placeholder="https://votre-site.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="business_description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description de votre activité *</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Décrivez ce que fait votre entreprise..."
                    className="min-h-24"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="target_audience"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Audience cible *</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Qui sont vos clients principaux ?"
                    className="min-h-20"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enregistrement...
              </>
            ) : (
              "Continuer"
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
};

export default StepOne;