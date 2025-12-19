import { useForm } from "react-hook-form";
import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import { BrandFormData } from "../types";

const formSchema = z.object({
  companyName: z.string().min(2, "Le nom de l'entreprise doit contenir au moins 2 caractères"),
  websiteUrl: z.string().url("URL invalide").optional().or(z.literal("")),
  instagramUrl: z.string().url("URL Instagram invalide").optional().or(z.literal("")),
  businessDescription: z.string().optional(),
  targetAudience: z.string().optional(),
});

interface BrandFormProps {
  defaultValues?: Partial<BrandFormData>;
  onSubmit: (values: BrandFormData) => void | Promise<void>;
  children?: React.ReactNode;
}

/**
 * Formulaire de configuration de la marque
 * @param defaultValues - Valeurs par défaut du formulaire
 * @param onSubmit - Callback appelé lors de la soumission
 * @param children - Boutons d'action personnalisés
 */
export const BrandForm = ({ defaultValues, onSubmit, children }: BrandFormProps) => {
  const form = useForm<BrandFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      companyName: defaultValues?.companyName || "",
      websiteUrl: defaultValues?.websiteUrl || "",
      instagramUrl: defaultValues?.instagramUrl || "",
      businessDescription: defaultValues?.businessDescription || "",
      targetAudience: defaultValues?.targetAudience || "",
    },
  });

  // Synchroniser le formulaire quand les defaultValues changent (chargement async)
  useEffect(() => {
    if (defaultValues) {
      form.reset({
        companyName: defaultValues.companyName || "",
        websiteUrl: defaultValues.websiteUrl || "",
        instagramUrl: defaultValues.instagramUrl || "",
        businessDescription: defaultValues.businessDescription || "",
        targetAudience: defaultValues.targetAudience || "",
      });
    }
  }, [defaultValues, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="companyName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nom de l'entreprise</FormLabel>
              <FormControl>
                <Input
                  placeholder="ex: Ma Super Entreprise"
                  {...field}
                  className="bg-background"
                />
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
                <Input
                  type="url"
                  placeholder="https://monentreprise.com"
                  {...field}
                  className="bg-background"
                />
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
              <FormLabel>Instagram</FormLabel>
              <FormControl>
                <Input
                  type="url"
                  placeholder="https://instagram.com/mamarque"
                  {...field}
                  className="bg-background"
                />
              </FormControl>
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
                  className="resize-none bg-background min-h-[100px]"
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
                  className="resize-none bg-background min-h-[80px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {children}
      </form>
    </Form>
  );
};
