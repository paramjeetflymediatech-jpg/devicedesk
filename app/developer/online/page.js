"use client";

import { useMemo } from "react";
import { useDeveloper } from "../DeveloperContext";
import AgentTable from "../components/AgentTable";

export default function OnlineAgentsPage() {
  const { agents } = useDeveloper();
  
  const onlineAgents = useMemo(() => {
    const now = new Date();
    return agents.filter(agent => {
      const diffMs = now.getTime() - new Date(agent.lastSeenAt).getTime();
      return diffMs <= 5 * 60 * 1000;
    });
  }, [agents]);

  return <AgentTable agents={onlineAgents} title="Online (Live) Agents" />;
}
