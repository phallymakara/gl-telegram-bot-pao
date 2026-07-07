import React, { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Calendar, Save, Copy } from "lucide-react";
import Card from "../components/Card";
import IconBtn from "../components/IconBtn";
import { api, SlotTableData } from "../data/api";

interface SlotsPageProps {
  notify: (msg: string) => void;
}

export default function SlotsPage({ notify }: SlotsPageProps) {
  const [tables, setTables] = useState<SlotTableData[]>([]);
  const [editingTableId, setEditingTableId] = useState<number | null>(null);

  useEffect(() => {
    api.get<SlotTableData[]>("/api/slots/").then(setTables).catch(() => notify("Failed to load slots"));
  }, []);

  function addRow(tableId: number) {
    const dateStr = new Date().toISOString().split("T")[0];
    api.post<{ id: number; slot_date: string; premium: number }>(`/api/slots/${tableId}/rows`, { slot_date: dateStr, premium: 300 })
      .then((row) => {
        setTables((ts) => ts.map((t) => t.id === tableId ? { ...t, rows: [...t.rows, row] } : t));
      })
      .catch(() => notify("Failed to add row"));
  }

  function delRow(tableId: number, rowId: number) {
    api.delete(`/api/slots/${tableId}/rows/${rowId}`)
      .then(() => {
        setTables((ts) => ts.map((t) => t.id === tableId ? { ...t, rows: t.rows.filter((r) => r.id !== rowId) } : t));
        notify("Row deleted");
      })
      .catch(() => notify("Failed to delete row"));
  }

  function updateRowPremium(tableId: number, rowId: number, premium: number) {
    const row = tables.find((t) => t.id === tableId)?.rows.find((r) => r.id === rowId);
    if (!row) return;
    api.put(`/api/slots/${tableId}/rows/${rowId}`, { slot_date: row.slot_date, premium })
      .then(() => {
        setTables((ts) => ts.map((t) => t.id === tableId ? { ...t, rows: t.rows.map((r) => r.id === rowId ? { ...r, premium } : r) } : t));
      })
      .catch(() => notify("Failed to update premium"));
  }

  function updateStock(tableId: number, stock: number) {
    const table = tables.find((t) => t.id === tableId);
    if (!table) return;
    api.put(`/api/slots/${tableId}`, { table_name: table.table_name, stock })
      .then(() => {
        setTables((ts) => ts.map((t) => t.id === tableId ? { ...t, stock } : t));
      })
      .catch(() => notify("Failed to update stock"));
  }

  function renameTable(tableId: number, newName: string) {
    const table = tables.find((t) => t.id === tableId);
    if (!table) return;
    api.put(`/api/slots/${tableId}`, { table_name: newName, stock: table.stock })
      .then(() => setTables((ts) => ts.map((t) => t.id === tableId ? { ...t, table_name: newName } : t)))
      .catch(() => notify("Failed to rename table"));
  }

  function addTable() {
    api.post<SlotTableData>("/api/slots/", { table_name: `Table ${tables.length + 1}`, stock: 0 })
      .then((t) => setTables((ts) => [...ts, t]))
      .catch(() => notify("Failed to create table"));
  }

  function delTable(tableId: number) {
    api.delete(`/api/slots/${tableId}`)
      .then(() => {
        setTables((ts) => ts.filter((t) => t.id !== tableId));
        notify("Table deleted");
      })
      .catch(() => notify("Failed to delete table"));
  }

  async function duplicateTable(tableId: number) {
    const table = tables.find((t) => t.id === tableId);
    if (!table) return;
    try {
      const newTable = await api.post<SlotTableData>("/api/slots/", { table_name: `${table.table_name} (Copy)`, stock: table.stock });
      for (const row of table.rows) {
        await api.post(`/api/slots/${newTable.id}/rows`, { slot_date: row.slot_date, premium: row.premium });
      }
      const fullTable = await api.get<SlotTableData[]>("/api/slots/");
      setTables(fullTable);
      notify(`Table duplicated: ${newTable.table_name}`);
    } catch {
      notify("Failed to duplicate table");
    }
  }

  function saveTable(tableId: number) {
    notify("Table saved");
  }

  return (
    <div className="flex-1 pt-4 px-4 pb-2 sm:pt-4 sm:px-8 sm:pb-2 min-w-0 overflow-hidden w-full flex flex-col space-y-3 min-h-0">
      <div className="flex justify-start flex-shrink-0">
        <button onClick={addTable} className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-medium shadow-sm transition-all"><Plus size={15} /> Add New Table</button>
      </div>
      <div className="flex-1 overflow-y-auto space-y-4 min-h-0 pb-4">
        {tables.map((t) => (
          <Card key={t.id}>
            <div className="p-5 flex items-center justify-between border-b border-slate-100">
              <div className="flex items-center gap-2 h-[34px]">
                {editingTableId === t.id ? (
                  <input type="text" defaultValue={t.table_name} onBlur={(e) => { renameTable(t.id, e.target.value); setEditingTableId(null); }} onKeyDown={(e) => { if (e.key === "Enter") { renameTable(t.id, e.currentTarget.value); setEditingTableId(null); } }} autoFocus className="font-semibold text-slate-800 text-sm border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50" />
                ) : (
                  <h3 className="font-semibold text-slate-800">{t.table_name}</h3>
                )}
                <button onClick={() => setEditingTableId(editingTableId === t.id ? null : t.id)} className="text-slate-400 hover:text-indigo-600 focus:outline-none transition-colors" title="Rename Table"><Pencil size={13} /></button>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => duplicateTable(t.id)} className="text-sm flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"><Copy size={13} /> Duplicate Table</button>
                <button onClick={() => delTable(t.id)} className="text-sm flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50"><Trash2 size={13} /> Delete Table</button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-400 uppercase tracking-wide border-b border-slate-100 bg-slate-50/60">
                    <th className="px-5 py-3 font-medium">#</th>
                    <th className="px-5 py-3 font-medium">Slot Date</th>
                    <th className="px-5 py-3 font-medium">Premium (USD)</th>
                    <th className="px-5 py-3 font-medium text-center">Stock</th>
                    <th className="px-5 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {t.rows.map((r, idx) => (
                    <tr key={r.id} className="border-b border-slate-50">
                      <td className="px-5 py-3 text-slate-400">{idx + 1}</td>
                      <td className="px-5 py-3 text-slate-600 whitespace-nowrap"><div className="flex items-center gap-2"><Calendar size={13} className="text-slate-300" /> {r.slot_date}</div></td>
                      <td className="px-5 py-3">
                        <input value={r.premium} onChange={(e) => updateRowPremium(t.id, r.id, +e.target.value.replace(/[^0-9]/g, ""))} className="w-28 text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
                      </td>
                      {idx === 0 && (
                        <td rowSpan={t.rows.length} className="px-5 py-3 align-middle text-center bg-slate-50/50 border-l border-slate-100">
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Stock (KG)</span>
                            <input type="text" value={t.stock} onChange={(e) => updateStock(t.id, +e.target.value.replace(/[^0-9.]/g, ""))} className="w-20 text-center font-bold text-slate-700 text-base border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
                          </div>
                        </td>
                      )}
                      <td className="px-5 py-3">
                        <IconBtn title="Delete row" tone="danger" onClick={() => delRow(t.id, r.id)}><Trash2 size={15} /></IconBtn>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex border-t border-slate-100">
              <button onClick={() => addRow(t.id)} className="flex-1 py-3.5 text-sm text-indigo-600 font-medium hover:bg-indigo-50/50 flex items-center justify-center gap-1.5 border-r border-slate-100"><Plus size={15} /> Add New Row</button>
              <button onClick={() => saveTable(t.id)} className="flex-1 py-3.5 text-sm text-emerald-600 font-medium hover:bg-emerald-50/50 flex items-center justify-center gap-1.5"><Save size={15} /> Save Data</button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
