"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import api from "@/lib/api";

export default function CallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );

  useEffect(() => {
    const code = searchParams.get("code");
    if (!code) {
      setStatus("error");
      toast.error("認証コードが見つかりません");
      return;
    }

    api
      .post(`/api/accounts/instagram/connect?code=${encodeURIComponent(code)}`)
      .then(() => {
        setStatus("success");
        toast.success("Instagramアカウントを連携しました");
        setTimeout(() => router.push("/accounts"), 1500);
      })
      .catch((err) => {
        setStatus("error");
        toast.error(
          err.response?.data?.detail || "アカウント連携に失敗しました"
        );
      });
  }, [searchParams, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
        {status === "loading" && (
          <>
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
            <p className="text-gray-600">Instagramアカウントを連携中...</p>
          </>
        )}
        {status === "success" && (
          <>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <span className="text-2xl text-green-600">&#10003;</span>
            </div>
            <p className="font-semibold text-gray-900">連携が完了しました</p>
            <p className="mt-1 text-sm text-gray-500">
              アカウント一覧にリダイレクトします...
            </p>
          </>
        )}
        {status === "error" && (
          <>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <span className="text-2xl text-red-600">&#10007;</span>
            </div>
            <p className="font-semibold text-gray-900">連携に失敗しました</p>
            <button
              onClick={() => router.push("/accounts")}
              className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
            >
              アカウント一覧に戻る
            </button>
          </>
        )}
      </div>
    </div>
  );
}
