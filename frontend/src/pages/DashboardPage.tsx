import StockMatrixTable from "../components/StockMatrixTable";
import { ToastType } from "../components/Toast";

/**
 * Main dashboard page rendering the image-matched Inventory Stock Matrix and KPI Overview.
 */
export default function DashboardPage({
  notify,
}: {
  notify?: (msg: string, type?: ToastType) => void;
}) {
  return (
    <div className="flex-1 w-full min-w-0 overflow-y-auto bg-white flex flex-col min-h-0 h-full">
      <StockMatrixTable notify={notify} />
    </div>
  );
}
