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
    error.statusCode = response.status;
    throw error;
  }
  return body;
}

async function recipientAccount(accountId) {
  const include = new URLSearchParams();
  include.set("include[0]", "configuration.recipient");
  include.set("include[1]", "requirements");
  return stripeV2(`core/accounts/${encodeURIComponent(accountId)}?${include}`);
}

function recipientPayoutState(account) {
  const capability = account?.configuration?.recipient?.capabilities?.stripe_balance?.stripe_transfers;
  const status = capability?.status || "inactive";
  const requirements = account?.requirements || {};
  const pastDue = Array.isArray(requirements.past_due) ? requirements.past_due : [];
  const currentlyDue = Array.isArray(requirements.currently_due) ? requirements.currently_due : [];
  const requirementsStatus = pastDue.length ? "past_due" : currentlyDue.length ? "currently_due" : null;
  return {
    connected: status === "active",
    transfersStatus: status,
    requirementsStatus
  };
}

const supabaseUrl = () => process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabasePublishable = () => process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || DEFAULT_SUPABASE_PUBLISHABLE_KEY;
const supabaseSecret = () => required("SUPABASE_SECRET_KEY");
const siteUrl = () => process.env.SITE_URL || "https://shop-flipora.netlify.app";

const responseSecurityHeaders = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store, max-age=0",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "X-Frame-Options": "DENY",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Vary": "Origin"
};

const json = (statusCode, body) => ({ statusCode, headers: responseSecurityHeaders, body: JSON.stringify(body) });

function assertTrustedOrigin(event) {
  const method = String(event?.httpMethod || "GET").toUpperCase();
  if (["GET", "HEAD", "OPTIONS"].includes(method)) return;
  const origin = event?.headers?.origin || event?.headers?.Origin;
  if (!origin) return;
  let parsed;
  let expected;
  try { parsed = new URL(origin); expected = new URL(siteUrl()); } catch { throw new Error("Request origin not allowed"); }
  if (parsed.origin === expected.origin) return;
  const previewHost = /^[a-z0-9-]+--shop-flipora\.netlify\.app$/i.test(parsed.hostname);
  if (parsed.protocol === "https:" && previewHost) return;
  throw new Error("Request origin not allowed");
}

const bearerToken = (event) => {
  const authorization = event.headers.authorization || event.headers.Authorization;
  if (!authorization?.startsWith("Bearer ")) throw new Error("Sign in required");
  return authorization;
};

async function authenticatedUser(event) {
  assertTrustedOrigin(event);
  const authorization = bearerToken(event);
  const response = await fetch(`${supabaseUrl()}/auth/v1/user`, { headers: { Authorization: authorization, apikey: supabasePublishable() } });
  if (!response.ok) throw new Error("Invalid or expired session");
  return response.json();
}

async function userRest(path, event, options = {}) {
  const authorization = bearerToken(event);
  const response = await fetch(`${supabaseUrl()}/rest/v1/${path}`, {
    ...options,
    headers: { apikey: supabasePublishable(), Authorization: authorization, "Content-Type": "application/json", Prefer: "return=representation", ...(options.headers || {}) }
  });
  const text = await response.text();
  if (!response.ok) throw new Error(text || "Database request failed");
  return text ? JSON.parse(text) : null;
}

async function rest(path, options = {}) {
  const response = await fetch(`${supabaseUrl()}/rest/v1/${path}`, {
    ...options,
    headers: { apikey: supabaseSecret(), Authorization: `Bearer ${supabaseSecret()}`, "Content-Type": "application/json", Prefer: "return=representation", ...(options.headers || {}) }
  });
  const text = await response.text();
  if (!response.ok) throw new Error(text || "Database request failed");
  return text ? JSON.parse(text) : null;
}

module.exports = { stripe, stripeV2, recipientAccount, recipientPayoutState, json, authenticatedUser, userRest, rest, siteUrl, required, supabaseUrl, supabaseSecret, supabasePublishable, assertTrustedOrigin, responseSecurityHeaders };

