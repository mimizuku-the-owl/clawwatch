import { createFileRoute } from "@tanstack/react-router";
import { Radio } from "lucide-react";
import { EventLog } from "@/components/event-log";

export const Route = createFileRoute("/events")({
  component: EventsPage,
});

function EventsPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Radio className="h-4.5 w-4.5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Events</h1>
            <p className="text-sm text-muted-foreground">
              Real-time activity feed across all agents
            </p>
          </div>
        </div>
      </div>

      {/* Event log */}
      <EventLog showAgentColumn limit={500} />
    </div>
  );
}
