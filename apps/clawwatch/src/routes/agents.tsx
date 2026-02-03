import { Badge } from "@clawwatch/ui/components/badge";
import { Button } from "@clawwatch/ui/components/button";
import {
  Card,
  CardContent,
} from "@clawwatch/ui/components/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@clawwatch/ui/components/dialog";
import { Input } from "@clawwatch/ui/components/input";
import { Label } from "@clawwatch/ui/components/label";
import { cn } from "@clawwatch/ui/lib/utils";
import { api } from "@convex/api";
import type { Id } from "@convex/dataModel";
import { createFileRoute, Link, Outlet, useMatches } from "@tanstack/react-router";
import { useQuery, useMutation } from "convex/react";
import {
  Activity,
  Bot,
  Circle,
  Clock,
  DollarSign,
  LayoutGrid,
  Network,
  Plus,
  Search,
} from "lucide-react";
import type { ChangeEvent } from "react";
import { memo, useMemo, useState } from "react";
import { AgentGraph } from "@/components/agent-graph";
import { formatCost, statusColor, timeAgo } from "@/lib/utils";

export const Route = createFileRoute("/agents")({
  component: AgentsPage,
});

function AgentsPage() {
  const agents = useQuery(api.agents.list, {});
  const matches = useMatches();
  const createAgent = useMutation(api.agents.upsert);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [agentName, setAgentName] = useState("");
  const [gatewayUrl, setGatewayUrl] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "graph">("grid");

  const isOnChildRoute = matches.some(match => match.routeId === '/agents/$agentId');

  const filteredAgents = useMemo(() => {
    if (!agents) return [];
    return agents.filter((agent) => {
      const matchesSearch = !searchQuery ||
        agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.config?.model?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || agent.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [agents, searchQuery, statusFilter]);

  const handleAddAgent = async () => {
    await createAgent({
      name: agentName.trim(),
      gatewayUrl: gatewayUrl.trim(),
      status: "offline",
    });
    setIsAddDialogOpen(false);
    setAgentName("");
    setGatewayUrl("");
  };

  if (isOnChildRoute) {
    return <Outlet />;
  }

  if (agents === undefined) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-6">
        <div className="flex items-center justify-between">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-10 bg-muted rounded w-32" />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                <div className="h-8 bg-muted rounded w-1/2 mb-4" />
                <div className="h-20 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const statusCounts = {
    all: agents.length,
    online: agents.filter(a => a.status === "online").length,
    offline: agents.filter(a => a.status === "offline").length,
    degraded: agents.filter(a => a.status === "degraded").length,
  };

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Agents</h1>
          <p className="text-muted-foreground">
            {agents.length} agent{agents.length !== 1 ? "s" : ""} connected
          </p>
        </div>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Agent
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Agent</DialogTitle>
              <DialogDescription>
                Connect a new AI agent to ClawWatch for monitoring.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Agent Name</Label>
                <Input
                  id="name"
                  value={agentName}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setAgentName(e.target.value)}
                  placeholder="e.g. mimizuku"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="gateway">Gateway URL</Label>
                <Input
                  id="gateway"
                  value={gatewayUrl}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setGatewayUrl(e.target.value)}
                  placeholder="ws://127.0.0.1:18789"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsAddDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddAgent}
                disabled={!agentName.trim() || !gatewayUrl.trim()}
              >
                Add Agent
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search, filter bar, and view toggle */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search agents..."
            value={searchQuery}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-1 rounded-lg border bg-muted/30 p-1">
          {(["all", "online", "offline", "degraded"] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                statusFilter === status
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {status === "all" ? "All" : status.charAt(0).toUpperCase() + status.slice(1)}
              <span className="ml-1.5 text-muted-foreground">
                {statusCounts[status]}
              </span>
            </button>
          ))}
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-1 rounded-lg border bg-muted/30 p-1 ml-auto">
          <button
            onClick={() => setViewMode("grid")}
            className={cn(
              "rounded-md p-1.5 transition-colors",
              viewMode === "grid"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
            title="Grid View"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode("graph")}
            className={cn(
              "rounded-md p-1.5 transition-colors",
              viewMode === "graph"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
            title="Graph View"
          >
            <Network className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Graph View */}
      {viewMode === "graph" && (
        <AgentGraphView agents={filteredAgents} />
      )}

      {/* Agent grid */}
      {viewMode === "grid" && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredAgents.map((agent) => (
            <AgentCard key={agent._id} agent={agent} />
          ))}
          {filteredAgents.length === 0 && agents.length > 0 && (
            <Card className="col-span-full">
              <CardContent className="py-8 text-center">
                <Search className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">No agents match your filters</p>
              </CardContent>
            </Card>
          )}
          {agents.length === 0 && (
            <Card className="col-span-full">
              <CardContent className="py-12 text-center">
                <div className="mx-auto mb-4 h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                  <Bot className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold">No agents connected</h3>
                <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
                  Connect your Clawdbot gateway to start monitoring agent activity,
                  costs, and performance metrics.
                </p>
                <Button className="mt-4" onClick={() => setIsAddDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Agent
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

// ── Graph View Wrapper ──
// Uses a fixed set of up to 10 hook slots to avoid hooks-in-loop violations

const MAX_GRAPH_AGENTS = 10;

function AgentGraphView({ agents }: { agents: AgentData[] }) {
  const sliced = agents.slice(0, MAX_GRAPH_AGENTS);

  // Fixed hook slots (hooks must be called unconditionally)
  const h0 = useQuery(api.agents.healthSummary, sliced[0] ? { agentId: sliced[0]._id as Id<"agents"> } : "skip");
  const h1 = useQuery(api.agents.healthSummary, sliced[1] ? { agentId: sliced[1]._id as Id<"agents"> } : "skip");
  const h2 = useQuery(api.agents.healthSummary, sliced[2] ? { agentId: sliced[2]._id as Id<"agents"> } : "skip");
  const h3 = useQuery(api.agents.healthSummary, sliced[3] ? { agentId: sliced[3]._id as Id<"agents"> } : "skip");
  const h4 = useQuery(api.agents.healthSummary, sliced[4] ? { agentId: sliced[4]._id as Id<"agents"> } : "skip");
  const h5 = useQuery(api.agents.healthSummary, sliced[5] ? { agentId: sliced[5]._id as Id<"agents"> } : "skip");
  const h6 = useQuery(api.agents.healthSummary, sliced[6] ? { agentId: sliced[6]._id as Id<"agents"> } : "skip");
  const h7 = useQuery(api.agents.healthSummary, sliced[7] ? { agentId: sliced[7]._id as Id<"agents"> } : "skip");
  const h8 = useQuery(api.agents.healthSummary, sliced[8] ? { agentId: sliced[8]._id as Id<"agents"> } : "skip");
  const h9 = useQuery(api.agents.healthSummary, sliced[9] ? { agentId: sliced[9]._id as Id<"agents"> } : "skip");

  const c0 = useQuery(api.costs.summary, sliced[0] ? { agentId: sliced[0]._id as Id<"agents"> } : "skip");
  const c1 = useQuery(api.costs.summary, sliced[1] ? { agentId: sliced[1]._id as Id<"agents"> } : "skip");
  const c2 = useQuery(api.costs.summary, sliced[2] ? { agentId: sliced[2]._id as Id<"agents"> } : "skip");
  const c3 = useQuery(api.costs.summary, sliced[3] ? { agentId: sliced[3]._id as Id<"agents"> } : "skip");
  const c4 = useQuery(api.costs.summary, sliced[4] ? { agentId: sliced[4]._id as Id<"agents"> } : "skip");
  const c5 = useQuery(api.costs.summary, sliced[5] ? { agentId: sliced[5]._id as Id<"agents"> } : "skip");
  const c6 = useQuery(api.costs.summary, sliced[6] ? { agentId: sliced[6]._id as Id<"agents"> } : "skip");
  const c7 = useQuery(api.costs.summary, sliced[7] ? { agentId: sliced[7]._id as Id<"agents"> } : "skip");
  const c8 = useQuery(api.costs.summary, sliced[8] ? { agentId: sliced[8]._id as Id<"agents"> } : "skip");
  const c9 = useQuery(api.costs.summary, sliced[9] ? { agentId: sliced[9]._id as Id<"agents"> } : "skip");

  const healthArr = [h0, h1, h2, h3, h4, h5, h6, h7, h8, h9];
  const costArr = [c0, c1, c2, c3, c4, c5, c6, c7, c8, c9];

  const healthMap = useMemo(() => {
    const m = new Map<string, any>();
    sliced.forEach((a, i) => {
      if (healthArr[i]) m.set(a._id, healthArr[i]);
    });
    return m;
  }, [sliced, ...healthArr]); // eslint-disable-line react-hooks/exhaustive-deps

  const costMap = useMemo(() => {
    const m = new Map<string, any>();
    sliced.forEach((a, i) => {
      if (costArr[i]) m.set(a._id, costArr[i]);
    });
    return m;
  }, [sliced, ...costArr]); // eslint-disable-line react-hooks/exhaustive-deps

  if (agents.length === 0) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <Network className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            No agents to display in graph view
          </p>
        </CardContent>
      </Card>
    );
  }

  return <AgentGraph agents={sliced} healthMap={healthMap} costMap={costMap} />;
}

interface AgentData {
  _id: string;
  name: string;
  status: string;
  lastHeartbeat: number;
  config?: { model?: string; channel?: string };
}

const AgentCard = memo(function AgentCard({ agent }: { agent: AgentData }) {
  const health = useQuery(api.agents.healthSummary, {
    agentId: agent._id as any,
  });
  const costSummary = useQuery(api.costs.summary, {
    agentId: agent._id as any,
  });

  const costToday = useMemo(
    () => formatCost(costSummary?.today.cost ?? 0),
    [costSummary?.today.cost],
  );

  return (
    <Link
      to="/agents/$agentId"
      params={{ agentId: agent._id }}
      className="block group"
    >
      <Card className="transition-all hover:border-primary/30 hover:shadow-md group-hover:bg-muted/20">
        <CardContent className="p-5 space-y-4">
          {/* Header row */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <Circle
                className={cn(
                  "h-2.5 w-2.5 shrink-0 fill-current",
                  statusColor(agent.status),
                )}
              />
              <span className="font-semibold truncate">{agent.name}</span>
            </div>
            <Badge
              variant={agent.status === "online" ? "default" : agent.status === "degraded" ? "secondary" : "outline"}
              className="shrink-0 text-xs"
            >
              {agent.status}
            </Badge>
          </div>

          {/* Model badge */}
          {agent.config?.model && (
            <div>
              <Badge variant="secondary" className="text-xs font-normal">
                {agent.config.model}
              </Badge>
            </div>
          )}

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 pt-1 border-t border-border/50">
            <div className="flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Today</p>
                <p className="text-sm font-medium">{costToday}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Sessions</p>
                <p className="text-sm font-medium">{health?.activeSessions ?? "–"}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Heartbeat</p>
                <p className="text-sm font-medium">{timeAgo(agent.lastHeartbeat)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
});
