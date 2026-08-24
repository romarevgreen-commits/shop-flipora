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
    const secretKey = Netlify.env.get("STRIPE_SECRET_KEY");
    if (!secretKey) throw new Error("Advertising checkout is not configured");

    const { packageId } = await request.json();
    const selected = packages[packageId as keyof typeof packages];
    if (!selected) return json(400, { error: "Invalid advertising package" });

    const stripe = new Stripe(secretKey, { apiVersion: "2026-07-29.dahlia" });
    const siteUrl = Netlify.env.get("SITE_URL") || "https://shop-flipora.netlify.app";
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
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
      metadata: { purchase_type: "advertisement", package_id: packageId, duration_days: String(selected.days), placement: selected.placement }
    });

    return json(200, { url: session.url });
  } catch (error) {
    console.error("Advertising checkout error", error);
    return json(400, { error: error instanceof Error ? error.message : "Could not start advertising checkout" });
  }
};

export const config: Config = { method: ["POST"] };
