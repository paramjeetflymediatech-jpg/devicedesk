"use client";

import { createContext, useContext, useState, useEffect } from "react";

const DeveloperContext = createContext();

export function DeveloperProvider({ children }) {
  const [agents, setAgents] = useState([]);
  const [deletedAgents, setDeletedAgents] = useState([]);
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({ total: 0, windows: 0, mac: 0, linux: 0, online: 0, offline: 0, deleted: 0 });
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [agentRes, logRes] = await Promise.all([
        fetch('/api/developer/agents'),
        fetch('/api/developer/agent-logs')
      ]);
      const agentData = await agentRes.json();
      const logData = await logRes.json();

      if (agentData.success) {
        setAgents(agentData.data);
        setDeletedAgents(agentData.deletedData || []);
        setStats(agentData.stats);
      }
      if (logData.success) {
        setLogs(logData.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to kill the agent for ${name}?`)) return;
    try {
      const res = await fetch(`/api/developer/agents?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchData();
      } else {
        alert('Failed to kill agent');
      }
    } catch (err) {
      console.error(err);
      alert('Error killing agent');
    }
  };

  return (
    <DeveloperContext.Provider value={{ agents, deletedAgents, logs, stats, loading, handleDelete, fetchData }}>
      {children}
    </DeveloperContext.Provider>
  );
}

export function useDeveloper() {
  return useContext(DeveloperContext);
}
