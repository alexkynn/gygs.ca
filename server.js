const express = require('express');
const { astro } = require('iztro');
const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// 讀取 Render 雲端設定的環境變數金鑰
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// ==========================================
// 🧠 1. 讀取本地端知識庫 (讀取 Markdown 檔案)
// ==========================================
const starsDef = fs.readFileSync(path.join(__dirname, '1_stars_definition.md'), 'utf-8');
const housesDef = fs.readFileSync(path.join(__dirname, '2_twelve_houses.md'), 'utf-8');
const transformDef = fs.readFileSync(path.join(__dirname, '3_four_transformations.md'), 'utf-8');
// 👇 新增讀取第四個知識庫：輔星與煞星
const auxStarsDef = fs.readFileSync(path.join(__dirname, '4_auxiliary_stars.md'), 'utf-8'); 

// ==========================================
// 🛡️ 2. 建構終極系統指令 (System Instruction)
// ==========================================
const SYSTEM_INSTRUCTION = `
你是 gygs.ca 的核心運算引擎，這是一個結合傳統命理演算法與現代數據智能的平台。
你的任務是讀取使用者的紫微斗數命盤 JSON 數據，並進行客觀、零幻覺、去迷信的流年與格局推演。

【絕對禁忌】
1. 嚴禁使用宿命論詞彙（如：命中注定、必定破財、剋夫剋妻、血光之災、前世業障）。
2. 嚴禁自行捏造任何未包含在以下知識庫中的星曜或宮位定義。
3. 所有的預測必須轉化為「行為傾向」、「心理狀態」或「客觀的環境變數」。

【運算知識庫】
請完全依照以下提供的四個核心數據庫進行邏輯推演：

=== 知識庫 1：十四主星現代定義 ===
${starsDef}

=== 知識庫 2：十二宮位現代場景 ===
${housesDef}

=== 知識庫 3：四化動態演算法 ===
${transformDef}

=== 知識庫 4：輔星與煞星動態參數 ===
${auxStarsDef}

【輸出格式要求】
請針對使用者的問題，給出結構化、專業且帶有數據分析風格的回覆。在提出論點時，請適時在括號內標註你的推演依據（例如：依據命宮七殺、流年財帛宮化忌、擎羊星的物理摩擦等），讓使用者明白這是嚴謹的交叉比對結果，而非隨機猜測。
`;

// ==========================================
// 🌐 3. 設定前端網頁與 API 路由
// ==========================================
// 讓伺服器提供首頁 (index.html)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// 接收前端發送的算命請求
app.post('/api/ask-chart', async (req, res) => {
  try {
    const { date, timeIndex, gender, question } = req.body;

    if (!date || timeIndex === undefined || !gender || !question) {
      return res.status(400).json({ error: '缺少必要參數 (date, timeIndex, gender, question)' });
    }

    // 使用 iztro 進行排盤
    const astrolabe = astro.bySolar(date, timeIndex, gender, true, 'zh-TW');
    const chartJsonString = JSON.stringify(astrolabe);

    // 建構發送給 Gemini 的 Prompt
    const prompt = `
    【運算任務啟動】
    這是一份使用者的紫微斗數命盤 JSON 數據：
    ${chartJsonString}
    
    使用者的具體問題或當前狀況是：${question}
    
    請啟動 gygs.ca 演算法，根據提供的知識庫進行交叉比對，給出精準的策略分析與行為建議。
    `;

    console.log("🚀 正在將命盤數據與知識庫發送給 Gemini 進行演算...");

    // 呼叫 Gemini 3.5 Flash 模型
    const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            temperature: 0.1, // 降低溫度，讓輸出的邏輯更嚴謹、不發散
        }
    });

    console.log("✅ 演算完成！");

    res.json({
      success: true,
      answer: response.text
    });

  } catch (error) {
    console.error("❌ 處理請求時發生錯誤:", error);
    res.status(500).json({ success: false, message: '伺服器內部錯誤' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(\`🟢 gygs.ca 紫微 AI 大腦 API 已啟動，監聽 Port: \${PORT}\`);
});