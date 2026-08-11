"use client";

import { BarChart3 } from "lucide-react";
import { ComingSoon } from "@/components/layout/ComingSoon";

export default function MasteringPage() {
  return (
    <ComingSoon
      crumb="mastering"
      title="Mastering"
      description="Standalone mastering chain controls (independent of a tuning pass) are on the roadmap."
      icon={BarChart3}
    />
  );
}
