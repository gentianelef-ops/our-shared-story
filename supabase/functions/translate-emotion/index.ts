// Edge function: translate a raw sentence into a NVC-structured statement.
// Uses Lovable AI Gateway (LOVABLE_API_KEY auto-injected).
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { raw, pactRules } = await req.json();
    if (!raw || typeof raw !== "string") {
      return new Response(JSON.stringify({ error: "raw text required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const pactBlock = Array.isArray(pactRules) && pactRules.length
      ? `\nVoici le pacte (les règles que ce couple s'est données) :\n${pactRules.map((r: string, i: number) => `${i + 1}. ${r}`).join("\n")}\n\nSi la situation décrite résonne avec une de ces règles, fais-y discrètement écho dans le besoin exprimé.`
      : "";

    const systemPrompt = `Tu es un traducteur expert en Communication Non Violente (CNV de Marshall Rosenberg). Ton rôle: transformer une phrase brute, souvent accusatrice ou descriptive, en une formulation CNV pure, douce mais directe, en français, à la première personne.

Structure obligatoire: "Quand [observation factuelle, neutre, sans jugement], je me suis senti·e [émotion précise], parce que j'avais besoin de [besoin universel sous-jacent]."

Règles strictes:
- Identifie UNE émotion précise (ex: invisible, mise de côté, pas prioritaire, anxieux·se, en colère, déçu·e, vulnérable, abandonné·e, méprisé·e, débordé·e, seul·e). Pas de mots vagues comme "mal" ou "pas bien".
- Identifie UN besoin universel sous-jacent (ex: être vu·e, compter, connexion, sécurité, reconnaissance, considération, autonomie, repos, tendresse physique, fiabilité, écoute).
- L'observation reformule les FAITS sans interprétation ni jugement. Pas de "tu fais toujours" ou "tu ne fais jamais".
- Ne répète pas la phrase brute. Reformule.
- Une seule phrase, pas de préambule, pas d'explication, pas de guillemets.${pactBlock}

Exemples:
Brut: "il m'a pas fait de bisous pour dire au revoir"
CNV: "Quand tu es parti sans m'embrasser, je me suis sentie invisible, parce que j'avais besoin de me sentir importante pour toi."

Brut: "elle est encore sur son téléphone à table"
CNV: "Quand tu regardes ton téléphone pendant le dîner, je me sens mis de côté, parce que j'ai besoin de présence et de connexion partagée."

Brut: "tu m'écoutes jamais quand je parle de mon travail"
CNV: "Quand je te raconte ma journée et que tu réponds en regardant ailleurs, je me sens pas entendu, parce que j'ai besoin de compter pour toi."`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Phrase brute: ${raw}\n\nRends UNIQUEMENT la phrase CNV, rien d'autre.` },
        ],
      }),
    });

    if (response.status === 429) {
      return new Response(JSON.stringify({ error: "Trop de demandes — patiente une minute." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (response.status === 402) {
      return new Response(JSON.stringify({ error: "Crédits IA épuisés. Ajoute des crédits dans Workspace > Usage." }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!response.ok) {
      const t = await response.text();
      console.error("AI gateway error", response.status, t);
      return new Response(JSON.stringify({ error: "Le traducteur ne répond pas." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const reformulated = data.choices?.[0]?.message?.content?.trim() ?? "";
    return new Response(JSON.stringify({ reformulated }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("translate-emotion error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erreur inconnue" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
