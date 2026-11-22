import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
const files = execFileSync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard"],
  { encoding: "utf8" },
)
  .trim()
  .split("\n");
const failures = [];

// Readdy's GitHub sync always pushes a root .env holding the public browser
// config (Supabase URL + anon key), which is also bundled into the website.
// Allow that file only while every entry is a VITE_PUBLIC_ value, and any
// Supabase JWT in it is the public "anon" role, never service_role.
function publicEnvProblems(file) {
  const problems = [];
  for (const raw of readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const match = /^([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (!match) {
      problems.push("unparseable line");
      continue;
    }
    const [, key, rawValue] = match;
    if (!key.startsWith("VITE_PUBLIC_")) {
      problems.push(`${key} is not a VITE_PUBLIC_ value`);
      continue;
    }
    const value = rawValue.replace(/^["']|["']$/g, "");
    const isJwt = /^eyJ[\w-]+\.[\w-]+\.[\w-]+$/.test(value);
    if (
      key === "VITE_PUBLIC_SUPABASE_ANON_KEY" &&
      !isJwt &&
      !/^sb_publishable_[\w-]+$/.test(value)
    ) {
      problems.push(`${key} is not a Supabase public key`);
      continue;
    }
    if (isJwt) {
      let role;
      try {
        role = JSON.parse(
          Buffer.from(value.split(".")[1], "base64url").toString("utf8"),
        ).role;
      } catch {
        role = undefined;
      }
      if (role !== "anon") problems.push(`${key} is not a public anon key`);
    }
  }
  return problems;
}


// Server-only secrets must never be committed or reach the browser bundle.
const SECRET_PATTERNS = [
  [/\bsk_(?:live|test)_[A-Za-z0-9]{10,}/, "Stripe secret key"],
  [/\brk_(?:live|test)_[A-Za-z0-9]{10,}/, "Stripe restricted key"],
  [/\bwhsec_[A-Za-z0-9]{10,}/, "Stripe webhook secret"],
  [/\bre_[A-Za-z0-9]{8,}_[A-Za-z0-9]{16,}/, "Resend API key"],
  [/\bsb_secret_[A-Za-z0-9_-]{10,}/, "Supabase secret key"],
  [/-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/, "private key"],
];
const CLIENT_SECRET_ENV = /import\.meta\.env\.(?!VITE_PUBLIC_)[A-Z0-9_]*(?:SECRET|SERVICE_ROLE|PRIVATE|API_KEY|TOKEN)[A-Z0-9_]*/;

function isTestFile(file) {
  return /(?:^|\/)(?:__tests__|tests)\/|\.(?:test|spec)\.[jt]sx?$/.test(file);
}

for (const file of files) {
  if (!existsSync(file)) continue;
  if (file === ".env") {
    for (const problem of publicEnvProblems(file))
      failures.push(`Committed .env may only hold public values: ${problem}`);
  } else if (/^\.env(?:\.|$)/.test(file) && file !== ".env.example")
    failures.push(`Environment file must not be committed: ${file}`);
  if (
    /\.(?:ts|tsx|sql|json|yml|yaml)$/.test(file) &&
    /^(?:<{7}\s|={7}$|>{7}\s)/m.test(readFileSync(file, "utf8"))
  )
    failures.push(`Merge conflict marker: ${file}`);
  if (
    !isTestFile(file) &&
    /\.(?:ts|tsx|js|jsx|mjs|json|html|toml|ya?ml|md|sql|env|example)$|^\.env/.test(file)
  ) {
    const text = readFileSync(file, "utf8");
    for (const [pattern, label] of SECRET_PATTERNS)
      if (pattern.test(text)) failures.push(`Possible ${label} committed: ${file}`);
    if (/^src\//.test(file) && CLIENT_SECRET_ENV.test(text))
      failures.push(`Browser code reads a server secret from import.meta.env: ${file}`);
  }
}
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("Repository checks passed.");
