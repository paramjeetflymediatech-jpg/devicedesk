"use client";

import { useDeveloper } from "../DeveloperContext";
import AgentTable from "../components/AgentTable";

export default function UninstalledAgentsPage() {
  const { deletedAgents } = useDeveloper();

  return <AgentTable agents={deletedAgents} title="Uninstalled & Logged Out Agents" hideActions={true} />;
}
