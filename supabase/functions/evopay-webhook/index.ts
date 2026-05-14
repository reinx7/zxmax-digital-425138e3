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
    const body = await req.json();
    const { id, status, amount } = body;

    console.log("Evopay webhook received:", JSON.stringify({ id, status, amount }));

    if (status !== "COMPLETED") {
      return new Response(JSON.stringify({ received: true, processed: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Find the purchase with this Evopay transaction ID in messages
    const { data: purchases, error: fetchError } = await supabaseAdmin
      .from("purchases")
      .select("id, product_id, buyer_id, seller_id, amount, status, messages")
      .eq("status", "pending");

    if (fetchError) {
      console.error("Error fetching purchases:", fetchError);
      throw fetchError;
    }

    let matchedPurchase: any = null;
    for (const p of purchases || []) {
      const msgs = p.messages || [];
      const systemMsg = msgs.find((m: any) =>
        m.from === "System" && m.text === `PAGAMENTO_EVOPAY:${id}`
      );
      if (systemMsg) {
        matchedPurchase = p;
        break;
      }
    }

    if (!matchedPurchase) {
      console.log("No matching purchase found for transaction:", id);
      return new Response(JSON.stringify({ received: true, processed: false, reason: "no_match" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Get product info for delivery
    const { data: product } = await supabaseAdmin
      .from("products")
      .select("id, delivery_type, delivery_content, seller_id")
      .eq("id", matchedPurchase.product_id)
      .maybeSingle();

    const isAuto = product?.delivery_type === "auto" && product?.delivery_content;
    const newStatus = isAuto ? "delivered" : "paid";

    // Update purchase status
    const newMessages = [
      ...(matchedPurchase.messages || []).filter((m: any) => !m.text?.startsWith("PAGAMENTO_EVOPAY:")),
      { from: "System", text: "Pagamento confirmado via Pix!", date: new Date().toISOString() },
    ];

    if (isAuto && product?.delivery_content) {
      newMessages.push({
        from: "System",
        text: `ENTREGA_AUTO: ${product.delivery_content}`,
        date: new Date().toISOString(),
      });
    }

    const { error: updateError } = await supabaseAdmin
      .from("purchases")
      .update({
        status: newStatus,
        messages: newMessages,
      })
      .eq("id", matchedPurchase.id);

    if (updateError) {
      console.error("Error updating purchase:", updateError);
      throw updateError;
    }

    // Increment product sales
    await supabaseAdmin.rpc("increment_product_sales", { product_id: matchedPurchase.product_id });

    // Credit seller balance (commission deducted)
    const { data: configData } = await supabaseAdmin
      .from("admin_config")
      .select("value")
      .eq("key", "commission")
      .maybeSingle();

    const commission = configData ? parseFloat(configData.value) : 10;
    const sellerNet = Math.max(0, matchedPurchase.amount - (matchedPurchase.amount * commission) / 100);

    // Update seller profile balance
    const { data: sellerProfile } = await supabaseAdmin
      .from("profiles")
      .select("user_id, balance, earnings")
      .eq("user_id", matchedPurchase.seller_id)
      .maybeSingle();

    if (sellerProfile) {
      const newBalance = (sellerProfile.balance || 0) + sellerNet;
      const newEarnings = (sellerProfile.earnings || 0) + sellerNet;
      await supabaseAdmin
        .from("profiles")
        .update({ balance: newBalance, earnings: newEarnings })
        .eq("user_id", matchedPurchase.seller_id);
    }

    console.log("Purchase confirmed and seller credited:", matchedPurchase.id);

    return new Response(JSON.stringify({ received: true, processed: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("Evopay webhook error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
