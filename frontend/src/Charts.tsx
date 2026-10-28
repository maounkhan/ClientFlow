import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Row } from "./api";
export function ActivityChart({ data }: { data: Row[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart
        data={data}
        margin={{ left: -25, right: 15, top: 10, bottom: 0 }}
      >
        <defs>
          <linearGradient id="greenArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2f8069" stopOpacity={0.18} />
            <stop offset="100%" stopColor="#2f8069" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          vertical={false}
          stroke="#e9eeeb"
          strokeDasharray="4 4"
        />
        <XAxis
          dataKey="day"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: "#8a958e" }}
          minTickGap={30}
        />
        <YAxis
          allowDecimals={false}
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: "#8a958e" }}
        />
        <Tooltip
          contentStyle={{
            borderRadius: 10,
            border: "1px solid #e1e8e3",
            fontSize: 12,
          }}
        />
        <Area
          type="monotone"
          dataKey="created"
          name="Created"
          stroke="#347960"
          strokeWidth={2.5}
          fill="url(#greenArea)"
        />
        <Area
          type="monotone"
          dataKey="resolved"
          name="Resolved"
          stroke="#b1c9a0"
          strokeWidth={2}
          strokeDasharray="4 4"
          fill="transparent"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
export function StatusChart({ data }: { data: Row[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ left: -20, right: 20, bottom: 15 }}>
        <CartesianGrid vertical={false} stroke="#edf0ed" />
        <XAxis
          dataKey="status"
          tick={{ fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          interval={0}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip cursor={{ fill: "#f0f5f1" }} />
        <Bar
          dataKey="count"
          name="Tickets"
          fill="#397c65"
          radius={[5, 5, 0, 0]}
          barSize={36}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
export function WorkloadChart({ data }: { data: Row[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ left: -20, right: 20, bottom: 10 }}>
        <CartesianGrid vertical={false} stroke="#edf0ed" />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
        <Bar
          dataKey="active"
          name="Active"
          fill="#397c65"
          radius={[4, 4, 0, 0]}
        />
        <Bar
          dataKey="resolved"
          name="Completed"
          fill="#bfd4aa"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
