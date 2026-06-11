"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  createTransactionsBulk,
  createRule,
  deleteRule,
} from "@/actions/finance";
import { formatINR, toMinor } from "@/lib/money";
import { cn } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
  icon: string;
  kind: string;
}
interface Rule {
  id: string;
  pattern: string;
  categoryId: string;
}

/** Tiny CSV parser handling quoted fields. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') inQuotes = false;
      else cur += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ",") {
      row.push(cur);
      cur = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cur);
      cur = "";
      if (row.some((c) => c.trim())) rows.push(row);
      row = [];
    } else cur += ch;
  }
  row.push(cur);
  if (row.some((c) => c.trim())) rows.push(row);
  return rows;
}

function normalizeDate(raw: string): string | null {
  const t = raw.trim();
  let m = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = t.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
  if (m)
    return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`; // DD/MM/YYYY (Indian banks)
  return null;
}

interface PreviewRow {
  date: string;
  description: string;
  amountMinor: number;
  type: "expense" | "income";
  categoryId: string | null;
  include: boolean;
}

export function ImportClient({
  accounts,
  categories,
  rules,
}: {
  accounts: { id: string; name: string }[];
  categories: Category[];
  rules: Rule[];
}) {
  const [csvText, setCsvText] = useState("");
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [dateCol, setDateCol] = useState(0);
  const [descCol, setDescCol] = useState(1);
  const [amountCol, setAmountCol] = useState(2);
  const [mode, setMode] = useState<"signed" | "debit-credit">("signed");
  const [creditCol, setCreditCol] = useState(3);
  const [hasHeader, setHasHeader] = useState(true);
  const [preview, setPreview] = useState<PreviewRow[] | null>(null);
  const [pending, startTransition] = useTransition();

  // rules manager state
  const [rulePattern, setRulePattern] = useState("");
  const [ruleCat, setRuleCat] = useState("");

  const rows = useMemo(() => (csvText ? parseCsv(csvText) : []), [csvText]);
  const dataRows = hasHeader ? rows.slice(1) : rows;
  const headerRow = hasHeader && rows.length ? rows[0] : null;
  const maxCols = rows.reduce((m, r) => Math.max(m, r.length), 0);

  function applyRules(description: string): string | null {
    const lower = description.toLowerCase();
    for (const r of rules) {
      if (lower.includes(r.pattern.toLowerCase())) return r.categoryId;
    }
    return null;
  }

  function buildPreview() {
    const out: PreviewRow[] = [];
    const seen = new Set<string>();
    for (const r of dataRows) {
      const date = normalizeDate(r[dateCol] ?? "");
      const description = (r[descCol] ?? "").trim();
      if (!date) continue;

      let amountMinor = 0;
      let type: "expense" | "income" = "expense";
      if (mode === "signed") {
        const v = toMinor(r[amountCol] ?? "0");
        if (!v) continue;
        type = v < 0 ? "expense" : "income";
        amountMinor = Math.abs(v);
      } else {
        const debit = Math.abs(toMinor(r[amountCol] ?? "0"));
        const credit = Math.abs(toMinor(r[creditCol] ?? "0"));
        if (debit) {
          amountMinor = debit;
          type = "expense";
        } else if (credit) {
          amountMinor = credit;
          type = "income";
        } else continue;
      }

      // dedupe within the file
      const key = `${date}|${description}|${amountMinor}|${type}`;
      if (seen.has(key)) continue;
      seen.add(key);

      out.push({
        date,
        description,
        amountMinor,
        type,
        categoryId: type === "expense" ? applyRules(description) : null,
        include: true,
      });
    }
    if (!out.length) toast.error("No parseable rows — check column mapping");
    setPreview(out);
  }

  function doImport() {
    if (!preview) return;
    const rowsToImport = preview.filter((p) => p.include);
    startTransition(async () => {
      const res = await createTransactionsBulk(
        rowsToImport.map((p) => ({
          accountId,
          categoryId: p.categoryId,
          type: p.type,
          amountMinor: p.amountMinor,
          date: p.date,
          note: p.description,
        }))
      );
      toast.success(`Imported ${res.imported} transactions`);
      setPreview(null);
      setCsvText("");
    });
  }

  const catById = (id: string | null) => categories.find((c) => c.id === id);

  return (
    <div className="space-y-6">
      <section className="space-y-3 rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-semibold">1 · Paste or upload bank CSV</h3>
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent">
            <Upload className="h-3.5 w-3.5" /> Upload .csv
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) setCsvText(await f.text());
              }}
            />
          </label>
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm outline-none"
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                Into: {a.name}
              </option>
            ))}
          </select>
          <label className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={hasHeader}
              onChange={(e) => setHasHeader(e.target.checked)}
            />
            First row is header
          </label>
        </div>
        <textarea
          value={csvText}
          onChange={(e) => setCsvText(e.target.value)}
          rows={5}
          placeholder={"Date,Description,Amount\n11/06/2026,SWIGGY BANGALORE,-450.00"}
          className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs outline-none"
        />
      </section>

      {rows.length > 0 && (
        <section className="space-y-3 rounded-lg border border-border bg-card p-4">
          <h3 className="text-sm font-semibold">2 · Map columns</h3>
          <div className="flex flex-wrap gap-3 text-sm">
            <ColPick label="Date" value={dateCol} onChange={setDateCol} max={maxCols} header={headerRow} />
            <ColPick label="Description" value={descCol} onChange={setDescCol} max={maxCols} header={headerRow} />
            <label className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              Amount style
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as typeof mode)}
                className="h-8 rounded-md border border-input bg-background px-2 text-sm outline-none"
              >
                <option value="signed">Single signed column</option>
                <option value="debit-credit">Separate debit/credit</option>
              </select>
            </label>
            <ColPick
              label={mode === "signed" ? "Amount" : "Debit"}
              value={amountCol}
              onChange={setAmountCol}
              max={maxCols}
              header={headerRow}
            />
            {mode === "debit-credit" && (
              <ColPick label="Credit" value={creditCol} onChange={setCreditCol} max={maxCols} header={headerRow} />
            )}
          </div>
          <button
            onClick={buildPreview}
            className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            Preview ({dataRows.length} rows)
          </button>
        </section>
      )}

      {preview && (
        <section className="space-y-3 rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">
              3 · Review ({preview.filter((p) => p.include).length} selected)
            </h3>
            <button
              onClick={doImport}
              disabled={pending || !preview.some((p) => p.include)}
              className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {pending ? "Importing…" : "Import"}
            </button>
          </div>
          <div className="max-h-96 space-y-1 overflow-y-auto">
            {preview.map((p, i) => (
              <div
                key={i}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-1.5 text-xs",
                  !p.include && "opacity-40"
                )}
              >
                <input
                  type="checkbox"
                  checked={p.include}
                  onChange={() =>
                    setPreview((prev) =>
                      prev!.map((x, j) =>
                        j === i ? { ...x, include: !x.include } : x
                      )
                    )
                  }
                />
                <span className="w-20 shrink-0 text-muted-foreground">{p.date}</span>
                <span className="min-w-0 flex-1 truncate">{p.description}</span>
                <select
                  value={p.categoryId ?? ""}
                  onChange={(e) =>
                    setPreview((prev) =>
                      prev!.map((x, j) =>
                        j === i ? { ...x, categoryId: e.target.value || null } : x
                      )
                    )
                  }
                  className="h-7 w-32 rounded border border-input bg-background px-1 outline-none"
                >
                  <option value="">No category</option>
                  {categories
                    .filter((c) => c.kind === p.type || p.type === "income")
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.icon} {c.name}
                      </option>
                    ))}
                </select>
                <span
                  className={cn(
                    "w-24 shrink-0 text-right font-medium tabular-nums",
                    p.type === "expense"
                      ? "text-red-500"
                      : "text-emerald-600 dark:text-emerald-400"
                  )}
                >
                  {p.type === "expense" ? "−" : "+"}
                  {formatINR(p.amountMinor)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3 rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-semibold">Auto-categorize rules</h3>
        <p className="text-xs text-muted-foreground">
          If the description contains the pattern (case-insensitive), the
          category applies automatically — e.g. &quot;SWIGGY&quot; → Food.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!rulePattern.trim() || !ruleCat) return;
            startTransition(async () => {
              await createRule(rulePattern.trim(), ruleCat);
              setRulePattern("");
            });
          }}
          className="flex flex-wrap gap-2"
        >
          <input
            placeholder="Pattern (SWIGGY, UBER…)"
            value={rulePattern}
            onChange={(e) => setRulePattern(e.target.value)}
            className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none"
          />
          <select
            value={ruleCat}
            onChange={(e) => setRuleCat(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm outline-none"
          >
            <option value="">Category…</option>
            {categories
              .filter((c) => c.kind === "expense")
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </option>
              ))}
          </select>
          <button
            disabled={!rulePattern.trim() || !ruleCat}
            className="inline-flex h-9 items-center gap-1 rounded-md border border-border px-3 text-sm hover:bg-accent disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" /> Add rule
          </button>
        </form>
        <div className="space-y-1">
          {rules.map((r) => (
            <div key={r.id} className="group flex items-center gap-2 text-sm">
              <code className="rounded bg-accent px-1.5 py-0.5 text-xs">
                {r.pattern}
              </code>
              <span className="text-muted-foreground">→</span>
              <span className="flex-1">
                {catById(r.categoryId)?.icon} {catById(r.categoryId)?.name}
              </span>
              <button
                onClick={() => startTransition(() => deleteRule(r.id))}
                className="hidden text-muted-foreground hover:text-red-500 group-hover:block"
                aria-label="Delete rule"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ColPick({
  label,
  value,
  onChange,
  max,
  header,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  max: number;
  header: string[] | null;
}) {
  return (
    <label className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-8 rounded-md border border-input bg-background px-2 text-sm outline-none"
      >
        {Array.from({ length: max }, (_, i) => (
          <option key={i} value={i}>
            {header?.[i] ? `${i}: ${header[i].slice(0, 18)}` : `Column ${i}`}
          </option>
        ))}
      </select>
    </label>
  );
}
