"use client";

import { LineChart } from "lucide-react";
import { ComingSoon } from "@/components/layout/ComingSoon";

export default function AnalyticsPage() {
  return (
    <ComingSoon
      crumb="analytics"
      title="Analytics"
      description="Pitch-accuracy and session trend reporting across your library are on the roadmap."
      icon={LineChart}
    />
  );
}
