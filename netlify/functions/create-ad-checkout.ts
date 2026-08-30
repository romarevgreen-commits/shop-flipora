import type { Config } from "@netlify/functions";

const packages = {
  starter: { name: "Flipora Starter Ad — 7 days", days: 7, placement: "marketplace" },
  business: { name: "Flipora Business Ad — 30 days", days: 30, placement: "marketplace" },
  featured: { name: "Flipora Featured Ad — 30 days", days: 30, placement: "homepage-priority" }
} as const;

const securityHeaders = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store, max-age=0",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "X-Frame-Options": "DENY",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Vary": "Origin"
};
const json = (status: number, body: Record<string, unknown>) => new Response(JSON.stringify(body), {
  status,
  headers: securityHeaders
});

const siteUrl = () => Netlify.env.get("SITE_URL") || "https://shop-flipora.netlify.app";

function trustedOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const incoming = new URL(origin);
    const expected = new URL(siteUrl());
    if (incoming.origin === expected.origin) return true;
    return incoming.protocol === "https:" && /^[a-z0-9-]+--shop-flipora\.netlify\.app$/i.test(incoming.hostname);
  } catch {
    return false;
  }
}

export default async (request: Request) => {
  if (request.method !== "POST") return json(405, { error: "Method not allowed" });
  if (!trustedOrigin(request)) return json(403, { error: "Request origin not allowed" });
  try {
    const authorization = request.headers.get("authorization");
    if (!authorization?.startsWith("Bearer ")) return json(401, { error: "Sign in and become a member before advertising" });
    const supabaseUrl = Netlify.env.get("SUPABASE_URL") || "https://opyzvpsbjqcdfeircica.supabase.co";
    const publishableKey = Netlify.env.get("SUPABASE_PUBLISHABLE_KEY") || Netlify.env.get("SUPABASE_ANON_KEY") || "sb_publishable_dZXo7TQxYnqloxuvYJ5hxA_MMNdDOIK";
    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: { Authorization: authorization, apikey: publishableKey } });
    if (!userResponse.ok) return json(401, { error: "Invalid or expired session" });
    const user = await userResponse.json();
    const supabaseSecret = Netlify.env.get("SUPABASE_SECRET_KEY");
    if (!supabaseSecret) throw new Error("Membership verification is not configured");
    const profileResponse = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=membership_active`, { headers: { apikey: supabaseSecret, Authorization: `Bearer ${supabaseSecret}` } });
    if (!profileResponse.ok) throw new Error("Could not verify membership");
    const profile = (await profileResponse.json())?.[0];
    if (!profile?.membership_active) return json(403, { error: "Lifetime membership is required before you can advertise" });

    const { packageId, businessName, message, destinationUrl } = await request.json();
    const selected = packages[packageId as keyof typeof packages];
    if (!selected) return json(400, { error: "Invalid advertising package" });
    const cleanName = String(businessName || "").trim().slice(0, 60);
    const cleanMessage = String(message || "").trim().slice(0, 180);
    if (!cleanName || !cleanMessage) return json(400, { error: "Business name and ad message are required" });
    let cleanUrl: string;
    try {
      const parsed = new URL(String(destinationUrl || ""));
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error();
      cleanUrl = parsed.toString().slice(0, 300);
    } catch {
      return json(400, { error: "Enter a valid website or contact link" });
    }

    const adRequest = {
      admin_id: user.id,
      action: "advertisement_submitted",
      target_type: "advertisement",
      target_id: `${user.id}-${Date.now()}`,
      details: { package_id: packageId, package_name: selected.name, duration_days: selected.days, placement: selected.placement, business_name: cleanName, ad_message: cleanMessage, destination_url: cleanUrl, included_with_membership: true }
    };
    const saveResponse = await fetch(`${supabaseUrl}/rest/v1/admin_audit_log`, {
      method: "POST",
      headers: { apikey: supabaseSecret, Authorization: `Bearer ${supabaseSecret}`, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify(adRequest)
    });
    if (!saveResponse.ok) throw new Error("Could not save your advertisement for review");
    return json(200, { success: true });
  } catch (error) {
    console.error("Advertising checkout error", error);
    return json(400, { error: error instanceof Error ? error.message : "Could not start advertising checkout" });
  }
};

export const config: Config = { method: ["POST"] };
