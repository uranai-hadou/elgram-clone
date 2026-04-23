"use client";

import { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";
import { Send, Users, Clock, AlertTriangle, CheckCircle2, Loader2, X } from "lucide-react";
import api from "@/lib/api";

type Account = { id: string; username: string };
type Job = {
  job_id: string;
  status: string;
  sent: number;
  failed: number;
  total: number;
  remaining?: number;
  next_batch_at?: string | null;
  message?: string;
  created_at?: string;
};

export default function BroadcastPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState("");
  const [message, setMessage] = useState("");
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [sending, setSending] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [activeJob, setActiveJob] = useState<Job | null>(null);
  const [recentJobs, setRecentJobs] = useState<Job[]>([]);

  useEffect(() => {
    api
      .get("/api/accounts/instagram")
      .then((res) => {
        setAccounts(res.data);
        if (res.data.length > 0) {
          setSelectedAccount(res.data[0].id);
          fetchRecipients(res.data[0].id);
        }
      })
      .catch(() => {});
    fetchRecentJobs();
  }, []);

  // Poll active job status
  useEffect(() => {
    if (!activeJob || activeJob.status === "completed") return;
    const interval = setInterval(() => {
      api
        .get(`/api/broadcast/status?job_id=${activeJob.job_id}`)
        .then((res) => {
          setActiveJob(res.data);
          if (res.data.status === "completed") {
            toast.success(`配信完了: ${res.data.sent}人に送信しました`);
            fetchRecentJobs();
          }
        })
        .catch(() => {});
    }, 5000);
    return () => clearInterval(interval);
  }, [activeJob]);

  const fetchRecipients = (accountId: string) => {
    if (!accountId) return;
    setLoadingRecipients(true);
    setRecipientCount(null);
    api
      .get(`/api/broadcast/recipients?account_id=${accountId}`)
      .then((res) => setRecipientCount(res.data.count))
      .catch(() => setRecipientCount(0))
      .finally(() => setLoadingRecipients(false));
  };

  const fetchRecentJobs = () => {
    api
      .get("/api/broadcast/status")
      .then((res) => setRecentJobs(res.data))
      .catch(() => {});
  };

  const handleAccountChange = (accountId: string) => {
    setSelectedAccount(accountId);
    setActiveJob(null);
    fetchRecipients(accountId);
  };

  const handleSend = async () => {
    if (!message.trim()) {
      toast.error("メッセージを入力してください");
      return;
    }
    if (recipientCount === 0) {
      toast.error("送信対象のユーザーがいません");
      return;
    }

    const batches = Math.ceil((recipientCount || 0) / 200);
    const confirmMsg =
      batches > 1
        ? `${recipientCount}人にDMを送信します。${batches}回に分けて送信されます（1回あたり200人、1時間間隔）。よろしいですか？`
        : `${recipientCount}人にDMを送信します。よろしいですか？`;

    if (!confirm(confirmMsg)) return;

    setSending(true);
    try {
      const res = await api.post("/api/broadcast/send", {
        account_id: selectedAccount,
        message: message.trim(),
        image_url: imageUrl || undefined,
      });
      setActiveJob({
        job_id: res.data.job_id,
        status: "pending",
        sent: 0,
        failed: 0,
        total: res.data.total,
        remaining: res.data.total,
      });
      toast.success("配信ジョブを開始しました");
      setMessage("");
      setImageUrl("");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "送信に失敗しました");
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString("ja-JP", { hour: "2-digit", minute: "2-digit" });
  };

  const statusLabel = (status: string) => {
    if (status === "completed") return "完了";
    if (status === "processing") return "送信中";
    return "待機中";
  };

  const statusColor = (status: string) => {
    if (status === "completed") return "text-green-600 bg-green-50";
    if (status === "processing") return "text-blue-600 bg-blue-50";
    return "text-amber-600 bg-amber-50";
  };

  return (
    <div className="mx-auto max-w-2xl">
      <h2 className="mb-6 text-2xl font-bold text-gray-900">一斉DM配信</h2>

      {/* 注意事項 */}
      <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <div className="flex gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <p className="text-sm font-medium text-amber-800">配信ルール</p>
            <ul className="mt-1 space-y-0.5 text-xs text-amber-700">
              <li>- 24時間以内にDMを送ってきたユーザーのみが対象です</li>
              <li>- 1時間あたり最大200通ずつ送信されます</li>
              <li>- 200人超の場合は1時間間隔で自動的に次のバッチが送信されます</li>
              <li>- 公式API経由のため、アカウントBANのリスクはありません</li>
            </ul>
          </div>
        </div>
      </div>

      {/* アクティブジョブの進捗 */}
      {activeJob && activeJob.status !== "completed" && (
        <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            <p className="text-sm font-semibold text-blue-800">配信進行中</p>
          </div>
          {/* プログレスバー */}
          <div className="h-3 w-full rounded-full bg-blue-200 overflow-hidden">
            <div
              className="h-full rounded-full bg-blue-600 transition-all duration-500"
              style={{
                width: `${activeJob.total ? ((activeJob.sent + activeJob.failed) / activeJob.total) * 100 : 0}%`,
              }}
            />
          </div>
          <div className="mt-2 flex justify-between text-xs text-blue-700">
            <span>
              {activeJob.sent + activeJob.failed} / {activeJob.total} 人
            </span>
            <span>
              成功: {activeJob.sent} / 失敗: {activeJob.failed}
            </span>
          </div>
          {activeJob.next_batch_at && activeJob.status === "pending" && (
            <div className="mt-2 flex items-center gap-1 text-xs text-blue-600">
              <Clock className="h-3 w-3" />
              次のバッチ: {formatTime(activeJob.next_batch_at)}
              （残り {activeJob.remaining} 人）
            </div>
          )}
        </div>
      )}

      <div className="space-y-5 rounded-xl border border-gray-200 bg-white p-6">
        {/* アカウント選択 */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            送信元アカウント
          </label>
          <select
            value={selectedAccount}
            onChange={(e) => handleAccountChange(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
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

        {/* 送信対象者数 */}
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-50 p-2.5">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">送信対象ユーザー</p>
              {loadingRecipients ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
              ) : (
                <p className="text-2xl font-bold text-gray-900">
                  {recipientCount ?? "-"}
                  <span className="ml-1 text-sm font-normal text-gray-500">人</span>
                  {recipientCount !== null && recipientCount > 200 && (
                    <span className="ml-2 text-xs font-normal text-amber-600">
                      ({Math.ceil(recipientCount / 200)}回に分けて送信)
                    </span>
                  )}
                </p>
              )}
            </div>
            <div className="ml-auto flex items-center gap-1 text-xs text-gray-400">
              <Clock className="h-3.5 w-3.5" />
              24時間以内
            </div>
          </div>
        </div>

        {/* メッセージ入力 */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            メッセージ
          </label>
          <textarea
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="送信するメッセージを入力してください"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <p className="mt-1 text-xs text-gray-400">{message.length} 文字</p>
        </div>

        {/* 画像アップロード */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            画像（任意）
          </label>
          <p className="mt-0.5 text-xs text-gray-400">
            テキストと一緒に画像を送信します
          </p>

          {imageUrl ? (
            <div className="mt-2 relative inline-block">
              <img
                src={imageUrl}
                alt="アップロード済み"
                className="h-32 w-32 rounded-lg border border-gray-200 object-cover"
              />
              <button
                type="button"
                onClick={() => setImageUrl("")}
                className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white hover:bg-red-600"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <label
              className={`mt-2 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-6 transition-colors ${
                uploading
                  ? "border-blue-300 bg-blue-50"
                  : "border-gray-300 hover:border-blue-400 hover:bg-gray-50"
              }`}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onDrop={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                const file = e.dataTransfer.files[0];
                if (!file) return;
                setUploading(true);
                try {
                  const fd = new FormData();
                  fd.append("file", file);
                  const res = await api.post("/api/upload", fd);
                  setImageUrl(res.data.url);
                } catch {
                  toast.error("画像のアップロードに失敗しました");
                } finally {
                  setUploading(false);
                }
              }}
            >
              {uploading ? (
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
              ) : (
                <>
                  <svg className="mb-2 h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-sm text-gray-500">クリックまたはドラッグ&ドロップ</span>
                  <span className="text-xs text-gray-400">PNG, JPG, GIF</span>
                </>
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setUploading(true);
                  try {
                    const fd = new FormData();
                    fd.append("file", file);
                    const res = await api.post("/api/upload", fd);
                    setImageUrl(res.data.url);
                  } catch {
                    toast.error("画像のアップロードに失敗しました");
                  } finally {
                    setUploading(false);
                  }
                }}
              />
            </label>
          )}
        </div>

        {/* 送信ボタン */}
        <button
          onClick={handleSend}
          disabled={
            sending ||
            !message.trim() ||
            !recipientCount ||
            recipientCount === 0 ||
            (activeJob !== null && activeJob.status !== "completed")
          }
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {sending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              送信開始中...
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              {recipientCount ? `${recipientCount}人にDMを送信` : "DMを送信"}
            </>
          )}
        </button>
      </div>

      {/* 配信履歴 */}
      {recentJobs.length > 0 && (
        <div className="mt-8">
          <h3 className="mb-3 text-lg font-semibold text-gray-900">配信履歴</h3>
          <div className="space-y-2">
            {recentJobs.map((job) => (
              <div
                key={job.job_id}
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-gray-700">{job.message}</p>
                  <p className="mt-0.5 text-xs text-gray-400">
                    {job.created_at
                      ? new Date(job.created_at).toLocaleString("ja-JP")
                      : ""}
                  </p>
                </div>
                <div className="ml-4 flex items-center gap-3">
                  <span className="text-sm text-gray-600">
                    {job.sent}/{job.total}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColor(job.status || "pending")}`}
                  >
                    {statusLabel(job.status || "pending")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
