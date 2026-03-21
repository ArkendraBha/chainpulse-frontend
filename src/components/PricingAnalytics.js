"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";

export default function PricingAnalytics() {
  useEffect(() => {
    trackEvent("view_pricing_page");
  }, []);

  return null;
}