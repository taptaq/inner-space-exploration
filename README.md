# 🌌 Inner Space Odyssey (内太空漫游)

**Inner Space Odyssey** 是一款带着“深空科幻”风格的 AI 应用。说得通俗一点，它就是一个**“披着科幻外衣的灵魂匹配与自我探索平台”**。

在这里，你不必填那些干巴巴的表单。为了了解你，应用里有一系列超有代入感的“科幻剧情选项”（比如在废弃医疗站里做决定）。系统会根据你的选择，测算你的防线高低、对节奏的感知、甚至深层的隐秘需求。然后，系统会把你当成一艘“星舰”，在茫茫宇宙（用户库）中帮你寻找最匹配的另一个人。

## ✨ 核心亮点

- 🛸 **超酷的沉浸式界面**
  - 全局暗色调、霓虹发光、扫描雷达、打字机效果... 让你感觉像坐在宇宙飞船的驾驶舱里。
  - 不管你是用手机还是用电脑大屏，页面布局都能自动适应，看着都很舒服。
- 🤖 **AI 大模型陪你“左右互搏”**
  - **单机模式下**：在专属你的分析页，系统里的“理智（超我）”和“本能欲望（本我）”两个 AI 会在页面上当着你的面吵架，探讨你心里最真实的诉求。
  - **匹配模式下**：系统会先让代表你的 AI 和代表对方的 AI 互相试探着聊天，聊得差不多了再把对方的身份解锁给你看。
- 🔐 **一键快捷登录**
  - 完美接入了 SecondMe 第三方登录，匹配成功后可以直接跳转到对方的 SecondMe 主页。
- 📊 **专属档案雷达图**
  - 会为你生成一个特别有极客范儿的六维雷达图，并且 AI 还会像个“客座医生/工程师”一样，给你写下一段深度的批注。

## 🛠️ 用了哪些技术？

- **基础框架**: Next.js (App Router), React
- **好看的皮囊**: Tailwind CSS （纯手写的各种发光和动画效果，没有借用沉重的 3D 库）
- **数据管家**: Zustand（负责在各个页面间记住你的选择）
- **数据库**: Supabase (搭配了超级好用的 Prisma ORM)
- **AI 接口**: 主要是 `Minimax` 负责快速的对话生成，也会辅以其他 API 处理长文本分析。

## 🚀 怎么把项目跑起来？

### 1. 准备环境

确保你的电脑里装了 Node.js（推荐版本 `>= 20.9.0`），如果没装的话去官网下载一下就好。

### 2. 下载与安装依赖

把代码克隆下来，然后在项目文件夹里打开终端，执行：

```bash
npm install
```

### 3. 配置密钥 (非常重要)

在项目的最外层文件夹里新建一个叫 `.env.local` 的文件，把下面这些必须的密码和钥匙填进去：

```env
# 你的 Supabase 数据库地址
DATABASE_URL="postgres://..."
DIRECT_URL="postgres://..."

# 你的 SecondMe 登录相关配置（去 SecondMe 后台申请）
SECOND_ME_CLIENT_ID="your_client_id"
SECOND_ME_CLIENT_SECRET="your_client_secret"
SECOND_ME_REDIRECT_URI="http://localhost:3000/api/auth/callback"

# 让 AI 回话的 Minimax API Key
MINIMAX_API_KEY="your_minimax_api_key"
MINIMAX_MODEL="MiniMax-M2.5-highspeed"
```

### 4. 同步数据库

如果你改了数据库结构，或者第一次跑项目，一定要执行这两句命令告诉数据库该建什么表：

```bash
npx prisma generate
npx prisma db push
```

### 5. 启动！

最后，跑这个命令开启本地服务器：

```bash
npm run dev
```

然后打开浏览器访问 `http://localhost:3000` 就可以看了！

## 🗂️ 这个项目里的文件都是干嘛的？

- `src/app/page.tsx`：游戏大厅（也就是你一打开看到的炫酷首页）
- `src/app/scenario/`：科幻剧情答题页
- `src/app/observatory/`：看雷达扫描、寻找匹配对象的过场页面
- `src/app/blueprint/` & `blueprint-solo/`：你的个人雷达面板和 AI 对话页面
- `src/app/api/`：所有和后端交互的接口都在这里（比如登录鉴权，呼叫 AI）
- `src/components/`：封装好的各种按钮、卡片和动画组件

---

如果有任何问题或者想添加新乐子，随时修改和拓展代码！玩得开心！ 🌌
