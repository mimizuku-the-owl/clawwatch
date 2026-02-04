import { cn } from "@clawwatch/ui/lib/utils";
import {
  Background,
  BackgroundVariant,
  Controls,
  type Edge,
  Handle,
  MiniMap,
  type Node,
  type NodeProps,
  Position,
  ReactFlow,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { memo, useMemo } from "react";
import { formatCost, timeAgo } from "@/lib/utils";

// ─── Data types matching the backend xraySummary return ───

export interface AgentXrayData {
  agent: {
    _id: string;
    name: string;
    gatewayUrl: string;
    status: string;
    config?: { model?: string; channel?: string };
  };
  channels: string[];
  integrations: Array<{
    name: string;
    category: "service" | "channel" | "memory" | "internal" | "ai";
    icon: string;
    callCount: number;
    lastSeen: number;
  }>;
  coreToolCounts: {
    exec: number;
    read: number;
    write: number;
    edit: number;
    process: number;
  };
  subAgents: Array<{ name: string; count: number; lastSeen: number }>;
  aiProviders: Array<{
    name: string;
    icon: string;
    cost: number;
    inputTokens: number;
    outputTokens: number;
    requests: number;
    lastSeen: number;
  }>;
}

export interface AgentXrayProps {
  data: AgentXrayData;
}

// ─── Node variants and styling ───

type XrayNodeVariant =
  | "agent"
  | "gateway"
  | "channel"
  | "service"
  | "ai"
  | "memory"
  | "internal"
  | "core";

type XrayNodeData = {
  title: string;
  subtitle?: string;
  meta?: string;
  variant: XrayNodeVariant;
  icon?: string;
};

const VARIANT_STYLES: Record<XrayNodeVariant, string> = {
  agent: "border-purple-500/50 bg-purple-500/10 shadow-purple-500/10",
  gateway: "border-emerald-500/30 bg-emerald-500/8",
  channel: "border-blue-400/30 bg-blue-500/8",
  service: "border-sky-400/30 bg-sky-500/8",
  ai: "border-rose-400/40 bg-rose-500/10 shadow-rose-500/10",
  memory: "border-emerald-400/30 bg-emerald-500/8",
  internal: "border-amber-400/30 bg-amber-500/8",
  core: "border-zinc-400/25 bg-zinc-500/8",
};

const VARIANT_HANDLE_COLOR: Record<XrayNodeVariant, string> = {
  agent: "!bg-purple-400",
  gateway: "!bg-emerald-400",
  channel: "!bg-blue-400",
  service: "!bg-sky-400",
  ai: "!bg-rose-400",
  memory: "!bg-emerald-400",
  internal: "!bg-amber-400",
  core: "!bg-zinc-400",
};

const VARIANT_EDGE_COLOR: Record<XrayNodeVariant, string> = {
  agent: "hsl(270 85% 65%)",
  gateway: "hsl(160 60% 50%)",
  channel: "hsl(210 80% 60%)",
  service: "hsl(200 80% 60%)",
  ai: "hsl(340 75% 60%)",
  memory: "hsl(160 60% 50%)",
  internal: "hsl(40 80% 55%)",
  core: "hsl(240 5% 50%)",
};

const MINIMAP_COLOR: Record<XrayNodeVariant, string> = {
  agent: "hsl(270 70% 60%)",
  gateway: "hsl(160 60% 50%)",
  channel: "hsl(210 80% 60%)",
  service: "hsl(200 80% 60%)",
  ai: "hsl(340 75% 60%)",
  memory: "hsl(160 60% 50%)",
  internal: "hsl(40 80% 55%)",
  core: "hsl(240 5% 50%)",
};

// ─── Custom node component ───

const XrayNode = memo(function XrayNode({
  data,
}: NodeProps<Node<XrayNodeData>>) {
  const handleColor = VARIANT_HANDLE_COLOR[data.variant];
  const isAgent = data.variant === "agent";

  return (
    <div
      className={cn(
        "rounded-lg border px-3 py-2 text-xs shadow-sm min-w-[150px] max-w-[200px] bg-card/80 backdrop-blur-sm",
        isAgent && "px-4 py-3 min-w-[180px] shadow-md",
        VARIANT_STYLES[data.variant],
      )}
    >
      <div className="flex items-center gap-1.5">
        {data.icon && <span className="text-sm shrink-0">{data.icon}</span>}
        <span
          className={cn(
            "font-semibold truncate",
            isAgent && "text-sm",
          )}
        >
          {data.title}
        </span>
      </div>
      {data.subtitle && (
        <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
          {data.subtitle}
        </div>
      )}
      {data.meta && (
        <div className="text-[10px] text-muted-foreground/70 mt-0.5 truncate">
          {data.meta}
        </div>
      )}

      <Handle
        type="target"
        position={Position.Left}
        className={cn(
          "!w-2 !h-2 !border-2 !border-background",
          handleColor,
        )}
      />
      <Handle
        type="source"
        position={Position.Right}
        className={cn(
          "!w-2 !h-2 !border-2 !border-background",
          handleColor,
        )}
      />
    </div>
  );
});

const nodeTypes = {
  xrayNode: XrayNode,
};

// ─── Helpers ───

function formatGatewayLabel(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

function isRecentlyActive(lastSeen: number): boolean {
  return Date.now() - lastSeen < 60 * 60 * 1000; // within 1 hour
}

function isStale(lastSeen: number): boolean {
  return Date.now() - lastSeen > 24 * 60 * 60 * 1000; // older than 1 day
}

function edgeThickness(count: number): number {
  if (count > 50) return 3;
  if (count > 20) return 2.5;
  if (count > 5) return 2;
  return 1.5;
}

function makeEdge(
  id: string,
  source: string,
  target: string,
  variant: XrayNodeVariant,
  lastSeen: number,
  count: number,
): Edge {
  const active = isRecentlyActive(lastSeen);
  const stale = isStale(lastSeen);

  return {
    id,
    source,
    target,
    style: {
      stroke: VARIANT_EDGE_COLOR[variant],
      strokeWidth: edgeThickness(count),
      ...(stale ? { strokeDasharray: "6 8", opacity: 0.4 } : {}),
      ...(!stale && !active ? { strokeDasharray: "4 6" } : {}),
    },
    animated: active,
  };
}

// Channel icon mapping
function channelIcon(ch: string): string {
  const lower = ch.toLowerCase();
  if (lower.includes("discord")) return "💜";
  if (lower.includes("slack")) return "💬";
  if (lower.includes("telegram")) return "✈️";
  if (lower.includes("whatsapp")) return "📱";
  if (lower.includes("irc")) return "📡";
  return "📨";
}

// ─── Layout builder ───

function buildLayout(data: AgentXrayData): {
  nodes: Node<XrayNodeData>[];
  edges: Edge[];
} {
  const nodes: Node<XrayNodeData>[] = [];
  const edges: Edge[] = [];

  const cx = 0;
  const cy = 0;
  const yGap = 85;
  const xSpread = 340;

  // ═══ CENTER: Agent ═══
  nodes.push({
    id: "agent",
    type: "xrayNode",
    position: { x: cx, y: cy },
    data: {
      title: data.agent.name,
      subtitle: data.agent.config?.model ?? "Agent",
      meta: data.agent.status,
      variant: "agent",
      icon: "🦉",
    },
  });

  // ═══ ABOVE: AI Providers ═══
  const aiProviders = data.aiProviders ?? [];
  if (aiProviders.length > 0) {
    const aiOffset = -((aiProviders.length - 1) * 210) / 2;
    aiProviders.forEach((provider, i) => {
      const id = `ai-${provider.name.replace(/\s+/g, "-")}`;
      nodes.push({
        id,
        type: "xrayNode",
        position: {
          x: cx + aiOffset + i * 210,
          y: cy - 160,
        },
        data: {
          title: provider.name,
          subtitle: `${provider.requests} req · ${formatCost(provider.cost)}`,
          meta: provider.lastSeen ? `Last: ${timeAgo(provider.lastSeen)}` : undefined,
          variant: "ai",
          icon: provider.icon,
        },
      });
      edges.push(
        makeEdge(
          `edge-agent-${id}`,
          "agent",
          id,
          "ai",
          provider.lastSeen,
          provider.requests,
        ),
      );
    });
  }

  // ═══ LEFT: Channels ═══
  const channelList = data.channels ?? [];
  // Also include "Messaging" integration as a channel-like node
  const messagingIntegration = (data.integrations ?? []).find(
    (i) => i.name === "Messaging",
  );

  const leftItems: Array<{
    id: string;
    title: string;
    subtitle: string;
    meta?: string;
    icon: string;
    lastSeen: number;
    count: number;
  }> = [];

  for (const ch of channelList) {
    leftItems.push({
      id: `channel-${ch}`,
      title: ch,
      subtitle: "Channel",
      icon: channelIcon(ch),
      lastSeen: Date.now(), // channels are always "alive"
      count: 10,
    });
  }

  if (messagingIntegration) {
    leftItems.push({
      id: "integration-messaging",
      title: "Messaging",
      subtitle: `${messagingIntegration.callCount} calls`,
      meta: messagingIntegration.lastSeen
        ? `Last: ${timeAgo(messagingIntegration.lastSeen)}`
        : undefined,
      icon: messagingIntegration.icon,
      lastSeen: messagingIntegration.lastSeen,
      count: messagingIntegration.callCount,
    });
  }

  const leftOffset = -((leftItems.length - 1) * yGap) / 2;
  leftItems.forEach((item, i) => {
    nodes.push({
      id: item.id,
      type: "xrayNode",
      position: { x: cx - xSpread, y: leftOffset + i * yGap },
      data: {
        title: item.title,
        subtitle: item.subtitle,
        meta: item.meta,
        variant: "channel",
        icon: item.icon,
      },
    });
    edges.push(
      makeEdge(
        `edge-agent-${item.id}`,
        "agent",
        item.id,
        "channel",
        item.lastSeen,
        item.count,
      ),
    );
  });

  // ═══ RIGHT: External services ═══
  const services = (data.integrations ?? []).filter(
    (i) => i.category === "service",
  );

  const serviceOffset = -((services.length - 1) * yGap) / 2;
  services.forEach((svc, i) => {
    const id = `service-${svc.name.replace(/\s+/g, "-")}`;
    nodes.push({
      id,
      type: "xrayNode",
      position: { x: cx + xSpread, y: serviceOffset + i * yGap },
      data: {
        title: svc.name,
        subtitle: `${svc.callCount} call${svc.callCount === 1 ? "" : "s"}`,
        meta: svc.lastSeen ? `Last: ${timeAgo(svc.lastSeen)}` : undefined,
        variant: "service",
        icon: svc.icon,
      },
    });
    edges.push(
      makeEdge(
        `edge-agent-${id}`,
        "agent",
        id,
        "service",
        svc.lastSeen,
        svc.callCount,
      ),
    );
  });

  // ═══ BELOW-LEFT: Memory + Internal ═══
  const memoryItems = (data.integrations ?? []).filter(
    (i) => i.category === "memory",
  );
  const internalItems = (data.integrations ?? []).filter(
    (i) => i.category === "internal",
  );
  const subAgents = data.subAgents ?? [];

  const belowLeftItems: Array<{
    id: string;
    title: string;
    subtitle: string;
    meta?: string;
    icon: string;
    variant: XrayNodeVariant;
    lastSeen: number;
    count: number;
  }> = [];

  for (const mem of memoryItems) {
    belowLeftItems.push({
      id: `memory-${mem.name.replace(/\s+/g, "-")}`,
      title: mem.name,
      subtitle: `${mem.callCount} lookups`,
      meta: mem.lastSeen ? `Last: ${timeAgo(mem.lastSeen)}` : undefined,
      icon: mem.icon,
      variant: "memory",
      lastSeen: mem.lastSeen,
      count: mem.callCount,
    });
  }

  for (const int of internalItems) {
    // Skip "Sub-Agents" here if we have actual sub-agent data
    if (int.name === "Sub-Agents" && subAgents.length > 0) continue;
    belowLeftItems.push({
      id: `internal-${int.name.replace(/[\s/]+/g, "-")}`,
      title: int.name,
      subtitle: `${int.callCount} calls`,
      meta: int.lastSeen ? `Last: ${timeAgo(int.lastSeen)}` : undefined,
      icon: int.icon,
      variant: "internal",
      lastSeen: int.lastSeen,
      count: int.callCount,
    });
  }

  // Individual sub-agents
  for (const sub of subAgents) {
    belowLeftItems.push({
      id: `subagent-${sub.name.replace(/[\s/]+/g, "-")}`,
      title: sub.name,
      subtitle: `${sub.count} spawn${sub.count === 1 ? "" : "s"}`,
      meta: sub.lastSeen ? `Last: ${timeAgo(sub.lastSeen)}` : undefined,
      icon: "🤖",
      variant: "internal",
      lastSeen: sub.lastSeen,
      count: sub.count,
    });
  }

  const blOffset = -((belowLeftItems.length - 1) * yGap) / 2;
  belowLeftItems.forEach((item, i) => {
    nodes.push({
      id: item.id,
      type: "xrayNode",
      position: {
        x: cx - xSpread + 20,
        y: cy + 200 + blOffset + i * yGap,
      },
      data: {
        title: item.title,
        subtitle: item.subtitle,
        meta: item.meta,
        variant: item.variant,
        icon: item.icon,
      },
    });
    edges.push(
      makeEdge(
        `edge-agent-${item.id}`,
        "agent",
        item.id,
        item.variant,
        item.lastSeen,
        item.count,
      ),
    );
  });

  // ═══ BELOW-RIGHT: Core Tools (grouped) ═══
  const coreToolCounts = data.coreToolCounts ?? {
    exec: 0,
    read: 0,
    write: 0,
    edit: 0,
    process: 0,
  };
  const totalCoreCalls = Object.values(coreToolCounts).reduce(
    (a, b) => a + b,
    0,
  );

  if (totalCoreCalls > 0) {
    const breakdown = Object.entries(coreToolCounts)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => `${k}:${v}`)
      .join(" · ");

    nodes.push({
      id: "core-tools",
      type: "xrayNode",
      position: { x: cx + xSpread - 20, y: cy + 200 },
      data: {
        title: "Core Tools",
        subtitle: `${totalCoreCalls} calls`,
        meta: breakdown,
        variant: "core",
        icon: "🔧",
      },
    });
    edges.push({
      id: "edge-agent-core-tools",
      source: "agent",
      target: "core-tools",
      style: {
        stroke: VARIANT_EDGE_COLOR.core,
        strokeWidth: edgeThickness(totalCoreCalls),
        strokeDasharray: "4 6",
      },
    });
  }

  // ═══ BOTTOM: Gateway ═══
  if (data.agent.gatewayUrl) {
    nodes.push({
      id: "gateway",
      type: "xrayNode",
      position: { x: cx, y: cy + 300 },
      data: {
        title: "Gateway",
        subtitle: formatGatewayLabel(data.agent.gatewayUrl),
        variant: "gateway",
        icon: "🚀",
      },
    });
    edges.push({
      id: "edge-agent-gateway",
      source: "agent",
      target: "gateway",
      style: {
        stroke: VARIANT_EDGE_COLOR.gateway,
        strokeWidth: 1.5,
        strokeDasharray: "4 6",
      },
    });
  }

  return { nodes, edges };
}

// ─── Minimap node color callback ───

function minimapNodeColor(node: Node<XrayNodeData>): string {
  const variant = node.data?.variant as XrayNodeVariant | undefined;
  return variant ? (MINIMAP_COLOR[variant] ?? "hsl(270 70% 60%)") : "hsl(270 70% 60%)";
}

// ─── Main component ───

export function AgentXrayInternal({ data }: AgentXrayProps) {
  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => buildLayout(data),
    [data],
  );

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  return (
    <div className="h-[650px] rounded-lg border bg-card overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        minZoom={0.2}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        className="bg-background"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="hsl(270 70% 60% / 0.08)"
        />
        <Controls
          className="!bg-card !border-border !shadow-lg [&>button]:!bg-card [&>button]:!border-border [&>button]:!text-foreground [&>button:hover]:!bg-muted"
          showInteractive={false}
        />
        <MiniMap
          className="!bg-card !border-border"
          nodeColor={minimapNodeColor}
          maskColor="hsl(var(--background) / 0.8)"
        />
      </ReactFlow>
    </div>
  );
}
