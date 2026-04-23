"use client";

import { useEffect, useState } from "react";
import { Camera, Trash2, ExternalLink, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";

type Account = {
  id: string;
  ig_user_id: string;
  username: string;
  created_at: string;
};

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);

  const fetchAccounts = () => {
    api.get("/api/accounts/instagram").then((res) => setAccounts(res.data)).catch(() => {});
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const connectInstagram = async () => {
    try {
      const res = await api.get("/api/accounts/instagram/auth-url");
      window.location.href = res.data.auth_url;
    } catch {
      toast.error("認証URLの取得に失敗しました");
    }
  };

  const resubscribe = async (id: string) => {
    try {
      await api.post(`/api/accounts/instagram/${id}/subscribe`);
      toast.success("Webhookを再登録しました");
    } catch (err: unknown) {
      const e = err as {
        response?: {
          data?: { detail?: string; meta?: { error?: { message?: string; code?: number } } };
        };
      };
      const metaErr = e.response?.data?.meta?.error;
      const msg = metaErr?.message
        ? `${metaErr.message}${metaErr.code ? ` (code ${metaErr.code})` : ""}`
        : e.response?.data?.detail || "再登録に失敗しました";
      toast.error(msg, { duration: 8000 });
      console.error("Subscribe error:", e.response?.data);
    }
  };

  const disconnectAccount = async (id: string) => {
    if (!confirm("このアカウントの連携を解除しますか？")) return;
    try {
      await api.delete(`/api/accounts/instagram/${id}`);
      toast.success("連携を解除しました");
      fetchAccounts();
    } catch {
      toast.error("解除に失敗しました");
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">アカウント連携</h2>
        <button
          onClick={connectInstagram}
          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-500 px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          <Camera className="h-4 w-4" />
          Instagramを連携
        </button>
      </div>

      {accounts.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <Camera className="mx-auto mb-4 h-12 w-12 text-gray-300" />
          <p className="text-gray-500">
            Instagramビジネスアカウントを連携してください。
          </p>
          <p className="mt-1 text-sm text-gray-400">
            Meta Graph APIを通じてコメント・DMの自動応答が可能になります。
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {accounts.map((account) => (
            <div
              key={account.id}
              className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-5"
            >
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-gradient-to-r from-purple-500 to-pink-500 p-2.5">
                  <Camera className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">
                    @{account.username}
                  </p>
                  <p className="text-sm text-gray-500">
                    ID: {account.ig_user_id}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => resubscribe(account.id)}
                  title="Webhookを再登録"
                  className="rounded-lg p-2 text-gray-400 hover:bg-blue-50 hover:text-blue-600"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
                <button
                  onClick={() => disconnectAccount(account.id)}
                  className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-500"
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
