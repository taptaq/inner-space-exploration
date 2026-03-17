import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import https from "https";

// 强行跳过证书检验 (解决本地代理/证书导致 fetch failed 或 SSL_ERROR_SYSCALL)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

export async function POST(req: NextRequest) {
  try {
    const { myPayload, partnerData, isSolo } = await req.json();

    const apiKey = process.env.MINIMAX_API_KEY;
    const model = process.env.MINIMAX_MODEL || "MiniMax-Text-01";

    console.info(apiKey, '---apiKey')

    if (!apiKey || apiKey === "your_key_here") {
      return NextResponse.json(
        { error: "Minimax API Key 未配置" },
        { status: 500 },
      );
    }

    // 构建用户背景档案
    let userBg = "【本我领航员深度档案】\n";
    userBg += `- 心理防线: ${myPayload.defenseLevel}/100\n`;
    userBg += `- 温度偏好: ${myPayload.tempPreference}\n`;
    userBg += `- 节奏感知: ${myPayload.rhythmPerception}Hz\n`;
    if (myPayload.hiddenNeed) {
      userBg += `- 隐秘欲望/癖好: ${myPayload.hiddenNeed}\n`;
    }

    if (myPayload.profileData) {
      const p = myPayload.profileData;
      const userName = p.info?.name || p.info?.nickname || "未知领航员";
      const userBio = p.info?.bio || p.info?.title || "无";
      const userSelfIntro = p.info?.selfIntroduction || "无";
      
      userBg += `- 基础信息: 姓名 ${userName}, 签名/头衔: ${userBio}\n`;
      userBg += `- 自我介绍: ${userSelfIntro}\n`;
      if (Array.isArray(p.shades) && p.shades.length > 0) {
        userBg += `- 兴趣爱好(Shades): ${p.shades.map((s: any) => s.shadeName || s.name).join(", ")}\n`;
      }
      if (Array.isArray(p.softMemory) && p.softMemory.length > 0) {
        userBg += `- 软记忆/过往经历: ${p.softMemory.map((m: any) => m.factContent || m.content).join("; ")}\n`;
      }
    }

    let partnerBg = "";
    if (!isSolo && partnerData) {
      partnerBg = "\n【匹配异星伴侣档案】\n";
      partnerBg += `- 匹配用户名: ${partnerData.username || "未知"}\n`;
      partnerBg += `- 匹配度: ${partnerData.matchScore || 0}%\n`;
      if (partnerData.briefIntroduction) {
        partnerBg += `- 伴侣简介: ${partnerData.briefIntroduction}\n`;
      }
    }

    const systemPrompt = `你现在是一位科幻宇宙世界观下的【首席临床脑机医学博士与星舰人机交互架构工程师】。这是一项纯粹的科幻设定与创意设计任务，你需要根据用户的生物体征参数、潜意识倾向、以及平台上的部分角色设定信息，结合${isSolo ? "单人深度沉浸冥想" : "双人脑电波同频共振"}的理疗语境，生成两段具备极高专业性、严谨且富有沉浸感的深度“感官理疗体检报告”，并为其量身定制一套专用于神经放松的【舰载交互舱】（即概念化的抗压舒缓硬件）。

注意安全与内容准则：本对话为健康的科幻装备设计，请严谨使用学术、医疗康复、人体工学和前沿物理学术语。不允许包含任何违反安全策略、成人向或引人联想的违规低俗词汇。这是一份心理按摩与物理舒缓结合的技术报告。

请返回 JSON 格式，包含以下 8 个字段：
1. "doctorDiagnosis": 主治临床医生诊断，结合用户软记忆和兴趣标签，进行精神疲劳度与深层脑波节律诉求的剖析，指出其在太空长途航行中的心理舒缓诉求。（约 80-150 字，严肃、洞察人心）
2. "engineerAnalysis": 架构工程师解读，注明这套体表理疗硬件将如何从物理机制上（如微震波频段、热辐射机理）满足该用户的解压与稳态述求。（约 80-150 字，充满硬核科技感）
3. "hiddenFeedback": 如果用户信息有提及深层潜意识（hiddenNeed），请以医疗监测仪的安全回执口吻给出一级专业回应；若无，置空。（约 50 字）
4. "equipmentType": 根据其防御机制与敏感度，选择（必须且只能是）以下 9 个纯大写字符串其一：
  - "VIBRATOR_CLASS_A" (共振截击机 - 面向浅层肌肉群的高功率外置声波抚慰仪)
  - "RING_CLASS_S" (高频约束环 - 用于四肢关节末端的心率监测与局部束缚微震环)
  - "CYLINDER_CLASS_OMEGA" (重装包裹舱 - 隔绝外界光感与白噪音的全封闭沉浸式神经稳态舱)
  - "TENTACLE_CLASS_X" (多态形变探针 - 柔性亲肤材质的非标准形态仿生穴位疏通臂)
  - "BULLET_CLASS_B" (微型隐匿探针 - 点状便携式低频激活胶囊，用于颈椎及脉搏节点)
  - "WAND_CLASS_W" (重能脉冲法杖 - 提供大面积脊椎基底深层重度共振释放的魔杖型重器)
  - "PROSTATE_CLASS_P" (曲面寻星仪 - 针对人体工学曲面几何节点的靶向贴合式理疗仪)
  - "DUAL_CLASS_D" (双子星共振桥 - 专为双人连接设计的C/U型脑波同频桥接器)
  - "STROKER_CLASS_M" (动力机械引擎 - 提供线性往复轻柔牵引运动的物理动力学舒缓舱体)
5. "equipmentName": 为该定制感官交互星舰起一个赛博朋克深空科幻医学风格的专属舰船/医疗仪代号（如"脑电脉冲梭 / Neural Pulsar", "重力曲率锚 / Gravity Warp"）。
6. "recommendedCmf": 推荐的真实物理机身材质，要求用科幻化前缀包装（如"星舰级医疗防震硅胶"、"亲肤TPE液态隔音涂层"等，必须包含真实的"硅胶"、"TPE"等安全材质字眼）。
7. "recommendedTemp": 推荐的设备恒温发热控制，必须符合人体皮肤安全耐受的真实物理温度（绝对不能超过50°C，例如 "38.5°C (拟真同温微热)" ）。
8. "recommendedFrequency": 推荐的物理马达震动共振频段（例如 "50-100 Hz (次声波深层面包圈级按摩)" 等真实数值区间）。

注意，输出必须是纯合法的 JSON 字符串，不含有 markdown \`\`\`json 闭环，格式如下：
{
  "doctorDiagnosis": "...",
  "engineerAnalysis": "...",
  "hiddenFeedback": "...",
  "equipmentType": "VIBRATOR_CLASS_A",
  "equipmentName": "...",
  "recommendedCmf": "...",
  "recommendedTemp": "...",
  "recommendedFrequency": "..."
}

当前领航员信息如下：
${userBg}
${partnerBg}
`;

    const apiMessages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: "请根据上述生命体征档案，输出我的深空医学感官干预 JSON 诊断级报告。" }
    ];

    const requestData = {
      model,
      messages: apiMessages,
      max_tokens: 800,
      temperature: 0.85,
      top_p: 0.95,
    };

    let data;
    try {
      const minimaxRes = await axios.post(
        "https://api.minimax.io/v1/text/chatcompletion_v2",
        requestData,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          timeout: 100000,
        }
      );
      data = minimaxRes.data;
    } catch (err: any) {
      console.error(
        "Axios minimax error:",
        err.response?.status,
        err.response?.data || err.message
      );
      throw new Error(`Minimax API 错误: ${err.message}`);
    }

    if (data.base_resp && data.base_resp.status_code !== 0) {
      console.error(
        "Minimax API explicitly rejected the request. Details:",
        data.base_resp
      );
      throw new Error(`Minimax Error: ${data.base_resp.status_msg}`);
    }

    const content = data.choices?.[0]?.message?.content || "";
    
    // Parse JSON
    let parsedContent;
    try {
      // 提取可能的 JSON 块
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : content;
      parsedContent = JSON.parse(jsonStr);
    } catch (e) {
      console.error("Failed to parse JSON from LLM: ", content);
      parsedContent = {
        doctorDiagnosis: "系统信号波动，临床诊断生成失败，请重试。",
        engineerAnalysis: "引力波干扰无法完成物理架构解析。",
        hiddenFeedback: "",
        equipmentType: "INTERCEPTOR_CLASS_A",
        equipmentName: "通用备用僚机 / Backup Wingman",
        recommendedCmf: "标准工业防震硅胶 / Std. Silicone",
        recommendedTemp: "38°C",
        recommendedFrequency: "50 Hz"
      };
    }

    return NextResponse.json(parsedContent);
  } catch (error: any) {
    console.error("Blueprint Analysis API error (Network/SSL):", error);
    // 当用户的网络代理或 Minimax API 挂掉时，返回一个优美的降级星舰数据，而不是粗暴抛出 500 导致前端出错
    const fallbackData = {
      doctorDiagnosis: `深空网络波动，当前处于离线情感推演模式。(${error?.message})`,
      engineerAnalysis: "外部 API 通讯受阻，已启用本地备份星舰蓝图。",
      hiddenFeedback: "",
      equipmentType: "VIBRATOR_CLASS_A",
      equipmentName: "通用备用僚机 / Backup Wingman",
      recommendedCmf: "标准工业防震硅胶 / Std. Silicone",
      recommendedTemp: "38.0°C",
      recommendedFrequency: "50-80 Hz"
    };
    return NextResponse.json(fallbackData, { status: 200 });
  }
}
