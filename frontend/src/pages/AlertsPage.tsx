/**
 * @file AlertsPage.tsx
 * @description Alerts & Promotions page component for managing stock alert thresholds and discount promotion rules.
 */

import { useEffect, useState } from "react";
import { AlertData, api } from "../api";
import StockAlertsView from "./alerts/StockAlertsView";
import PromoDiscountsView from "./alerts/PromoDiscountsView";

interface AlertsPageProps {
  /** Toast notification callback trigger */
  notify: (msg: string) => void;
  /** Display mode ("stock" for stock alerts, "promo" for discount promotions) */
  mode: "stock" | "promo";
}

/**
 * Alerts and Promotions management page component.
 */
export default function AlertsPage({ notify, mode }: AlertsPageProps) {
  const [alerts, setAlerts] = useState<AlertData[]>([]);

  useEffect(() => {
    const type = mode === "stock" ? "LOW_STOCK" : "PROMOTION";
    api
      .get<AlertData[]>(`/api/alerts/?alert_type=${type}`)
      .then(setAlerts)
      .catch(() => notify("Failed to load alerts"));
  }, [mode]);

  function deleteAlert(id: number) {
    api
      .delete(`/api/alerts/${id}`)
      .then(() => {
        setAlerts((a) => a.filter((x) => x.id !== id));
        notify("Alert deleted");
      })
      .catch(() => notify("Failed to delete alert"));
  }

  if (mode === "stock") {
    return <StockAlertsView alerts={alerts} notify={notify} deleteAlert={deleteAlert} />;
  }

  return <PromoDiscountsView alerts={alerts} notify={notify} deleteAlert={deleteAlert} />;
}
