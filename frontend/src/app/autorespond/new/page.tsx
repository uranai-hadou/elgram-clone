"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import api from "@/lib/api";

type Account = { id: string; username: string };

export default function NewRulePage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    ig_account_id: "",
    name: "",
    trigger_type: "comment",
    match_type: "contains",
    trigger_keyword: "",
    response_type: "dm",
    response_message: "",
  });

  useEffect(() => {
    api
      .get("/api/accounts/instagram")
      .then((res) => {
        setAccounts(res.data);
        if (res.data.length > 0) {
          setForm((f) => ({ ...f, ig_account_id: res.data[0].id }));
        }
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/api/autorespond/rules", form);
      toast.success("ルールを作成しました");
      router.push("/autorespond");
    } catch {
      toast.error("作成に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  const update = (key: string, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  return (
    <div className="mx-auto max-w-2xl">
      <h2 className="mb-6 text-2xl font-bold text-gray-900">
        新しい自動応答ルール
      </h2>
      <form
        onSubmit={handleSubmit}
        className="space-y-5 rounded-xl border border-gray-200 bg-white p-6"
      >
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Instagramアカウント
          </label>
          <select
            value={form.ig_account_id}
            onChange={(e) => update("ig_account_id", e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            required
          >
            {accounts.length === 0 && (
              <option value="">アカウントを連携してください</option>
            )}
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                @{a.username}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            ルール名
          </label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            placeholder="例: 資料請求への自動DM"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              トリガータイプ
            </label>
            <select
              value={form.trigger_type}
              onChange={(e) => update("trigger_type", e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="comment">コメント</option>
              <option value="dm">DM</option>
              <option value="story_mention">ストーリーメンション</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              マッチタイプ
            </label>
            <select
              value={form.match_type}
              onChange={(e) => update("match_type", e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="contains">部分一致</option>
              <option value="exact">完全一致</option>
              <option value="regex">正規表現</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            トリガーキーワード
          </label>
          <input
            type="text"
            required
            value={form.trigger_keyword}
            onChange={(e) => update("trigger_keyword", e.target.value)}
            placeholder="例: 資料"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            応答タイプ
          </label>
          <select
            value={form.response_type}
            onChange={(e) => update("response_type", e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="dm">DM送信</option>
            <option value="comment_reply">コメント返信</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            応答メッセージ
          </label>
          <textarea
            required
            rows={4}
            value={form.response_message}
            onChange={(e) => update("response_message", e.target.value)}
            placeholder="自動送信するメッセージを入力してください"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? "作成中..." : "ルールを作成"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            キャンセル
          </button>
        </div>
      </form>
    </div>
  );
}
