"use client";

import { useDeveloper } from "../DeveloperContext";
import AgentTable from "../components/AgentTable";

export default function DashboardPage() {
  const { agents } = useDeveloper();
  return <AgentTable agents={agents} title="All Registered Agents" />;
}
