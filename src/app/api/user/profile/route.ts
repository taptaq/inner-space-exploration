import { NextRequest, NextResponse } from "next/server";
import { config, secondmeApi } from "@/lib/secondme";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing or invalid authorization token" },
        { status: 401 }
      );
    }
    const token = authHeader.split(" ")[1];
    const options = {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };

    // 并发请求三个接口
    const [infoRes, shadesRes, softMemoryRes] = await Promise.allSettled([
      secondmeApi("/api/secondme/user/info", options),
      secondmeApi("/api/secondme/user/shades", options),
      secondmeApi("/api/secondme/user/softmemory?pageNo=1&pageSize=50", options),
    ]);

    const info = infoRes.status === "fulfilled" ? infoRes.value.data : null;
    const shades = shadesRes.status === "fulfilled" ? shadesRes.value.data?.shades : [];
    const softMemory = softMemoryRes.status === "fulfilled" ? softMemoryRes.value.data?.list : [];

    if (!info) {
      return NextResponse.json(
        { error: "Failed to fetch user info" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      info,
      shades,
      softMemory,
    });
  } catch (error: any) {
    console.error("Profile API error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
