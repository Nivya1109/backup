/**
 * SLIB Intelligent Cleanup Script
 *
 * Scans ALL Library records (not just missing exampleCode) and identifies
 * low-quality, duplicate, spam, or irrelevant entries for removal.
 *
 * Run:  npx tsx scripts/remove-no-example.ts              ← dry run (safe default)
 *       npx tsx scripts/remove-no-example.ts --delete     ← actually deletes
 *       npx tsx scripts/remove-no-example.ts --verbose    ← show all scored records
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const DELETE_LIMIT = 100;
const MIN_SCORE = 2;

// ─────────────────────────────────────────────────────────────────────────────
// PROTECTION LAYER
// Uses three-tier token-based matching — NOT naive substring.
// "gin" matches the package "gin" but NOT "packaging".
// ─────────────────────────────────────────────────────────────────────────────

const PROTECTED_FULL_NAMES = new Set(
  [
    // Python type / build infrastructure (exact names to avoid substring hits)
    "typing-extensions", "typing_extensions",
    "python-multipart", "python_multipart",
    "python-dateutil", "python_dateutil",
    "python-dotenv",   "python_dotenv",
    "annotated-types", "annotated_types",
    "exceptiongroup",
    "trove-classifiers", "trove_classifiers",
    // TypeScript / JS infra
    "class-validator", "class-transformer",
    "date-fns", "date-fns-tz",
    "socket.io", "socket.io-client",
    "ts-node", "ts-morph",
    "babel-core", "babel-loader",
    "eslint-config-next", "eslint-config-prettier",
    "websocket-client", "websocket",
    // AWS / cloud helpers
    "s3fs", "s3transfer", "aiobotocore", "awscli",
    "cachetools", "google-auth",
    "googleapis-common-protos", "proto-plus",
    "grpcio-tools",
    // Python system / compat
    "cffi", "pycparser",
    "tomli", "tomlkit", "colorama",
    "pymysql", "psycopg2", "psycopg2-binary",
    "pynacl", "pyopenssl",
    "greenlet", "anyio",
    "aiosignal", "oauthlib",
    "grpcio", "grpcio-status",
    "passlib", "coverage",
    "six", "packaging", "wheel",
    "virtualenv", "distlib",
    "tabulate", "wcwidth",
    "tzdata", "filelock", "zipp",
    "tenacity", "lxml",
    "pyasn1", "pyasn1-modules",
    "et-xmlfile", "keyring",
    "referencing", "jsonschema-specifications",
    "structlog", "python-json-logger",
    "importlib-metadata", "mdurl",
    // Commonly missed compound names whose tokens don't match simple keywords
    "mysql2", "bullmq", "ioredis", "bunyan",
    "kafkajs", "kafka-js",
    "node-fetch", "node-releases", "node-identifier",
    "readable-stream",
    "supertest",
    "bcryptjs",
    "jsonwebtoken",
    "morgan",
    "tslib",
    "nan",
    "clean-css",
    // Python compound names
    "pyjwt", "pymongo",
    "beautifulsoup4",
    "urllib3", "certifi", "charset-normalizer",
    "attrs", "idna", "pytz",
    "pyparsing", "docutils",
    "psutil", "networkx",
    "hypothesis",
    "factory-boy", "factory_boy",
    "h11", "httpcore",
    "multidict", "frozenlist", "fsspec",
    "sniffio", "aiohappyeyeballs",
    "aiokafka",
    "jmespath", "iniconfig", "platformdirs",
    "pluggy", "pathspec",
    "wrapt", "rpds-py", "propcache",
    "dnspython", "regex",
    "distro",
    "hatchling",
    "werkzeug",
    "authlib",
    // JS/TS utility exact names
    "utility-types",
    "hast-util-to-html", "hast-util-whitespace",
    "hast-util-parse-selector", "hast-util-from-parse5",
    "mdast-util-to-string", "mdast-util-phrasing",
    "mdast-util-from-markdown",
    "unist-util-visit", "unist-util-position",
    "rc-util", "rc-textarea",
    "egg-ts-helper",
    "pg",
  ].map((s) => s.toLowerCase()),
);

/** Scoped packages — any name starting with these is unconditionally kept. */
const PROTECTED_SCOPES = [
  "@types/", "@nestjs/", "@angular/", "@vue/",
  "@react-", "@radix-ui/", "@tanstack/", "@prisma/",
  "@aws-sdk/", "@google-cloud/", "@azure/",
  "@fortawesome/", "@emotion/", "@mui/", "@chakra-ui/",
  "@testing-library/", "@storybook/", "@sveltejs/",
  "@trpc/", "@hono/", "@remix-run/", "@astrojs/",
  "@financial-times/",
  "@midwayjs/",
  "@tinymce/",
  "@rc-component/",
  "@ag-grid-community/", "@ag-grid-enterprise/",
];

/** Whole-token protection — matched after splitting on non-alphanumeric chars. */
const PROTECTED_TOKENS = new Set(
  [
    // Frontend
    "react", "reactjs", "next", "nextjs", "nuxt", "vue", "vuejs",
    "angular", "angularjs", "svelte", "sveltekit", "remix", "astro",
    "gatsby", "solid", "solidjs", "qwik", "ember", "emberjs", "backbone",
    "preact", "inferno", "mithril",
    // Backend
    "nest", "nestjs", "express", "expressjs", "fastify", "hapi", "koa",
    "django", "flask", "fastapi", "rails", "sinatra", "spring", "laravel",
    "symfony", "gin", "fiber", "echo", "actix", "axum", "rocket",
    "sanic", "tornado", "aiohttp", "litestar", "hono", "elysia",
    "feathers", "strapi", "directus", "adonis", "adonisjs",
    // Databases / ORMs
    "prisma", "sequelize", "mongoose", "typeorm", "drizzle", "knex", "mikro",
    "sqlalchemy", "alembic", "peewee", "tortoise",
    "postgres", "postgresql", "mysql", "mariadb", "sqlite", "mongodb",
    "redis", "cassandra", "dynamodb", "elasticsearch", "opensearch",
    "clickhouse", "cockroachdb", "cockroach", "planetscale",
    "supabase", "firebase", "firestore", "neo4j",
    "couchdb", "couchbase", "influxdb", "timescaledb", "fauna",
    // ML / Data
    "tensorflow", "pytorch", "keras", "numpy", "pandas", "scipy",
    "matplotlib", "seaborn", "plotly", "bokeh", "altair",
    "xgboost", "lightgbm", "catboost", "sklearn", "scikit",
    "huggingface", "transformers", "langchain", "openai", "anthropic",
    "spacy", "nltk", "gensim", "statsmodels",
    "dask", "polars", "pyarrow", "pyspark",
    // DevOps / Infra / Cloud
    "docker", "kubernetes", "k8s", "terraform", "ansible", "helm",
    "prometheus", "grafana", "datadog", "sentry", "opentelemetry", "otel",
    "nginx", "caddy", "traefik",
    "kafka", "spark", "hadoop", "hive", "flink", "airflow", "beam",
    "nifi", "dubbo", "camel", "pulsar",
    "aws", "azure", "gcp", "cloudflare", "vercel", "netlify",
    // Auth / Security
    "oauth", "oauth2", "jwt", "passport", "passportjs",
    "auth0", "clerk", "nextauth", "lucia",
    "bcrypt", "argon", "argon2", "nacl",
    // UI / Styling / Icons
    "tailwind", "tailwindcss", "bootstrap", "chakra", "material",
    "antd", "shadcn", "radix", "headless", "daisyui", "bulma",
    "fontawesome", "heroicons", "lucide", "feather", "phosphor",
    "styled", "emotion", "stitches",
    // Testing
    "jest", "vitest", "mocha", "jasmine", "ava", "sinon",
    "pytest", "unittest", "nose",
    "cypress", "playwright", "selenium", "puppeteer", "testcafe",
    // Build / Bundlers
    "webpack", "vite", "rollup", "esbuild", "parcel", "turbo",
    "swc", "babel", "tsc", "typescript",
    // Popular utilities
    "lodash", "underscore", "ramda", "rxjs", "immer",
    "zustand", "redux", "mobx", "recoil", "jotai", "pinia", "vuex",
    "axios", "got", "ky", "superagent",
    "zod", "yup", "joi", "ajv",
    "uuid", "nanoid", "cuid", "ulid",
    "dotenv", "convict",
    "chalk", "commander", "yargs", "inquirer", "ora", "boxen",
    "sharp", "jimp", "imagemin",
    "cheerio",
    "stripe", "twilio", "sendgrid", "nodemailer", "resend",
    "helmet", "cors", "pino", "bull",
    // Protocols / serialisation
    "protobuf", "grpc", "graphql", "trpc", "openapi", "swagger",
    "msgpack", "avro", "thrift",
    // Python ecosystem
    "pydantic", "starlette", "uvicorn", "gunicorn", "celery",
    "boto3", "botocore", "requests", "httpx",
    "pillow", "opencv", "imageio",
    "mypy", "black", "ruff", "flake8", "pylint", "isort",
    "setuptools", "pip", "poetry", "pipenv", "pdm",
    "click", "typer", "rich", "loguru",
    "pygments", "jinja2",
    "cryptography", "cffi",
    "google", "snyk", "discord", "livefyre", "simctl",
    // Apache Foundation (all Apache projects are protected)
    "apache",
    // Misc
    "prettier", "eslint", "husky",
    "storybook", "chromatic",
    "swr", "tanstack", "query",
    "framer", "motion", "gsap", "three", "threejs",
    "socket", "prelude",
    "plotly", "argon2",
    "cors", "pino", "bull",
    "ag", "grid", "tinymce", "plotly",
  ].map((t) => t.toLowerCase()),
);

// ─────────────────────────────────────────────────────────────────────────────
// SPAM SIGNALS
// ─────────────────────────────────────────────────────────────────────────────

/** Known npm spam description template (thousands of fake packages use this). */
const SPAM_DESC_PREFIXES = [
  "this is a runtime library for [typescript](https://www.typescriptlang.org/)",
  "this is a runtime library for typescript",
  "this is a runtime library for [typescript]",
];

/** Spam npm account scopes: random chars + "npm" + optional digit. */
const SPAM_SCOPE_RE = /^@[a-z0-9]{3,15}npm\d*\//i;

/** Latin lorem ipsum words that appear in auto-generated package names. */
const LOREM_WORDS = new Set([
  "vitae", "ipsa", "molestias", "explicabo", "tempora", "dolor",
  "quisquam", "doloremque", "quas", "recusandae", "architecto",
  "accusantium", "aperiam", "aspernatur", "assumenda", "atque",
  "beatae", "blanditiis", "consequatur", "consectetur", "corporis",
  "culpa", "cumque", "cupiditate", "debitis", "delectus", "deleniti",
  "deserunt", "dicta", "dignissimos", "distinctio", "dolore",
  "dolorem", "doloribus", "dolorum", "ducimus", "earum",
  "eveniet", "excepturi", "exercitationem", "expedita",
  "facere", "facilis", "fuga", "fugiat", "fugit", "harum",
  "illum", "impedit", "ipsam", "ipsum", "iste", "iure", "iusto",
  "labore", "laboriosam", "laborum", "laudantium",
  "magnam", "magni", "maiores", "maxime", "minima", "minus",
  "molestiae", "mollitia", "natus", "necessitatibus", "nemo",
  "nihil", "nisi", "nobis", "nostrum", "nulla",
  "obcaecati", "odio", "odit", "officiis", "omnis", "optio",
  "pariatur", "perferendis", "perspiciatis", "placeat", "porro",
  "possimus", "praesentium", "provident",
  "quam", "quasi", "quibusdam", "quis", "quo", "quod", "quos",
  "ratione", "reiciendis", "repellat", "repellendus",
  "reprehenderit", "repudiandae", "rerum", "saepe", "sapiente",
  "sequi", "similique", "sint", "sit", "soluta",
  "suscipit", "tenetur", "totam", "ullam", "unde",
  "vel", "velit", "veniam", "veritatis", "vero",
  "voluptas", "voluptatem", "voluptatibus", "voluptatum",
]);

const SUSPICIOUS_NAME_RES = [
  /^(foo|bar|baz)([-_]|$)/,
  /^(lorem|ipsum|dolor)\b/,
  /^(test|demo|sample|example|placeholder|untitled|dummy|temp)([-_v\d]|$)/,
  /^my[-_](lib|pkg|module|app|project|tool|util)s?$/,
  /^(delete|remove|deprecated)[-_]?(me|this|lib|pkg)?$/,
  /^(xxx|yyy|zzz)([-_]|$)/,
  /\d{7,}/,
  /^[a-z]{1,2}[-_][a-z]{1,2}$/,
  /^[a-z]{1,3}\d{4,}$/,
];

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function tokenise(s: string): string[] {
  return s.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}

function normaliseForDedup(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function protectionReason(name: string, slug: string): string | null {
  const lower = name.toLowerCase();

  if (PROTECTED_FULL_NAMES.has(lower) || PROTECTED_FULL_NAMES.has(slug.toLowerCase())) {
    return `exact protected name "${name}"`;
  }
  for (const scope of PROTECTED_SCOPES) {
    if (lower.startsWith(scope.toLowerCase())) {
      return `scoped under protected scope "${scope}"`;
    }
  }
  for (const tok of [...tokenise(name), ...tokenise(slug)]) {
    if (PROTECTED_TOKENS.has(tok)) {
      return `token "${tok}" is a protected library name`;
    }
  }
  return null;
}

type LibRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  shortSummary: string | null;
  functionDesc: string | null;
  exampleCode: string | null;
  officialUrl: string | null;
  repositoryUrl: string | null;
  tags: string[];
  dataSource: string | null;
};

/** Count how many of the 7 key fields are meaningfully filled. */
function completenessScore(lib: LibRow): number {
  let n = 0;
  if ((lib.description ?? "").trim().length > 30) n++;
  if ((lib.shortSummary ?? "").trim().length > 10) n++;
  if ((lib.functionDesc ?? "").trim().length > 10) n++;
  if (lib.tags.length > 0) n++;
  if (lib.officialUrl) n++;
  if (lib.repositoryUrl) n++;
  if ((lib.exampleCode ?? "").trim().length > 10) n++;
  return n; // 0–7
}

/** Strip markdown badge syntax and measure remaining plain-text length. */
function strippedDescLength(desc: string): number {
  return desc
    .replace(/\[!\[.*?\]\(.*?\)\]\(.*?\)/g, "")   // [![badge](url)](link)
    .replace(/!\[.*?\]\(.*?\)/g, "")               // ![img](url)
    .replace(/\[.*?\]\(.*?\)/g, "")                // [text](url)
    .replace(/\.\. image::.*$/gm, "")              // RST images
    .replace(/\.\. \|[^|]+\|.*$/gm, "")            // RST substitutions
    .replace(/\|[a-z_]+\|/gi, "")                  // RST inline refs
    .replace(/https?:\/\/\S+/g, "")                // bare URLs
    .replace(/<[^>]+>/g, "")                        // HTML tags
    .trim()
    .length;
}

/** Returns true if this looks like an unknown personal/private scope. */
function isPersonalScope(name: string): boolean {
  if (!/^@/.test(name)) return false;
  const lower = name.toLowerCase();
  return !PROTECTED_SCOPES.some((s) => lower.startsWith(s.toLowerCase()));
}

// ─────────────────────────────────────────────────────────────────────────────
// DUPLICATE DETECTION
// ─────────────────────────────────────────────────────────────────────────────

function findDuplicates(libs: LibRow[]): Map<string, string> {
  // Map<weaker_id → reason>
  const toDelete = new Map<string, string>();

  const byNormName = new Map<string, LibRow[]>();
  const byNormSlug = new Map<string, LibRow[]>();

  for (const lib of libs) {
    const kn = normaliseForDedup(lib.name);
    const ks = normaliseForDedup(lib.slug);
    if (!byNormName.has(kn)) byNormName.set(kn, []);
    if (!byNormSlug.has(ks)) byNormSlug.set(ks, []);
    byNormName.get(kn)!.push(lib);
    byNormSlug.get(ks)!.push(lib);
  }

  const markWeaker = (group: LibRow[], via: string) => {
    if (group.length < 2) return;
    const sorted = [...group].sort((a, b) => completenessScore(b) - completenessScore(a));
    for (const weaker of sorted.slice(1)) {
      if (!toDelete.has(weaker.id)) {
        toDelete.set(weaker.id, `duplicate of "${sorted[0].name}" (via ${via}, weaker quality kept)`);
      }
    }
  };

  for (const group of byNormName.values()) markWeaker(group, "normalized name");
  for (const group of byNormSlug.values()) markWeaker(group, "normalized slug");

  return toDelete;
}

// ─────────────────────────────────────────────────────────────────────────────
// WEAKNESS SCORING
// ─────────────────────────────────────────────────────────────────────────────

function scoreWeakness(
  lib: LibRow,
  duplicateReason: string | undefined,
): { score: number; reasons: string[]; tier: string } {
  const reasons: string[] = [];
  let score = 0;

  const descRaw   = (lib.description ?? "").trim();
  const descLower = descRaw.toLowerCase();
  const nameLower = lib.name.toLowerCase();

  // ── TIER: DUPLICATE ─────────────────────────────────────────────────────
  if (duplicateReason) {
    reasons.push(duplicateReason);
    score += 4;
    return { score, reasons, tier: "duplicate" };
  }

  // ── TIER: SPAM ───────────────────────────────────────────────────────────
  let isSpam = false;

  for (const prefix of SPAM_DESC_PREFIXES) {
    if (descLower.startsWith(prefix)) {
      reasons.push("matches known npm spam description template");
      score += 6;
      isSpam = true;
      break;
    }
  }
  if (SPAM_SCOPE_RE.test(nameLower)) {
    reasons.push("scope matches npm spam account pattern");
    score += 4;
    isSpam = true;
  }
  const nameTokens  = tokenise(lib.name);
  const latinTokens = nameTokens.filter((t) => LOREM_WORDS.has(t));
  if (latinTokens.length >= 2) {
    reasons.push(`name has ${latinTokens.length} Latin lorem ipsum words: ${latinTokens.join(", ")}`);
    score += 3;
    isSpam = true;
  }
  for (const re of SUSPICIOUS_NAME_RES) {
    if (re.test(nameLower)) {
      reasons.push(`suspicious/autogenerated name: ${re}`);
      score += 4;
      isSpam = true;
      break;
    }
  }

  if (isSpam) return { score, reasons, tier: "spam" };

  // ── TIER: LOW METADATA ───────────────────────────────────────────────────
  const missingFields: string[] = [];
  if (!descRaw)                              missingFields.push("description");
  if (!(lib.shortSummary ?? "").trim())      missingFields.push("shortSummary");
  if (!(lib.functionDesc ?? "").trim())      missingFields.push("functionDesc");
  if (lib.tags.length === 0)                 missingFields.push("tags");
  if (!lib.officialUrl)                      missingFields.push("officialUrl");
  if (!lib.repositoryUrl)                    missingFields.push("repositoryUrl");
  if (!(lib.exampleCode ?? "").trim())       missingFields.push("exampleCode");

  if (missingFields.length >= 6) {
    reasons.push(`missing ${missingFields.length}/7 metadata fields (${missingFields.join(", ")})`);
    score += 4;
  } else if (missingFields.length === 5) {
    reasons.push(`missing 5/7 metadata fields (${missingFields.join(", ")})`);
    score += 3;
  } else if (missingFields.length === 4) {
    reasons.push(`missing 4/7 metadata fields (${missingFields.join(", ")})`);
    score += 2;
  } else if (missingFields.length === 3) {
    reasons.push(`missing 3/7 metadata fields (${missingFields.join(", ")})`);
    score += 1;
  }

  // ── TIER: POOR DESCRIPTION ────────────────────────────────────────────────
  if (!descRaw) {
    reasons.push("description is empty");
    score += 3;
  } else if (descRaw.length < 20) {
    reasons.push(`description only ${descRaw.length} chars`);
    score += 2;
  } else {
    // Effectively badge-only: very little real text after stripping images/badges
    const stripped = strippedDescLength(descRaw);
    if (stripped < 25 && descRaw.length > 30) {
      reasons.push(`description is effectively badge/image-only (${stripped} chars of real text)`);
      score += 2;
    }
    // Generic boilerplate
    const BOILERPLATE = [
      /^(n\/a|none|tbd|todo|coming soon|placeholder|unknown)\.?$/i,
      /^no description(\.| available)?\.?$/i,
      /^(lorem ipsum|lorem)\b/i,
      /^(a |an |the )?(library|package|module|tool|utility|framework|sdk|plugin)\.?$/i,
      /^this (library|package|module|tool|framework)\.?$/i,
      /^readme\.?md?\.?$/i,
      /^#+\s*(readme|todo|wip|placeholder)\s*$/i,
    ];
    for (const re of BOILERPLATE) {
      if (re.test(descRaw)) {
        reasons.push("description is generic boilerplate");
        score += 2;
        break;
      }
    }
  }

  // ── PRIVATE PERSONAL PACKAGE ─────────────────────────────────────────────
  if (isPersonalScope(lib.name)) {
    const descText   = (lib.description ?? "").trim();
    const summText   = (lib.shortSummary ?? "").trim();

    // Generic "TypeScript/Node helper X" descriptions
    const GENERIC_HELPER = /^(a\s+)?(typescript|nodejs?|node\.js|ts|c77|rsw\d+)\s+(helper|utility|utilities)\s*(library|classes|types|engine|module|exceptions|enums)?\s*[-–]?\s*\w*\s*\.?$/i;
    if (GENERIC_HELPER.test(descText) || GENERIC_HELPER.test(summText)) {
      reasons.push("personal/private-scope package with generic helper description");
      score += 3;
    }
    // Description just echoes the package name or scope
    const scopeUser = (lib.name.match(/^@([^/]+)\//) ?? [])[1] ?? "";
    if (scopeUser && (descText.toLowerCase().includes(scopeUser.toLowerCase()) || summText.toLowerCase().includes(scopeUser.toLowerCase()))) {
      if (descText.length < 60) {
        reasons.push("personal-scope package whose description just references its own scope name");
        score += 2;
      }
    }
    // Single "utilities" tag + no exampleCode + very short description = low-value
    if (
      lib.tags.length <= 1 &&
      lib.tags.every((t) => /^utilities?$/i.test(t)) &&
      !(lib.exampleCode ?? "").trim() &&
      descText.length < 80
    ) {
      reasons.push("personal-scope package: only 'utilities' tag, no example, short description");
      score += 2;
    }

    // Unprotected personal/company scope with no enrichment whatsoever
    // (no shortSummary, no functionDesc, no exampleCode) = clearly a stub
    if (
      !(lib.shortSummary ?? "").trim() &&
      !(lib.functionDesc ?? "").trim() &&
      !(lib.exampleCode ?? "").trim()
    ) {
      reasons.push("personal/company-scoped package with zero human-curated enrichment");
      score += 2;
    }
  }

  // ── SCRAPED STUB SIGNALS ──────────────────────────────────────────────────
  // Crawled records that never received any human-curated enrichment are the
  // lowest-value entries in the database. Each missing enrichment field adds a
  // small penalty that stacks with the metadata-completeness score above.
  const isScraped = !!(lib.dataSource?.includes("crawler") || lib.dataSource === "scraped");
  if (isScraped) {
    if (!(lib.exampleCode ?? "").trim()) {
      reasons.push("scraped record with no example code");
      score += 1;
    }
    if (!(lib.shortSummary ?? "").trim() && !(lib.functionDesc ?? "").trim()) {
      reasons.push("scraped record with no shortSummary and no functionDesc (never enriched)");
      score += 1;
    }
  }

  // ── COMBINED WEAK SIGNALS ─────────────────────────────────────────────────
  // No example + no tags + scraped = additional marginal signal on top of others
  if (
    score > 0 &&
    !(lib.exampleCode ?? "").trim() &&
    lib.tags.length === 0 &&
    isScraped
  ) {
    reasons.push("scraped record with no example code and no tags");
    score += 1;
  }

  const tier = score === 0 ? "clean" : score < MIN_SCORE ? "borderline" : "weak";
  return { score, reasons, tier };
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  const isDryRun  = !process.argv.includes("--delete");
  const isVerbose = process.argv.includes("--verbose");

  console.log("=".repeat(72));
  console.log("  SLIB Intelligent Cleanup");
  console.log(isDryRun ? "  MODE: DRY RUN  (pass --delete to actually delete)" : "  MODE: DELETE");
  console.log(`  Min weakness score : ${MIN_SCORE}   |   Delete cap : ${DELETE_LIMIT}`);
  console.log("=".repeat(72));

  // Fetch ALL records
  const all = await prisma.library.findMany({
    select: {
      id: true, name: true, slug: true,
      description: true, shortSummary: true, functionDesc: true,
      exampleCode: true, officialUrl: true, repositoryUrl: true,
      tags: true, dataSource: true,
    },
  });

  // ── DUPLICATE DETECTION ───────────────────────────────────────────────────
  const dupReasons = findDuplicates(all);

  // ── PARTITION: protected vs unprotected ───────────────────────────────────
  const protectedList: Array<{ lib: LibRow; reason: string }> = [];
  const unprotected:   LibRow[] = [];

  for (const lib of all) {
    const reason = protectionReason(lib.name, lib.slug);
    if (reason) protectedList.push({ lib, reason });
    else unprotected.push(lib);
  }

  // ── SCORE unprotected records ─────────────────────────────────────────────
  const scored = unprotected
    .map((lib) => ({
      lib,
      ...scoreWeakness(lib, dupReasons.get(lib.id)),
    }))
    .sort((a, b) => b.score - a.score);

  const qualifies    = scored.filter(({ score }) => score >= MIN_SCORE);
  const borderline   = scored.filter(({ score }) => score > 0 && score < MIN_SCORE);
  const clean        = scored.filter(({ score }) => score === 0);
  const toDelete     = qualifies.slice(0, DELETE_LIMIT);

  // Stats by tier
  const tierCounts = { duplicate: 0, spam: 0, "low metadata": 0, "poor description": 0, "private package": 0, other: 0 };
  for (const { tier, reasons } of qualifies) {
    if (tier === "duplicate") tierCounts.duplicate++;
    else if (tier === "spam") tierCounts.spam++;
    else if (reasons.some((r) => r.includes("metadata fields"))) tierCounts["low metadata"]++;
    else if (reasons.some((r) => r.includes("description"))) tierCounts["poor description"]++;
    else if (reasons.some((r) => r.includes("personal"))) tierCounts["private package"]++;
    else tierCounts.other++;
  }

  // ── SUMMARY ───────────────────────────────────────────────────────────────
  console.log();
  console.log("─".repeat(72));
  console.log("  SUMMARY");
  console.log("─".repeat(72));
  console.log(`  Total Library records              : ${all.length}`);
  console.log(`  Protected (kept unconditionally)   : ${protectedList.length}`);
  console.log(`  Unprotected pool                   : ${unprotected.length}`);
  console.log(`    └─ duplicates found              : ${dupReasons.size}`);
  console.log(`    └─ clean (score 0)               : ${clean.length}`);
  console.log(`    └─ borderline (score 1)              : ${borderline.length}`);
  console.log(`    └─ weak candidates (score ≥ ${MIN_SCORE})    : ${qualifies.length}`);
  console.log(`  Final delete candidates            : ${toDelete.length}  (cap: ${DELETE_LIMIT})`);
  console.log();
  console.log("  BREAKDOWN OF DELETE CANDIDATES:");
  console.log(`    ├─ duplicates            : ${tierCounts.duplicate}`);
  console.log(`    ├─ spam/autogenerated    : ${tierCounts.spam}`);
  console.log(`    ├─ low metadata          : ${tierCounts["low metadata"]}`);
  console.log(`    ├─ poor description      : ${tierCounts["poor description"]}`);
  console.log(`    └─ private/niche package : ${tierCounts["private package"]}`);
  console.log("─".repeat(72));

  // ── PROTECTED SAMPLE ──────────────────────────────────────────────────────
  console.log();
  console.log("PROTECTED SAMPLE — first 20 (will NOT be deleted):");
  for (const { lib, reason } of protectedList.slice(0, 20)) {
    console.log(`  ✓  ${lib.name.padEnd(44)} ← ${reason}`);
  }
  if (protectedList.length > 20) {
    console.log(`  … and ${protectedList.length - 20} more protected records.`);
  }

  // ── VERBOSE: all scored unprotected records ───────────────────────────────
  if (isVerbose) {
    console.log();
    console.log("─".repeat(72));
    console.log("  VERBOSE — all unprotected records with scores:");
    console.log("─".repeat(72));
    for (const { lib, score, tier, reasons } of scored) {
      const desc = (lib.description ?? "(no description)").slice(0, 65).replace(/\n/g, " ");
      console.log(`  [score=${score} tier=${tier}]  ${lib.name}`);
      console.log(`    desc : ${desc}`);
      if (reasons.length) console.log(`    why  : ${reasons.join(" | ")}`);
      console.log();
    }
  }

  // ── DELETE CANDIDATES ─────────────────────────────────────────────────────
  console.log();
  console.log("─".repeat(72));
  console.log("  DELETE CANDIDATES");
  console.log("─".repeat(72));
  console.log();

  if (toDelete.length === 0) {
    console.log("  No records met the weak/spam/duplicate criteria.");
    console.log("  Your database appears to be in good shape.");
    console.log("  Use --verbose to inspect all unprotected records.");
  }

  for (const { lib, score, tier, reasons } of toDelete) {
    const desc = lib.description
      ? lib.description.trim().slice(0, 88).replace(/\n/g, " ")
      : "(no description)";
    console.log(`[score=${score} | ${tier}]  ${lib.name}  (${lib.slug})`);
    console.log(`  id          : ${lib.id}`);
    console.log(`  dataSource  : ${lib.dataSource ?? "null"}`);
    console.log(`  description : ${desc}`);
    console.log(`  reasons     : ${reasons.join("  |  ")}`);
    console.log();
  }

  console.log("─".repeat(72));
  console.log(`Total selected for deletion: ${toDelete.length}`);

  if (qualifies.length < 50) {
    console.log();
    console.log("  NOTE: Fewer than 50 candidates found. This is intentional —");
    console.log("  the script only flags records with strong evidence of being");
    console.log("  spam, duplicates, or genuinely low-quality. Your database");
    console.log("  may already be in decent shape for the remaining records.");
  }

  if (isDryRun) {
    console.log();
    console.log("  Dry run complete — no records were deleted.");
    console.log("  Re-run with --delete to perform deletion.");
    console.log();
    return;
  }

  const ids = toDelete.map(({ lib }) => lib.id);
  console.log(`\nDeleting ${ids.length} records…`);
  const result = await prisma.library.deleteMany({ where: { id: { in: ids } } });
  console.log(`Done. Deleted ${result.count} Library records.\n`);
}

main()
  .catch((err) => {
    console.error("Script failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
