"use client";

import { useMemo } from "react";
import { useDeveloper } from "../DeveloperContext";
import AgentTable from "../components/AgentTable";

export default function MacAgentsPage() {
  const { agents } = useDeveloper();
  
  const macAgents = useMemo(() => {
    return agents.filter(agent => {
      const platform = (agent.osPlatform || '').toLowerCase();
      return platform.includes('darwin') || platform.includes('mac');
    });
  }, [agents]);

  return <AgentTable agents={macAgents} title="macOS Agents" />;
}
