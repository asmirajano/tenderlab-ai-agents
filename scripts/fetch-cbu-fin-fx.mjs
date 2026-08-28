import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { createRequire } from "node:module";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const appRequire = createRequire(new URL("../apps/tender-apps/package.json", import.meta.url));
const XLSX = appRequire("xlsx");

const START_YEAR = 2015;
const END_YEAR = 2025;
const PROVIDER_ENDPOINT = "https://cbu.uz/common/arkhiv_valut/excel.php";
const OUTPUT_PATH = resolve(dirname(fileURLToPath(import.meta.url)), "../packages/tender-balance/src/data/cbu-fin-fx-2015-2025.json");
const CACHE_PATH = join(tmpdir(), "tenderapps-cbu-fin-fx-2015-2025");
const TARGETS = ["USD", "EUR"];
const execFileAsync = promisify(execFile);

function isoDate(year, month, day) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function cbuDate(year, month, day) {
  return `${String(day).padStart(2, "0")}.${String(month).padStart(2, "0")}.${year}`;
}

function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

async function fetchMonth(year, month, attempt = 1) {
  const cacheFile = join(CACHE_PATH, `${year}-${String(month).padStart(2, "0")}.xls`);
  try {
    await access(cacheFile);
    return new Uint8Array(await readFile(cacheFile));
  } catch {
    // The official archive is intentionally cached outside the repository between retries.
  }
  try {
    const curlCommand = process.platform === "win32" ? "curl.exe" : "curl";
    const { stdout } = await execFileAsync(curlCommand, [
      "--silent", "--show-error", "--fail", "--request", "POST", PROVIDER_ENDPOINT,
      "--data-urlencode", "format=XLS",
      "--data-urlencode", `FROM_MONTH=${cbuDate(year, month, 1)}`,
      "--data-urlencode", `TO_YEAR=${cbuDate(year, month, daysInMonth(year, month))}`,
      "--data-urlencode", "lang=en",
      "--data-urlencode", "rates=",
    ], {
      encoding: "buffer",
      maxBuffer: 16 * 1024 * 1024,
    });
    const bytes = new Uint8Array(stdout);
    if (bytes.length < 1_000) throw new Error(`CBU returned an unexpectedly small archive (${bytes.length} bytes)`);
    await mkdir(CACHE_PATH, { recursive: true });
    await writeFile(cacheFile, bytes);
    return bytes;
  } catch (error) {
    if (attempt >= 8) throw error;
    await new Promise((resolveDelay) => setTimeout(resolveDelay, Math.min(30_000, attempt * attempt * 1_500)));
    return fetchMonth(year, month, attempt + 1);
  }
}

function parseMonth(bytes, year, month) {
  const workbook = XLSX.read(bytes, { type: "array", cellDates: false });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: null });
  const header = rows[1] ?? [];
  const columns = [];
  for (let index = 2; index < header.length; index += 2) {
    const title = String(header[index] ?? "").trim();
    const code = title.match(/\((\d{3})\)\s*$/)?.[1];
    if (!code) continue;
    columns.push({
      code,
      name: title.replace(/\s*\(\d{3}\)\s*$/, "").replace(/\s+/g, " ").trim(),
      nominalColumn: index - 1,
      rateColumn: index,
    });
  }

  const observations = [];
  for (const row of rows.slice(2)) {
    const date = String(row[0] ?? "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    for (const column of columns) {
      const nominal = Number(row[column.nominalColumn]);
      const rate = Number(row[column.rateColumn]);
      if (!(nominal > 0) || !Number.isFinite(rate) || !(rate > 0)) continue;
      observations.push({ date, code: column.code, name: column.name, uzsPerUnit: rate / nominal });
    }
  }
  if (!observations.length) throw new Error(`No CBU observations parsed for ${year}-${String(month).padStart(2, "0")}`);
  return observations;
}

function roundRate(value) {
  return Number(value.toPrecision(15));
}

function aggregate(observations) {
  const byDate = new Map();
  const nameByCode = new Map();
  for (const observation of observations) {
    const dateRates = byDate.get(observation.date) ?? new Map();
    dateRates.set(observation.code, observation.uzsPerUnit);
    byDate.set(observation.date, dateRates);
    nameByCode.set(observation.code, observation.name);
  }

  const currencies = {};
  const years = Array.from({ length: END_YEAR - START_YEAR + 1 }, (_, index) => String(START_YEAR + index));
  const allCodes = Array.from(nameByCode.keys()).sort();

  for (const year of years) {
    const yearDates = Array.from(byDate.keys()).filter((date) => date.startsWith(`${year}-`)).sort();
    const targetCodes = { USD: "840", EUR: "978" };
    for (const sourceCode of ["UZS", ...allCodes]) {
      const sourceCurrency = sourceCode === "UZS"
        ? "UZS"
        : sourceCode === "840"
          ? "USD"
          : sourceCode === "978"
            ? "EUR"
            : null;
      const sourceName = sourceCode === "UZS" ? "Uzbek Sum" : nameByCode.get(sourceCode);
      const currencyCode = sourceCurrency ?? observations.find((observation) => observation.code === sourceCode)?.currency;
      void currencyCode;

      const targetRates = {};
      for (const target of TARGETS) {
        const targetCode = targetCodes[target];
        const crossObservations = yearDates.flatMap((date) => {
          const rates = byDate.get(date);
          const targetUzs = rates?.get(targetCode);
          const sourceUzs = sourceCode === "UZS" ? 1 : rates?.get(sourceCode);
          return targetUzs && sourceUzs ? [{ date, rate: sourceUzs / targetUzs }] : [];
        });
        if (!crossObservations.length) continue;
        const closing = crossObservations.at(-1);
        targetRates[target] = {
          average: roundRate(crossObservations.reduce((sum, item) => sum + item.rate, 0) / crossObservations.length),
          closing: roundRate(closing.rate),
          closingDate: closing.date,
          observationCount: crossObservations.length,
        };
      }
      if (!Object.keys(targetRates).length) continue;

      const stableCurrencyCode = sourceCode === "UZS"
        ? "UZS"
        : sourceCode === "840"
          ? "USD"
          : sourceCode === "978"
            ? "EUR"
            : observations.find((observation) => observation.code === sourceCode)?.alphaCode;
      const key = stableCurrencyCode ?? sourceCode;
      currencies[key] ??= { numericCode: sourceCode === "UZS" ? null : sourceCode, name: sourceName, years: {} };
      currencies[key].years[year] = targetRates;
    }
  }
  return currencies;
}

async function mapWithConcurrency(items, concurrency, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  async function run() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, run));
  return results;
}

const months = [];
for (let year = START_YEAR; year <= END_YEAR; year += 1) {
  for (let month = 1; month <= 12; month += 1) months.push({ year, month });
}

const monthlyObservations = await mapWithConcurrency(months, 1, async ({ year, month }, index) => {
  const bytes = await fetchMonth(year, month);
  process.stdout.write(`\rFetched ${index + 1}/${months.length}: ${year}-${String(month).padStart(2, "0")}`);
  const parsed = parseMonth(bytes, year, month);
  await new Promise((resolveDelay) => setTimeout(resolveDelay, 250));
  return parsed;
});
process.stdout.write("\n");

const observations = monthlyObservations.flat().map((observation) => {
  const alphaMatch = observation.name.match(/\b(?:USD|EUR)\b/);
  return { ...observation, alphaCode: observation.code === "840" ? "USD" : observation.code === "978" ? "EUR" : alphaMatch?.[0] };
});

// Resolve alpha codes from the current official JSON vocabulary because the XLS archive identifies currencies by ISO numeric code.
const vocabularyResponse = await fetch("https://cbu.uz/en/arkhiv-kursov-valyut/json/");
if (!vocabularyResponse.ok) throw new Error(`CBU vocabulary returned HTTP ${vocabularyResponse.status}`);
const vocabulary = await vocabularyResponse.json();
const alphaByNumeric = new Map(vocabulary.map((item) => [String(item.Code).padStart(3, "0"), item.Ccy]));
for (const observation of observations) observation.alphaCode = alphaByNumeric.get(observation.code) ?? observation.alphaCode ?? observation.code;

const currencies = aggregate(observations);
const normalizedObservationHash = createHash("sha256")
  .update(observations.map((item) => `${item.date}|${item.code}|${item.uzsPerUnit}`).sort().join("\n"))
  .digest("hex");
const dataset = {
  schemaVersion: "1.0.0",
  datasetId: "TEA-DS-CBU-FIN-FX-2015-2025",
  provider: "Central Bank of the Republic of Uzbekistan",
  providerArchiveUrl: "https://cbu.uz/en/arkhiv-kursov-valyut/",
  providerApiDocumentationUrl: "https://cbu.uz/en/arkhiv-kursov-valyut/veb-masteram/",
  sourceEndpoint: PROVIDER_ENDPOINT,
  retrievedAt: new Date().toISOString(),
  range: { from: isoDate(START_YEAR, 1, 1), to: isoDate(END_YEAR, 12, 31) },
  targetCurrencies: TARGETS,
  methodology: {
    quote: "Target-currency units per source-currency unit",
    closing: "Last common official CBU observation on or before 31 December of the source-driven year",
    average: "Arithmetic mean of daily cross-rates on common official CBU observation dates in the source-driven year",
    sourceNormalization: "Each CBU quoted rate is divided by its published nominal before cross-rate calculation",
  },
  sourceArchiveRequests: months.length,
  normalizedObservationCount: observations.length,
  normalizedObservationSha256: normalizedObservationHash,
  currencies,
};

await mkdir(dirname(OUTPUT_PATH), { recursive: true });
await writeFile(OUTPUT_PATH, `${JSON.stringify(dataset)}\n`, "utf8");
console.log(`Wrote ${OUTPUT_PATH}`);
console.log(`Currencies: ${Object.keys(currencies).length}; normalized observations: ${observations.length}`);
