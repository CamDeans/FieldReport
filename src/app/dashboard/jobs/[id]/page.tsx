"use client";

import { useParams } from "next/navigation";
import { JobWorkspace } from "@/components/job-workspace";

export default function JobPage() {
  const params = useParams<{ id: string }>();
  return <JobWorkspace jobId={params.id} />;
}
