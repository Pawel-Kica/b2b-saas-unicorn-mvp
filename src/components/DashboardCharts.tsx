"use client";

import { useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
} from "react-simple-maps";
import type { DashboardStats } from "@/lib/api";

const COLORS = ["#3b82f6", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ec4899", "#ef4444"];
const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";


function CustomTooltipContent({ active, payload }: { active?: boolean; payload?: { name: string; value: number }[] }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 text-sm shadow-lg">
      <p className="text-foreground font-medium">{payload[0].name}</p>
      <p className="text-muted">{payload[0].value}</p>
    </div>
  );
}

function DonutChart({ title, data, nameKey }: { title: string; data: Record<string, unknown>[]; nameKey: string }) {
  if (!data.length) {
    return (
      <div className="rounded-xl border border-border bg-surface p-4">
        <h3 className="text-xs font-medium text-muted">{title}</h3>
        <p className="mt-6 text-center text-xs text-muted">No data yet</p>
      </div>
    );
  }

  const chartData = data.map((d) => ({
    name: (d[nameKey] as string) || "Unknown",
    value: d.count as number,
  }));

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <h3 className="text-xs font-medium text-muted mb-1">{title}</h3>
      <div className="h-44">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="45%"
              innerRadius={35}
              outerRadius={58}
              paddingAngle={2}
              dataKey="value"
              nameKey="name"
            >
              {chartData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltipContent />} />
            <Legend
              wrapperStyle={{ fontSize: "10px" }}
              formatter={(value: string) => <span className="text-muted">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function WorldMap({ data }: { data: DashboardStats["leads_by_country"] }) {
  const [hoveredGeo, setHoveredGeo] = useState<{ name: string; count: number } | null>(null);

  const countByName: Record<string, number> = {};
  for (const d of data) {
    countByName[d.country] = d.count;
  }

  const maxCount = Math.max(...data.map((d) => d.count), 1);

  function getCountForGeo(geoName: string) {
    return countByName[geoName] ?? 0;
  }

  function getFillForGeo(geoName: string) {
    const count = getCountForGeo(geoName);
    if (count === 0) return "#27272a";
    const intensity = Math.max(0.2, count / maxCount);
    const r = Math.round(30 + (59 - 30) * (1 - intensity));
    const g = Math.round(58 + (130 - 58) * intensity);
    const b = Math.round(138 + (246 - 138) * intensity);
    return `rgb(${r}, ${g}, ${b})`;
  }

  const sorted = [...data].sort((a, b) => b.count - a.count);
  const totalLeads = sorted.reduce((s, d) => s + d.count, 0);

  return (
    <div className="mt-4 rounded-xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-muted">Lead Locations</h3>
        {hoveredGeo && (
          <span className="text-sm text-foreground">
            {hoveredGeo.name}: <span className="font-bold text-blue-400">{hoveredGeo.count}</span>
          </span>
        )}
      </div>

      {!data.length ? (
        <p className="py-12 text-center text-sm text-muted">No location data yet. Enrich leads to populate the map.</p>
      ) : (
        <div className="flex gap-4">
          {/* Map — 70% */}
          <div className="w-[70%] min-w-0">
            <div className="h-[350px]">
              <ComposableMap
                projectionConfig={{ rotate: [-10, 0, 0], scale: 147 }}
                width={800}
                height={400}
                style={{ width: "100%", height: "100%" }}
              >
                <ZoomableGroup>
                  <Geographies geography={GEO_URL}>
                    {({ geographies }) =>
                      geographies.map((geo) => {
                        const name = (geo.properties as { name?: string }).name || "";
                        const count = getCountForGeo(name);
                        return (
                          <Geography
                            key={geo.rsmKey}
                            geography={geo}
                            fill={getFillForGeo(name)}
                            stroke="#18181b"
                            strokeWidth={0.5}
                            style={{
                              default: { outline: "none" },
                              hover: { outline: "none", fill: "#60a5fa" },
                              pressed: { outline: "none" },
                            }}
                            onMouseEnter={() => setHoveredGeo({ name, count })}
                            onMouseLeave={() => setHoveredGeo(null)}
                          />
                        );
                      })
                    }
                  </Geographies>
                </ZoomableGroup>
              </ComposableMap>
            </div>

            {/* Legend bar */}
            <div className="mt-2 flex items-center gap-2 text-xs text-muted">
              <span>0</span>
              <div className="h-2 flex-1 rounded-full" style={{
                background: "linear-gradient(to right, #27272a, #1e3a8a, #3b82f6)",
              }} />
              <span>{maxCount}</span>
            </div>
          </div>

          {/* Country table — 30% */}
          <div className="w-[30%] min-w-0 overflow-auto max-h-[390px]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted">
                  <th className="pb-2 font-medium">Country</th>
                  <th className="pb-2 font-medium text-right">Leads</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((d) => (
                  <tr key={d.country} className="border-b border-border/50">
                    <td className="py-2 text-foreground">{d.country}</td>
                    <td className="py-2 text-right">
                      <span className="font-semibold text-blue-400">{d.count}</span>
                      <span className="ml-1 text-xs text-muted">
                        ({Math.round((d.count / totalLeads) * 100)}%)
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardCharts({ data }: { data: DashboardStats }) {
  return (
    <>
      {/* Donut Charts — 4 in a row */}
      <div className="mt-4 grid gap-4 grid-cols-2 xl:grid-cols-4">
        <DonutChart title="Leads by Competitor" data={data.leads_by_competitor} nameKey="name" />
        <DonutChart title="Posts by Competitor" data={data.posts_by_competitor} nameKey="name" />
        <DonutChart title="Outreach by Status" data={data.outreach_by_status} nameKey="status" />
        <DonutChart title="Outreach by Method" data={data.outreach_by_method} nameKey="method" />
      </div>

      {/* World Map */}
      <WorldMap data={data.leads_by_country} />
    </>
  );
}
