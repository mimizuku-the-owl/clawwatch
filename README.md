<p align="center">
  <img src="apps/clawwatch/public/clawwatch-owl.svg" alt="ClawWatch" width="64" height="64" />
</p>

<h3 align="center">ClawWatch</h3>

<p align="center">
  Self-hosted monitoring and cost management for AI agents.
</p>

<p align="center">
  <a href="https://github.com/0xdsqr/clawwatch"><img src="https://img.shields.io/badge/github-clawwatch-blue?style=flat-square&logo=github" alt="GitHub" /></a>
  <a href="#"><img src="https://img.shields.io/badge/typescript-5.9-blue?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" /></a>
  <a href="#"><img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="License" /></a>
</p>

---

ClawWatch is a local-first monitoring system for agentic AI agents. Connect your agents through a WebSocket gateway and get real-time visibility into costs, token usage, sessions, and system health from a single dashboard.

### Core Features

**Real-time cost tracking** -- Monitor spend across providers and models as it happens, with projected monthly burn rates and budget controls.

**Multi-agent dashboard** -- Unified view of all connected agents with live status indicators, session counts, and per-agent cost breakdowns.

**Smart alerting** -- Configurable rules for budget thresholds, offline detection, error spikes, and cost anomalies. Supports Discord, email, and webhook notifications.

**Live event stream** -- Filterable, sortable log of all agent activity with level-based coloring, search, and real-time streaming.

**Token analytics** -- Input/output/cache token breakdowns with model comparison tables and usage distribution charts.

**Fully self-hosted** -- Runs on your machine. Data stays local. No external dependencies beyond a Convex backend.

### Quick Start

```bash
# install dependencies
bun install

# start convex backend
cd packages/core && npx convex dev

# start the dashboard
cd apps/clawwatch && bun run dev
```

Set `GATEWAY_URL` and `GATEWAY_TOKEN` to connect the WebSocket collector to your agent gateway.

### Stack

- **Frontend**: React 19, TanStack Router, Tailwind CSS 4, Recharts
- **Backend**: Convex (real-time database + API)
- **Runtime**: Bun
- **Collector**: WebSocket + polling for live data ingestion
