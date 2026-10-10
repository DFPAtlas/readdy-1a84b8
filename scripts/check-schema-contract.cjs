const ts = require(process.cwd() + "/node_modules/typescript");
const fs = require("fs");
const path = require("path");
module.exports = function checkSchema(schema) {
  const cols = new Map();
  for (const row of schema) {
    if (!cols.has(row.table_name)) cols.set(row.table_name, new Set());
    cols.get(row.table_name).add(row.column_name);
  }
  const missing = {};
  function record(table, column, file) {
    if (!/^[a-z_][a-z_0-9]*$/.test(column) || cols.get(table)?.has(column))
      return;
    missing[table] ??= {};
    missing[table][column] ??= [];
    if (!missing[table][column].includes(file))
      missing[table][column].push(file);
  }
  function walk(dir) {
    for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, item.name);
      if (item.isDirectory()) walk(file);
      else if (/\.tsx?$/.test(file) && !file.includes("__tests__")) read(file);
    }
  }
  function read(file) {
    const ast = ts.createSourceFile(
      file,
      fs.readFileSync(file, "utf8"),
      ts.ScriptTarget.Latest,
      true,
    );
    function tableOf(n) {
      if (
        ts.isCallExpression(n) &&
        ts.isPropertyAccessExpression(n.expression)
      ) {
        if (
          n.expression.name.text === "from" &&
          ts.isStringLiteral(n.arguments[0])
        )
          return n.arguments[0].text;
        return tableOf(n.expression.expression);
      }
      return null;
    }
    function visit(n) {
      if (
        ts.isCallExpression(n) &&
        ts.isPropertyAccessExpression(n.expression)
      ) {
        const table = tableOf(n.expression.expression);
        if (table && table !== "private") {
          const method = n.expression.name.text;
          if (
            [
              "select",
              "eq",
              "neq",
              "in",
              "is",
              "not",
              "ilike",
              "order",
            ].includes(method) &&
            n.arguments[0] &&
            ts.isStringLiteral(n.arguments[0])
          ) {
            const val = n.arguments[0].text;
            if (method === "select") {
              let dep = 0;
              let part = "";
              for (const c of val + ",") {
                if (c === "(") dep++;
                if (c === ")") dep--;
                if (c === "," && dep === 0) {
                  if (!part.includes("(") && part !== "*")
                    record(table, part.trim().split(":").pop(), file);
                  part = "";
                } else part += c;
              }
            } else record(table, val, file);
          }
          if (
            ["insert", "upsert", "update"].includes(method) &&
            n.arguments[0] &&
            ts.isObjectLiteralExpression(n.arguments[0])
          )
            for (const p of n.arguments[0].properties)
              if (
                ts.isPropertyAssignment(p) ||
                ts.isShorthandPropertyAssignment(p)
              )
                record(table, p.name.getText(ast).replace(/['"]/g, ""), file);
        }
      }
      ts.forEachChild(n, visit);
    }
    visit(ast);
  }
  walk("src");
  walk("supabase/functions");
  if (Object.keys(missing).length)
    throw new Error(
      "Database query contract mismatch: " + JSON.stringify(missing),
    );
  console.log("Static database query contracts passed.");
};
