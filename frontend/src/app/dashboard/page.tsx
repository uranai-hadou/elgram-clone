"use client";

import { useEffect, useState } from "react";
import { MessageSquareReply, Zap, BarChart3, ChevronLeft, ChevronRight } from "lucide-react";
import api from "@/lib/api";

type Stats = {
  total_rules: number;
  active_rules: number;
  total_responses: number;
};

type DailyEntry = {
  date: string;
  account_id: string;
  count: number;
};

type AccountInfo = {
  id: string;
  username: string;
};

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [accounts, setAccounts] = useState<AccountInfo[]>([]);
  const [daily, setDaily] = useState<DailyEntry[]>([]);
  const [days, setDays] = useState(30);

  useEffect(() => {
    api.get("/api/autorespond/stats").then((res) => setStats(res.data)).catch(() => {});
    fetchDaily(30);
  }, []);

  const fetchDaily = (d: number) => {
    setDays(d);
    api
      .get(`/api/autorespond/daily-stats?days=${d}`)
      .then((res) => {
        setAccounts(res.data.accounts);
        setDaily(res.data.daily);
      })
      .catch(() => {});
  };

  // Build date list for selected range
  const dateList: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    dateList.push(d.toISOString().split("T")[0]);
  }

  const getCount = (date: string, accountId: string) => {
    const entry = daily.find((d) => d.date === date && d.account_id === accountId);
    return entry?.count || 0;
  };

  const getTotalForDate = (date: string) => {
    return daily
      .filter((d) => d.date === date)
      .reduce((sum, d) => sum + d.count, 0);
  };

  const getTotalForAccount = (accountId: string) => {
    return daily
      .filter((d) => d.account_id === accountId)
      .reduce((sum, d) => sum + d.count, 0);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

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
      label: "自動応答数（累計）",
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

      {/* デイリー自動応答数 */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            デイリー自動応答数
          </h3>
          <div className="flex gap-1.5">
            {[7, 14, 30].map((d) => (
              <button
                key={d}
                onClick={() => fetchDaily(d)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  days === d
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {d}日間
              </button>
            ))}
          </div>
        </div>

        {accounts.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-400">
            アカウントを連携すると自動応答数が表示されます
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="sticky left-0 bg-gray-50 px-4 py-3 text-left text-xs font-medium text-gray-500 z-10">
                      日付
                    </th>
                    {accounts.map((a) => (
                      <th
                        key={a.id}
                        className="px-4 py-3 text-right text-xs font-medium text-gray-500 whitespace-nowrap"
                      >
                        @{a.username}
                      </th>
                    ))}
                    {accounts.length > 1 && (
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">
                        合計
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {dateList.map((date, i) => {
                    const total = getTotalForDate(date);
                    const isToday = date === new Date().toISOString().split("T")[0];
                    return (
                      <tr
                        key={date}
                        className={`border-b border-gray-100 ${
                          isToday ? "bg-blue-50/50" : i % 2 === 0 ? "bg-white" : "bg-gray-50/30"
                        }`}
                      >
                        <td className={`sticky left-0 px-4 py-2.5 text-xs whitespace-nowrap z-10 ${isToday ? "bg-blue-50/50 font-semibold text-blue-700" : i % 2 === 0 ? "bg-white" : "bg-gray-50/30"} text-gray-600`}>
                          {formatDate(date)}
                          {isToday && <span className="ml-1 text-blue-500">(今日)</span>}
                        </td>
                        {accounts.map((a) => {
                          const count = getCount(date, a.id);
                          return (
                            <td
                              key={a.id}
                              className="px-4 py-2.5 text-right text-xs tabular-nums"
                            >
                              {count > 0 ? (
                                <span className="font-medium text-gray-900">{count}</span>
                              ) : (
                                <span className="text-gray-300">0</span>
                              )}
                            </td>
                          );
                        })}
                        {accounts.length > 1 && (
                          <td className="px-4 py-2.5 text-right text-xs tabular-nums font-medium text-gray-700">
                            {total > 0 ? total : <span className="text-gray-300">0</span>}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                  {/* 合計行 */}
                  <tr className="border-t-2 border-gray-200 bg-gray-50 font-medium">
                    <td className="sticky left-0 bg-gray-50 px-4 py-3 text-xs text-gray-700 z-10">
                      合計
                    </td>
                    {accounts.map((a) => (
                      <td key={a.id} className="px-4 py-3 text-right text-xs tabular-nums text-gray-900">
                        {getTotalForAccount(a.id)}
                      </td>
                    ))}
                    {accounts.length > 1 && (
                      <td className="px-4 py-3 text-right text-xs tabular-nums text-gray-900">
                        {daily.reduce((sum, d) => sum + d.count, 0)}
                      </td>
                    )}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
