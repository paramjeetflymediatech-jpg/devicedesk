"use client";

import { useMemo } from "react";
import { useDeveloper } from "../DeveloperContext";
import AgentTable from "../components/AgentTable";

export default function LinuxAgentsPage() {
  const { agents } = useDeveloper();
  
  const linuxAgents = useMemo(() => {
    return agents.filter(agent => {
      const platform = (agent.osPlatform || '').toLowerCase();
      return platform.includes('linux') || platform.includes('ubuntu');
    });
  }, [agents]);

  return <AgentTable agents={linuxAgents} title="Linux / Ubuntu Agents" />;
}
