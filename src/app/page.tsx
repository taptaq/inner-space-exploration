"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import LoginPage from "@/components/auth/LoginPage";

export default function Home() {
  const [isRendered, setIsRendered] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    setIsRendered(true);
    const token = localStorage.getItem("token");
    const userStr = localStorage.getItem("user");
    
    setIsLoggedIn(!!token);
    if (userStr) {
      try {
        setCurrentUser(JSON.parse(userStr));
      } catch (e) {
        // silent catch
      }
    }
    
    setIsChecking(false);
  }, []);

  // 预生成背景流星与星轨游离碎片
  const [particles, setParticles] = useState<any[]>([]);

  useEffect(() => {
    setParticles(
      Array.from({ length: 30 }).map(() => ({
        id: Math.random(),
        size: Math.random() * 3 + 1,
        top: Math.random() * 100,
        left: Math.random() * 100,
        duration: Math.random() * 10 + 10,
        delay: Math.random() * 5,
      }))
    );
  }, []);

  // 还在检查登录状态时显示空白，避免闪烁
  if (isChecking) {
    return (
      <main className="min-h-screen bg-brand-slate-950 flex items-center justify-center">
        <div className="relative w-8 h-8">
          <div className="absolute inset-0 border-2 border-brand-cyan-500/20 rounded-full" />
          <div className="absolute inset-0 border-2 border-t-brand-cyan-400 rounded-full animate-spin" />
        </div>
      </main>
    );
  }

  if (!isLoggedIn) {
    return <LoginPage />;
  }

  return (
    <main className="relative min-h-screen bg-brand-slate-950 font-mono overflow-hidden flex flex-col items-center justify-center text-center px-4">
      {/* 极简且深邃的背景光影系 */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        {/* 核心光晕 */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.08)_0%,transparent_60%)] mix-blend-screen" />
        {/* 顶层压暗，营造失重感 */}
        <div className="absolute inset-0 bg-gradient-to-b from-brand-slate-950 via-transparent to-brand-slate-950 z-10" />

        {/* 孤寂星辰粒子 (仅在客户端渲染，避免 SSR 随机数水合错误) */}
        {isRendered &&
          particles.map((p) => (
            <div
              key={p.id}
              className="absolute bg-brand-cyan-400/40 rounded-full animate-[pulse_3s_ease-in-out_infinite]"
              style={{
                width: `${p.size}px`,
                height: `${p.size}px`,
                top: `${p.top}%`,
                left: `${p.left}%`,
                animationDuration: `${p.duration}s`,
                animationDelay: `${p.delay}s`,
              }}
            />
          ))}

        {/* 扫描虚线动画 */}
        <div className="absolute inset-0 border-[1px] border-brand-slate-900/40 rounded-full w-[200vw] h-[200vw] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border-dashed border-spacing-8 animate-[spin_100s_linear_infinite]" />
      </div>

      {/* 居中核心排版区 */}
      <div
        className={`z-20 flex flex-col items-center transition-all duration-1000 transform ${isRendered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
      >
        {/* 气氛标签 */}
        <div className="mb-6 inline-flex items-center space-x-2 px-4 py-1.5 rounded-full border border-brand-cyan-900/30 bg-brand-slate-900/60 backdrop-blur-md">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,1)]" />
          <span className="text-[10px] sm:text-xs text-brand-emerald-400 font-bold tracking-widest uppercase">
            准备好进入深空了吗？
          </span>
        </div>

        {/* 巨物感大标题 */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-brand-cyan-100 to-brand-cyan-600 tracking-tighter mb-4 drop-shadow-2xl">
          内太空<span className="text-brand-slate-500 font-light mx-2">|</span>
          漫游
        </h1>

        <p className="max-w-md mx-auto text-sm sm:text-base text-brand-slate-400 leading-relaxed mb-12 tracking-wide font-light">
          在这里，你可以放心地输入身体探索时你隐秘的需求和癖好。
          <br />
          我们将为你寻找茫茫宇宙中{" "}
          <span className="text-brand-cyan-400 border-b border-brand-cyan-400/30 pb-0.5 font-bold">
            与你频率契合的同类灵魂
          </span>
          ，或只为你构筑{" "}
          <span className="text-sky-400 border-b border-sky-400/30 pb-0.5 font-bold">
            专属你一个人
          </span>{" "}
          的私密乐园蓝图。
        </p>

        {/* CTA 双入口 */}
        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-lg">
          {/* 主推入口：情境化直觉漫游 */}
          <div className="relative group flex-1">
            <div className="absolute -inset-1 bg-gradient-to-r from-brand-cyan-500 to-brand-emerald-500 rounded-lg blur opacity-40 group-hover:opacity-100 transition duration-1000 group-hover:duration-200" />
            <Link
              href="/scenario"
              className="relative flex items-center justify-center px-6 py-5 bg-brand-slate-950 text-white rounded-lg border border-brand-slate-800 leading-none group-hover:bg-brand-slate-900 transition-colors w-full"
            >
              <div className="flex flex-col items-center">
                <span className="text-sm font-bold tracking-widest uppercase text-brand-cyan-400 group-hover:text-white transition-colors">
                  [ 直觉 ]
                </span>
                <span className="text-[10px] text-brand-slate-500 mt-1">
                  凭本能选择 · 推荐
                </span>
              </div>
            </Link>
          </div>

          {/* 次级入口：极客手控 */}
          <div className="relative group flex-1">
            <div className="absolute -inset-1 bg-gradient-to-r from-brand-cyan-500 to-brand-emerald-500 rounded-lg blur opacity-40 group-hover:opacity-100 transition duration-1000 group-hover:duration-200" />
            <Link
              href="/onboarding"
              className="relative flex items-center justify-center px-6 py-5 bg-brand-slate-950 text-white rounded-lg border border-brand-slate-800 leading-none group-hover:bg-brand-slate-900 transition-colors w-full"
            >
              <div className="flex flex-col items-center">
                <span className="text-sm font-bold tracking-widest uppercase text-brand-cyan-400 group-hover:text-white transition-colors">
                  [ 手控 ]
                </span>
                <span className="text-[10px] text-brand-slate-500 mt-1">
                  手动调参 · 高级
                </span>
              </div>
            </Link>
          </div>
        </div>

        {/* 科普入口 */}
        <Link
          href="/knowledge"
          className="mt-8 group px-6 py-3 rounded-lg border border-brand-slate-700 bg-brand-slate-900/40 hover:border-brand-cyan-500/50 hover:bg-brand-cyan-950/20 hover:shadow-[0_0_20px_rgba(6,182,212,0.1)] transition-all duration-300 inline-flex items-center gap-2 text-sm text-brand-slate-400 group-hover:text-brand-cyan-400"
        >
          <span className="text-base">📚</span>
          <span className="font-bold tracking-wider group-hover:text-brand-cyan-400 transition-colors">
            深空医典
          </span>
          <span className="text-brand-slate-600 text-xs">·</span>
          <span className="text-xs text-brand-slate-500">
            科学认识自己的身体与心理
          </span>
          <svg
            className="w-3.5 h-3.5 text-brand-slate-600 group-hover:text-brand-cyan-400 transition-colors ml-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </Link>

        {/* 用户资料极简铭牌 (转移到医典下方) */}
        {currentUser && (
          <div className="mt-8 flex items-center gap-3 bg-brand-slate-900/60 border border-brand-slate-700/50 px-4 py-2 rounded-full backdrop-blur-md z-30 transition-all hover:bg-brand-slate-800/80 hover:border-brand-cyan-500/50 shadow-lg">
            {currentUser.avatar ? (
              <img src={currentUser.avatar} alt="Avatar" className="w-9 h-9 rounded-full border border-brand-slate-700 object-cover" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-brand-slate-800 border border-brand-slate-700 flex items-center justify-center">
                <span className="text-brand-cyan-400 text-xs font-bold w-full text-center leading-[2rem]">?</span>
              </div>
            )}
            <div className="flex flex-col pr-3">
              <span className="text-brand-slate-200 text-xs font-bold tracking-wide">{currentUser.name || currentUser.email}</span>
              <span className="text-brand-cyan-500 text-[9px] uppercase tracking-widest leading-none mt-1">已连接 SecondMe 主脑</span>
            </div>
            {/* 极小退出按钮 */}
            <button
              onClick={() => {
                localStorage.removeItem("token");
                localStorage.removeItem("user");
                window.location.reload();
              }}
              className="ml-2 w-6 h-6 rounded-full bg-brand-slate-800 hover:bg-brand-red-500/20 text-brand-slate-500 hover:text-brand-red-400 flex items-center justify-center transition-colors"
              title="断开连接"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        )}

      </div>

      {/* 底部装饰工程参数 */}
      <div className="absolute bottom-6 left-6 text-[10px] text-brand-slate-400/40 flex flex-col space-y-1 mt-auto">
        <span>纬度: 49.33N // 经度: 12.44E</span>
        <span>通讯协议: V1.0.0_测试版</span>
        <span>核心温度: 32°C // 极佳</span>
      </div>
    </main>
  );
}
