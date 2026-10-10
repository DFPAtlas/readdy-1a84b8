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
for (const file of files) {
  if (!existsSync(file)) continue;
  if (/^\.env(?:\.|$)/.test(file) && file !== ".env.example")
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
