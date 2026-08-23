const Stripe = require("stripe");

const required = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
};

const stripe = () => new Stripe(required("STRIPE_SECRET_KEY"));
const supabaseUrl = () => required("SUPABASE_URL");
const supabaseSecret = () => required("SUPABASE_SECRET_KEY");
const siteUrl = () => process.env.SITE_URL || "https://shop-flipora.netlify.app";

const json = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  body: JSON.stringify(body)
});

async function authenticatedUser(event) {
  const authorization = event.headers.authorization || event.headers.Authorization;
  if (!authorization?.startsWith("Bearer ")) throw new Error("Sign in required");
  const response = await fetch(`${supabaseUrl()}/auth/v1/user`, {
    headers: { Authorization: authorization, apikey: supabaseSecret() }
  });
  if (!response.ok) throw new Error("Invalid or expired session");
  return response.json();
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

module.exports = { stripe, json, authenticatedUser, rest, siteUrl, required };

