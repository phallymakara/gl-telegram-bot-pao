import StockMatrixTable from "../components/StockMatrixTable";

/**
 * Main dashboard page rendering the image-matched Inventory Stock Matrix and KPI Overview.
 */
export default function DashboardPage() {
  return (
    <div className="w-full">
      <StockMatrixTable />
    </div>
  );
}
