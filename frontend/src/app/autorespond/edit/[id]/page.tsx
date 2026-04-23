"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Check, X, Play } from "lucide-react";
import api from "@/lib/api";

type Account = { id: string; username: string };
type Media = {
  id: string;
  caption: string;
  media_type: string;
  thumbnail_url: string;
  timestamp: string;
  permalink: string;
};
type MediaTarget = { id: string; caption?: string; media_type?: string };

export default function EditRulePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [mediaList, setMediaList] = useState<Media[]>([]);
  const [mediaFilter, setMediaFilter] = useState<"all" | "feed" | "reel">("all");
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [mediaTargets, setMediaTargets] = useState<MediaTarget[]>([]);
  const [form, setForm] = useState({
    ig_account_id: "",
    name: "",
    trigger_type: "comment",
    match_type: "contains",
    trigger_keyword: "",
    response_type: "dm",
    response_message: "",
    response_image_url: "",
    comment_reply_message: "",
  });

  useEffect(() => {
    Promise.all([
      api.get("/api/accounts/instagram"),
      api.get("/api/autorespond/rules"),
    ]).then(([accountsRes, rulesRes]) => {
      setAccounts(accountsRes.data);
      type RuleShape = {
        id: string;
        ig_account_id: string;
        name: string;
        media_id?: string | null;
        media_caption?: string | null;
        media_type?: string | null;
        media_targets?: MediaTarget[];
        trigger_type: string;
        match_type: string;
        trigger_keyword?: string | null;
        response_type: string;
        response_message: string;
        response_image_url?: string | null;
        comment_reply_message?: string | null;
      };
      const rule = (rulesRes.data as RuleShape[]).find((r) => r.id === id);
      if (rule) {
        setForm({
          ig_account_id: rule.ig_account_id,
          name: rule.name,
          trigger_type: rule.trigger_type,
          match_type: rule.match_type,
          trigger_keyword: rule.trigger_keyword || "",
          response_type: rule.response_type,
          response_message: rule.response_message,
          response_image_url: rule.response_image_url || "",
          comment_reply_message: rule.comment_reply_message || "",
        });
        // Backward compat: if media_targets missing but legacy media_id set, hydrate as single target
        if (rule.media_targets && rule.media_targets.length > 0) {
          setMediaTargets(rule.media_targets);
        } else if (rule.media_id) {
          setMediaTargets([
            {
              id: rule.media_id,
              caption: rule.media_caption || "",
              media_type: rule.media_type || "",
            },
          ]);
        }
        fetchMedia(rule.ig_account_id);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  const fetchMedia = (accountId: string) => {
    if (!accountId) return;
    setLoadingMedia(true);
    api
      .get(`/api/accounts/instagram/media?account_id=${accountId}`)
      .then((res) => setMediaList(res.data))
      .catch(() => setMediaList([]))
      .finally(() => setLoadingMedia(false));
  };

  const handleAccountChange = (accountId: string) => {
    setForm((f) => ({ ...f, ig_account_id: accountId }));
    setMediaTargets([]);
    fetchMedia(accountId);
  };

  const toggleMedia = (media: Media) => {
    setMediaTargets((prev) => {
      const exists = prev.some((t) => t.id === media.id);
      if (exists) return prev.filter((t) => t.id !== media.id);
      return [
        ...prev,
        { id: media.id, caption: media.caption, media_type: media.media_type },
      ];
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.patch(`/api/autorespond/rules/${id}`, {
        ...form,
        media_targets: mediaTargets,
      });
      toast.success("ルールを更新しました");
      router.push("/autorespond");
    } catch {
      toast.error("更新に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  const update = (key: string, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h2 className="mb-6 text-2xl font-bold text-gray-900">ルールを編集</h2>
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
            onChange={(e) => handleAccountChange(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            required
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>@{a.username}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">ルール名</label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-700">
              対象投稿（複数選択可）
            </label>
            {mediaTargets.length > 0 && (
              <button
                type="button"
                onClick={() => setMediaTargets([])}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-500"
              >
                <X className="h-3 w-3" />
                {mediaTargets.length}件をクリア
              </button>
            )}
          </div>
          <p className="mt-0.5 text-xs text-gray-400">
            投稿をクリックで選択／解除。未選択の場合は全投稿が対象です。
          </p>

          {mediaList.length > 0 && (
            <div className="mt-2 flex gap-1.5">
              {([
                { key: "all", label: "すべて", match: () => true },
                { key: "feed", label: "フィード", match: (t: string) => t !== "VIDEO" },
                { key: "reel", label: "リール", match: (t: string) => t === "VIDEO" },
              ] as const).map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setMediaFilter(tab.key as typeof mediaFilter)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    mediaFilter === tab.key
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {tab.label}
                  <span className="ml-1 opacity-70">
                    {mediaList.filter((m) => tab.match(m.media_type)).length}
                  </span>
                </button>
              ))}
            </div>
          )}

          {loadingMedia ? (
            <div className="mt-3 flex items-center gap-2 text-sm text-gray-400">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
              投稿を読み込み中...
            </div>
          ) : mediaList.length > 0 ? (
            <div className="mt-3 grid grid-cols-3 gap-2 max-h-80 overflow-y-auto rounded-lg border border-gray-200 p-2">
              {mediaList.filter((m) => {
                if (mediaFilter === "all") return true;
                if (mediaFilter === "reel") return m.media_type === "VIDEO";
                return m.media_type !== "VIDEO";
              }).map((m) => {
                const selected = mediaTargets.some((t) => t.id === m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => toggleMedia(m)}
                    className={`group relative aspect-square overflow-hidden rounded-lg border-2 transition-all ${
                      selected ? "border-blue-500 ring-2 ring-blue-200" : "border-transparent hover:border-gray-300"
                    }`}
                  >
                    {m.thumbnail_url ? (
                      <img src={m.thumbnail_url} alt={m.caption || "投稿"} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gray-100 text-xs text-gray-400">No Image</div>
                    )}
                    {m.media_type === "VIDEO" && (
                      <div className="absolute left-1 top-1 rounded bg-black/60 p-0.5">
                        <Play className="h-3 w-3 fill-white text-white" />
                      </div>
                    )}
                    {selected && (
                      <div className="absolute inset-0 flex items-center justify-center bg-blue-500/30">
                        <div className="rounded-full bg-blue-500 p-1"><Check className="h-4 w-4 text-white" /></div>
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                      <p className="line-clamp-2 text-[10px] leading-tight text-white">{m.caption || "(キャプションなし)"}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : null}

          {mediaTargets.length > 0 && (
            <div className="mt-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
              <p className="text-xs font-medium text-blue-700">選択中: {mediaTargets.length}件の投稿に適用</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">トリガータイプ</label>
            <select value={form.trigger_type} onChange={(e) => update("trigger_type", e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
              <option value="comment">コメント</option>
              <option value="dm">DM</option>
              <option value="story_mention">ストーリーメンション</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">マッチタイプ</label>
            <select value={form.match_type} onChange={(e) => update("match_type", e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
              <option value="contains">部分一致</option>
              <option value="exact">完全一致</option>
              <option value="regex">正規表現</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">トリガーキーワード</label>
          <input
            type="text"
            value={form.trigger_keyword}
            onChange={(e) => update("trigger_keyword", e.target.value)}
            placeholder="空欄にすると全てのコメントに反応します"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <p className="mt-1 text-xs text-gray-400">空欄の場合、あらゆるコメントに対して自動返信が発動します</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">応答タイプ</label>
          <select value={form.response_type} onChange={(e) => update("response_type", e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
            <option value="dm">DM送信</option>
            <option value="comment_reply">コメント返信</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            {form.response_type === "dm" ? "DMメッセージ" : "応答メッセージ"}
          </label>
          <textarea
            required
            rows={4}
            value={form.response_message}
            onChange={(e) => update("response_message", e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        {form.response_type === "dm" && form.trigger_type === "comment" && (
          <div>
            <label className="block text-sm font-medium text-gray-700">
              コメント返信メッセージ（任意）
            </label>
            <p className="mt-0.5 text-xs text-gray-400">
              DMと同時に、投稿へのコメント返信も行う場合に入力（例：「DMお送りしました！ご確認ください✨」）
            </p>
            <textarea
              rows={2}
              value={form.comment_reply_message}
              onChange={(e) => update("comment_reply_message", e.target.value)}
              placeholder="空欄の場合はコメント返信は行いません"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        )}

        {form.response_type === "dm" && (
          <div>
            <label className="block text-sm font-medium text-gray-700">画像（任意）</label>
            {form.response_image_url ? (
              <div className="mt-2 relative inline-block">
                <img src={form.response_image_url} alt="アップロード済み" className="h-32 w-32 rounded-lg border border-gray-200 object-cover" />
                <button type="button" onClick={() => update("response_image_url", "")} className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white hover:bg-red-600">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <label
                className={`mt-2 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-6 transition-colors ${uploading ? "border-blue-300 bg-blue-50" : "border-gray-300 hover:border-blue-400 hover:bg-gray-50"}`}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={async (e) => {
                  e.preventDefault(); e.stopPropagation();
                  const file = e.dataTransfer.files[0]; if (!file) return;
                  setUploading(true);
                  try { const fd = new FormData(); fd.append("file", file); const res = await api.post("/api/upload", fd); update("response_image_url", res.data.url); } catch { toast.error("画像のアップロードに失敗しました"); } finally { setUploading(false); }
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
                <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                  const file = e.target.files?.[0]; if (!file) return;
                  setUploading(true);
                  try { const fd = new FormData(); fd.append("file", file); const res = await api.post("/api/upload", fd); update("response_image_url", res.data.url); } catch { toast.error("画像のアップロードに失敗しました"); } finally { setUploading(false); }
                }} />
              </label>
            )}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={submitting} className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            {submitting ? "保存中..." : "変更を保存"}
          </button>
          <button type="button" onClick={() => router.back()} className="rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50">
            キャンセル
          </button>
        </div>
      </form>
    </div>
  );
}
