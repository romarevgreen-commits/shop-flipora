import Stripe from "stripe";
import type { Config } from "@netlify/functions";

const packages = {
  starter: { name: "Flipora Starter Ad — 7 days", amount: 1900, days: 7, placement: "marketplace" },
  business: { name: "Flipora Business Ad — 30 days", amount: 4900, days: 30, placement: "marketplace" },
  featured: { name: "Flipora Featured Ad — 30 days", amount: 9900, days: 30, placement: "homepage-priority" }
} as const;

const json = (status: number, body: Record<string, unknown>) => new Response(JSON.stringify(body), {
  status,
  headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }
});

const randomLetters = () => Array.from({ length: 8 }, () => String.fromCharCode(97 + Math.floor(Math.random() * 26))).join("");

export default async (request: Request) => {
  if (request.method !== "POST") return json(405, { error: "Method not allowed" });
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

    const secretKey = Netlify.env.get("STRIPE_SECRET_KEY");
    if (!secretKey) throw new Error("Advertising checkout is not configured");

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

    const stripe = new Stripe(secretKey, { apiVersion: "2026-07-29.dahlia" });
    const siteUrl = Netlify.env.get("SITE_URL") || "https://shop-flipora.netlify.app";
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: user.email,
      integration_identifier: `flipora_ads_${randomLetters()}`,
      line_items: [{
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: selected.amount,
          product_data: { name: selected.name, description: `${selected.days}-day ${selected.placement} advertising placement` }
        }
      }],
      success_url: `${siteUrl}/?ad=success&session_id={CHECKOUT_SESSION_ID}#advertise`,
      cancel_url: `${siteUrl}/?ad=cancelled#advertise`,
      metadata: { purchase_type: "advertisement", user_id: String(user.id), package_id: packageId, duration_days: String(selected.days), placement: selected.placement, business_name: cleanName, ad_message: cleanMessage, destination_url: cleanUrl }
    });

    return json(200, { url: session.url });
  } catch (error) {
    console.error("Advertising checkout error", error);
    return json(400, { error: error instanceof Error ? error.message : "Could not start advertising checkout" });
  }
};

export const config: Config = { method: ["POST"] };
