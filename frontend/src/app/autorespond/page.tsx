"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Pencil, Trash2, Search, X } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";

type MediaTarget = { id: string; caption?: string; media_type?: string };
type Rule = {
  id: string;
  name: string;
  is_active: boolean;
  media_id: string | null;
  media_caption: string | null;
  media_type: string | null;
  media_targets: MediaTarget[];
  target_scope: "specific" | "all" | "feeds" | "reels";
  trigger_type: string;
  match_type: string;
  trigger_keyword: string;
  response_type: string;
  response_message: string;
  created_at: string;
};

const mediaTypeLabel = (type: string | null) => {
  if (type === "VIDEO") return "リール";
  if (type === "CAROUSEL_ALBUM") return "カルーセル";
  return "フィード";
};

const triggerLabels: Record<string, string> = {
  comment: "コメント",
  dm: "DM",
  story_mention: "ストーリーメンション",
};

const matchLabels: Record<string, string> = {
  exact: "完全一致",
  contains: "部分一致",
  regex: "正規表現",
};

export default function AutorespondPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [keyword, setKeyword] = useState("");

  const fetchRules = () => {
    api.get("/api/autorespond/rules").then((res) => setRules(res.data)).catch(() => {});
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const toggleActive = async (rule: Rule) => {
    try {
      await api.patch(`/api/autorespond/rules/${rule.id}`, {
        is_active: !rule.is_active,
      });
      fetchRules();
    } catch {
      toast.error("更新に失敗しました");
    }
  };

  const deleteRule = async (id: string) => {
    if (!confirm("このルールを削除しますか？")) return;
    try {
      await api.delete(`/api/autorespond/rules/${id}`);
      toast.success("削除しました");
      fetchRules();
    } catch {
      toast.error("削除に失敗しました");
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">自動応答ルール</h2>
        <Link
          href="/autorespond/new"
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          新規ルール作成
        </Link>
      </div>

      {/* 検索フィルター */}
      {rules.length > 0 && (
        <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-white p-4">
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
            <label className="block text-xs font-medium text-gray-500 mb-1">キーワード</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="ルール名・キーワードで検索"
                className="w-full rounded-lg border border-gray-300 pl-8 pr-3 py-1.5 text-sm"
              />
            </div>
          </div>
          {(dateFrom || dateTo || keyword) && (
            <button
              onClick={() => { setDateFrom(""); setDateTo(""); setKeyword(""); }}
              className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50"
            >
              <X className="h-3 w-3" />
              クリア
            </button>
          )}
        </div>
      )}

      {(() => {
        const filtered = rules.filter((rule) => {
          const created = new Date(rule.created_at);
          if (dateFrom && created < new Date(dateFrom)) return false;
          if (dateTo) {
            const to = new Date(dateTo);
            to.setHours(23, 59, 59, 999);
            if (created > to) return false;
          }
          if (keyword) {
            const kw = keyword.toLowerCase();
            const matches =
              rule.name.toLowerCase().includes(kw) ||
              (rule.trigger_keyword || "").toLowerCase().includes(kw) ||
              rule.response_message.toLowerCase().includes(kw);
            if (!matches) return false;
          }
          return true;
        });

        return filtered.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <p className="text-gray-500">
            {rules.length === 0
              ? "自動応答ルールがありません。新しいルールを作成してください。"
              : "該当するルールが見つかりません。"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((rule) => (
            <div
              key={rule.id}
              className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-5"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-gray-900">{rule.name}</h3>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      rule.is_active
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {rule.is_active ? "有効" : "無効"}
                  </span>
                </div>
                {rule.target_scope === "all" ? (
                  <p className="mt-1 text-xs text-blue-600">対象: 全ての投稿</p>
                ) : rule.target_scope === "feeds" ? (
                  <p className="mt-1 text-xs text-blue-600">対象: フィードのみ</p>
                ) : rule.target_scope === "reels" ? (
                  <p className="mt-1 text-xs text-blue-600">対象: リールのみ</p>
                ) : (rule.media_targets?.length ?? 0) > 1 ? (
                  <p className="mt-1 text-xs text-blue-600">
                    対象: {rule.media_targets.length}件の投稿
                  </p>
                ) : rule.media_id ? (
                  <p className="mt-1 text-xs text-blue-600">
                    対象: [{mediaTypeLabel(rule.media_type)}]{" "}
                    {rule.media_caption
                      ? rule.media_caption.slice(0, 40) + (rule.media_caption.length > 40 ? "..." : "")
                      : "(キャプションなし)"}
                  </p>
                ) : null}
                <div className="mt-1 flex gap-4 text-sm text-gray-500">
                  <span>
                    トリガー: {triggerLabels[rule.trigger_type] || rule.trigger_type}
                  </span>
                  <span>
                    マッチ: {matchLabels[rule.match_type] || rule.match_type}
                  </span>
                  <span>キーワード: {rule.trigger_keyword}</span>
                </div>
                <p className="mt-1 text-sm text-gray-400 truncate max-w-lg">
                  応答: {rule.response_message}
                </p>
                <p className="mt-1 text-xs text-gray-300">
                  {new Date(rule.created_at).toLocaleDateString("ja-JP")} 作成
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleActive(rule)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                    rule.is_active
                      ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      : "bg-green-100 text-green-700 hover:bg-green-200"
                  }`}
                >
                  {rule.is_active ? "無効にする" : "有効にする"}
                </button>
                <Link
                  href={`/autorespond/edit/${rule.id}`}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-500"
                >
                  <Pencil className="h-4 w-4" />
                </Link>
                <button
                  onClick={() => deleteRule(rule.id)}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      );
      })()}
    </div>
  );
}
