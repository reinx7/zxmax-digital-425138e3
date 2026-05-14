import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("EVOPAY_API_KEY");
    if (!apiKey) {
      throw new Error("EVOPAY_API_KEY nao configurada");
    }

    const { productName, priceInCents, buyerEmail, buyerName, purchaseId } = await req.json();

    if (!productName || !priceInCents || !buyerEmail) {
      throw new Error("Dados incompletos para checkout");
    }

    if (priceInCents < 50) {
      throw new Error("Valor minimo para pagamento e R$ 0,50");
    }

    const priceInReais = priceInCents / 100;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const callbackUrl = `${supabaseUrl}/functions/v1/evopay-webhook`;

    const payload = {
      amount: priceInReais,
      callbackUrl,
      payerName: buyerName || buyerEmail.split("@")[0],
      payerEmail: buyerEmail,
      payerDocument: "00000000000",
    };

    const response = await fetch("https://pix.evopay.cash/v1/pix", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "API-Key": apiKey,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMessage = data.error?.message || data.error || data.message || "Erro ao criar transacao";
      throw new Error(`Evopay Error (${response.status}): ${errorMessage}`);
    }

    const transactionId = data.id;
    const qrCodeBase64 = data.qrCodeBase64;
    const qrCodeText = data.qrCodeText;

    if (!transactionId) {
      throw new Error("Nenhuma informacao de pagamento retornada pela Evopay");
    }

    // Store the transaction mapping in purchases table
    if (purchaseId) {
      await supabaseAdmin
        .from("purchases")
        .update({
          messages: [
            { from: "System", text: `PAGAMENTO_EVOPAY:${transactionId}`, date: new Date().toISOString() },
          ],
        })
        .eq("id", purchaseId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        transactionId,
        qrCodeBase64,
        qrCodeText,
        amount: data.amount,
        status: data.status,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Erro desconhecido ao criar checkout",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
