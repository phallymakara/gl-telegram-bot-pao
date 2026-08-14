import React, { useState, useEffect } from "react";
import { Plus, Calendar, Trash2, Pencil, MoreHorizontal, X } from "lucide-react";
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
  premium: number;
  stock?: number;
}

export default function SlotsPage({ mode = "buyback", notify }: SlotsPageProps) {
  const [selectedSlotType, setSelectedSlotType] = useState<"BUY" | "SELL">(
    mode === "sell" ? "SELL" : "BUY"
  );

  const [buyRows, setBuyRows] = useState<SlotRowItem[]>([]);
  const [sellRows, setSellRows] = useState<SlotRowItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRowId, setEditingRowId] = useState<number | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<number | null>(null);

  const [slotForm, setSlotForm] = useState({
    start_date: new Date().toISOString().split("T")[0],
    end_date: "",
    premium: "",
    stock: "",
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
      .catch(() => {});
  }, []);

  function delRow(rowId: number) {
    if (selectedSlotType === "BUY") {
      setBuyRows((rs) => rs.filter((r) => r.id !== rowId));
      notify("Buy slot row deleted");
    } else {
      setSellRows((rs) => rs.filter((r) => r.id !== rowId));
      notify("Sell slot row deleted");
    }
  }

  function submitSlotModal() {
    if (selectedSlotType === "SELL") {
      if (!slotForm.start_date || !slotForm.end_date || !slotForm.premium || !slotForm.stock) {
        notify("Please fill in all required slot fields");
        return;
      }
    } else {
      if (!slotForm.start_date || !slotForm.end_date || !slotForm.premium) {
        notify("Please fill in all required slot fields");
        return;
      }
    }

    if (editingRowId !== null) {
      const updateFn = (rs: SlotRowItem[]) =>
        rs.map((r) =>
          r.id === editingRowId
            ? {
                ...r,
                start_date: slotForm.start_date,
                end_date: slotForm.end_date,
                premium: Number(slotForm.premium),
                stock: selectedSlotType === "SELL" ? Number(slotForm.stock) : undefined,
              }
            : r
        );
      if (selectedSlotType === "BUY") {
        setBuyRows(updateFn);
      } else {
        setSellRows(updateFn);
      }
      notify(`${selectedSlotType === "BUY" ? "Buy" : "Sell"} Slot updated successfully!`);
    } else {
      const newRow: SlotRowItem = {
        id: Date.now(),
        start_date: slotForm.start_date,
        end_date: slotForm.end_date,
        premium: Number(slotForm.premium),
        stock: selectedSlotType === "SELL" ? Number(slotForm.stock) : undefined,
      };

      if (selectedSlotType === "BUY") {
        setBuyRows((rs) => [...rs, newRow]);
        notify("New Buy Slot added successfully!");
      } else {
        setSellRows((rs) => [...rs, newRow]);
        notify("New Sell Slot added successfully!");
      }
    }

    setIsModalOpen(false);
    setEditingRowId(null);
  }

  const activeRows = selectedSlotType === "BUY" ? buyRows : sellRows;

  return (
    <div
      className="flex-1 p-4 sm:p-6 min-w-0 overflow-hidden w-full flex flex-col space-y-3 min-h-0 h-full"
      onClick={() => setActiveMenuId(null)}
    >
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedSlotType("BUY")}
            className={`text-sm px-4 py-2.5 rounded-lg font-medium shadow-sm transition-all cursor-pointer ${
              selectedSlotType === "BUY"
                ? "bg-indigo-600 text-white hover:bg-indigo-700"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            Buy Slot
          </button>
          <button
            type="button"
            onClick={() => setSelectedSlotType("SELL")}
            className={`text-sm px-4 py-2.5 rounded-lg font-medium shadow-sm transition-all cursor-pointer ${
              selectedSlotType === "SELL"
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
            const today = new Date().toISOString().split("T")[0];
            const nextWeek = new Date();
            nextWeek.setDate(nextWeek.getDate() + 7);
            setEditingRowId(null);
            setSlotForm({
              start_date: today,
              end_date: nextWeek.toISOString().split("T")[0],
              premium: selectedSlotType === "BUY" ? "300" : "350",
              stock: selectedSlotType === "SELL" ? "30" : "",
            });
            setIsModalOpen(true);
          }}
          className={`flex items-center gap-2 text-sm px-4 py-2.5 rounded-lg text-white font-medium shadow-sm transition-colors cursor-pointer ${
            selectedSlotType === "SELL"
              ? "bg-emerald-600 hover:bg-emerald-700"
              : "bg-indigo-600 hover:bg-indigo-700"
          }`}
        >
          <Plus size={16} /> Add {selectedSlotType === "BUY" ? "Buy" : "Sell"} Slot
        </button>
      </div>

      <Card className="flex-1 flex flex-col min-h-0 overflow-hidden h-full">
        <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0 w-full">
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-50">
              <tr className="text-left text-xs text-slate-400 uppercase tracking-wide border-b border-slate-200 bg-slate-50">
                <th className="px-5 py-3 font-medium bg-slate-50 whitespace-nowrap">Slot Date (Start - End)</th>
                <th className="px-5 py-3 font-medium bg-slate-50 whitespace-nowrap">Premium (USD)</th>
                {selectedSlotType === "SELL" && (
                  <th className="px-5 py-3 font-medium bg-slate-50 whitespace-nowrap">Stock</th>
                )}
                <th className="px-5 py-3 font-medium bg-slate-50 whitespace-nowrap text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {activeRows.map((r) => (
                <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                  <td className="px-5 py-3.5 text-slate-700 font-medium whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-slate-400 shrink-0" />
                      <span>
                        {r.start_date} <span className="text-slate-400 font-normal">to</span> {r.end_date}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 font-semibold text-slate-800 whitespace-nowrap">
                    ${r.premium.toLocaleString()}
                  </td>
                  {selectedSlotType === "SELL" && (
                    <td className="px-5 py-3.5 font-bold text-slate-700 whitespace-nowrap">
                      {(r.stock ?? 0).toFixed(1)} <span className="text-xs font-normal text-slate-400">KG</span>
                    </td>
                  )}
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
                                stock: r.stock !== undefined ? String(r.stock) : "",
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
                              delRow(r.id);
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
              {activeRows.length === 0 && (
                <tr>
                  <td colSpan={selectedSlotType === "SELL" ? 4 : 3} className="px-5 py-10 text-center text-sm text-slate-400">
                    No {selectedSlotType.toLowerCase()} slots found. Click{" "}
                    <span
                      className={`font-semibold ${
                        selectedSlotType === "SELL" ? "text-emerald-600" : "text-indigo-600"
                      }`}
                    >
                      "+ Add {selectedSlotType === "BUY" ? "Buy" : "Sell"} Slot"
                    </span>{" "}
                    to create a slot.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xl w-full max-w-md overflow-hidden transform scale-100 transition-transform">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <h3 className="font-semibold text-slate-800 text-lg">
                {editingRowId !== null ? "Edit" : "Add"} {selectedSlotType === "BUY" ? "Buy" : "Sell"} Slot
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

              {selectedSlotType === "SELL" ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Premium (USD) *</label>
                    <input
                      type="text"
                      value={slotForm.premium}
                      onChange={(e) => setSlotForm({ ...slotForm, premium: e.target.value.replace(/[^0-9.]/g, "") })}
                      placeholder="0.00"
                      className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Stock (KG) *</label>
                    <input
                      type="text"
                      value={slotForm.stock}
                      onChange={(e) => setSlotForm({ ...slotForm, stock: e.target.value.replace(/[^0-9.]/g, "") })}
                      placeholder="0.00"
                      className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>
                </div>
              ) : (
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
              )}
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
                onClick={submitSlotModal}
                className={`flex items-center gap-1.5 text-sm px-5 py-2.5 rounded-lg text-white font-semibold shadow-sm transition-colors focus:outline-none cursor-pointer ${
                  selectedSlotType === "SELL"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-indigo-600 hover:bg-indigo-700"
                }`}
              >
                {editingRowId !== null ? <Pencil size={15} /> : <Plus size={15} />}
                {editingRowId !== null ? "Save Changes" : `Save ${selectedSlotType === "BUY" ? "Buy" : "Sell"} Slot`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
