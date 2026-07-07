import React, { useState } from "react";
import { Plus, Pencil, Trash2, Calendar, Save, Copy } from "lucide-react";
import Card from "../components/Card";
import IconBtn from "../components/IconBtn";
import { slotTablesSeed, SlotTable } from "../data/mockData";

interface SlotsPageProps {
  notify: (msg: string) => void;
}

export default function SlotsPage({ notify }: SlotsPageProps) {
  const [tables, setTables] = useState<SlotTable[]>(slotTablesSeed);
  const [editingTableId, setEditingTableId] = useState<string | null>(null);

  function addRow(id: string) {
    setTables((ts) =>
      ts.map((t) =>
        t.id === id
          ? {
              ...t,
              rows: [...t.rows, { id: "r" + Date.now(), date: "13/06/2026", premium: 300 }]
            }
          : t
      )
    );
  }

  function delRow(tid: string, rid: string) {
    setTables((ts) =>
      ts.map((t) =>
        t.id === tid
          ? { ...t, rows: t.rows.filter((r) => r.id !== rid) }
          : t
      )
    );
    notify("Row deleted");
  }

  function setPremium(tid: string, rid: string, v: string) {
    const val = v === "" ? 0 : parseInt(v, 10);
    setTables((ts) =>
      ts.map((t) =>
        t.id === tid
          ? {
              ...t,
              rows: t.rows.map((r) => (r.id === rid ? { ...r, premium: val } : r))
            }
          : t
      )
    );
  }

  function setStock(id: string, v: string) {
    const val = v === "" ? 0 : parseFloat(v);
    setTables((ts) =>
      ts.map((t) => (t.id === id ? { ...t, stock: val } : t))
    );
  }

  function renameTable(id: string, newName: string) {
    setTables((ts) =>
      ts.map((t) => (t.id === id ? { ...t, name: newName } : t))
    );
  }

  function addTable() {
    setTables((ts) => [
      ...ts,
      {
        id: "t" + Date.now(),
        name: `Table ${ts.length + 1}`,
        stock: 0,
        rows: [{ id: "r" + Date.now(), date: "13/06/2026", premium: 300 }]
      }
    ]);
  }

  function delTable(id: string) {
    setTables((ts) => ts.filter((t) => t.id !== id));
    notify("Table deleted");
  }

  function duplicateTable(id: string) {
    const tableToDup = tables.find((t) => t.id === id);
    if (!tableToDup) return;
    
    const newTable: SlotTable = {
      ...tableToDup,
      id: "t" + Date.now(),
      name: `${tableToDup.name} (Copy)`,
      rows: tableToDup.rows.map((r, i) => ({
        ...r,
        id: "r" + Date.now() + i
      }))
    };
    
    setTables((ts) => {
      const idx = ts.findIndex((t) => t.id === id);
      if (idx === -1) return [...ts, newTable];
      const next = [...ts];
      next.splice(idx + 1, 0, newTable);
      return next;
    });
    
    notify(`Table duplicated: ${newTable.name}`);
  }

  return (
    <div className="flex-1 pt-4 px-4 pb-2 sm:pt-4 sm:px-8 sm:pb-2 min-w-0 overflow-hidden w-full flex flex-col space-y-3 min-h-0">
      <div className="flex justify-start flex-shrink-0">
        <button
          onClick={addTable}
          className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-medium shadow-sm transition-all"
        >
          <Plus size={15} /> Add New Table
        </button>
      </div>
      <div className="flex-1 overflow-y-auto space-y-4 min-h-0 pb-4">
      {tables.map((t) => (
        <Card key={t.id}>
          <div className="p-5 flex items-center justify-between border-b border-slate-100">
            <div className="flex items-center gap-2 h-[34px]">
              {editingTableId === t.id ? (
                <input
                  type="text"
                  defaultValue={t.name}
                  onBlur={(e) => {
                    renameTable(t.id, e.target.value);
                    setEditingTableId(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      renameTable(t.id, e.currentTarget.value);
                      setEditingTableId(null);
                    }
                  }}
                  autoFocus
                  className="font-semibold text-slate-800 text-sm border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50"
                />
              ) : (
                <h3 className="font-semibold text-slate-800">
                  {t.name}
                </h3>
              )}
              <button
                onClick={() => setEditingTableId(editingTableId === t.id ? null : t.id)}
                className="text-slate-400 hover:text-indigo-600 focus:outline-none transition-colors"
                title="Rename Table"
              >
                <Pencil size={13} />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => duplicateTable(t.id)}
                className="text-sm flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <Copy size={13} /> Duplicate Table
              </button>
              <button
                onClick={() => delTable(t.id)}
                className="text-sm flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50"
              >
                <Trash2 size={13} /> Delete Table
              </button>
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
                    <td className="px-5 py-3 text-slate-600 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Calendar size={13} className="text-slate-300" /> {r.date}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <input
                        value={r.premium}
                        onChange={(e) => setPremium(t.id, r.id, e.target.value.replace(/[^0-9]/g, ""))}
                        className="w-28 text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                      />
                    </td>
                    {idx === 0 && (
                      <td
                        rowSpan={t.rows.length}
                        className="px-5 py-3 align-middle text-center bg-slate-50/50 border-l border-slate-100"
                      >
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Stock (KG)</span>
                          <input
                            type="text"
                            value={t.stock}
                            onChange={(e) => setStock(t.id, e.target.value.replace(/[^0-9.]/g, ""))}
                            className="w-20 text-center font-bold text-slate-700 text-base border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                          />
                        </div>
                      </td>
                    )}
                    <td className="px-5 py-3">
                      <IconBtn title="Delete row" tone="danger" onClick={() => delRow(t.id, r.id)}>
                        <Trash2 size={15} />
                      </IconBtn>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex border-t border-slate-100">
            <button
              onClick={() => addRow(t.id)}
              className="flex-1 py-3.5 text-sm text-indigo-600 font-medium hover:bg-indigo-50/50 flex items-center justify-center gap-1.5 border-r border-slate-100"
            >
              <Plus size={15} /> Add New Row
            </button>
            <button
              onClick={() => notify(`${t.name} data saved`)}
              className="flex-1 py-3.5 text-sm text-emerald-600 font-medium hover:bg-emerald-50/50 flex items-center justify-center gap-1.5"
            >
              <Save size={15} /> Save Data
            </button>
          </div>
        </Card>
      ))}
      </div>
    </div>
  );
}
