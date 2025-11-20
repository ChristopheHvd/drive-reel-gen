import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RequestSchema = z.object({
  websiteUrl: z.string().optional().or(z.literal("")),
  instagramUrl: z.string().optional().or(z.literal("")),
  userId: z.string().uuid().optional(),
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    
    // Validation OBLIGATOIRE
    const result = RequestSchema.safeParse(body);
    if (!result.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid data', details: result.error }), 
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { websiteUrl, instagramUrl, userId } = result.data;

    // Filtrer les chaînes vides
    const validWebsiteUrl = websiteUrl && websiteUrl.trim() !== "" ? websiteUrl : undefined;
    const validInstagramUrl = instagramUrl && instagramUrl.trim() !== "" ? instagramUrl : undefined;

    // Vérifier qu'au moins une URL est fournie
    if (!validWebsiteUrl && !validInstagramUrl) {
      return new Response(
        JSON.stringify({ error: 'Au moins une URL (site web ou Instagram) est requise pour l\'analyse' }), 
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Analyzing brand for:', { validWebsiteUrl, validInstagramUrl, userId });

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Get the authorization header to authenticate the user
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from the JWT token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error('Error getting user:', userError);
      throw new Error('Unauthorized');
    }

    console.log('User authenticated:', user.id);

    // Call Lovable AI to analyze the brand
    const sources = [];
    if (validWebsiteUrl) sources.push(`Site web: ${validWebsiteUrl}`);
    if (validInstagramUrl) sources.push(`Instagram: ${validInstagramUrl}`);
    
    const prompt = `Tu es un expert en analyse de marque et en marketing. Analyse cette entreprise à partir des sources suivantes:

${sources.join('\n')}

Fournis une analyse détaillée au format JSON avec les champs suivants:
- business_description: Une description détaillée de l'activité de l'entreprise (2-3 phrases)
- target_audience: Description précise de l'audience cible
- brand_values: Un tableau de 3-5 valeurs clés de la marque (ex: ["innovation", "qualité", "durabilité"])
- visual_identity: Un objet décrivant l'identité visuelle avec:
  - colors: tableau des couleurs principales (hex codes si possible)
  - style: description du style visuel (ex: "moderne et minimaliste")
  - imagery: type d'images utilisées (ex: "photos authentiques de produits")
- tone_of_voice: Description du ton de communication (ex: "professionnel et accessible")

Réponds UNIQUEMENT avec le JSON, sans texte additionnel.`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI gateway error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), 
          {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required. Please add credits to your Lovable AI workspace.' }), 
          {
            status: 402,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      
      throw new Error('AI gateway error');
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content;
    
    if (!aiContent) {
      throw new Error('No content from AI');
    }

    console.log('AI response:', aiContent);

    // Parse the JSON response from AI
    let brandData;
    try {
      // Remove markdown code blocks if present
      const jsonContent = aiContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      brandData = JSON.parse(jsonContent);
    } catch (e) {
      console.error('Failed to parse AI response as JSON:', e);
      throw new Error('Invalid JSON response from AI');
    }

    // Get or create brand profile
    const { data: existingProfile } = await supabase
      .from('brand_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    const brandProfileData = {
      user_id: user.id,
      company_name: brandData.company_name || 'Company', // fallback
      website_url: websiteUrl,
      business_description: brandData.business_description,
      target_audience: brandData.target_audience || null,
      brand_values: brandData.brand_values,
      visual_identity: brandData.visual_identity,
      tone_of_voice: brandData.tone_of_voice,
      analyzed_at: new Date().toISOString(),
    };

    if (existingProfile) {
      // Update existing profile
      const { error: updateError } = await supabase
        .from('brand_profiles')
        .update(brandProfileData)
        .eq('id', existingProfile.id);

      if (updateError) {
        console.error('Error updating brand profile:', updateError);
        throw updateError;
      }
    } else {
      // Create new profile
      const { error: insertError } = await supabase
        .from('brand_profiles')
        .insert(brandProfileData);

      if (insertError) {
        console.error('Error creating brand profile:', insertError);
        throw insertError;
      }
    }

    // Auto-save if userId is provided
    if (userId) {
      const brandProfileData = {
        user_id: userId,
        business_description: brandData.business_description,
        target_audience: brandData.target_audience || null,
        brand_values: brandData.brand_values,
        visual_identity: brandData.visual_identity,
        tone_of_voice: brandData.tone_of_voice,
        analyzed_at: new Date().toISOString(),
      };

      const { error: updateError } = await supabase
        .from('brand_profiles')
        .update(brandProfileData)
        .eq('user_id', userId);

      if (updateError) {
        console.error('Error auto-saving brand profile:', updateError);
      } else {
        console.log('Brand profile auto-saved successfully');
      }
    }

    console.log('Brand profile saved successfully');

    return new Response(
      JSON.stringify({ 
        success: true,
        data: brandData
      }), 
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in analyze-brand function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});