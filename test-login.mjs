// test-login.mjs
// Minimal, self-contained Discord bot login test (Node 18+/20+)

// 1) Imports
import { Client, GatewayIntentBits } from "discord.js";

// 2) Helpers
const mask = (t = "") => (t ? `${t.slice(0, 5)}...${t.slice(-5)}` : "(none)");
const nowIso = () => new Date().toISOString();

function fail(msg, code = 1) {
  console.error(`❌ ${msg}`);
  process.exit(code);
}

function ok(msg) {
  console.log(`✅ ${msg}`);
}

// 3) Read + validate token
const rawEnv = process.env.DISCORD_BOT_TOKEN;
const token = rawEnv?.trim();

console.log(`\n[${nowIso()}] DISCORD_BOT_TOKEN (masked): ${mask(token)}`);

if (!token) fail("DISCORD_BOT_TOKEN is not set (or is empty after trimming).");
if ((token.match(/\./g) || []).length !== 2) {
  console.warn(
    "⚠️  Token does not look like a standard bot token (doesn't have 2 dots). " +
      "Make sure you copied the **Bot** token from the Discord Developer Portal."
  );
}

// 4) Preflight session-start limits (prevents burning identify bucket)
async function preflightGateway() {
  try {
    const res = await fetch("https://discord.com/api/v10/gateway/bot", {
      headers: { Authorization: `Bot ${token}` },
    });
    if (!res.ok) {
      const body = await res.text();
      fail(
        `Gateway preflight failed: HTTP ${res.status}. Body: ${body || "(empty)"}`,
        2
      );
    }
    const data = await res.json();
    const ssl = data.session_start_limit || {};
    console.log(
      `Gateway session_start_limit: remaining=${ssl.remaining}, total=${ssl.total}, reset_after=${ssl.reset_after}ms`
    );
    if (ssl.remaining <= 0) {
      const resetMs = Number(ssl.reset_after || 0);
      const eta = new Date(Date.now() + resetMs).toISOString();
      fail(
        `Not enough sessions remaining to spawn a shard. Resets in ~${Math.ceil(
          resetMs / 1000
        )}s (≈ ${eta}).`,
        3
      );
    }
    ok("Gateway preflight OK.");
  } catch (e) {
    fail(`Gateway preflight threw: ${e?.message || e}`, 2);
  }
}

// 5) Try an actual login, then immediately destroy
async function tryLogin() {
  const client = new Client({
    intents: [GatewayIntentBits.Guilds],
  });

  client.once("ready", () => {
    ok(`Logged in as ${client.user?.tag}`);
  });

  try {
    await client.login(token);
  } catch (err) {
    // Improve the common cases
    if (err?.code === "TokenInvalid") {
      fail(
        "Login failed: TokenInvalid. The token is wrong/revoked or not a Bot token from the Dev Portal.",
        4
      );
    }
    const msg = err?.message || String(err);
    if (/Not enough sessions remaining/i.test(msg)) {
      fail(msg, 3);
    }
    fail(`Login failed: ${msg}`, 4);
  } finally {
    // Clean up the WS so you don't consume a long-lived session
    try {
      client.destroy();
    } catch {}
  }
}

// 6) Run
(async () => {
  console.log("\n--- Preflight ---");
  await preflightGateway();

  console.log("\n--- Login attempt ---");
  await tryLogin();

  console.log("\nAll good. Exiting.\n");
  process.exit(0);
})();