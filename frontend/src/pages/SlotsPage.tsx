import React, { useState, useEffect } from "react";
import { Plus, Calendar, Trash2, Pencil, MoreHorizontal, X, Save } from "lucide-react";
import Card from "../components/Card";
import { api, SlotTableData } from "../data/api";

interface SlotsPageProps {
  mode?: "buyback" | "sell";
  notify: (msg: string) => void;
}

interface SlotRowItem {
  id: number;
  start_date: string;
  end_date: string;
  premium: string | number;
  qty?: string | number;
}

interface SellTableItem {
  id: number;
  title: string;
  tableStock: string;
  newRowDate: string;
  rows: SlotRowItem[];
}

const INITIAL_SELL_TABLES: SellTableItem[] = [
  {
    id: 1,
    title: "Sell Slot Table 1",
    tableStock: "100.000",
    newRowDate: "2026-08-15",
    rows: [
      { id: 101, start_date: "2026-08-08", end_date: "2026-08-08", premium: "300.00", qty: "10.00" },
      { id: 102, start_date: "2026-08-09", end_date: "2026-08-09", premium: "300.00", qty: "15.00" },
      { id: 103, start_date: "2026-08-10", end_date: "2026-08-10", premium: "300.00", qty: "20.00" },
    ],
  },
];

export default function SlotsPage({ mode = "buyback", notify }: SlotsPageProps) {
  const [selectedSlotType, setSelectedSlotType] = useState<"BUY" | "SELL">(
    mode === "sell" ? "SELL" : "BUY"
  );

  const [buyRows, setBuyRows] = useState<SlotRowItem[]>([]);
  const [sellTables, setSellTables] = useState<SellTableItem[]>(INITIAL_SELL_TABLES);

  // Buy Slot Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRowId, setEditingRowId] = useState<number | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<number | null>(null);

  const [slotForm, setSlotForm] = useState({
    start_date: new Date().toISOString().split("T")[0],
    end_date: "",
    premium: "",
  });

  useEffect(() => {
    api
      .get<SlotTableData[]>("/api/slots/")
      .then((tables) => {
        if (tables.length > 0 && tables[0].rows) {
          const apiRows = tables[0].rows.map((r) => ({
            id: r.id,
            start_date: r.slot_date,
            end_date: r.slot_date,
            premium: r.premium,
          }));
          setBuyRows(apiRows);
        }
      })
      .catch(() => { });
  }, []);

  function delBuyRow(rowId: number) {
    setBuyRows((rs) => rs.filter((r) => r.id !== rowId));
    notify("Buy slot row deleted");
  }

  function addSellTable() {
    const newTableId = Date.now();
    const today = new Date().toISOString().split("T")[0];
    const newTable: SellTableItem = {
      id: newTableId,
      title: `Sell Slot Table ${sellTables.length + 1}`,
      tableStock: "100.000",
      newRowDate: today,
      rows: [
        { id: Date.now() + 1, start_date: today, end_date: today, premium: "300.00", qty: "10.00" },
      ],
    };
    setSellTables((prev) => [...prev, newTable]);
    notify("New table added successfully!");
  }

  function deleteSellTable(tableId: number) {
    setSellTables((prev) => prev.filter((t) => t.id !== tableId));
    notify("Table deleted");
  }

  function addRowToTable(tableId: number) {
    setSellTables((prev) =>
      prev.map((tbl) => {
        if (tbl.id !== tableId) return tbl;
        const dateVal = tbl.newRowDate || new Date().toISOString().split("T")[0];
        const newRow: SlotRowItem = {
          id: Date.now(),
          start_date: dateVal,
          end_date: dateVal,
          premium: "300.00",
          qty: "0.00",
        };
        return { ...tbl, rows: [...tbl.rows, newRow] };
      })
    );
    notify("New row added to table");
  }

  function updateRowInTable(tableId: number, rowId: number, patch: Partial<SlotRowItem>) {
    setSellTables((prev) =>
      prev.map((tbl) => {
        if (tbl.id !== tableId) return tbl;
        return {
          ...tbl,
          rows: tbl.rows.map((r) => (r.id === rowId ? { ...r, ...patch } : r)),
        };
      })
    );
  }

  function updateTableStock(tableId: number, stockVal: string) {
    setSellTables((prev) =>
      prev.map((tbl) => (tbl.id === tableId ? { ...tbl, tableStock: stockVal } : tbl))
    );
  }

  function updateTableNewRowDate(tableId: number, dateVal: string) {
    setSellTables((prev) =>
      prev.map((tbl) => (tbl.id === tableId ? { ...tbl, newRowDate: dateVal } : tbl))
    );
  }

  function deleteRowInTable(tableId: number, rowId: number) {
    setSellTables((prev) =>
      prev.map((tbl) => {
        if (tbl.id !== tableId) return tbl;
        return { ...tbl, rows: tbl.rows.filter((r) => r.id !== rowId) };
      })
    );
    notify("Row deleted");
  }

  function submitBuyModal() {
    if (!slotForm.start_date || !slotForm.premium) {
      notify("Please fill in required fields");
      return;
    }

    const startDate = slotForm.start_date;
    const endDate = slotForm.end_date || slotForm.start_date;

    if (editingRowId !== null) {
      setBuyRows((rs) =>
        rs.map((r) =>
          r.id === editingRowId
            ? {
              ...r,
              start_date: startDate,
              end_date: endDate,
              premium: slotForm.premium,
            }
            : r
        )
      );
      notify("Buy Slot updated successfully!");
    } else {
      const newRow: SlotRowItem = {
        id: Date.now(),
        start_date: startDate,
        end_date: endDate,
        premium: slotForm.premium,
      };
      setBuyRows((rs) => [...rs, newRow]);
      notify("New Buy Slot added successfully!");
    }

    setIsModalOpen(false);
    setEditingRowId(null);
  }

  return (
    <div
      className="flex-1 p-4 sm:p-6 min-w-0 overflow-hidden w-full flex flex-col space-y-4 min-h-0 h-full"
      onClick={() => setActiveMenuId(null)}
    >
      {/* Top Bar Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedSlotType("BUY")}
            className={`text-sm px-4 py-2.5 rounded-lg font-medium shadow-sm transition-all cursor-pointer ${selectedSlotType === "BUY"
                ? "bg-indigo-600 text-white hover:bg-indigo-700"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
          >
            Buy Slot
          </button>
          <button
            type="button"
            onClick={() => setSelectedSlotType("SELL")}
            className={`text-sm px-4 py-2.5 rounded-lg font-medium shadow-sm transition-all cursor-pointer ${selectedSlotType === "SELL"
                ? "bg-emerald-600 text-white hover:bg-emerald-700"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
          >
            Sell Slot
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            if (selectedSlotType === "SELL") {
              addSellTable();
            } else {
              const today = new Date().toISOString().split("T")[0];
              const nextWeek = new Date();
              nextWeek.setDate(nextWeek.getDate() + 7);
              setEditingRowId(null);
              setSlotForm({
                start_date: today,
                end_date: nextWeek.toISOString().split("T")[0],
                premium: "300",
              });
              setIsModalOpen(true);
            }
          }}
          className={`flex items-center gap-2 text-sm px-4 py-2.5 rounded-lg text-white font-medium shadow-sm transition-colors cursor-pointer ${selectedSlotType === "SELL"
              ? "bg-emerald-600 hover:bg-emerald-700"
              : "bg-indigo-600 hover:bg-indigo-700"
            }`}
        >
          <Plus size={16} /> {selectedSlotType === "BUY" ? "Add Buy Slot" : "Add Table"}
        </button>
      </div>

      {/* Main Content View */}
      {selectedSlotType === "SELL" ? (
        <div className="space-y-6 overflow-y-auto flex-1 min-h-0 pr-1">
          {sellTables.map((tbl) => (
            <Card key={tbl.id} className="flex flex-col min-h-0 overflow-hidden">
              {/* Table Title Header */}
              <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
                <input
                  type="text"
                  value={tbl.title}
                  onChange={(e) =>
                    setSellTables((prev) =>
                      prev.map((t) => (t.id === tbl.id ? { ...t, title: e.target.value } : t))
                    )
                  }
                  className="font-bold text-slate-800 text-sm bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none px-1 py-0.5"
                />
                {sellTables.length > 1 && (
                  <button
                    type="button"
                    onClick={() => deleteSellTable(tbl.id)}
                    className="text-xs text-rose-500 hover:text-rose-700 hover:bg-rose-50 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 font-medium cursor-pointer"
                    title="Delete table"
                  >
                    <Trash2 size={14} /> Delete Table
                  </button>
                )}
              </div>

              <div className="overflow-x-auto w-full">
                <table className="w-full text-sm border-collapse">
                  <thead className="sticky top-0 z-10 bg-slate-50">
                    <tr className="text-left text-xs text-slate-400 uppercase tracking-wide border-b border-slate-200 bg-slate-50">
                      <th className="px-5 py-3 font-medium bg-slate-50 whitespace-nowrap w-12 text-slate-400">#</th>
                      <th className="px-5 py-3 font-medium bg-slate-50 whitespace-nowrap text-slate-400">SLOT DATE</th>
                      <th className="px-5 py-3 font-medium bg-slate-50 whitespace-nowrap text-center text-slate-400">PREMIUM (USD)</th>
                      <th className="px-5 py-3 font-medium bg-slate-50 whitespace-nowrap text-center text-slate-400">QTY</th>
                      <th className="px-5 py-3 font-medium bg-slate-50 whitespace-nowrap text-center text-slate-400">STOCK</th>
                      <th className="px-5 py-3 font-medium bg-slate-50 whitespace-nowrap text-center text-slate-400">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tbl.rows.map((r, idx) => (
                      <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-2 text-slate-400 font-medium text-left w-12 text-xs">{idx + 1}</td>
                        <td className="px-4 py-2">
                          <input
                            type="date"
                            value={r.start_date}
                            onChange={(e) => updateRowInTable(tbl.id, r.id, { start_date: e.target.value, end_date: e.target.value })}
                            className="text-xs border border-slate-200 rounded-md px-2.5 py-1 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                          />
                        </td>
                        <td className="px-4 py-2 text-center">
                          <input
                            type="text"
                            value={r.premium}
                            onChange={(e) => updateRowInTable(tbl.id, r.id, { premium: e.target.value })}
                            className="w-28 text-xs border border-slate-200 rounded-md px-2.5 py-1 bg-white text-slate-800 font-medium text-center focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 mx-auto"
                          />
                        </td>
                        <td className="px-4 py-2 text-center">
                          <input
                            type="text"
                            value={r.qty !== undefined ? r.qty : ""}
                            onChange={(e) => updateRowInTable(tbl.id, r.id, { qty: e.target.value })}
                            placeholder="0.00"
                            className="w-20 text-xs border border-slate-200 rounded-md px-2.5 py-1 bg-white text-slate-800 font-medium text-center focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 mx-auto"
                          />
                        </td>
                        {/* Merged STOCK column spanning all table rows */}
                        {idx === 0 && (
                          <td
                            rowSpan={tbl.rows.length > 0 ? tbl.rows.length : 1}
                            className="px-4 py-2 text-center align-middle bg-slate-50/40 border-x border-slate-200/60"
                          >
                            <div className="flex flex-col items-center justify-center py-1">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                STOCK (KG)
                              </span>
                              <input
                                type="text"
                                value={tbl.tableStock}
                                onChange={(e) => updateTableStock(tbl.id, e.target.value)}
                                placeholder="100.000"
                                className="w-24 text-xs border border-slate-200 rounded-md px-2.5 py-1 bg-white text-slate-900 font-bold text-center focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-xs"
                              />
                            </div>
                          </td>
                        )}
                        <td className="px-4 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => deleteRowInTable(tbl.id, r.id)}
                            className="p-1 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                            title="Delete row"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {tbl.rows.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-5 py-8 text-center text-sm text-slate-400">
                          No rows in this table. Click "+ Add New Row" below to add a row.
                        </td>
                      </tr>
                    )}
                    {/* Table Footer with Add Row and Save Data */}
                    <tr className="border-t border-slate-200 bg-slate-50/30">
                      <td colSpan={3} className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <input
                            type="date"
                            value={tbl.newRowDate}
                            onChange={(e) => updateTableNewRowDate(tbl.id, e.target.value)}
                            className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                          />
                          <button
                            type="button"
                            onClick={() => addRowToTable(tbl.id)}
                            className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-700 font-semibold text-sm cursor-pointer transition-colors"
                          >
                            <Plus size={16} /> Add New Row
                          </button>
                        </div>
                      </td>
                      <td colSpan={3} className="px-5 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => notify(`Data saved for ${tbl.title}!`)}
                          className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-semibold text-sm cursor-pointer transition-colors"
                        >
                          <Save size={16} /> Save Data
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="flex-1 flex flex-col min-h-0 overflow-hidden h-full">
          <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0 w-full">
            <table className="w-full text-sm border-collapse">
              <thead className="sticky top-0 z-10 bg-slate-50">
                <tr className="text-left text-xs text-slate-400 uppercase tracking-wide border-b border-slate-200 bg-slate-50">
                  <th className="px-5 py-3 font-medium bg-slate-50 whitespace-nowrap w-12 text-slate-400">#</th>
                  <th className="px-5 py-3 font-medium bg-slate-50 whitespace-nowrap text-slate-400">Slot Date (Start - End)</th>
                  <th className="px-5 py-3 font-medium bg-slate-50 whitespace-nowrap text-center text-slate-400">PREMIUM (USD)</th>
                  <th className="px-5 py-3 font-medium bg-slate-50 whitespace-nowrap text-center text-slate-400">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {buyRows.map((r, idx) => (
                  <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3.5 text-slate-400 font-medium whitespace-nowrap">{idx + 1}</td>
                    <td className="px-5 py-3.5 text-slate-700 font-medium whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-slate-400 shrink-0" />
                        <span>
                          {r.start_date} <span className="text-slate-400 font-normal">to</span> {r.end_date}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-slate-800 whitespace-nowrap text-center">
                      ${typeof r.premium === "number" ? r.premium.toLocaleString() : r.premium}
                    </td>
                    <td className="px-5 py-3.5 text-center relative">
                      <div className="relative inline-block text-left">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuId(activeMenuId === r.id ? null : r.id);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors focus:outline-none cursor-pointer"
                          title="Actions"
                        >
                          <MoreHorizontal size={16} />
                        </button>

                        {activeMenuId === r.id && (
                          <div className="absolute right-0 mt-1 w-28 bg-white rounded-xl border border-slate-200 shadow-lg py-1 z-30 text-left">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuId(null);
                                setEditingRowId(r.id);
                                setSlotForm({
                                  start_date: r.start_date,
                                  end_date: r.end_date,
                                  premium: String(r.premium),
                                });
                                setIsModalOpen(true);
                              }}
                              className="w-full px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors cursor-pointer"
                            >
                              <Pencil size={13} className="text-slate-400" /> Edit
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuId(null);
                                delBuyRow(r.id);
                              }}
                              className="w-full px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors cursor-pointer"
                            >
                              <Trash2 size={13} /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Buy Slot Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xl w-full max-w-md overflow-hidden transform scale-100 transition-transform">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <h3 className="font-semibold text-slate-800 text-lg">
                {editingRowId !== null ? "Edit" : "Add"} Buy Slot
              </h3>
              <button
                type="button"
                aria-label="Close dialog"
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingRowId(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors focus:outline-none"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Start Date *</label>
                  <input
                    type="date"
                    value={slotForm.start_date}
                    onChange={(e) => setSlotForm({ ...slotForm, start_date: e.target.value })}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1.5 block">End Date *</label>
                  <input
                    type="date"
                    value={slotForm.end_date}
                    onChange={(e) => setSlotForm({ ...slotForm, end_date: e.target.value })}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Premium (USD) *</label>
                <input
                  type="text"
                  value={slotForm.premium}
                  onChange={(e) => setSlotForm({ ...slotForm, premium: e.target.value.replace(/[^0-9.]/g, "") })}
                  placeholder="0.00"
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="p-5 border-t border-slate-100 bg-slate-50/60 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingRowId(null);
                }}
                className="text-sm px-4 py-2.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 font-medium transition-colors focus:outline-none cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitBuyModal}
                className="flex items-center gap-1.5 text-sm px-5 py-2.5 rounded-lg text-white font-semibold bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-colors focus:outline-none cursor-pointer"
              >
                {editingRowId !== null ? <Pencil size={15} /> : <Plus size={15} />}
                {editingRowId !== null ? "Save Changes" : "Save Buy Slot"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
