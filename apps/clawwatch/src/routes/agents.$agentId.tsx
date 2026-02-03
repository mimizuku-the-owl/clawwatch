import { Badge } from "@clawwatch/ui/components/badge";
import { Button } from "@clawwatch/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@clawwatch/ui/components/card";
import { Input } from "@clawwatch/ui/components/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@clawwatch/ui/components/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@clawwatch/ui/components/tabs";
import { cn } from "@clawwatch/ui/lib/utils";
import { api } from "@convex/api";
import type { Id } from "@convex/dataModel";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Circle,
  Clock,
  DollarSign,
  ExternalLink,
  FolderOpen,
  Hash,
  Search,
  X,
  Zap,
} from "lucide-react";
import type { ChangeEvent } from "react";
import { memo, useMemo, useState, useCallback } from "react";
import { CostChart } from "@/components/cost-chart";
import { StatCard } from "@/components/stat-card";
import { formatCost, formatTokens, statusColor, timeAgo } from "@/lib/utils";

export const Route = createFileRoute("/agents/$agentId")({
  component: AgentDetailPage,
});

type SortField = "lastActivity" | "estimatedCost" | "totalTokens";
type SortDir = "asc" | "desc";

function AgentDetailPage() {
  const { agentId } = Route.useParams();
  const navigate = useNavigate();

  // Session filters
  const [sessionSearch, setSessionSearch] = useState("");
  const [kindFilter, setKindFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("lastActivity");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [expandedSession, setExpandedSession] = useState<string | null>(null);

  const health = useQuery(api.agents.healthSummary, {
    agentId: agentId as Id<"agents">,
  });

  const agentCostSummary = useQuery(api.costs.summary, {
    agentId: agentId as Id<"agents">,
  });

  const agentTimeSeries = useQuery(api.costs.timeSeries, {
    hours: 24,
    agentId: agentId as Id<"agents">,
  });

  const sessions = useQuery(api.sessions.byAgent, {
    agentId: agentId as Id<"agents">,
    limit: 100,
  });

  const formattedAgentCost = useMemo(
    () => formatCost(agentCostSummary?.today.cost ?? 0),
    [agentCostSummary?.today.cost],
  );

  const formattedAgentTokens = useMemo(
    () =>
      formatTokens(
        (agentCostSummary?.today.inputTokens ?? 0) +
          (agentCostSummary?.today.outputTokens ?? 0),
      ),
    [agentCostSummary?.today.inputTokens, agentCostSummary?.today.outputTokens],
  );

  // Derive unique kinds/channels for filters
  const sessionKinds = useMemo(() => {
    if (!sessions) return [];
    const kinds = new Set(sessions.map((s) => s.kind));
    return Array.from(kinds).sort();
  }, [sessions]);

  // Filtered + sorted sessions
  const filteredSessions = useMemo(() => {
    if (!sessions) return undefined;
    let result = sessions.filter((session) => {
      const matchesSearch =
        !sessionSearch ||
        session.sessionKey.toLowerCase().includes(sessionSearch.toLowerCase()) ||
        session.channel?.toLowerCase().includes(sessionSearch.toLowerCase()) ||
        session.kind.toLowerCase().includes(sessionSearch.toLowerCase());
      const matchesKind = kindFilter === "all" || session.kind === kindFilter;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && session.isActive) ||
        (statusFilter === "completed" && !session.isActive);
      return matchesSearch && matchesKind && matchesStatus;
    });

    result = [...result].sort((a, b) => {
      const av = a[sortField] ?? 0;
      const bv = b[sortField] ?? 0;
      return sortDir === "desc" ? (bv as number) - (av as number) : (av as number) - (bv as number);
    });

    return result;
  }, [sessions, sessionSearch, kindFilter, statusFilter, sortField, sortDir]);

  const toggleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortDir((d) => (d === "desc" ? "asc" : "desc"));
      } else {
        setSortField(field);
        setSortDir("desc");
      }
    },
    [sortField],
  );

  if (!health) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="grid grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 bg-muted rounded" />
            ))}
          </div>
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  const { agent, activeSessions, errorCount, isHealthy } = health;

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDir === "desc" ? (
      <ChevronDown className="h-3 w-3 inline ml-0.5" />
    ) : (
      <ChevronUp className="h-3 w-3 inline ml-0.5" />
    );
  };

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate({ to: "/agents" })}
          className="h-8 w-8 p-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <div className="flex items-center gap-3 flex-1">
          <Circle
            className={cn("h-3 w-3 fill-current", statusColor(agent.status))}
          />
          <h1 className="text-2xl font-bold tracking-tight">{agent.name}</h1>

          {agent.config?.model && (
            <Badge variant="secondary">{agent.config.model}</Badge>
          )}

          <Badge variant={isHealthy ? "default" : "destructive"} className="ml-2">
            {isHealthy ? "Healthy" : "Issues Detected"}
          </Badge>

          <span className="text-sm text-muted-foreground ml-auto">
            Last heartbeat {timeAgo(agent.lastHeartbeat)}
          </span>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sessions">
            Sessions
            {sessions && (
              <span className="ml-1.5 text-xs text-muted-foreground">
                ({sessions.length})
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
        </TabsList>

        {/* ─── OVERVIEW TAB ─── */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Cost Today"
              value={formattedAgentCost}
              change={`${agentCostSummary?.today.requests ?? 0} requests`}
              icon={<DollarSign className="h-5 w-5 text-primary" />}
            />
            <StatCard
              label="Tokens Today"
              value={formattedAgentTokens}
              change="Input + Output"
              icon={<Zap className="h-5 w-5 text-amber-400" />}
            />
            <StatCard
              label="Active Sessions"
              value={activeSessions.toString()}
              change="Currently running"
              icon={<Activity className="h-5 w-5 text-blue-400" />}
            />
            <StatCard
              label="Errors (24h)"
              value={errorCount.toString()}
              change={errorCount === 0 ? "All clear" : "Needs attention"}
              changeType={errorCount === 0 ? "positive" : "negative"}
              icon={
                <AlertTriangle
                  className={cn(
                    "h-5 w-5",
                    errorCount > 0 ? "text-red-400" : "text-muted-foreground",
                  )}
                />
              }
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Cost — Last 24 Hours</CardTitle>
              <CardDescription>
                Hourly cost breakdown for this agent
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CostChart data={agentTimeSeries ?? []} />
            </CardContent>
          </Card>

          {/* Health details */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "h-10 w-10 rounded-lg flex items-center justify-center",
                    agent.status === "online" ? "bg-emerald-500/10" : "bg-red-500/10",
                  )}>
                    <Circle className={cn(
                      "h-4 w-4 fill-current",
                      statusColor(agent.status),
                    )} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Status</p>
                    <p className="text-lg font-semibold capitalize">{agent.status}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Activity className="h-4 w-4 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Sessions</p>
                    <p className="text-lg font-semibold">{health.totalSessions}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <DollarSign className="h-4 w-4 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Cost This Week</p>
                    <p className="text-lg font-semibold">{formatCost(agentCostSummary?.week.cost ?? 0)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── SESSIONS TAB ─── */}
        <TabsContent value="sessions" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search sessions..."
                value={sessionSearch}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setSessionSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>

            {/* Kind filter */}
            <select
              value={kindFilter}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setKindFilter(e.target.value)}
              className="rounded-md border bg-background px-3 py-2 text-sm h-9"
            >
              <option value="all">All kinds</option>
              {sessionKinds.map((kind) => (
                <option key={kind} value={kind}>
                  {kind}
                </option>
              ))}
            </select>

            {/* Status filter */}
            <div className="flex items-center gap-1 rounded-lg border bg-muted/30 p-0.5">
              {(["all", "active", "completed"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                    statusFilter === s
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>

            {(sessionSearch || kindFilter !== "all" || statusFilter !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9"
                onClick={() => {
                  setSessionSearch("");
                  setKindFilter("all");
                  setStatusFilter("all");
                }}
              >
                <X className="h-3.5 w-3.5 mr-1" />
                Clear
              </Button>
            )}
          </div>

          {/* Sessions table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Session</TableHead>
                    <TableHead>Kind</TableHead>
                    <TableHead>Channel</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>
                      <button
                        onClick={() => toggleSort("lastActivity")}
                        className="flex items-center gap-1 hover:text-foreground transition-colors"
                      >
                        Last Activity
                        <SortIcon field="lastActivity" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        onClick={() => toggleSort("totalTokens")}
                        className="flex items-center gap-1 hover:text-foreground transition-colors"
                      >
                        Tokens
                        <SortIcon field="totalTokens" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        onClick={() => toggleSort("estimatedCost")}
                        className="flex items-center gap-1 hover:text-foreground transition-colors"
                      >
                        Cost
                        <SortIcon field="estimatedCost" />
                      </button>
                    </TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSessions === undefined ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 8 }).map((_, j) => (
                          <TableCell key={j}>
                            <div className="h-4 bg-muted rounded animate-pulse" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : filteredSessions.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="py-12 text-center text-muted-foreground"
                      >
                        <Activity className="mx-auto mb-2 h-8 w-8 opacity-50" />
                        <p className="text-sm">No sessions found</p>
                        <p className="text-xs mt-1">
                          {sessions && sessions.length > 0
                            ? "Try adjusting your filters"
                            : "Sessions will appear when the agent starts processing requests"}
                        </p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSessions.map((session) => (
                      <SessionRow
                        key={session._id}
                        session={session}
                        isExpanded={expandedSession === session._id}
                        onToggle={() =>
                          setExpandedSession(
                            expandedSession === session._id ? null : session._id,
                          )
                        }
                      />
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── FILES TAB ─── */}
        <TabsContent value="files" className="space-y-6">
          <Card>
            <CardContent className="py-16 text-center">
              <div className="mx-auto mb-4 h-14 w-14 rounded-xl bg-muted flex items-center justify-center">
                <FolderOpen className="h-7 w-7 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold">Workspace File Browser</h3>
              <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
                Connect your agent's workspace to browse, view, and manage files
                directly from ClawWatch.
              </p>
              <div className="mt-6 flex items-center justify-center gap-3">
                <Button variant="outline" size="sm">
                  <BookOpen className="h-4 w-4 mr-2" />
                  Setup Guide
                  <ExternalLink className="h-3 w-3 ml-1.5 text-muted-foreground" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Session Row with expandable detail ───

interface SessionData {
  _id: string;
  sessionKey: string;
  kind: string;
  channel?: string;
  startedAt: number;
  lastActivity: number;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
  messageCount: number;
  isActive: boolean;
}

const SessionRow = memo(function SessionRow({
  session,
  isExpanded,
  onToggle,
}: {
  session: SessionData;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const duration = useMemo(() => {
    const ms = (session.isActive ? Date.now() : session.lastActivity) - session.startedAt;
    const mins = Math.floor(ms / 60000);
    const hours = Math.floor(mins / 60);
    if (hours > 0) return `${hours}h ${mins % 60}m`;
    return `${mins}m`;
  }, [session.startedAt, session.lastActivity, session.isActive]);

  return (
    <>
      <TableRow
        className={cn(
          "cursor-pointer transition-colors",
          isExpanded && "bg-muted/30",
        )}
        onClick={onToggle}
      >
        <TableCell className="font-mono text-xs">
          <span title={session.sessionKey}>
            {session.sessionKey.length > 20
              ? `${session.sessionKey.substring(0, 20)}…`
              : session.sessionKey}
          </span>
        </TableCell>
        <TableCell>
          <Badge variant="secondary" className="text-xs font-normal">
            {session.kind}
          </Badge>
        </TableCell>
        <TableCell className="text-sm">
          {session.channel || "—"}
        </TableCell>
        <TableCell className="text-sm">{timeAgo(session.startedAt)}</TableCell>
        <TableCell className="text-sm">
          {timeAgo(session.lastActivity)}
        </TableCell>
        <TableCell className="text-sm font-medium">
          {formatTokens(session.totalTokens ?? 0)}
        </TableCell>
        <TableCell className="text-sm font-medium">
          {formatCost(session.estimatedCost ?? 0)}
        </TableCell>
        <TableCell>
          <Badge variant={session.isActive ? "default" : "secondary"}>
            {session.isActive ? "Active" : "Done"}
          </Badge>
        </TableCell>
      </TableRow>

      {/* Expanded detail row */}
      {isExpanded && (
        <TableRow className="bg-muted/20 hover:bg-muted/20">
          <TableCell colSpan={8} className="p-4">
            <div className="grid grid-cols-2 gap-x-8 gap-y-4 md:grid-cols-4">
              <DetailItem
                icon={<Clock className="h-3.5 w-3.5" />}
                label="Duration"
                value={duration}
              />
              <DetailItem
                icon={<Hash className="h-3.5 w-3.5" />}
                label="Messages"
                value={session.messageCount.toString()}
              />
              <DetailItem
                icon={<Zap className="h-3.5 w-3.5" />}
                label="Input Tokens"
                value={formatTokens(session.inputTokens)}
              />
              <DetailItem
                icon={<Zap className="h-3.5 w-3.5" />}
                label="Output Tokens"
                value={formatTokens(session.outputTokens)}
              />
              <DetailItem
                icon={<DollarSign className="h-3.5 w-3.5" />}
                label="Total Cost"
                value={formatCost(session.estimatedCost)}
              />
              <DetailItem
                icon={<Activity className="h-3.5 w-3.5" />}
                label="Avg Cost/Msg"
                value={
                  session.messageCount > 0
                    ? formatCost(session.estimatedCost / session.messageCount)
                    : "—"
                }
              />
              <DetailItem
                label="Kind"
                value={session.kind}
              />
              <DetailItem
                label="Channel"
                value={session.channel || "—"}
              />
            </div>
            <div className="mt-3 pt-3 border-t border-border/50">
              <p className="text-xs text-muted-foreground font-mono break-all">
                Key: {session.sessionKey}
              </p>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
});

function DetailItem({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2">
      {icon && (
        <span className="mt-0.5 text-muted-foreground">{icon}</span>
      )}
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}

export default AgentDetailPage;
