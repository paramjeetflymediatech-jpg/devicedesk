"use client";

import { useMemo } from "react";
import { useDeveloper } from "../DeveloperContext";
import AgentTable from "../components/AgentTable";

export default function WindowsAgentsPage() {
  const { agents } = useDeveloper();
  
  const windowsAgents = useMemo(() => {
    return agents.filter(agent => (agent.osPlatform || '').toLowerCase().includes('win'));
  }, [agents]);

  return <AgentTable agents={windowsAgents} title="Windows Agents" />;
}
