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
}
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("Repository checks passed.");
