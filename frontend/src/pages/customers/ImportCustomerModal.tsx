/**
 * @file ImportCustomerModal.tsx
 * @description Dialog modal allowing bulk CSV import of customer master records matching system columns.
 * Supports template download, file upload, instant parsed preview, and batch submission.
 */

import { useState, useRef, ChangeEvent } from "react";
import { X, Upload, Download, FileSpreadsheet, CheckCircle2, AlertCircle, Trash2, Loader2 } from "lucide-react";
import * as XLSX from "xlsx";
import DraggableModalBox from "../../components/DraggableModalBox";
import { CustomerData, customersApi } from "../../api";

interface ImportCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  notify?: (msg: string) => void;
  existingCount?: number;
}

interface ParsedCustomerRow {
  customer_code?: string;
  customer_type: "Individual" | "Enterprise" | string;
  name: string;
  contact?: string;
  sex?: string;
  dob?: string;
  nation?: string;
  address?: string;
  is_active: boolean;
  isValid: boolean;
  error?: string;
}

/**
 * Standard CSV parser handling quotes, escaped quotes, and newlines.
 */
function parseCSV(text: string): string[][] {
  const clean = text.replace(/^\uFEFF/, ""); // Remove UTF-8 BOM
  const rows: string[][] = [];
  let row: string[] = [];
  let current = "";
  let insideQuotes = false;

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    const nextChar = clean[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === "," && !insideQuotes) {
      row.push(current.trim());
      current = "";
    } else if ((char === "\r" || char === "\n") && !insideQuotes) {
      if (char === "\r" && nextChar === "\n") {
        i++;
      }
      row.push(current.trim());
      if (row.some((cell) => cell.length > 0)) {
        rows.push(row);
      }
      row = [];
      current = "";
    } else {
      current += char;
    }
  }

  if (current.length > 0 || row.length > 0) {
    row.push(current.trim());
    if (row.some((cell) => cell.length > 0)) {
      rows.push(row);
    }
  }

  return rows;
}

function normalizeKey(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export default function ImportCustomerModal({
  isOpen,
  onClose,
  onSuccess,
  notify,
  existingCount = 0,
}: ImportCustomerModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedCustomerRow[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  function handleDownloadTemplate() {
    const headers = [
      "Customer Code",
      "Customer Type",
      "Customer Name",
      "Contact",
      "Sex",
      "DOB",
      "Nation",
      "Address",
      "Status",
    ];
    const sampleRows = [
      [
        `CUST-${String(existingCount + 1).padStart(3, "0")}`,
        "Individual",
        "Sok Dara",
        "+855 12 345 678",
        "Male",
        "1992-05-18",
        "Cambodian",
        "Phnom Penh",
        "Active",
      ],
      [
        `CUST-${String(existingCount + 2).padStart(3, "0")}`,
        "Enterprise",
        "Angkor Gold Trading Co.",
        "+855 23 888 999",
        "",
        "",
        "Cambodian",
        "Siem Reap",
        "Active",
      ],
    ];

    const csvContent =
      "\uFEFF" +
      [
        headers.join(","),
        ...sampleRows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")),
      ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "customers_import_template.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    if (notify) notify("Customer import template downloaded");
  }

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setParseError(null);

    try {
      let rawRows: string[][] = [];
      const fileName = selected.name.toLowerCase();
      const isExcel = fileName.endsWith(".xlsx") || fileName.endsWith(".xls");

      if (isExcel) {
        const buffer = await selected.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          setParseError("The selected Excel workbook contains no sheets.");
          setParsedRows([]);
          return;
        }
        const worksheet = workbook.Sheets[firstSheetName];
        const sheetData = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
          header: 1,
          defval: "",
        });
        rawRows = sheetData.map((row) =>
          Array.isArray(row) ? row.map((cell) => String(cell ?? "").trim()) : []
        );
      } else {
        const text = await selected.text();
        if (!text) {
          setParseError("The selected file is empty.");
          setParsedRows([]);
          return;
        }
        rawRows = parseCSV(text);
      }

      if (rawRows.length < 2) {
        setParseError("The file must contain a header row and at least one data row.");
        setParsedRows([]);
        return;
      }

      const rawHeaders = rawRows[0];
      const headerMap: Record<string, number> = {};
      rawHeaders.forEach((h, idx) => {
        const norm = normalizeKey(h);
        headerMap[norm] = idx;
      });

      // Determine column indexes with fuzzy mapping
      const getColIdx = (aliases: string[]) => {
        for (const alias of aliases) {
          const key = normalizeKey(alias);
          if (key in headerMap) return headerMap[key];
        }
        return -1;
      };

      const codeIdx = getColIdx(["Customer Code", "CustomerCode", "Code", "ID"]);
      const typeIdx = getColIdx(["Customer Type", "CustomerType", "Type"]);
      const nameIdx = getColIdx(["Customer Name", "CustomerName", "Name", "Full Name", "Client Name"]);
      const contactIdx = getColIdx(["Contact", "Phone", "Tel", "Telephone", "Mobile"]);
      const sexIdx = getColIdx(["Sex", "Gender"]);
      const dobIdx = getColIdx(["DOB", "Date of Birth", "BirthDate", "Birthday"]);
      const nationIdx = getColIdx(["Nation", "Nationality", "Country"]);
      const addressIdx = getColIdx(["Address", "Location", "Addr"]);
      const statusIdx = getColIdx(["Status", "Active", "Is Active", "IsActive"]);

      const rows: ParsedCustomerRow[] = [];
      for (let r = 1; r < rawRows.length; r++) {
        const cells = rawRows[r];
        if (!cells || cells.length === 0 || (cells.length === 1 && !cells[0].trim())) continue;

        const rawName = nameIdx >= 0 ? cells[nameIdx] || "" : "";
        const rawCode = codeIdx >= 0 ? cells[codeIdx] || "" : "";
        const rawType = typeIdx >= 0 ? cells[typeIdx] || "" : "";
        const rawContact = contactIdx >= 0 ? cells[contactIdx] || "" : "";
        const rawSex = sexIdx >= 0 ? cells[sexIdx] || "" : "";
        const rawDob = dobIdx >= 0 ? cells[dobIdx] || "" : "";
        const rawNation = nationIdx >= 0 ? cells[nationIdx] || "" : "";
        const rawAddress = addressIdx >= 0 ? cells[addressIdx] || "" : "";
        const rawStatus = statusIdx >= 0 ? (cells[statusIdx] || "").toLowerCase() : "active";

        const isValid = !!rawName.trim();
        const normalizedType =
          rawType.toLowerCase().includes("enterprise") || rawType.toLowerCase().includes("company")
            ? "Enterprise"
            : "Individual";

        const isActive =
          rawStatus === "" ||
          rawStatus.includes("active") ||
          rawStatus === "true" ||
          rawStatus === "1" ||
          rawStatus === "yes";

        rows.push({
          customer_code: rawCode.trim() || undefined,
          customer_type: normalizedType,
          name: rawName.trim(),
          contact: rawContact.trim() || undefined,
          sex: normalizedType === "Enterprise" ? undefined : rawSex.trim() || undefined,
          dob: normalizedType === "Enterprise" ? undefined : rawDob.trim() || undefined,
          nation: rawNation.trim() || undefined,
          address: rawAddress.trim() || undefined,
          is_active: isActive,
          isValid,
          error: !isValid ? "Customer Name is required" : undefined,
        });
      }

      if (rows.length === 0) {
        setParseError("No valid data rows found in the uploaded file.");
      }
      setParsedRows(rows);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to parse file.";
      setParseError(`Parse error: ${msg}`);
      setParsedRows([]);
    }
  }

  function handleClearFile() {
    setFile(null);
    setParsedRows([]);
    setParseError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleImportSubmit() {
    const validRows = parsedRows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      if (notify) notify("No valid customer records to import");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: Partial<CustomerData>[] = validRows.map((r) => ({
        customer_code: r.customer_code,
        customer_type: r.customer_type,
        name: r.name,
        contact: r.contact,
        sex: r.sex || null,
        dob: r.dob || null,
        nation: r.nation || null,
        address: r.address || null,
        is_active: r.is_active,
      }));

      const res = await customersApi.bulkImportCustomers(payload);
      if (notify) {
        notify(res.message || `Successfully imported ${res.imported_count} customer(s)`);
      }
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to bulk import customers";
      setParseError(msg);
      if (notify) notify(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  const validCount = parsedRows.filter((r) => r.isValid).length;
  const invalidCount = parsedRows.length - validCount;

  return (
    <div
      className="fixed inset-0 z-50 bg-transparent flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <DraggableModalBox
        resetKey="import-customer-modal"
        className="bg-white rounded-3xl shadow-none border border-slate-300 w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60 shrink-0">
          <div>
            <h3 className="font-semibold text-slate-800 text-sm sm:text-base">Bulk Import Customers</h3>
            <p className="text-[11px] text-slate-400">Upload CSV or Excel file (.csv, .xlsx, .xls) to populate directory</p>
          </div>
          <button
            type="button"
            aria-label="Close dialog"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors focus:outline-none cursor-pointer disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 flex-1 overflow-y-auto">
          {/* Top Actions / Template Download */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700">Select CSV / Excel File</span>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer"
            >
              <Download size={13} className="text-slate-500" />
              Download Template
            </button>
          </div>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.xls,.xlsx"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Upload Dropzone */}
          {!file ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-white hover:bg-slate-50/50 flex flex-col items-center justify-center"
            >
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 mb-2">
                <Upload size={20} />
              </div>
              <p className="text-xs font-semibold text-slate-700">Click to select CSV or Excel file (.csv, .xlsx, .xls)</p>
            </div>
          ) : (
            <div className="flex items-center justify-between p-3 bg-indigo-50/40 border border-indigo-100 rounded-xl">
              <div className="flex items-center gap-2.5 min-w-0">
                <FileSpreadsheet size={18} className="text-indigo-600 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-800 truncate">{file.name}</p>
                  <p className="text-[11px] text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClearFile}
                disabled={isSubmitting}
                className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-white transition-colors cursor-pointer"
                title="Remove file"
              >
                <Trash2 size={16} />
              </button>
            </div>
          )}

          {/* Error Message */}
          {parseError && (
            <p className="text-xs text-rose-600">
              {parseError}
            </p>
          )}

          {/* Parsed Preview Table */}
          {parsedRows.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 font-semibold text-slate-700">
                  <span>Data Preview ({parsedRows.length} rows detected)</span>
                </div>
                <div className="flex items-center gap-3 text-[11px]">
                  <span className="flex items-center gap-1 text-emerald-600 font-medium">
                    <CheckCircle2 size={13} /> {validCount} Valid
                  </span>
                  {invalidCount > 0 && (
                    <span className="flex items-center gap-1 text-rose-500 font-medium">
                      <AlertCircle size={13} /> {invalidCount} Incomplete
                    </span>
                  )}
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                <table className="w-full text-[11px] text-left">
                  <thead className="bg-slate-50 text-slate-500 font-semibold sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-2.5 w-8">#</th>
                      <th className="py-2 px-2.5">Code</th>
                      <th className="py-2 px-2.5">Type</th>
                      <th className="py-2 px-2.5">Name</th>
                      <th className="py-2 px-2.5">Contact</th>
                      <th className="py-2 px-2.5">Sex</th>
                      <th className="py-2 px-2.5">DOB</th>
                      <th className="py-2 px-2.5">Nation</th>
                      <th className="py-2 px-2.5">Address</th>
                      <th className="py-2 px-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedRows.map((r, i) => (
                      <tr key={i} className={!r.isValid ? "bg-rose-50/50" : "hover:bg-slate-50/60"}>
                        <td className="py-2 px-2.5 text-slate-400 font-mono text-[10px]">{i + 1}</td>
                        <td className="py-2 px-2.5 font-normal text-slate-700 font-mono">
                          {r.customer_code || <span className="text-slate-400 italic">Auto</span>}
                        </td>
                        <td className="py-2 px-2.5 text-slate-700 font-normal">
                          {r.customer_type}
                        </td>
                        <td className="py-2 px-2.5 font-normal text-slate-800">
                          {r.name || <span className="text-rose-500 font-normal italic">Missing name</span>}
                        </td>
                        <td className="py-2 px-2.5 text-slate-600">{r.contact || "-"}</td>
                        <td className="py-2 px-2.5 text-slate-600">{r.sex || "-"}</td>
                        <td className="py-2 px-2.5 text-slate-600">{r.dob || "-"}</td>
                        <td className="py-2 px-2.5 text-slate-600">{r.nation || "-"}</td>
                        <td className="py-2 px-2.5 text-slate-600 max-w-[120px] truncate">{r.address || "-"}</td>
                        <td className="py-2 px-2.5">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                              r.is_active
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-slate-100 text-slate-500 border border-slate-200"
                            }`}
                          >
                            {r.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50/50 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleImportSubmit}
            disabled={isSubmitting || validCount === 0}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload size={14} />
                Import {validCount > 0 ? `(${validCount})` : ""} Customers
              </>
            )}
          </button>
        </div>
      </DraggableModalBox>
    </div>
  );
}
