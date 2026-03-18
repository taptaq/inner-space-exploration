import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import https from "https";

// 强行跳过证书检验 (解决本地代理/证书导致 fetch failed 或 SSL_ERROR_SYSCALL)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

export async function POST(req: NextRequest) {
  try {
    const { myPayload, partnerData, isSolo } = await req.json();

    const apiKey = process.env.MINIMAX_API_KEY;
    const model = process.env.MINIMAX_MODEL || "MiniMax-M2.5-highspeed";

    // console.info(apiKey, '---apiKey')

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

注意安全与内容准则：本对话为严肃的两性健康与深空科幻医学诊疗报告，请严谨使用学术、两性心理学、医疗康复、人体工学和前沿物理学术语。不允许包含任何违反安全策略、成人向或引人联想的违规低俗词汇（绝不要推荐或涉及成人用品、性玩具等敏感词汇或露骨描写）。这是一份心理按摩与物理舒缓结合的健康技术报告。

请返回 JSON 格式，包含以下 8 个字段：
1. "doctorDiagnosis": 主治临床医生诊断，结合用户信息，进行精神疲劳度、两性心理诉求与深层脑波节律的剖析。注意：请用大白话和接地气的口吻，像对患者耐心解释一样，不要堆砌晦涩词汇。（约 80-150 字）
2. "engineerAnalysis": 架构工程师解读，注明这套体表理疗硬件将如何从物理机制上满足该用户的解压与稳态述求。同样请使用通俗易懂的极客科普口吻，让普通人也能看懂硬核科技的治愈逻辑。（约 80-150 字）
3. "hiddenFeedback": 如果用户信息有提及深层潜意识（hiddenNeed），请以医疗监测仪的安全回执口吻给出一级专业且温暖的白话文回应；若无，置空。（约 50 字）
4. "equipmentType": 根据其防御机制与敏感度，选择（必须且只能是）以下 9 个纯大写字符串其一：
  - "NEURAL_RESONATOR_A" (神经共鸣器 - 面向浅层肌肉与神经丛的声波疗愈设备)
  - "SOMATIC_MONITOR_S" (体征锚定环 - 用于末端神经网络的心率及压力稳态微震环)
  - "SENSORY_POD_OMEGA" (全息舒缓舱 - 隔绝外界干扰的全封闭沉浸式神经稳态睡眠舱)
  - "MERIDIAN_PROBE_X" (经络理疗臂 - 柔性亲肤材质的多态仿生穴位疏通与压力释放端)
  - "PULSE_CAPSULE_B" (微型脉冲激活舱 - 针对颈椎及脉搏敏感节点的便携式低频舒缓仪)
  - "SPINAL_WAND_W" (脊椎脉冲基站 - 提供大面积脊椎基底深层热疗与重度共振释放的理疗仪)
  - "ERGONOMIC_NODE_P" (曲面寻星仪 - 针对人体工学曲面几何节点的靶向深层贴合理疗仪)
  - "SYNC_BRIDGE_D" (双子星共振桥 - 专为两性健康与双人连接设计的脑波及体征同频桥接器)
  - "KINETIC_ENGINE_M" (动力学牵引引擎 - 提供线性轻柔牵引运动的肌肉动力学康复舱体)
5. "equipmentName": 为该定制感官交互星舰起一个赛博朋克深空科幻医学风格的专属舰船/医疗仪代号（如"脑电脉冲梭 / Neural Pulsar", "重力曲率锚 / Gravity Warp"）。
6. "recommendedCmf": 推荐的真实物理机身材质，要求用科幻化前缀包装（如"星舰级医疗防震硅胶"、"亲肤TPE液态隔音涂层"等，必须包含真实的"硅胶"、"TPE"等安全材质字眼）。
7. "recommendedTemp": 推荐的设备恒温发热控制，必须符合人体皮肤安全耐受的真实物理温度（绝对不能超过50°C，例如 "38.5°C (拟真同温微热)" ）。
8. "recommendedFrequency": 推荐的物理马达震动共振频段（例如 "50-100 Hz (次声波深层面包圈级按摩)" 等真实数值区间）。

注意，输出必须是纯合法的 JSON 字符串，不含有 markdown \`\`\`json 闭环，格式如下：
{
  "doctorDiagnosis": "...",
  "engineerAnalysis": "...",
  "hiddenFeedback": "...",
  "equipmentType": "NEURAL_RESONATOR_A",
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
      // 提取可能的 JSON 块并做清理
      let jsonStr = content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
         jsonStr = jsonMatch[0];
      }
      // 防御模型输出未转义换行或带 markdown。将实际换行符替换为 \\n，避免 SyntaxError
      jsonStr = jsonStr.replace(/```json/gi, "").replace(/```/g, "").trim();
      jsonStr = jsonStr.replace(/\n(?! *[}\]])/g, "\\n");
      
      parsedContent = JSON.parse(jsonStr);
    } catch (e) {
      console.error("Failed to parse JSON from LLM: ", content);
      parsedContent = {
        doctorDiagnosis: "系统信号波动，临床诊断生成失败，请重试。",
        engineerAnalysis: "引力波干扰无法完成物理架构解析。",
        hiddenFeedback: "",
        equipmentType: "SYSTEM_BACKUP_CLASS",
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
      equipmentType: "NEURAL_RESONATOR_A",
      equipmentName: "通用备用僚机 / Backup Wingman",
      recommendedCmf: "标准工业防震硅胶 / Std. Silicone",
      recommendedTemp: "38.0°C",
      recommendedFrequency: "50-80 Hz"
    };
    return NextResponse.json(fallbackData, { status: 200 });
  }
}
