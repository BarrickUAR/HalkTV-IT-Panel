"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";
import { CATEGORY_LABELS } from "@/lib/ticket-labels";

const COLORS = ["#0ea5e9", "#10b981", "#f59e0b", "#f43f5e", "#8b5cf6", "#64748b"];

export function DashboardCharts({
  categoryData,
  trendData,
}: {
  categoryData: { category: string; _count: number }[];
  trendData: { date: string; count: number }[];
}) {
  const pieData = useMemo(() => {
    return categoryData.map((d) => ({
      name: CATEGORY_LABELS[d.category as keyof typeof CATEGORY_LABELS] || d.category,
      value: d._count,
    }));
  }, [categoryData]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
      {/* Kategori Dağılımı (Pie Chart) */}
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <h3 className="text-sm font-bold mb-6">Kategorilere Göre Talepler</h3>
        <div className="h-64 w-full">
          {pieData.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Veri yok</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: any) => [`${value} Talep`, "Miktar"]}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Son 7 Gün (Bar Chart) */}
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <h3 className="text-sm font-bold mb-6">Son 7 Günlük Talep Trendi</h3>
        <div className="h-64 w-full">
          {trendData.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Veri yok</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#64748b' }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#64748b' }}
                />
                <Tooltip 
                  cursor={{ fill: '#f1f5f9' }}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  formatter={(value: any) => [`${value} Talep`, "Miktar"]}
                />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
