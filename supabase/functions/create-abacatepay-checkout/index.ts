import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function respond(payload: Record<string, unknown>) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("ABACATEPAY_API_KEY");
    if (!apiKey) return respond({ ok: false, error: "ABACATEPAY_API_KEY não configurada." });

    const { productName, priceInCents, buyerEmail } = await req.json();
    if (!productName || !priceInCents || !buyerEmail) {
      return respond({ ok: false, error: "Dados incompletos para checkout." });
    }

    const origin = req.headers.get("origin") || "https://zxmax-digital.lovable.app";

    const billingPayload = {
      frequency: "ONE_TIME",
      methods: ["PIX"],
      products: [
        {
          externalId: `product_${Date.now()}`,
          name: productName,
          quantity: 1,
          price: priceInCents,
        },
      ],
      returnUrl: `${origin}/?payment=success`,
      completionUrl: `${origin}/?payment=success`,
      customer: {
        name: buyerEmail.split("@")[0] || "Comprador",
        email: buyerEmail,
      },
    };

    const response = await fetch("https://api.abacatepay.com/v1/billing/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify(billingPayload),
    });

    const data = await response.json();

    if (!response.ok) {
      return respond({
        ok: false,
        error: data.error || data.message || "Erro ao criar cobrança AbacatePay.",
        diagnostics: {
          stage: "billing_create",
          status: response.status,
          payload: billingPayload,
          response: data,
        },
      });
    }

    const url = data.url || data.data?.url;
    if (!url) {
      return respond({
        ok: false,
        error: "A AbacatePay não retornou a URL de checkout.",
        diagnostics: {
          stage: "billing_response",
          response: data,
        },
      });
    }

    return respond({ ok: true, success: true, url });
  } catch (error: any) {
    console.error("AbacatePay checkout error:", error);
    return respond({ ok: false, error: error?.message || "Erro interno no checkout AbacatePay." });
  }
});
