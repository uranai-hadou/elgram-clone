"use client";

import { useEffect, useState, useRef } from "react";
import { Upload, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";

type Knowledge = {
  id: string;
  source_filename: string;
  extracted_text: string;
  summary: string;
  category: string | null;
  created_at: string;
};

const categoryColors: Record<string, string> = {
  マーケティング: "bg-purple-100 text-purple-700",
  集客: "bg-blue-100 text-blue-700",
  マインドセット: "bg-yellow-100 text-yellow-700",
  売上: "bg-green-100 text-green-700",
  ブランディング: "bg-pink-100 text-pink-700",
  SNS運用: "bg-cyan-100 text-cyan-700",
  その他: "bg-gray-100 text-gray-600",
};

export default function KnowledgePage() {
  const [items, setItems] = useState<Knowledge[]>([]);
  const [uploading, setUploading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchKnowledge = () => {
    api
      .get("/api/mentor/knowledge")
      .then((res) => setItems(res.data))
      .catch(() => {});
  };

  useEffect(() => {
    fetchKnowledge();
  }, []);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    let successCount = 0;
    for (const file of Array.from(files)) {
      try {
        const form = new FormData();
        form.append("file", file);
        await api.post("/api/mentor/knowledge/upload", form);
        successCount++;
      } catch {
        toast.error(`${file.name} のアップロードに失敗しました`);
      }
    }
    if (successCount > 0) {
      toast.success(`${successCount}件のナレッジを追加しました`);
      fetchKnowledge();
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleDelete = async (id: string) => {
    if (!confirm("このナレッジを削除しますか？")) return;
    try {
      await api.delete(`/api/mentor/knowledge/${id}`);
      toast.success("削除しました");
      fetchKnowledge();
    } catch {
      toast.error("削除に失敗しました");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleUpload(e.dataTransfer.files);
  };

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">ナレッジ管理</h2>
        <span className="text-sm text-gray-500">{items.length}件のナレッジ</span>
      </div>

      {/* アップロードエリア */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className="mb-8 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-10 transition-colors hover:border-blue-400 hover:bg-blue-50"
      >
        <Upload className="mb-3 h-10 w-10 text-gray-400" />
        {uploading ? (
          <p className="text-sm text-gray-500">アップロード中...</p>
        ) : (
          <>
            <p className="mb-2 text-sm text-gray-600">
              スクリーンショットをドラッグ＆ドロップ、または
            </p>
            <label className="cursor-pointer rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              ファイルを選択
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleUpload(e.target.files)}
              />
            </label>
          </>
        )}
      </div>

      {/* ナレッジ一覧 */}
      {items.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <p className="text-gray-500">
            まだナレッジがありません。経営者のスクリーンショットをアップロードしてください。
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-gray-200 bg-white p-5"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {item.category && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          categoryColors[item.category] || categoryColors["その他"]
                        }`}
                      >
                        {item.category}
                      </span>
                    )}
                    <span className="text-xs text-gray-400">
                      {item.source_filename}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-gray-800">{item.summary}</p>
                </div>
                <div className="ml-4 flex items-center gap-1">
                  <button
                    onClick={() =>
                      setExpandedId(expandedId === item.id ? null : item.id)
                    }
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"
                    title="詳細を表示"
                  >
                    {expandedId === item.id ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {expandedId === item.id && (
                <div className="mt-3 rounded-lg bg-gray-50 p-3 text-xs text-gray-600 whitespace-pre-wrap">
                  {item.extracted_text}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
