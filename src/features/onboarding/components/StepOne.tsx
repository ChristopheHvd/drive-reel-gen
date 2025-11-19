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
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const formSchema = z.object({
  companyName: z.string().min(2, "Le nom de l'entreprise doit contenir au moins 2 caractères"),
  websiteUrl: z.string().url("URL invalide").optional().or(z.literal("")),
  businessDescription: z.string().optional(),
  targetAudience: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface StepOneProps {
  onComplete: () => void;
}

const StepOne = ({ onComplete }: StepOneProps) => {
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

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const brandData = data.data;
      if (brandData) {
        form.setValue("businessDescription", brandData.business_description || "");
        form.setValue("targetAudience", brandData.target_audience || "");
        toast.success("Analyse terminée !");
      }
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

      const { error } = await supabase
        .from('brand_profiles')
        .upsert({
          user_id: user.id,
          company_name: values.companyName,
          website_url: values.websiteUrl,
          business_description: values.businessDescription,
          target_audience: values.targetAudience,
        });

      if (error) throw error;

      if (values.websiteUrl) {
        await handleAnalyzeBrand();
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
                  <Input placeholder="ex: Ma Super Entreprise" {...field} />
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
                <FormControl>
                  <Input type="url" placeholder="https://monentreprise.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="button"
            variant="outline"
            onClick={handleAnalyzeBrand}
            disabled={!form.watch("websiteUrl") || isAnalyzing}
            className="w-full"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyse en cours...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Analyser avec IA
              </>
            )}
          </Button>

          <FormField
            control={form.control}
            name="businessDescription"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description de l'activité</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Décrivez votre activité..."
                    className="resize-none min-h-[100px]"
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
                    placeholder="Décrivez votre audience cible..."
                    className="resize-none min-h-[80px]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Continuer
          </Button>
        </form>
      </Form>
    </div>
  );
};

export default StepOne;
