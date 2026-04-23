import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

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
    const { code, redirectUri } = await req.json();
    if (!code) {
      return respond({ ok: false, error: "Código do Discord não enviado." });
    }

    const clientId = "1485093454517371070";
    const clientSecret = Deno.env.get("DISCORD_CLIENT_SECRET");
    if (!clientSecret) {
      return respond({ ok: false, error: "DISCORD_CLIENT_SECRET não configurado." });
    }

    const finalRedirectUri = redirectUri || "https://zxmax-digital.lovable.app/";

    const tokenRes = await fetch("https://discord.com/api/v10/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        code,
        redirect_uri: finalRedirectUri,
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || tokenData.error || !tokenData.access_token) {
      return respond({
        ok: false,
        error: `Discord token error: ${tokenData.error_description || tokenData.error || "Falha ao obter access token."}`,
        diagnostics: {
          stage: "token_exchange",
          status: tokenRes.status,
          redirectUri: finalRedirectUri,
        },
      });
    }

    const userRes = await fetch("https://discord.com/api/v10/users/@me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const discordUser = await userRes.json();

    if (!userRes.ok || !discordUser.id) {
      return respond({
        ok: false,
        error: "Falha ao buscar usuário do Discord.",
        diagnostics: {
          stage: "fetch_user",
          status: userRes.status,
        },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const email = discordUser.email || `discord_${discordUser.id}@zxmax.local`;
    const displayName = discordUser.global_name || discordUser.username || `Discord User ${discordUser.id}`;
    const avatarUrl = discordUser.avatar
      ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
      : `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(displayName)}`;

    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) {
      return respond({ ok: false, error: `Erro listando usuários: ${listError.message}` });
    }

    const existingUser = existingUsers?.users?.find(
      (u: any) => u.user_metadata?.discord_id === discordUser.id || u.email === email,
    );

    if (existingUser) {
      const newPassword = crypto.randomUUID();
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
        password: newPassword,
        user_metadata: {
          ...existingUser.user_metadata,
          display_name: displayName,
          avatar_url: avatarUrl,
          discord_id: discordUser.id,
        },
      });

      if (updateError) {
        return respond({ ok: false, error: `Erro atualizando usuário Discord: ${updateError.message}` });
      }

      await supabaseAdmin.from("profiles").update({
        display_name: displayName,
        avatar_url: avatarUrl,
      }).eq("user_id", existingUser.id);

      return respond({
        ok: true,
        success: true,
        user: {
          id: existingUser.id,
          email: existingUser.email,
          display_name: displayName,
          avatar_url: avatarUrl,
        },
        password: newPassword,
      });
    }

    const password = crypto.randomUUID();
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        display_name: displayName,
        avatar_url: avatarUrl,
        discord_id: discordUser.id,
      },
    });

    if (createError || !newUser.user) {
      return respond({ ok: false, error: `Erro criando usuário Discord: ${createError?.message || "Usuário não retornado."}` });
    }

    await supabaseAdmin.from("profiles").update({
      display_name: displayName,
      avatar_url: avatarUrl,
    }).eq("user_id", newUser.user.id);

    return respond({
      ok: true,
      success: true,
      user: {
        id: newUser.user.id,
        email,
        display_name: displayName,
        avatar_url: avatarUrl,
      },
      password,
    });
  } catch (error: any) {
    console.error("Discord callback error:", error);
    return respond({ ok: false, error: error?.message || "Erro interno no login Discord." });
  }
});
