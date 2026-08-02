"use client";

import { useState } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { Download, Upload, CheckCircle2, XCircle } from "lucide-react";
import { bulkImportProducts, type ImportRow, type ImportResult } from "@/lib/actions/admin-import";
import { useToastStore } from "@/store/toast-store";

function normalizeKeys(row: Record<string, unknown>): ImportRow {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    out[key.trim().toLowerCase().replace(/\s+/g, "_")] = value;
  }
  return out as ImportRow;
}

export default function AdminImportPage() {
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [results, setResults] = useState<ImportResult[] | null>(null);
  const [importing, setImporting] = useState(false);
  const push = useToastStore((s) => s.push);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResults(null);

    const isCsv = file.name.toLowerCase().endsWith(".csv");

    if (isCsv) {
      Papa.parse<Record<string, unknown>>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (parsed) => setRows(parsed.data.map(normalizeKeys)),
      });
    } else {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
        setRows(json.map(normalizeKeys));
      };
      reader.readAsArrayBuffer(file);
    }
  }

  async function handleImport() {
    if (rows.length === 0) return;
    setImporting(true);
    const res = await bulkImportProducts(rows);
    setImporting(false);
    setResults(res);
    const errors = res.filter((r) => r.status === "error").length;
    push(
      errors === 0 ? `${res.length} produits importes avec succes` : `${res.length - errors} reussis, ${errors} erreurs`,
      errors === 0 ? "success" : "error"
    );
  }

  return (
    <div className="max-w-3xl">
      <h1 className="font-bold text-2xl text-brand-ink mb-2">Importer des produits</h1>
      <p className="text-brand-gray text-sm mb-6">
        Importez des produits en masse depuis un fichier CSV ou Excel. Les champs requis sont: name, category, price, sku.
      </p>

      <a
        href="/templates/rapidevite-import-template.csv"
        download
        className="inline-flex items-center gap-2 text-sm font-semibold text-brand-orange mb-6"
      >
        <Download className="w-4 h-4" /> Telecharger le modele CSV
      </a>

      <div className="bg-white border border-brand-border rounded-2xl p-5 space-y-4">
        <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFile} className="text-sm" />
        {fileName && <p className="text-sm text-brand-gray">{rows.length} lignes detectees dans {fileName}</p>}

        {rows.length > 0 && (
          <div className="overflow-x-auto border border-brand-border rounded-xl">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-brand-gray border-b border-brand-border bg-brand-cream">
                  <th className="px-3 py-2">Nom</th>
                  <th className="px-3 py-2">Categorie</th>
                  <th className="px-3 py-2">Prix</th>
                  <th className="px-3 py-2">SKU</th>
                  <th className="px-3 py-2">Stock</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 8).map((r, i) => (
                  <tr key={i} className="border-b border-brand-border last:border-0">
                    <td className="px-3 py-2">{r.name}</td>
                    <td className="px-3 py-2">{r.category}</td>
                    <td className="px-3 py-2">{r.price}</td>
                    <td className="px-3 py-2">{r.sku}</td>
                    <td className="px-3 py-2">{r.inventory}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > 8 && <p className="text-xs text-brand-gray px-3 py-2">+{rows.length - 8} lignes supplementaires</p>}
          </div>
        )}

        <button
          onClick={handleImport}
          disabled={rows.length === 0 || importing}
          className="flex items-center gap-2 rounded-full bg-brand-orange text-white text-sm font-semibold px-6 py-2.5 hover:bg-brand-orange-dark transition disabled:opacity-50"
        >
          <Upload className="w-4 h-4" /> {importing ? "Importation..." : `Importer ${rows.length || ""} produits`}
        </button>
      </div>

      {results && (
        <div className="mt-6 bg-white border border-brand-border rounded-2xl p-5">
          <h2 className="font-semibold text-brand-ink mb-3">Resultats</h2>
          <ul className="space-y-1.5 max-h-96 overflow-y-auto">
            {results.map((r, i) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                {r.status === "error" ? (
                  <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-brand-green shrink-0" />
                )}
                <span className="text-brand-gray">Ligne {r.row}:</span>
                <span className="text-brand-ink">{r.name}</span>
                {r.message && <span className="text-red-500">— {r.message}</span>}
                {r.status !== "error" && <span className="text-brand-gray">({r.status === "created" ? "cree" : "mis a jour"})</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
