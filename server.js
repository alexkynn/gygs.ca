const express = require('express');
const { astro } = require('iztro');
const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
// 👇 引入剛安裝的八字套件
const { Solar } = require('lunar-javascript'); 

const app = express();
app.use(cors());
app.use(express.json());

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// ==========================================
// 🧠 1. 讀取本地端 12 個知識庫 (紫微 + 八字)
// ==========================================
const starsDef = fs.readFileSync(path.join(__dirname, '1_stars_definition.md'), 'utf-8');
const housesDef = fs.readFileSync(path.join(__dirname, '2_twelve_houses.md'), 'utf-8');
const transformDef = fs.readFileSync(path.join(__dirname, '3_four_transformations.md'), 'utf-8');
const auxStarsDef = fs.readFileSync(path.join(__dirname, '4_auxiliary_stars.md'), 'utf-8');
const patternsDef = fs.readFileSync(path.join(__dirname, '5_chart_patterns.md'), 'utf-8');
const flyingStarsDef = fs.readFileSync(path.join(__dirname, '6_flying_stars_causality.md'), 'utf-8');
const timeSeriesDef = fs.readFileSync(path.join(__dirname, '7_time_series_nested.md'), 'utf-8');
const healthDef = fs.readFileSync(path.join(__dirname, '8_secondary_stars_and_health.md'), 'utf-8');
const calibrationDef = fs.readFileSync(path.join(__dirname, '9_palace_calibration_rules.md'), 'utf-8');
const monthlyDailyDef = fs.readFileSync(path.join(__dirname, '10_monthly_daily_tracking.md'), 'utf-8');
const synastryDef = fs.readFileSync(path.join(__dirname, '11_synastry_matrix.md'), 'utf-8');
// 👇 八字宏觀數據庫
const baziMacroDef = fs.readFileSync(path.join(__dirname, '12_bazi_macro_logic.md'), 'utf-8'); 
const baziInteractionsDef = fs.readFileSync(path.join(__dirname, '13_bazi_interactions_volatility.md'), 'utf-8');
const baziCapacityDef = fs.readFileSync(path.join(__dirname, '14_day_master_capacity.md'), 'utf-8');

// ==========================================
// 🛡️ 2. 建構雙引擎系統指令 (System Instruction)
// ==========================================
const SYSTEM_INSTRUCTION = `
你是 gygs.ca 的核心運算引擎，這是一個結合紫微斗數(微觀)與八字(宏觀)的雙引擎大數據預測平台。
你的任務是讀取使用者的「紫微命盤 JSON」與「八字四柱結構」，進行客觀、零幻覺、去迷信的交叉推演。

【絕對禁忌】
1. 嚴禁使用宿命論詞彙（如：命中注定、必定破財、剋夫剋妻、血光之災、前世業障）。
2. 嚴禁自行捏造知識庫外的不存在星曜或神煞。
3. 所有的預測必須轉化為「行為傾向」、「心理狀態」或「客觀的環境變數」。

【運算知識庫】
請完全依照以下提供的核心數據庫進行邏輯推演：

=== 知識庫 1-3：主星、宮位、四化 ===
${starsDef}
${housesDef}
${transformDef}

=== 知識庫 4-6：輔煞星、格局、飛星因果 ===
${auxStarsDef}
${patternsDef}
${flyingStarsDef}

=== 知識庫 7-9：長短期趨勢、健康、宮位重疊 ===
${timeSeriesDef}
${healthDef}
${calibrationDef}

=== 知識庫 10-11：高頻追蹤、對手件合盤 ===
${monthlyDailyDef}
${synastryDef}

=== 知識庫 12：八字宏觀環境與十神邏輯 ===
${baziMacroDef}

=== 知識庫 13：天干地支刑沖合害矩陣 ===
${baziInteractionsDef}

=== 知識庫 14：日主強度與系統承載力 ===
${baziCapacityDef}

【輸出格式要求】
1. 請針對使用者的問題，給出結構化、專業且帶有數據分析風格的回覆。
2. 在提出論點時，必須展現「雙引擎」的威力，例如：「從八字宏觀來看，您今年走正財運（環境平穩），但微觀紫微流年顯示事業宮化忌（內部高壓），因此建議...」。讓使用者明白這是嚴謹的交叉比對結果。
`;

// ==========================================
// 🌐 3. 設定前端網頁與 API 路由
// ==========================================
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/api/ask-chart', async (req, res) => {
  try {
    const { date, timeIndex, gender, question } = req.body;

    if (!date || timeIndex === undefined || !gender || !question) {
      return res.status(400).json({ error: '缺少必要參數' });
    }

    // ------------------------------------------
    // ⚙️ 引擎 A：紫微斗數排盤 (Iztro)
    // ------------------------------------------
    const astrolabe = astro.bySolar(date, timeIndex, gender, true, 'zh-TW');
    const chartJsonString = JSON.stringify(astrolabe);

    // ------------------------------------------
    // ⚙️ 引擎 B：八字排盤 (lunar-javascript)
    // ------------------------------------------
    // 將前端傳來的 0-12 timeIndex 映射為大約的 24 小時制時間，以確保八字時柱正確
    const hourMap = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 23];
    const targetHour = hourMap[timeIndex];
    const [year, month, day] = date.split('-').map(Number);
    
    // 透過 lunar-javascript 取得八字
    const solarDate = Solar.fromYmdHms(year, month, day, targetHour, 0, 0);
    const lunarDate = solarDate.getLunar();
    const baZi = lunarDate.getEightChar();
    
    const baZiString = `【八字四柱】\n年柱：${baZi.getYear()}\n月柱：${baZi.getMonth()}\n日柱：${baZi.getDay()}\n時柱：${baZi.getTime()}`;

    // ------------------------------------------
    // 🚀 發送給 Gemini 的最終提示詞
    // ------------------------------------------
    const prompt = `
    【雙引擎運算任務啟動】
    
    === [引擎A] 微觀紫微命盤 JSON ===
    ${chartJsonString}
    
    === [引擎B] 宏觀八字四柱 ===
    ${baZiString}
    
    使用者的性別：${gender}
    使用者的具體問題或當前狀況是：${question}
    
    請啟動 gygs.ca 演算法，根據提供的知識庫進行紫微與八字的「宏觀/微觀交叉比對」，給出精準的策略分析與行為建議。
    `;

    console.log("🚀 正在將紫微與八字雙引擎數據發送給 Gemini 進行演算...");

    const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            temperature: 0.1, 
        }
    });

    console.log("✅ 雙引擎演算完成！");

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
  console.log(`🟢 gygs.ca 雙引擎大數據 API 已啟動，監聽 Port: ${PORT}`);
});