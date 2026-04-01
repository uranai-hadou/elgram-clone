"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Pencil, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";

type Rule = {
  id: string;
  name: string;
  is_active: boolean;
  trigger_type: string;
  match_type: string;
  trigger_keyword: string;
  response_type: string;
  response_message: string;
  created_at: string;
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

      {rules.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <p className="text-gray-500">
            自動応答ルールがありません。新しいルールを作成してください。
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => (
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
      )}
    </div>
  );
}
