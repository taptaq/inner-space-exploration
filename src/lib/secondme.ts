// SecondMe API 配置
export const config = {
  appId: process.env.NEXT_PUBLIC_SECONDME_APP_ID,
  appSecret: process.env.SECONDME_APP_SECRET,
  baseUrl: process.env.SECONDME_BASE_URL || "https://api.mindverse.com/gate/lab",
};

// 如果本地遭遇代理软件劫持导致 SSL 握手失败 (ECONNRESET) 可强行跳过证书检验
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

// API 请求辅助函数
export async function secondmeApi(endpoint: string, options: RequestInit = {}) {
  const url = `${config.baseUrl}${endpoint}`;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    "X-App-ID": config.appId || "",
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: response.statusText }));
    throw new Error(error.message || `API Error: ${response.status}`);
  }

  return response.json();
}

// 获取当前登录用户信息、标签、软记忆
export async function getCurrentUser(token?: string) {
  if (!token) return null;

  try {
    const authHeaders = {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };

    // 并发拉取用户信息, 爱好标签, 以及软记忆
    const [infoRes, shadesRes, softMemoryRes] = await Promise.allSettled([
      secondmeApi("/api/secondme/user/info", authHeaders),
      secondmeApi("/api/secondme/user/shades", authHeaders),
      secondmeApi("/api/secondme/user/softmemory", authHeaders)
    ]);

    // 哪怕 shades 获取失败，只要 info 在，都算登录获取成功
    if (infoRes.status === "rejected") {
      throw infoRes.reason;
    }

    const info = infoRes.value?.data || {};
    const shades = shadesRes.status === "fulfilled" ? shadesRes.value?.data : [];
    const softMemory = softMemoryRes.status === "fulfilled" ? softMemoryRes.value?.data : [];

    return {
      ...info, // 平铺原有 info, 兼容旧代码解构逻辑
      info,    // 嵌套全量信息
      shades: Array.isArray(shades) ? shades : shades?.list || [],
      softMemory: Array.isArray(softMemory) ? softMemory : softMemory?.list || [],
    };
  } catch (err) {
    console.error("getCurrentUser error:", err);
    return null;
  }
}
