/**
 * Offline DDL generator for the OpenHub Prisma schema.
 *
 * Why this exists
 * ---------------
 * `prisma migrate dev` / `db push` shell out to Prisma's Rust `schema-engine`
 * binary, which is downloaded from binaries.prisma.sh. Air-gapped, proxied or
 * CI-sandboxed environments (and some corporate networks) cannot reach that
 * host. OpenHub must still be installable there, so this module derives
 * portable SQL directly from `prisma/schema.prisma`.
 *
 * The canonical path stays Prisma: on a machine with network access you use
 * `prisma migrate dev` / `prisma migrate deploy` with the committed migration
 * in `prisma/migrations/`. This generator produces that same migration SQL
 * (`npm run db:migration:sql`) and the SQLite schema used by `npm run db:push`.
 *
 * The parser is intentionally small: it understands exactly the Prisma schema
 * dialect used by this project (scalar fields, relations, @id/@unique/@default/
 * @relation, @@id/@@unique/@@index).
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const SCALAR_TYPES = new Set(['String', 'Int', 'BigInt', 'Float', 'Boolean', 'DateTime', 'Json', 'Bytes', 'Decimal']);

const PG_TYPES = {
  String: 'TEXT',
  Int: 'INTEGER',
  BigInt: 'BIGINT',
  Float: 'DOUBLE PRECISION',
  Boolean: 'BOOLEAN',
  DateTime: 'TIMESTAMP(3)',
  Json: 'JSONB',
  Bytes: 'BYTEA',
  Decimal: 'DECIMAL(20,4)',
};

const SQLITE_TYPES = {
  String: 'TEXT',
  Int: 'INTEGER',
  BigInt: 'INTEGER',
  Float: 'REAL',
  Boolean: 'BOOLEAN',
  DateTime: 'DATETIME',
  Json: 'TEXT',
  Bytes: 'BLOB',
  Decimal: 'DECIMAL',
};

function stripComments(line) {
  const trimmed = line.trim();
  if (trimmed.startsWith('//')) return '';
  return line;
}

/** Extract `@name(...)` or `@name` attributes from the tail of a field definition. */
function parseAttributes(rest) {
  const attrs = [];
  let i = 0;
  while (i < rest.length) {
    if (rest[i] !== '@') {
      i += 1;
      continue;
    }
    const nameMatch = /^@(\w+)/.exec(rest.slice(i));
    if (!nameMatch) break;
    const name = nameMatch[1];
    let cursor = i + nameMatch[0].length;
    let args = null;
    if (rest[cursor] === '(') {
      let depth = 0;
      let inString = false;
      let strChar = '';
      const start = cursor + 1;
      for (; cursor < rest.length; cursor += 1) {
        const ch = rest[cursor];
        if (inString) {
          if (ch === strChar) inString = false;
          continue;
        }
        if (ch === '"' || ch === "'") {
          inString = true;
          strChar = ch;
          continue;
        }
        if (ch === '(') depth += 1;
        if (ch === ')') {
          depth -= 1;
          if (depth === 0) break;
        }
      }
      args = rest.slice(start, cursor);
      cursor += 1;
    }
    attrs.push({ name, args });
    i = cursor;
  }
  return attrs;
}

function attrArg(attrs, name) {
  const found = attrs.find((a) => a.name === name);
  return found ? found.args : undefined;
}

function hasAttr(attrs, name) {
  return attrs.some((a) => a.name === name);
}

/** Parse a `[a, b]` list from an attribute argument (also handles `fields: [a]`). */
function parseList(arg) {
  if (!arg) return [];
  const inner = /\[([^\]]*)\]/.exec(arg);
  if (!inner) return [];
  return inner[1]
    .split(',')
    .map((part) => part.trim().replace(/^"|"$/g, ''))
    .filter(Boolean);
}

export function parseSchema(text) {
  const models = [];
  let current = null;

  for (const rawLine of text.split('\n')) {
    const line = stripComments(rawLine).trim();
    if (!line) continue;

    const modelStart = /^model\s+(\w+)\s*\{$/.exec(line);
    if (modelStart) {
      current = { name: modelStart[1], fields: [], uniques: [], indexes: [], ids: [], map: null };
      models.push(current);
      continue;
    }
    if (line === '}') {
      current = null;
      continue;
    }
    if (!current) continue;

    const blockAttr = /^@@(\w+)\((.*)\)$/.exec(line);
    if (blockAttr) {
      const [, name, arg] = blockAttr;
      if (name === 'unique') current.uniques.push(parseList(arg));
      if (name === 'index') current.indexes.push(parseList(arg));
      if (name === 'id') current.ids = parseList(arg);
      if (name === 'map') current.map = arg.replace(/"/g, '');
      continue;
    }

    const fieldMatch = /^(\w+)\s+([A-Za-z_][A-Za-z0-9_]*)(\[\])?(\?)?(.*)$/.exec(line);
    if (!fieldMatch) continue;
    const [, name, type, list, optional, rest] = fieldMatch;
    const attrs = parseAttributes(rest);
    const isList = Boolean(list);
    const isOptional = Boolean(optional);
    const isScalar = SCALAR_TYPES.has(type) && !isList;

    current.fields.push({
      name,
      type,
      isList,
      isOptional,
      isScalar,
      isId: hasAttr(attrs, 'id'),
      isUnique: hasAttr(attrs, 'unique'),
      isUpdatedAt: hasAttr(attrs, 'updatedAt'),
      default: attrArg(attrs, 'default'),
      relation: attrArg(attrs, 'relation'),
      relationModel: isScalar ? null : type,
      map: (attrArg(attrs, 'map') ?? '').replace(/"/g, '') || null,
    });
  }

  return models;
}

function defaultSql(value, dialect, scalarType) {
  if (value === undefined || value === null) return null;
  const v = value.trim();
  if (v === 'now()') return 'CURRENT_TIMESTAMP';
  if (v === 'cuid()' || v === 'uuid()' || v === 'dbgenerated()') return null;
  if (v === 'autoincrement()') return null;
  if (v === 'true' || v === 'false') {
    if (dialect === 'sqlite') return v === 'true' ? '1' : '0';
    return v;
  }
  if (/^-?\d+(\.\d+)?$/.test(v)) return v;
  if (v.startsWith('"') && v.endsWith('"')) {
    const inner = v.slice(1, -1).replace(/'/g, "''");
    return `'${inner}'`;
  }
  // Enum-ish defaults are stored as strings in this project.
  if (scalarType === 'String') return `'${v.replace(/'/g, "''")}'`;
  return null;
}

function quote(id, dialect) {
  return dialect === 'sqlite' ? `"${id}"` : `"${id}"`;
}

/** Topologically order models so referenced tables are created first. */
function orderModels(models) {
  const byName = new Map(models.map((m) => [m.name, m]));
  const deps = new Map(
    models.map((m) => [
      m.name,
      new Set(
        m.fields
          .filter((f) => !f.isScalar && f.relation && !f.isList)
          .map((f) => f.relationModel)
          .filter((dep) => dep && dep !== m.name && byName.has(dep)),
      ),
    ]),
  );

  const ordered = [];
  const visited = new Set();
  const visiting = new Set();

  function visit(name) {
    if (visited.has(name)) return;
    if (visiting.has(name)) return; // cycle: the back edge is emitted without a FK constraint
    visiting.add(name);
    for (const dep of deps.get(name) ?? []) visit(dep);
    visiting.delete(name);
    visited.add(name);
    ordered.push(byName.get(name));
  }

  for (const model of models) visit(model.name);
  return ordered;
}

function relationRef(relationArg) {
  if (!relationArg) return null;
  const fields = parseList(/fields:\s*\[[^\]]*\]/.exec(relationArg)?.[0] ?? '');
  const references = parseList(/references:\s*\[[^\]]*\]/.exec(relationArg)?.[0] ?? '');
  const onDelete = /onDelete:\s*(\w+)/.exec(relationArg)?.[1];
  const onUpdate = /onUpdate:\s*(\w+)/.exec(relationArg)?.[1];
  if (!fields.length) return null;
  return { fields, references: references.length ? references : ['id'], onDelete, onUpdate };
}

const PG_ACTION = {
  Cascade: 'CASCADE',
  SetNull: 'SET NULL',
  SetDefault: 'SET DEFAULT',
  Restrict: 'RESTRICT',
  NoAction: 'NO ACTION',
};

/**
 * Generate DDL for the parsed schema.
 * @param {ReturnType<typeof parseSchema>} models
 * @param {'sqlite'|'postgresql'} dialect
 */
export function generateDdl(models, dialect) {
  const types = dialect === 'sqlite' ? SQLITE_TYPES : PG_TYPES;
  const ordered = orderModels(models);
  const statements = [];
  const indexes = [];

  for (const model of ordered) {
    const table = model.map ?? model.name;
    const columns = [];
    const constraints = [];

    for (const field of model.fields) {
      if (!field.isScalar) continue;
      const column = field.map ?? field.name;
      const type = types[field.type] ?? 'TEXT';
      let def = `${quote(column, dialect)} ${type}`;
      if (field.isId && model.ids.length === 0) def += ' PRIMARY KEY';
      if (!field.isOptional && !field.isId) def += ' NOT NULL';
      const dflt = defaultSql(field.default, dialect, field.type);
      if (dflt !== null) def += ` DEFAULT ${dflt}`;
      if (field.isUnique) constraints.push(`UNIQUE (${quote(column, dialect)})`);
      columns.push(def);
    }

    if (model.ids.length > 0) {
      constraints.push(`PRIMARY KEY (${model.ids.map((id) => quote(id, dialect)).join(', ')})`);
    }

    for (const unique of model.uniques) {
      constraints.push(`UNIQUE (${unique.map((c) => quote(c, dialect)).join(', ')})`);
    }

    for (const field of model.fields) {
      if (field.isScalar || !field.relation) continue;
      const ref = relationRef(field.relation);
      if (!ref) continue;
      const referencedTable = field.relationModel;
      const action =
        PG_ACTION[ref.onDelete ?? (field.isOptional ? 'SetNull' : 'Restrict')] ?? 'RESTRICT';
      const update = PG_ACTION[ref.onUpdate ?? 'Cascade'] ?? 'CASCADE';
      constraints.push(
        `FOREIGN KEY (${ref.fields.map((c) => quote(c, dialect)).join(', ')}) ` +
          `REFERENCES ${quote(referencedTable, dialect)}(${ref.references
            .map((c) => quote(c, dialect))
            .join(', ')}) ON DELETE ${action} ON UPDATE ${update}`,
      );
    }

    const body = [...columns, ...constraints].join(',\n  ');
    statements.push(`CREATE TABLE ${quote(table, dialect)} (\n  ${body}\n);`);

    model.indexes.forEach((cols, i) => {
      indexes.push(
        `CREATE INDEX ${quote(`${table}_${cols.join('_')}_idx${i > 0 ? `_${i}` : ''}`, dialect)} ` +
          `ON ${quote(table, dialect)} (${cols.map((c) => quote(c, dialect)).join(', ')});`,
      );
    });
  }

  return [...statements, ...indexes].join('\n\n') + '\n';
}

export function loadSchemaModels(schemaPath) {
  const path =
    schemaPath ?? join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'prisma', 'schema.prisma');
  return parseSchema(readFileSync(path, 'utf8'));
}

export function generateDropAll(models, dialect) {
  // Drop in reverse dependency order.
  return orderModels(models)
    .reverse()
    .map((m) => `DROP TABLE IF EXISTS ${quote(m.map ?? m.name, dialect)};`)
    .join('\n');
}
