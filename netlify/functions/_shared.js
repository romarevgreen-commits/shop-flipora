const Stripe = require("stripe");

const DEFAULT_SUPABASE_URL = "https://opyzvpsbjqcdfeircica.supabase.co";
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_dZXo7TQxYnqloxuvYJ5hxA_MMNdDOIK";

const required = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
};

let stripeClient;
const stripe = () => {
  if (!stripeClient) {
    stripeClient = new Stripe(required("STRIPE_SECRET_KEY"), {
      apiVersion: "2026-08-26.dahlia"
    });
  }
  return stripeClient;
};

async function stripeV2(path, options = {}) {
  const response = await fetch(`https://api.stripe.com/v2/${String(path).replace(/^\/+/, "")}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${required("STRIPE_SECRET_KEY")}`,
      "Stripe-Version": "2026-08-26.preview",
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = null; }
  if (!response.ok) {
    const message = body?.error?.message || body?.message || text || "Stripe request failed";
    const error = new Error(message);
    error.code = body?.error?.code || body?.code || "stripe_request_failed";
    throw error;
  }
  return body;
}

const supabaseUrl = () => process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabasePublishable = () => process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || DEFAULT_SUPABASE_PUBLISHABLE_KEY;
const supabaseSecret = () => required("SUPABASE_SECRET_KEY");
const siteUrl = () => process.env.SITE_URL || "https://shop-flipora.netlify.app";

const json = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  body: JSON.stringify(body)
});

const bearerToken = (event) => {
  const authorization = event.headers.authorization || event.headers.Authorization;
  if (!authorization?.startsWith("Bearer ")) throw new Error("Sign in required");
  return authorization;
};

async function authenticatedUser(event) {
  const authorization = bearerToken(event);
  const response = await fetch(`${supabaseUrl()}/auth/v1/user`, {
    headers: { Authorization: authorization, apikey: supabasePublishable() }
  });
  if (!response.ok) throw new Error("Invalid or expired session");
  return response.json();
}

async function userRest(path, event, options = {}) {
  const authorization = bearerToken(event);
  const response = await fetch(`${supabaseUrl()}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: supabasePublishable(),
      Authorization: authorization,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  if (!response.ok) throw new Error(text || "Database request failed");
  return text ? JSON.parse(text) : null;
}

async function rest(path, options = {}) {
  const response = await fetch(`${supabaseUrl()}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: supabaseSecret(), Authorization: `Bearer ${supabaseSecret()}`,
      "Content-Type": "application/json", Prefer: "return=representation", ...(options.headers || {})
    }
  });
  const text = await response.text();
  if (!response.ok) throw new Error(text || "Database request failed");
  return text ? JSON.parse(text) : null;
}

module.exports = { stripe, stripeV2, json, authenticatedUser, userRest, rest, siteUrl, required, supabaseUrl, supabaseSecret, supabasePublishable };
