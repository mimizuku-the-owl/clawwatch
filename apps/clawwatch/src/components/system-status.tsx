import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@clawwatch/ui/components/card";
import { cn } from "@clawwatch/ui/lib/utils";
import { api } from "@convex/api";
import { useQuery } from "convex/react";
import { memo, useMemo } from "react";
import { timeAgo } from "@/lib/utils";

const STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes — if no heartbeat, consider offline

export const SystemStatus = memo(function SystemStatus() {
  const agents = useQuery(api.agents.list, {});

  const statusInfo = useMemo(() => {
    if (!agents || agents.length === 0) return null;

    const now = Date.now();

    // Use real heartbeat timestamps from agents
    const mostRecentHeartbeat = Math.max(...agents.map((a) => a.lastHeartbeat));
    const gatewayConnected = now - mostRecentHeartbeat < STALE_THRESHOLD_MS;

    // Count based on real heartbeat freshness, not just DB status field
    const onlineCount = agents.filter(
      (a) => now - a.lastHeartbeat < STALE_THRESHOLD_MS,
    ).length;
    const offlineCount = agents.length - onlineCount;

    return {
      gatewayConnected,
      lastHeartbeat: mostRecentHeartbeat,
      onlineCount,
      offlineCount,
      totalAgents: agents.length,
    };
  }, [agents]);

  if (!statusInfo) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">System Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-1/2" />
            <div className="h-4 bg-muted rounded w-2/3" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const { gatewayConnected, lastHeartbeat, onlineCount, offlineCount } =
    statusInfo;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">System Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "h-2 w-2 rounded-full",
              gatewayConnected ? "bg-emerald-400" : "bg-red-400",
            )}
          />
          <span className="text-sm font-medium">
            {gatewayConnected ? "Connected" : "Disconnected"}
          </span>
        </div>

        <div className="text-sm">
          <span className="text-muted-foreground">Last heartbeat:</span>
          <span
            className={cn(
              "ml-2 font-mono",
              !gatewayConnected && "text-red-400",
            )}
          >
            {timeAgo(lastHeartbeat)}
          </span>
        </div>

        <div className="text-sm">
          <span className="text-muted-foreground">Agents:</span>
          <span className="ml-2">
            <span
              className={cn(
                "font-medium",
                onlineCount > 0 ? "text-emerald-400" : "text-muted-foreground",
              )}
            >
              {onlineCount} online
            </span>
            {offlineCount > 0 && (
              <>
                <span className="mx-1 text-muted-foreground">•</span>
                <span className="font-medium text-red-400">
                  {offlineCount} offline
                </span>
              </>
            )}
          </span>
        </div>
      </CardContent>
    </Card>
  );
});
