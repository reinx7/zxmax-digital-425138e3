import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Evopay checkout request received");
    
    const apiKey = Deno.env.get("EVOPAY_API_KEY");
    if (!apiKey) {
      console.error("EVOPAY_API_KEY not configured");
      throw new Error("EVOPAY_API_KEY não configurada");
    }
    
    console.log("API Key found, processing request...");

    const { productName, priceInCents, buyerEmail, buyerName } = await req.json();
    console.log("Request data:", { productName, priceInCents, buyerEmail, buyerName });
    
    if (!productName || !priceInCents || !buyerEmail) {
      console.error("Incomplete data:", { productName, priceInCents, buyerEmail });
      throw new Error("Dados incompletos para checkout");
    }

    const origin = req.headers.get("origin") || "https://zxmax-digital-uqwt.onrender.com";
    console.log("Using origin:", origin);

    // Converter centavos para reais (Evopay espera o valor em reais como float)
    const priceInReais = priceInCents / 100;

    // Criar transação Pix via Evopay
    const payload = {
      amount: priceInReais,
      callbackUrl: `${origin}/api/evopay-callback`,
      payerName: buyerName || buyerEmail.split("@")[0],
      payerEmail: buyerEmail,
      payerDocument: "00000000000", // Placeholder - pode ser coletado do usuário
    };

    console.log("Sending payload to Evopay:", JSON.stringify(payload, null, 2));

    const response = await fetch("https://pix.evopay.cash/v1/pix", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "API-Key": apiKey,
      },
      body: JSON.stringify(payload),
    });

    console.log("Evopay response status:", response.status);
    
    const data = await response.json();
    console.log("Evopay response data:", JSON.stringify(data, null, 2));

    if (!response.ok) {
      console.error("Evopay API error:", data);
      const errorMessage = data.error?.message || data.error || data.message || "Erro ao criar transação Evopay";
      throw new Error(`Evopay Error (${response.status}): ${errorMessage}`);
    }

    // Evopay retorna um QR code que pode ser exibido
    // Para redirecionamento, usamos a URL do QR code ou criamos uma página de checkout
    const qrCodeUrl = data.qrCodeUrl || data.qrCodeBase64;
    const transactionId = data.id;
    
    if (!qrCodeUrl && !transactionId) {
      console.error("No QR code or transaction ID in response:", data);
      throw new Error("Nenhuma informação de pagamento retornada pela Evopay");
    }

    console.log("Transaction created successfully:", { transactionId, qrCodeUrl });
    
    // Retornar dados para o frontend exibir o QR code
    return new Response(JSON.stringify({ 
      transactionId,
      qrCodeUrl,
      qrCodeBase64: data.qrCodeBase64,
      qrCodeText: data.qrCodeText,
      amount: data.amount,
      status: data.status,
      // Criar URL de redirecionamento que exibe o QR code
      url: `${origin}/?payment=pending&txId=${transactionId}`,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("Evopay checkout error:", error.message || error);
    console.error("Full error:", error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || "Erro desconhecido ao criar checkout",
        details: error.toString()
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" }, 
        status: 400 
      },
    );
  }
});
