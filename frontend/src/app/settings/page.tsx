"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Eye, EyeOff, Copy, ExternalLink } from "lucide-react";
import api from "@/lib/api";

export default function SettingsPage() {
  const [form, setForm] = useState({
    meta_app_id: "",
    meta_app_secret: "",
    webhook_verify_token: "",
    instagram_redirect_uri: "",
  });
  const [maskedSecret, setMaskedSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [secretEdited, setSecretEdited] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api.get("/api/settings").then((res) => {
      const d = res.data;
      setForm({
        meta_app_id: d.meta_app_id,
        meta_app_secret: "",
        webhook_verify_token: d.webhook_verify_token,
        instagram_redirect_uri: d.instagram_redirect_uri,
      });
      setMaskedSecret(d.meta_app_secret_masked);
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, []);

  const webhookUrl =
    typeof window !== "undefined"
      ? `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/webhook/instagram`
      : "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload: Record<string, string> = {
        meta_app_id: form.meta_app_id,
        webhook_verify_token: form.webhook_verify_token,
        instagram_redirect_uri: form.instagram_redirect_uri,
      };
      if (secretEdited) {
        payload.meta_app_secret = form.meta_app_secret;
      }
      const res = await api.put("/api/settings", payload);
      setMaskedSecret(res.data.meta_app_secret_masked);
      setSecretEdited(false);
      setForm((f) => ({ ...f, meta_app_secret: "" }));
      toast.success("設定を保存しました");
    } catch {
      toast.error("保存に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("コピーしました");
  };

  if (!loaded) return null;

  return (
    <div className="mx-auto max-w-2xl">
      <h2 className="mb-6 text-2xl font-bold text-gray-900">Meta API 設定</h2>

      {/* Webhook URL info */}
      <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-5">
        <h3 className="mb-2 text-sm font-semibold text-blue-800">
          Webhook URL（Meta開発者コンソールに設定）
        </h3>
        <div className="flex items-center gap-2">
          <code className="flex-1 rounded bg-white px-3 py-2 text-sm text-blue-900 border border-blue-200">
            {webhookUrl}
          </code>
          <button
            onClick={() => copyToClipboard(webhookUrl)}
            className="rounded-lg p-2 text-blue-600 hover:bg-blue-100"
          >
            <Copy className="h-4 w-4" />
          </button>
        </div>
        <a
          href="https://developers.facebook.com/apps/"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
        >
          Meta開発者コンソールを開く
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-5 rounded-xl border border-gray-200 bg-white p-6"
      >
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Meta App ID
          </label>
          <input
            type="text"
            value={form.meta_app_id}
            onChange={(e) => setForm({ ...form, meta_app_id: e.target.value })}
            placeholder="例: 123456789012345"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <p className="mt-1 text-xs text-gray-400">
            Meta開発者コンソール &gt; アプリ設定 &gt; 基本データ で確認できます
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Meta App Secret
          </label>
          <div className="relative mt-1">
            {!secretEdited ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={maskedSecret || "未設定"}
                  className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-500"
                />
                <button
                  type="button"
                  onClick={() => setSecretEdited(true)}
                  className="shrink-0 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
                >
                  変更
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type={showSecret ? "text" : "password"}
                    value={form.meta_app_secret}
                    onChange={(e) =>
                      setForm({ ...form, meta_app_secret: e.target.value })
                    }
                    placeholder="App Secretを入力"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-10 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"
                  >
                    {showSecret ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSecretEdited(false);
                    setForm((f) => ({ ...f, meta_app_secret: "" }));
                  }}
                  className="shrink-0 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
                >
                  取消
                </button>
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Webhook検証トークン
          </label>
          <input
            type="text"
            value={form.webhook_verify_token}
            onChange={(e) =>
              setForm({ ...form, webhook_verify_token: e.target.value })
            }
            placeholder="任意の文字列（Meta側と一致させる）"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            OAuthリダイレクトURI
          </label>
          <input
            type="url"
            value={form.instagram_redirect_uri}
            onChange={(e) =>
              setForm({ ...form, instagram_redirect_uri: e.target.value })
            }
            placeholder="http://localhost:3000/accounts/callback"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <p className="mt-1 text-xs text-gray-400">
            Meta開発者コンソールの「有効なOAuthリダイレクトURI」にも同じURLを登録してください
          </p>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? "保存中..." : "設定を保存"}
        </button>
      </form>
    </div>
  );
}
