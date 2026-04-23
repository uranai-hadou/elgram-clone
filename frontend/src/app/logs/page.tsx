"use client";

import { useEffect, useState } from "react";
import { Search, X, ArrowUpRight, ArrowDownLeft, ChevronLeft, ChevronRight } from "lucide-react";
import api from "@/lib/api";

type Log = {
  id: string;
  account_id: string;
  account_username: string;
  direction: string;
  message_type: string;
  sender_ig_id: string;
  content: string;
  created_at: string;
};

type Account = { id: string; username: string };

const PAGE_SIZE = 50;

export default function LogsPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [total, setTotal] = useState(0);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [accountFilter, setAccountFilter] = useState("");
  const [directionFilter, setDirectionFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const fetchLogs = (p: number = 0) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (accountFilter) params.set("account_id", accountFilter);
    if (directionFilter) params.set("direction", directionFilter);
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);
    if (search) params.set("search", search);
    params.set("limit", String(PAGE_SIZE));
    params.set("offset", String(p * PAGE_SIZE));

    api
      .get(`/api/logs?${params}`)
      .then((res) => {
        setLogs(res.data.logs);
        setTotal(res.data.total);
        if (res.data.accounts) setAccounts(res.data.accounts);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLogs(0);
    setPage(0);
  }, [accountFilter, directionFilter, dateFrom, dateTo, search]);

  const handleSearch = () => {
    setSearch(searchInput);
  };

  const clearFilters = () => {
    setAccountFilter("");
    setDirectionFilter("");
    setDateFrom("");
    setDateTo("");
    setSearch("");
    setSearchInput("");
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const hasFilters = accountFilter || directionFilter || dateFrom || dateTo || search;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">送受信ログ</h2>
        <span className="text-sm text-gray-500">{total}件</span>
      </div>

      {/* フィルター */}
      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-white p-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">アカウント</label>
          <select
            value={accountFilter}
            onChange={(e) => setAccountFilter(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
          >
            <option value="">すべて</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>@{a.username}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">方向</label>
          <select
            value={directionFilter}
            onChange={(e) => setDirectionFilter(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
          >
            <option value="">すべて</option>
            <option value="outbound">送信のみ</option>
            <option value="inbound">受信のみ</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">開始日</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">終了日</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
          />
        </div>
        <div className="flex-1 min-w-[150px]">
          <label className="block text-xs font-medium text-gray-500 mb-1">内容検索</label>
          <div className="flex gap-1.5">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="メッセージ内容で検索"
                className="w-full rounded-lg border border-gray-300 pl-8 pr-3 py-1.5 text-sm"
              />
            </div>
            <button
              onClick={handleSearch}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs text-white hover:bg-blue-700"
            >
              検索
            </button>
          </div>
        </div>
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50"
          >
            <X className="h-3 w-3" />
            クリア
          </button>
        )}
      </div>

      {/* ログ一覧 */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        </div>
      ) : logs.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center text-sm text-gray-400">
          ログが見つかりません
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {logs.map((log) => (
              <div
                key={log.id}
                className="rounded-xl border border-gray-200 bg-white px-5 py-4"
              >
                <div className="flex items-start gap-3">
                  {/* 方向アイコン */}
                  <div
                    className={`mt-0.5 shrink-0 rounded-full p-1.5 ${
                      log.direction === "outbound"
                        ? "bg-blue-50 text-blue-600"
                        : "bg-green-50 text-green-600"
                    }`}
                  >
                    {log.direction === "outbound" ? (
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    ) : (
                      <ArrowDownLeft className="h-3.5 w-3.5" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* ヘッダー */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          log.direction === "outbound"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {log.direction === "outbound" ? "送信" : "受信"}
                      </span>
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                        {log.message_type === "dm" ? "DM" : "コメント"}
                      </span>
                      <span className="text-xs text-gray-400">
                        @{log.account_username}
                      </span>
                      <span className="text-xs text-gray-300">→</span>
                      <span className="text-xs text-gray-500 font-mono">
                        {log.sender_ig_id}
                      </span>
                    </div>

                    {/* メッセージ内容 */}
                    <p className="mt-1.5 text-sm text-gray-800 whitespace-pre-wrap break-words">
                      {log.content}
                    </p>

                    {/* 日時 */}
                    <p className="mt-1.5 text-xs text-gray-400">
                      {new Date(log.created_at).toLocaleString("ja-JP")}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ページネーション */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-3">
              <button
                onClick={() => { setPage(page - 1); fetchLogs(page - 1); }}
                disabled={page === 0}
                className="rounded-lg border border-gray-300 p-1.5 text-gray-500 hover:bg-gray-50 disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm text-gray-600">
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => { setPage(page + 1); fetchLogs(page + 1); }}
                disabled={page >= totalPages - 1}
                className="rounded-lg border border-gray-300 p-1.5 text-gray-500 hover:bg-gray-50 disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
