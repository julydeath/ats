'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const CHART_COLORS = {
  blue: '#1d4ed8',
  blueLight: '#93c5fd',
  green: '#059669',
  orange: '#d97706',
  red: '#dc2626',
  slate: '#64748b',
} as const

const tooltipStyle = {
  backgroundColor: '#ffffff',
  border: '1px solid #cbd5e1',
  borderRadius: 10,
  color: '#1e293b',
  fontSize: 12,
}

const axisTickStyle = {
  fill: '#64748b',
  fontSize: 11,
}

export type LeadVelocityDatum = {
  count: number
  dayLabel: string
  isHighlighted?: boolean
}

export function LeadVelocityChart({ data }: { data: LeadVelocityDatum[] }) {
  return (
    <div className="ops-chart-shell" role="img" aria-label="Lead operational velocity">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: 4, right: 4, top: 8 }}>
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
          <XAxis axisLine={false} dataKey="dayLabel" tick={axisTickStyle} tickLine={false} />
          <YAxis allowDecimals={false} axisLine={false} tick={axisTickStyle} tickLine={false} width={26} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#eff6ff' }} />
          <Bar dataKey="count" radius={[6, 6, 0, 0]}>
            {data.map((item) => (
              <Cell key={`velocity-${item.dayLabel}`} fill={item.isHighlighted ? CHART_COLORS.blue : CHART_COLORS.blueLight} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export type DualTrendDatum = {
  attendance: number
  label: string
  workflow: number
}

export function AdminWeeklyLoadChart({ data }: { data: DualTrendDatum[] }) {
  return (
    <div className="ops-chart-shell ops-chart-shell-lg" role="img" aria-label="Attendance and workflow trend">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ left: 8, right: 8, top: 8 }}>
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
          <XAxis axisLine={false} dataKey="label" tick={axisTickStyle} tickLine={false} />
          <YAxis axisLine={false} tick={axisTickStyle} tickLine={false} width={30} />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
          <Line dataKey="attendance" dot={false} name="Attendance" stroke={CHART_COLORS.blue} strokeWidth={3} type="monotone" />
          <Line dataKey="workflow" dot={false} name="Workflow" stroke={CHART_COLORS.green} strokeWidth={3} type="monotone" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export type HRTrendDatum = {
  attendance: number
  dayLabel: string
  workflow: number
}

export function HRTrendChart({ data }: { data: HRTrendDatum[] }) {
  return (
    <div className="ops-chart-shell ops-chart-shell-lg" role="img" aria-label="HR trend chart">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ left: 8, right: 8, top: 8 }}>
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" />
          <XAxis axisLine={false} dataKey="dayLabel" tick={axisTickStyle} tickLine={false} />
          <YAxis axisLine={false} tick={axisTickStyle} tickLine={false} width={30} />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
          <Line dataKey="attendance" dot={false} name="Attendance Activity" stroke={CHART_COLORS.blue} strokeWidth={3} type="monotone" />
          <Line dataKey="workflow" dot={false} name="Workflow Activity" stroke={CHART_COLORS.orange} strokeWidth={3} type="monotone" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export type HRLeaveDatum = {
  days: number
  label: string
}

const LEAVE_COLORS = [CHART_COLORS.blue, CHART_COLORS.green, CHART_COLORS.orange, CHART_COLORS.red, CHART_COLORS.slate]

export function HRLeaveDonutChart({ data }: { data: HRLeaveDatum[] }) {
  return (
    <div className="ops-chart-shell" role="img" aria-label="Leave breakdown chart">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip contentStyle={tooltipStyle} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
          <Pie
            data={data}
            dataKey="days"
            innerRadius={52}
            nameKey="label"
            outerRadius={76}
            paddingAngle={2}
            stroke="#ffffff"
            strokeWidth={2}
          >
            {data.map((item, index) => (
              <Cell key={`leave-${item.label}`} fill={LEAVE_COLORS[index % LEAVE_COLORS.length]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

export type HRPayrollDatum = {
  label: string
  net: number
}

export function HRPayrollBarChart({ data }: { data: HRPayrollDatum[] }) {
  return (
    <div className="ops-chart-shell" role="img" aria-label="Payroll trend chart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: 8, right: 8, top: 8 }}>
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
          <XAxis axisLine={false} dataKey="label" tick={axisTickStyle} tickLine={false} />
          <YAxis axisLine={false} tick={axisTickStyle} tickLine={false} width={36} />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value) =>
              new Intl.NumberFormat('en-IN', {
                currency: 'INR',
                maximumFractionDigits: 0,
                style: 'currency',
              }).format(Number(value) || 0)
            }
          />
          <Bar dataKey="net" fill={CHART_COLORS.blue} radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export type SimpleBarDatum = {
  label: string
  value: number
}

export function SimpleBarChart({
  ariaLabel,
  color = CHART_COLORS.blue,
  data,
}: {
  ariaLabel: string
  color?: string
  data: SimpleBarDatum[]
}) {
  return (
    <div className="ops-chart-shell" role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: 8, right: 8, top: 8 }}>
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
          <XAxis axisLine={false} dataKey="label" tick={axisTickStyle} tickLine={false} />
          <YAxis axisLine={false} tick={axisTickStyle} tickLine={false} width={34} />
          <Tooltip contentStyle={tooltipStyle} />
          <Bar dataKey="value" fill={color} radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export type SimpleDonutDatum = {
  label: string
  value: number
}

export function SimpleDonutChart({
  ariaLabel,
  data,
}: {
  ariaLabel: string
  data: SimpleDonutDatum[]
}) {
  return (
    <div className="ops-chart-shell" role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip contentStyle={tooltipStyle} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
          <Pie
            data={data}
            dataKey="value"
            innerRadius={52}
            nameKey="label"
            outerRadius={76}
            paddingAngle={2}
            stroke="#ffffff"
            strokeWidth={2}
          >
            {data.map((item, index) => (
              <Cell key={`simple-donut-${item.label}`} fill={LEAVE_COLORS[index % LEAVE_COLORS.length]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
