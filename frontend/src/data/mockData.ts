export interface SalesDataPoint {
  day: string;
  revenue: number;
}

export const salesData: SalesDataPoint[] = [
  { day: "Sun", revenue: 9800 },
  { day: "Mon", revenue: 12400 },
  { day: "Tue", revenue: 19300 },
  { day: "Wed", revenue: 10200 },
  { day: "Thu", revenue: 13900 },
  { day: "Fri", revenue: 21200 },
  { day: "Sat", revenue: 15100 },
];

export interface RevenueDataPoint {
  day: string;
  buy: number;
  sell: number;
}

export const revenueData: RevenueDataPoint[] = [
  { day: "Sun", buy: 9800, sell: 4200 },
  { day: "Mon", buy: 12400, sell: 8000 },
  { day: "Tue", buy: 19300, sell: 14500 },
  { day: "Wed", buy: 10200, sell: 5500 },
  { day: "Thu", buy: 13900, sell: 9200 },
  { day: "Fri", buy: 21200, sell: 16800 },
  { day: "Sat", buy: 15100, sell: 11000 },
];

export interface PlatformOrder {
  id: number;
  invoice: string;
  customer: string;
  phone: string;
  date: string;
  type: string;
  qty: number;
  unit: number;
  total: number;
  status: string;
}

export const platformOrdersSeed: PlatformOrder[] = (() => {
  const customers = [
    "Makara Phally", "Sokun Nisa", "Vutha Kim", "Leang Dara", "Bunthy Chhay",
    "Pich Samnang", "Sreyleak Touch", "Davy Hour", "Menghong Choeun", "Sokha Lim",
    "Chhorn Sokha", "Neang Vuthy", "Pen Dara", "Seang Meas", "Kim Sreyleak",
    "Touch Ravy", "Chantha Lim", "Vanna Ly", "Rithy Pov", "Channary Sok"
  ];
  const phones = [
    "012 345 678", "010 987 654", "015 555 888", "017 222 111", "096 777 333",
    "011 444 222", "089 123 456", "093 654 321", "092 888 999", "010 321 654"
  ];
  const statuses = [
    "Completed", "Pending", "Confirmed", "Completed", "Pending",
    "Cancelled", "Confirmed", "Completed", "Pending", "Completed"
  ];
  return Array.from({ length: 120 }, (_, i) => {
    const n = i + 1;
    const qty = [2.50, 1.00, 3.00, 0.50, 1.80, 2.00, 1.20, 4.00, 0.80, 1.50][i % 10];
    const unit = i < 10 ? 68 : 69;
    return {
      id: n,
      invoice: `INV-20250523-${String(n).padStart(3, "0")}`,
      customer: customers[i % customers.length],
      phone: phones[i % phones.length],
      date: "May 23, 2025",
      type: i % 3 === 0 ? "Sell" : "Buy",
      qty,
      unit,
      total: +(qty * unit).toFixed(2),
      status: statuses[i % statuses.length],
    };
  });
})();

export interface PhysicalOrder {
  id: number;
  customer: string;
  date: string;
  type: string;
  qty: number;
  total: number;
}

export const physicalOrdersSeed: PhysicalOrder[] = (() => {
  const base: [string, string, string, number, number][] = [
    ["Chhorn Sokha", "May 23, 2025", "Buy", 2.50, 170.00],
    ["Neang Vuthy", "May 23, 2025", "Sell", 1.20, 82.00],
    ["Pen Dara", "May 23, 2025", "Buy", 3.00, 204.00],
    ["Seang Meas", "May 22, 2025", "Sell", 0.80, 54.40],
    ["Kim Sreyleak", "May 22, 2025", "Buy", 1.50, 103.50],
    ["Touch Ravy", "May 22, 2025", "Buy", 4.00, 276.00],
    ["Chantha Lim", "May 21, 2025", "Sell", 2.20, 149.60],
    ["Vanna Ly", "May 21, 2025", "Buy", 1.00, 69.00],
  ];
  const extra = [
    "Rithy Pov", "Channary Sok", "Sopheak Chan", "Bopha Keo", "Rina Ouk",
    "Vichet Ny", "Makara Phally", "Sokun Nisa", "Vutha Kim", "Leang Dara",
    "Bunthy Chhay", "Pich Samnang", "Sreyleak Touch", "Davy Hour",
    "Menghong Choeun", "Sokha Lim"
  ];
  const rows: PhysicalOrder[] = base.map((r, i) => ({
    id: i + 1,
    customer: r[0],
    date: r[1],
    type: r[2],
    qty: r[3],
    total: r[4]
  }));
  extra.forEach((name, i) => {
    const type = i % 3 === 0 ? "Sell" : "Buy";
    const qty = +(0.5 + ((i * 37) % 400) / 100).toFixed(2);
    rows.push({
      id: rows.length + 1,
      customer: name,
      date: `May ${20 - (i % 5)}, 2025`,
      type,
      qty,
      total: +(qty * 68.4).toFixed(2)
    });
  });
  while (rows.length < 58) {
    const i = rows.length;
    const baseRow = base[i % base.length];
    rows.push({
      id: i + 1,
      customer: baseRow[0],
      date: `May ${18 + (i % 6)}, 2025`,
      type: i % 2 ? "Sell" : "Buy",
      qty: +(0.6 + (i % 9) / 3).toFixed(2),
      total: +((0.6 + (i % 9) / 3) * 68.4).toFixed(2)
    });
  }
  return rows;
})();

export interface SlotRow {
  id: string;
  date: string;
  premium: number;
}

export interface SlotTable {
  id: string;
  name: string;
  stock: number;
  rows: SlotRow[];
}

export const slotTablesSeed: SlotTable[] = [
  {
    id: "t1",
    name: "Table 1",
    stock: 50,
    rows: [
      { id: "r1", date: "10/06/2026", premium: 300 },
      { id: "r2", date: "11/06/2026", premium: 300 },
      { id: "r3", date: "12/06/2026", premium: 400 },
    ]
  },
  {
    id: "t2",
    name: "Table 2",
    stock: 51,
    rows: [
      { id: "r4", date: "10/06/2026", premium: 300 },
      { id: "r5", date: "11/06/2026", premium: 300 },
      { id: "r6", date: "12/06/2026", premium: 400 },
    ]
  },
  {
    id: "t3",
    name: "Table 3",
    stock: 60,
    rows: [
      { id: "r7", date: "10/06/2026", premium: 350 },
    ]
  },
];

export interface ReportRow {
  date: string;
  type: string;
  orders: number;
  qty: number;
  amount: number;
}

export const reportRows: ReportRow[] = [
  { date: "May 23, 2025", type: "Buy", orders: 22, qty: 18.70, amount: 2345 },
  { date: "May 23, 2025", type: "Sell", orders: 16, qty: 12.30, amount: 1650 },
  { date: "May 22, 2025", type: "Buy", orders: 18, qty: 15.50, amount: 1980 },
  { date: "May 22, 2025", type: "Sell", orders: 12, qty: 9.40, amount: 1210 },
  { date: "May 21, 2025", type: "Buy", orders: 14, qty: 11.20, amount: 1435 },
  { date: "May 21, 2025", type: "Sell", orders: 10, qty: 7.80, amount: 990 },
  { date: "May 20, 2025", type: "Buy", orders: 16, qty: 12.10, amount: 1585 },
  { date: "May 20, 2025", type: "Sell", orders: 10, qty: 8.20, amount: 1055 },
];

export interface LowStockAlert {
  id: number;
  item: string;
  threshold: string;
  message: string;
  premium: number;
  timing: string;
  date: string;
  time: string;
  status: string;
}

export const lowStockSeed: LowStockAlert[] = [
  { id: 1, item: "Gold Necklace 24K", threshold: "10 g", message: "Gold Necklace 24K is low in stock. Hurry up and get yours before it's out!", premium: 2.00, timing: "Immediately", date: "May 22, 2025", time: "04:15 PM", status: "Active" },
  { id: 2, item: "Gold Ring 22K", threshold: "5 pcs", message: "Gold Ring 22K is running low! Only a few left in stock.", premium: 1.50, timing: "15 minutes after trigger", date: "May 21, 2025", time: "11:30 AM", status: "Active" },
  { id: 3, item: "Gold Bracelet 24K", threshold: "15 g", message: "Stock is low for Gold Bracelet 24K. Don't miss out!", premium: 2.50, timing: "30 minutes after trigger", date: "May 20, 2025", time: "09:10 AM", status: "Active" },
  { id: 4, item: "Gold Bar 24K (1g)", threshold: "3 pcs", message: "Gold Bar 24K (1g) is almost out of stock.", premium: 1.00, timing: "1 hour after trigger", date: "May 18, 2025", time: "02:45 PM", status: "Paused" },
  { id: 5, item: "Gold Earring 18K", threshold: "4 pcs", message: "Limited stock! Gold Earring 18K is low.", premium: 1.00, timing: "Immediately", date: "May 17, 2025", time: "10:20 AM", status: "Active" },
];

export interface Promotion {
  id: number;
  name: string;
  desc: string;
  type: string;
  value: string;
  applies: string;
  message: string;
  premium: number;
  start: string;
  startTime: string;
  end: string;
  endTime: string;
  timing: string;
  status: string;
}

export const promoSeed: Promotion[] = [
  { id: 1, name: "Weekend Special", desc: "Weekend discount for all items", type: "Percentage", value: "10%", applies: "All Gold Items", message: "Enjoy 10% off on all gold items this weekend only!", premium: 2.00, start: "May 23, 2025", startTime: "12:00 AM", end: "May 25, 2025", endTime: "11:59 PM", timing: "1 hour before start", status: "Active" },
  { id: 2, name: "Gold Necklace Promo", desc: "Special discount on 24K necklaces", type: "Fixed Amount", value: "$5.00", applies: "Gold Necklace 24K", message: "Get $5 off Gold Necklace 24K. Limited time offer!", premium: 1.50, start: "May 26, 2025", startTime: "12:00 AM", end: "May 31, 2025", endTime: "11:59 PM", timing: "2 hours before start", status: "Active" },
  { id: 3, name: "Upcoming Holiday Sale", desc: "Big sale for upcoming holiday", type: "Percentage", value: "15%", applies: "All Gold Items", message: "Celebrate the holiday with 15% off on all gold items!", premium: 2.50, start: "Jun 01, 2025", startTime: "12:00 AM", end: "Jun 07, 2025", endTime: "11:59 PM", timing: "1 day before start", status: "Scheduled" },
];

export interface UserItem {
  id: number;
  name: string;
  you?: boolean;
  username: string;
  email: string;
  role: string;
  status: string;
  last: string;
  pw: string;
}

export const usersSeed: UserItem[] = [
  { id: 1, name: "Admin User", you: true, username: "admin", email: "admin@goldsystem.com", role: "Super Admin", status: "Active", last: "May 23, 2025 09:15 AM", pw: "Adm!n2025#" },
  { id: 2, name: "Makara Reach", username: "makara", email: "makara@goldsystem.com", role: "Admin", status: "Active", last: "May 23, 2025 08:40 AM", pw: "Makara@88" },
  { id: 3, name: "Panha Vanna", username: "panha", email: "panha@goldsystem.com", role: "Manager", status: "Active", last: "May 22, 2025 04:30 PM", pw: "Vanna#456" },
  { id: 4, name: "Sokny Ratha", username: "ratha", email: "ratha@goldsystem.com", role: "Manager", status: "Active", last: "May 22, 2025 11:20 AM", pw: "Ratha!321" },
  { id: 5, name: "Lyheang Yen", username: "lyheang", email: "lyheang@goldsystem.com", role: "Staff", status: "Active", last: "May 21, 2025 02:10 PM", pw: "Lyheang#9" },
  { id: 6, name: "Thida Chan", username: "thida", email: "thida@goldsystem.com", role: "Staff", status: "Active", last: "May 21, 2025 09:05 AM", pw: "Thida@2025" },
  { id: 7, name: "Kosal Bopha", username: "kosal", email: "kosal@goldsystem.com", role: "Staff", status: "Active", last: "May 20, 2025 05:45 PM", pw: "Kosal!007" },
  { id: 8, name: "Kimheang Hok", username: "hok", email: "hok@goldsystem.com", role: "Staff", status: "Inactive", last: "—", pw: "Hok#2024x" },
];
