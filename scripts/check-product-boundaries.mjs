import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

export function importsOf(text, filename = 'module.ts') {
  const source = ts.createSourceFile(filename, text, ts.ScriptTarget.Latest, true);
  const imports = [];
  const visit = node => {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier) {
      imports.push(ts.isStringLiteralLike(node.moduleSpecifier) ? node.moduleSpecifier.text : null);
    }
    if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(node.expression) && node.expression.text === 'require'))) {
      imports.push(node.arguments[0] && ts.isStringLiteralLike(node.arguments[0]) ? node.arguments[0].text : null);
    }
    if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) {
      const expr = node.moduleReference.expression;
      imports.push(expr && ts.isStringLiteralLike(expr) ? expr.text : null);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return imports;
}

const slash = value => value.replaceAll('\\', '/');
export function audit(root, contract) {
  const errors = [], edges = [], visited = new Set();
  const resolve = (from, spec) => {
    const candidate = path.resolve(root, path.dirname(from), spec.split('?')[0]);
    const choices = [candidate, ...['.ts', '.tsx', '.js', '.mjs', '.json', '/index.ts', '/index.tsx'].map(ext => candidate + ext)];
    const found = choices.find(file => fs.existsSync(file) && fs.statSync(file).isFile());
    return found && slash(path.relative(root, found));
  };
  function walk(file, allowed, externals, label) {
    const key = `${label}:${file}`;
    if (visited.has(key)) return;
    visited.add(key);
    if (!allowed(file)) { errors.push(`${label}: forbidden dependency ${file}`); return; }
    if (!/\.(?:ts|tsx|js|mjs)$/.test(file)) return;
    for (const spec of importsOf(fs.readFileSync(path.join(root, file), 'utf8'), file)) {
      if (spec === null) { errors.push(`${label}: non-literal dependency in ${file}`); continue; }
      if (!spec.startsWith('.')) {
        if (!externals.some(pkg => spec === pkg || spec.startsWith(pkg + '/'))) errors.push(`${label}: undeclared external ${spec} in ${file}`);
        edges.push({from:file, to:spec, kind:'external'});
        continue;
      }
      const target = resolve(file, spec);
      if (!target) { errors.push(`${label}: unresolved ${spec} in ${file}`); continue; }
      edges.push({from:file, to:target, kind:'local'});
      walk(target, allowed, externals, label);
    }
  }
  function files(dir) {
    return fs.readdirSync(path.join(root, dir), {withFileTypes:true}).flatMap(entry => entry.isDirectory() ? files(`${dir}/${entry.name}`) : [`${dir}/${entry.name}`]);
  }
  for (const domain of contract.domains) {
    for (const file of files(domain.root)) walk(file, target => target.startsWith(domain.root + '/'), domain.externals, domain.name);
  }
  const ui = contract.logistics;
  for (const entry of ui.entries) walk(entry, target => target.startsWith('packages/logistics-costing/src/') || ui.files.includes(target), ui.externals, 'Logistics UI');
  return {errors, edges, visitedCount:visited.size};
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const contract = JSON.parse(fs.readFileSync(path.join(root, 'docs/product-boundaries.json'), 'utf8'));
  const result = audit(root, contract);
  console.log(JSON.stringify(result, null, 2));
  if (result.errors.length) process.exitCode = 1;
}
