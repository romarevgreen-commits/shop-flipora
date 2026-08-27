import Stripe from "stripe";
import type { Config } from "@netlify/functions";

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
const required = (name: string) => {
  const value = Netlify.env.get(name);
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
};
const siteUrl = () => Netlify.env.get("SITE_URL") || "https://shop-flipora.netlify.app";
const randomLetters = () => Array.from({ length: 8 }, () => String.fromCharCode(97 + Math.floor(Math.random() * 26))).join("");

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
    if (!authorization?.startsWith("Bearer ")) return json(401, { error: "Sign in required" });
    const supabaseUrl = Netlify.env.get("SUPABASE_URL") || "https://opyzvpsbjqcdfeircica.supabase.co";
    const publishableKey = Netlify.env.get("SUPABASE_PUBLISHABLE_KEY") || Netlify.env.get("SUPABASE_ANON_KEY") || "sb_publishable_dZXo7TQxYnqloxuvYJ5hxA_MMNdDOIK";
    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: { Authorization: authorization, apikey: publishableKey } });
    if (!userResponse.ok) return json(401, { error: "Invalid or expired session" });
    const user = await userResponse.json();

    const secret = required("SUPABASE_SECRET_KEY");
    const profileResponse = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=membership_active`, { headers: { apikey: secret, Authorization: `Bearer ${secret}` } });
    if (!profileResponse.ok) throw new Error("Could not check membership status");
    const profile = (await profileResponse.json())?.[0];
    if (profile?.membership_active) return json(400, { error: "Your lifetime membership is already active" });

    const stripe = new Stripe(required("STRIPE_SECRET_KEY"), { apiVersion: "2026-08-26.dahlia" });
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: user.email,
      integration_identifier: `flipora_member_${randomLetters()}`,
      payment_intent_data: { receipt_email: user.email },
      line_items: [{ quantity: 1, price_data: { currency: "usd", unit_amount: 999, product_data: { name: "Flipora Lifetime Seller Membership", description: "One-time membership required to connect seller payouts and receive earnings" } } }],
      success_url: `${siteUrl()}/?membership=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl()}/`,
      metadata: { purchase_type: "seller_membership", user_id: String(user.id), membership_type: "lifetime" }
    });
    return json(200, { url: session.url });
  } catch (error) {
    console.error("Membership checkout error", error);
    return json(400, { error: error instanceof Error ? error.message : "Could not start membership checkout" });
  }
};

export const config: Config = { method: ["POST"] };
