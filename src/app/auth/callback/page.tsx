"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function CallbackContent() {
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    let processed = false;

    const handleCallback = async () => {
      if (processed) return;
      processed = true;

      const code = searchParams.get("code");
      const state = searchParams.get("state");
      const err = searchParams.get("error");
      const errorDescription = searchParams.get("error_description");

      if (err) {
        setError(errorDescription || "授权失败");
        return;
      }

      if (!code) {
        setError("未获取到授权码");
        return;
      }

      // 验证 state
      const savedState = localStorage.getItem("oauth_state");
      if (savedState && state !== savedState) {
        console.warn("OAuth state 不匹配");
      }
      localStorage.removeItem("oauth_state");

      try {
        const redirectUri = `${window.location.origin}/auth/callback`;

        const res = await fetch("/api/auth/callback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, redirectUri }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "登录失败");
        }

        // 写入 token 并跳回首页
        localStorage.setItem("token", data.token);
        if (data.user) {
          localStorage.setItem("user", JSON.stringify(data.user));
        }
        window.location.href = "/";
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "系统错误，请重试";
        console.error("Callback error:", e);
        setError(message);
      }
    };

    handleCallback();
  }, [searchParams, router]);

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="text-brand-red-400 font-mono text-sm border border-red-500/30 px-4 py-3 rounded bg-red-950/20">
          <span className="text-red-400">ERROR:</span> {error}
        </div>
        <button
          onClick={() => (window.location.href = "/")}
          className="px-6 py-2 border border-brand-slate-700 text-brand-slate-300 rounded hover:border-brand-cyan-500/50 hover:text-brand-cyan-400 transition-colors text-sm font-mono tracking-widest"
        >
          [ 返回登录 ]
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-10 h-10">
        <div className="absolute inset-0 border-2 border-brand-cyan-500/20 rounded-full" />
        <div className="absolute inset-0 border-2 border-t-brand-cyan-400 rounded-full animate-spin" />
      </div>
      <p className="text-brand-slate-400 text-sm font-mono tracking-widest animate-pulse">
        正在接入身份验证...
      </p>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <main className="min-h-screen bg-brand-slate-950 font-mono flex items-center justify-center">
      <div className="flex flex-col items-center gap-8">
        {/* Logo */}
        <div className="text-center">
          <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-brand-cyan-600 tracking-tighter">
            内太空 <span className="text-brand-slate-600 font-light">|</span> 漫游
          </h1>
          <p className="text-xs text-brand-slate-500 mt-1 tracking-widest">
            INNER SPACE ODYSSEY
          </p>
        </div>

        <Suspense
          fallback={
            <div className="flex flex-col items-center gap-4">
              <div className="relative w-10 h-10">
                <div className="absolute inset-0 border-2 border-brand-cyan-500/20 rounded-full" />
                <div className="absolute inset-0 border-2 border-t-brand-cyan-400 rounded-full animate-spin" />
              </div>
              <p className="text-brand-slate-400 text-sm tracking-widest">加载中...</p>
            </div>
          }
        >
          <CallbackContent />
        </Suspense>
      </div>
    </main>
  );
}
