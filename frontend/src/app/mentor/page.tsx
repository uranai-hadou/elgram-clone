"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
  Send,
  Plus,
  Trash2,
  MessageCircle,
  BookOpen,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";

type Session = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

type Message = {
  id: string;
  session_id: string;
  role: string;
  content: string;
  created_at: string;
};

export default function MentorPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchSessions = () => {
    api
      .get("/api/mentor/chat/sessions")
      .then((res) => setSessions(res.data))
      .catch(() => {});
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const loadSession = async (sessionId: string) => {
    setCurrentSessionId(sessionId);
    try {
      const res = await api.get(`/api/mentor/chat/sessions/${sessionId}`);
      setMessages(res.data);
    } catch {
      toast.error("メッセージの読み込みに失敗しました");
    }
  };

  const startNewChat = () => {
    setCurrentSessionId(null);
    setMessages([]);
    setInput("");
  };

  const deleteSession = async (sessionId: string) => {
    if (!confirm("このチャットを削除しますか？")) return;
    try {
      await api.delete(`/api/mentor/chat/sessions/${sessionId}`);
      if (currentSessionId === sessionId) {
        setCurrentSessionId(null);
        setMessages([]);
      }
      fetchSessions();
      toast.success("削除しました");
    } catch {
      toast.error("削除に失敗しました");
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    const text = input.trim();
    setInput("");

    // 楽観的にメッセージを表示
    const tempUserMsg: Message = {
      id: "temp-user",
      session_id: currentSessionId || "",
      role: "user",
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    setIsLoading(true);

    try {
      const res = await api.post("/api/mentor/chat", {
        message: text,
        session_id: currentSessionId,
      });
      const { message: assistantMsg, session_id } = res.data;

      if (!currentSessionId) {
        setCurrentSessionId(session_id);
      }

      // temp メッセージを確定メッセージに置き換え
      setMessages((prev) => {
        const withoutTemp = prev.filter((m) => m.id !== "temp-user");
        return [
          ...withoutTemp,
          { ...tempUserMsg, id: "user-" + Date.now(), session_id },
          assistantMsg,
        ];
      });

      fetchSessions();
    } catch {
      toast.error("送信に失敗しました");
      setMessages((prev) => prev.filter((m) => m.id !== "temp-user"));
      setInput(text);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex h-screen">
      {/* 左サイドバー: セッション一覧 */}
      <div className="flex w-64 flex-col border-r border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between border-b border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-700">チャット履歴</h3>
          <Link
            href="/mentor/knowledge"
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-200"
            title="ナレッジ管理"
          >
            <BookOpen className="h-4 w-4" />
          </Link>
        </div>
        <div className="p-3">
          <button
            onClick={startNewChat}
            className="flex w-full items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            新しいチャット
          </button>
        </div>
        <div className="flex-1 overflow-auto px-3 pb-3">
          {sessions.map((session) => (
            <div
              key={session.id}
              className={`group mb-1 flex items-center justify-between rounded-lg px-3 py-2 text-sm cursor-pointer transition-colors ${
                currentSessionId === session.id
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <button
                onClick={() => loadSession(session.id)}
                className="flex flex-1 items-center gap-2 truncate text-left"
              >
                <MessageCircle className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate">{session.title}</span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteSession(session.id);
                }}
                className="hidden rounded p-1 text-gray-400 hover:text-red-500 group-hover:block"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* メインチャットエリア */}
      <div className="flex flex-1 flex-col">
        {/* メッセージ表示 */}
        <div className="flex-1 overflow-auto p-6">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="mb-4 rounded-full bg-blue-50 p-4">
                <MessageCircle className="h-8 w-8 text-blue-500" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-gray-800">
                ビジネスメンターBot
              </h3>
              <p className="max-w-md text-sm text-gray-500">
                占いビジネスについて何でも相談してください。
                経営者たちの知見をもとに、実践的なアドバイスをお届けします。
              </p>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap ${
                      msg.role === "user"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="rounded-2xl bg-gray-100 px-4 py-3 text-sm text-gray-500">
                    考え中...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* 入力エリア */}
        <div className="border-t border-gray-200 bg-white p-4">
          <div className="mx-auto flex max-w-3xl items-end gap-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="メッセージを入力..."
              rows={1}
              className="flex-1 resize-none rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              style={{
                minHeight: "44px",
                maxHeight: "120px",
                height: "auto",
              }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = "auto";
                target.style.height = target.scrollHeight + "px";
              }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
