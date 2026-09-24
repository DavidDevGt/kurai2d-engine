// Removes declarations tagged `@internal` from the generated .d.ts files.
// tsc's `stripInternal` ignores declarations that come from JavaScript
// sources, so engine internals shared between classes (and therefore not
// `@private`) would otherwise leak into the public types.
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = fileURLToPath(new URL("../dist/types/", import.meta.url));

function* declarationFiles(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* declarationFiles(path);
    else if (name.endsWith(".d.ts")) yield path;
  }
}

function isInternal(node) {
  return ts.getJSDocTags(node).some((tag) => tag.tagName.text === "internal");
}

let removed = 0;
for (const file of declarationFiles(root)) {
  const text = readFileSync(file, "utf8");
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const ranges = [];
  const visit = (node) => {
    if (
      (ts.isClassElement(node) || ts.isTypeElement(node)) &&
      isInternal(node)
    ) {
      ranges.push([node.getFullStart(), node.getEnd()]);
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  if (ranges.length === 0) continue;

  let out = text;
  for (const [start, end] of ranges.reverse()) {
    out = out.slice(0, start) + out.slice(end);
  }
  writeFileSync(file, out);
  removed += ranges.length;
}
console.log(`strip-internal: removed ${removed} internal declarations`);
