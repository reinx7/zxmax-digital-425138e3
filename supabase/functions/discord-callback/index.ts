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
    const { code, redirectUri } = await req.json();

    if (!code) {
      throw new Error("Missing code parameter");
    }

    const clientId = Deno.env.get("DISCORD_CLIENT_ID") || "1485093454517371070";
    const clientSecret = Deno.env.get("DISCORD_CLIENT_SECRET");
    if (!clientSecret) {
      throw new Error("DISCORD_CLIENT_SECRET not configured");
    }

    const finalRedirectUri = redirectUri || new URL(req.url).origin + "/";

    // Exchange code for access token
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

    if (!tokenRes.ok || tokenData.error) {
      throw new Error(`Discord token error: ${tokenData.error_description || tokenData.error || "Unknown"}`);
    }

    if (!tokenData.access_token) {
      throw new Error("No access token returned from Discord");
    }

    // Get Discord user profile
    const userRes = await fetch("https://discord.com/api/v10/users/@me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const discordUser = await userRes.json();

    if (!userRes.ok || !discordUser.id) {
      throw new Error(`Failed to fetch Discord user: ${discordUser.message || "Unknown"}`);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const email = discordUser.email || `discord_${discordUser.id}@zxmax.local`;
    const displayName = discordUser.global_name || discordUser.username || `Discord User ${discordUser.id}`;
    const avatarUrl = discordUser.avatar
      ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
      : `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(displayName)}`;

    // Try to find existing user by email or Discord ID
    const { data: { users: allUsers }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) throw listError;

    const existingUser = allUsers?.find(
      (u: any) => u.email === email || u.user_metadata?.discord_id === discordUser.id
    );

    if (existingUser) {
      const userId = existingUser.id;
      const password = crypto.randomUUID();

      const { error: updateUserError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password,
        email_confirm: true,
        user_metadata: {
          ...(existingUser.user_metadata || {}),
          display_name: displayName,
          avatar_url: avatarUrl,
          discord_id: discordUser.id,
        },
      });
      if (updateUserError) throw updateUserError;

      // Update profile
      await supabaseAdmin.from("profiles").update({
        display_name: displayName,
        avatar_url: avatarUrl,
      }).eq("user_id", userId);

      return new Response(
        JSON.stringify({
          success: true,
          password,
          user: { id: userId, email: existingUser.email, display_name: displayName, avatar_url: avatarUrl },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    } else {
      // Create new user
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

      if (createError) throw createError;

      const userId = newUser.user.id;

      // Update profile
      await supabaseAdmin.from("profiles").update({
        display_name: displayName,
        avatar_url: avatarUrl,
      }).eq("user_id", userId);

      return new Response(
        JSON.stringify({
          success: true,
          password,
          user: { id: userId, email, display_name: displayName, avatar_url: avatarUrl },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }
  } catch (error: any) {
    console.error("Discord callback error:", error.message);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Unknown error occurred",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
