import StockMatrixTable from "../components/StockMatrixTable";

/**
 * Main dashboard page rendering the image-matched Inventory Stock Matrix and KPI Overview.
 */
export default function DashboardPage() {
  return (
    <div className="flex-1 w-full min-w-0 overflow-y-auto bg-white flex flex-col min-h-0 h-full">
      <StockMatrixTable />
    </div>
  );
}
