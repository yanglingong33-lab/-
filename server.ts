import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route to proxy AI request
  app.post("/api/chat", async (req, res) => {
    try {
      const { messages } = req.body;

      const response = await fetch("https://api.apimart.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer sk-vkQ5Q2K7Ap8BkQujcjVeFE9xMRrQbJaIR0vo8pP7Jj5aqpR4`,
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          stream: false,
          messages: [
            {
              role: "system",
              content:
                `你是“领养助手小喵”🐾，一只温暖、治愈、专业、公益的宠物领养智能顾问。
你的核心任务是引导用户完成宠物领养的咨询流程。请务必遵守以下回复逻辑和结构：

【核心规则】
1. 语言风格：像真诚的朋友在微信聊天。语气亲切温暖，多用可爱的emoji（如🐾, 💜, 😊, ✨）。段落简短连贯。
2. 结构清晰：每次回复包含1-2个自然段，适当换行，保持视觉清爽。总字数不要超过80字。
3. 步骤递进：请按照以下【咨询阶段】严格地一步步引导用户，不要跳步，不要一次性问所有问题：

【咨询阶段逻辑】
阶段一：确认物种（用户刚开始咨询）
-> 热情打招呼，并询问用户想领养猫咪还是狗狗呢？

阶段二：询问性格（用户回答了想领养猫或狗之后）
-> 热情肯定用户的选择，然后紧接着问他们期待什么性格的宠物？（提示几个选项：比如黏人、安静、活泼、独立等）

阶段三：精准推荐（等到用户说出性格偏好后！！！）
-> 肯定他们的偏好，顺势向他们推荐一只完全匹配的宠物，让用户看看。
-> 重点：如果推荐猫咪，必须在这条消息的末尾强制加上标记：[SHOW_CAT_CARD]
-> 重点：如果推荐狗狗，必须在这条消息的末尾强制加上标记：[SHOW_DOG_CARD]

阶段四：条件评估（展示过卡片后，用户表示好可爱/想了解等兴趣时）
-> 说明为了毛孩子好，需要了解下基础情况，抛出1-2个问题（如：与家人同住吗？家里有人过敏吗？是否接受疫苗绝育？）。

阶段五：邀约见面（用户回答领养条件且均良好时）
-> 肯定用户的条件（如“完美！它会很幸福的”），主动帮他们预约线下见面时间，促进行动。`,
            },
            ...messages,
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("API Error Response:", errorText);
        throw new Error(`API returned ${response.status}: ${errorText}`);
      }

      const responseText = await response.text();
      let replyContent = "";

      try {
        const data = JSON.parse(responseText);
        replyContent = data.choices[0].message.content;
      } catch (parseError: any) {
        // If it fails to parse as regular JSON, check if it's SSE (Server-Sent Events)
        if (responseText.includes("data: ")) {
          const lines = responseText.split("\n").filter(line => line.trim().startsWith("data: "));
          for (const line of lines) {
            const jsonStr = line.replace(/^data:\s*/, "").trim();
            if (jsonStr === "[DONE]") continue;
            try {
              const chunk = JSON.parse(jsonStr);
              const content = chunk.choices[0]?.delta?.content || "";
              replyContent += content;
            } catch (err) {
              console.error("Chunk parse error:", err, "for line:", line);
            }
          }
        } else {
          throw new Error(`Failed to parse response: ${parseError.message}. Response was: ${responseText}`);
        }
      }

      res.json({ reply: replyContent });
    } catch (error: any) {
      console.error("Chat API Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
