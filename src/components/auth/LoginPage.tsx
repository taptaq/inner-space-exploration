"use client";

import { useState, useEffect, useMemo } from "react";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [isRendered, setIsRendered] = useState(false);
  const [particles, setParticles] = useState<any[]>([]);

  useEffect(() => {
    setIsRendered(true);
    // 使用 useEffect 在客户端统一生成粒子，修复 SSR 水合不匹配导致粒子不显示的问题
    setParticles(
      Array.from({ length: 80 }).map(() => ({
        id: Math.random(),
        size: Math.random() * 2.5 + 0.8,
        top: Math.random() * 100,
        left: Math.random() * 100,
        duration: Math.random() * 12 + 8,
        delay: Math.random() * 5,
        opacity: Math.random() * 0.6 + 0.2,
      })),
    );
  }, []);

  const handleLogin = () => {
    setLoading(true);

    const clientId = process.env.NEXT_PUBLIC_SECONDME_APP_ID || "";

    if (!clientId) {
      alert("错误：环境变量 NEXT_PUBLIC_SECONDME_APP_ID 未配置。");
      setLoading(false);
      return;
    }

    const redirectUri = `${window.location.origin}/auth/callback`;
    const state = Math.random().toString(36).substring(2, 15);
    localStorage.setItem("oauth_state", state);

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      state: state,
    });

    window.location.href = `https://go.second.me/oauth/?${params.toString()}`;
  };

  return (
    <main className="relative min-h-screen bg-brand-slate-950 font-mono overflow-hidden flex flex-col items-center justify-center text-center px-6">
      {/* 背景层 */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {/* 全局暗黑网格 (Grid texture) */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.03)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_80%,transparent_100%)] z-0" />

        {/* 核心光晕 */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.08)_0%,transparent_50%)] mix-blend-screen" />

        {/* 雷达扫描波纹 */}
        <div className="absolute top-0 left-0 right-0 h-96 bg-gradient-to-b from-transparent via-brand-cyan-500/5 to-transparent blur-3xl animate-[pulse_8s_ease-in-out_infinite] transform translate-y-[20%]" />

        {/* 顶底渐变遮罩 */}
        <div className="absolute inset-0 bg-gradient-to-b from-brand-slate-950 via-transparent to-brand-slate-950 z-10" />

        {/* 星轨扫描圆 */}
        <div className="absolute inset-0 border border-brand-slate-700/30 rounded-full w-[200vw] h-[200vw] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border-dashed border-spacing-8 animate-[spin_180s_linear_infinite]" />
        <div className="absolute inset-0 border border-brand-cyan-900/20 rounded-full w-[150vw] h-[150vw] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border-dashed border-spacing-4 animate-[spin_100s_linear_infinite_reverse]" />

        {/* 星辰粒子 */}
        {isRendered &&
          particles.map((p) => (
            <div
              key={p.id}
              className="absolute rounded-full bg-brand-cyan-400 animate-pulse z-20"
              style={{
                width: `${p.size}px`,
                height: `${p.size}px`,
                top: `${p.top}%`,
                left: `${p.left}%`,
                opacity: p.opacity,
                animationDuration: `${p.duration}s`,
                animationDelay: `${p.delay}s`,
                boxShadow: `0 0 ${p.size * 4}px rgba(6, 182, 212, 0.8)`,
              }}
            />
          ))}
      </div>

      <div
        className={`relative z-20 flex flex-col items-center max-w-sm md:max-w-lg w-full transition-all duration-1000 ${
          isRendered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}
      >
        {/* 状态指示 */}
        <div className="mb-8 md:mb-10 inline-flex items-center gap-2 px-4 py-1.5 md:px-5 md:py-2 rounded-full border border-brand-cyan-900/30 bg-brand-slate-900/60 backdrop-blur-md">
          <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-brand-emerald-400 animate-pulse shadow-[0_0_6px_rgba(52,211,153,1)]" />
          <span className="text-[10px] md:text-xs text-brand-emerald-400 font-bold tracking-widest uppercase">
            系统就绪 · 等待身份接入
          </span>
        </div>

        {/* 标题区 */}
        <h1 className="text-5xl sm:text-6xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-brand-cyan-100 to-brand-cyan-600 tracking-tighter mb-2 md:mb-4 drop-shadow-2xl">
          内太空
          <span className="text-brand-slate-600 font-light mx-3 md:mx-4">
            |
          </span>
          漫游
        </h1>
        <p className="text-xs md:text-sm text-brand-slate-500 tracking-[0.4em] uppercase mb-3 md:mb-5">
          Inner Space Odyssey
        </p>

        {/* 分割线 */}
        <div className="w-16 md:w-24 h-px bg-gradient-to-r from-transparent via-brand-cyan-500/50 to-transparent my-6 md:my-8" />

        <p className="text-sm md:text-base text-center mx-auto text-brand-slate-400 leading-relaxed mb-10 md:mb-12 tracking-wide max-w-xs md:max-w-lg">
          没有审判，只有共振。
          <br className="hidden sm:block" />
          请载入你的{" "}
          <span className="text-brand-cyan-400 border-b border-brand-cyan-400/30 font-bold whitespace-nowrap">
            SecondMe 数字身份
          </span>{" "}
          开启潜航。
          <br />
          <span className="mt-3 inline-block">
            交出那些难以启齿的诉求，这片深空会向你证明：
            <br />
            <span className="text-brand-slate-200 font-bold mt-1 inline-block drop-shadow-md">
              你从来都不是异类，你只是在等待同类。
            </span>
          </span>
        </p>

        {/* 登录按钮 */}
        <div className="relative group w-full md:w-11/12 mx-auto">
          {/* 发光外框 */}
          <div className="absolute -inset-0.5 bg-gradient-to-r from-brand-cyan-500 to-brand-emerald-500 rounded-lg blur opacity-30 group-hover:opacity-70 transition duration-500" />
          <button
            onClick={handleLogin}
            disabled={loading}
            className="relative w-full py-4 md:py-5 px-6 bg-brand-slate-950 border border-brand-slate-800 rounded-lg text-brand-cyan-400 font-bold tracking-widest text-sm md:text-base hover:bg-brand-slate-900 hover:text-white hover:border-brand-cyan-500/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-3">
                <span className="w-4 h-4 md:w-5 md:h-5 border-2 border-brand-cyan-500/30 border-t-brand-cyan-400 rounded-full animate-spin" />
                正在接入身份验证...
              </span>
            ) : (
              "[ 接入 SecondMe 身份验证 ]"
            )}
          </button>
        </div>

        {/* 底部提示 */}
        <p className="mt-6 md:mt-8 text-[10px] md:text-xs text-brand-slate-600 tracking-wider">
          登录即表示你同意我们的服务条款与隐私政策
        </p>
      </div>

      {/* 底部工程参数 */}
      <div className="absolute bottom-6 left-6 text-[10px] text-brand-slate-500/40 flex flex-col space-y-0.5 z-20">
        <span>AUTH_PROTOCOL: SecondMe_OAuth2</span>
        <span>ENDPOINT: api.mindverse.com</span>
        <span>STATUS: STANDBY</span>
      </div>
      <div className="absolute bottom-6 right-6 text-[10px] text-brand-slate-500/40 z-20">
        <span>V1.0.0 · ISS-AUTH</span>
      </div>
    </main>
  );
}
