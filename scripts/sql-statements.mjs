// Split migration SQL without breaking quoted strings, comments, or function bodies.
export function sqlStatements(text) {
  const statements = [];
  let start = 0;
  const tokens = /--[^\n]*|\/\*[\s\S]*?\*\/|'(?:''|[^'])*'|"(?:""|[^"])*"|(\$[a-zA-Z_0-9]*\$)[\s\S]*?\1|;/g;
  for (const match of text.matchAll(tokens)) {
    if (match[0] !== ';') continue;
    const statement = text.slice(start, match.index).trim();
    if (statement && !/^(BEGIN|COMMIT)$/i.test(statement)) statements.push(statement);
    start = match.index + 1;
  }
  if (text.slice(start).trim()) throw new Error('Migration must end with a semicolon.');
  return statements;
}
