"use client";

import { useEffect, useState } from "react";
import { MessageSquareReply, Zap, BarChart3 } from "lucide-react";
import api from "@/lib/api";

type Stats = {
  total_rules: number;
  active_rules: number;
  total_responses: number;
};

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    api.get("/api/autorespond/stats").then((res) => setStats(res.data)).catch(() => {});
  }, []);

  const cards = [
    {
      label: "自動応答ルール",
      value: stats?.total_rules ?? "-",
      icon: MessageSquareReply,
      color: "text-blue-600 bg-blue-50",
    },
    {
      label: "有効なルール",
      value: stats?.active_rules ?? "-",
      icon: Zap,
      color: "text-green-600 bg-green-50",
    },
    {
      label: "自動応答数",
      value: stats?.total_responses ?? "-",
      icon: BarChart3,
      color: "text-purple-600 bg-purple-50",
    },
  ];

  return (
    <div>
      <h2 className="mb-6 text-2xl font-bold text-gray-900">ダッシュボード</h2>
      <div className="grid gap-6 sm:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-gray-200 bg-white p-6"
          >
            <div className="flex items-center gap-4">
              <div className={`rounded-lg p-3 ${card.color}`}>
                <card.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{card.label}</p>
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
