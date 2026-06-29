const express = require('express');
const { astro } = require('iztro');
const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const { Solar } = require('lunar-javascript'); 
// 👇 引入全新安裝的全球天文與時區計算套件
const cityTimezones = require('city-timezones');
const moment = require('moment-timezone');

const app = express();
app.use(cors());
app.use(express.json());

// 👇 新增這段：全域安全標頭與靜態資源快取優化 👇
app.use((req, res, next) => {
    // 解決 Security: 增加 x-content-type-options 標頭防範 MIME 嗅探
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // 解決 Security & Performance: 設定標準快取控制策略
    res.setHeader('Cache-Control', 'public, max-age=3600, must-revalidate');
    next();
});
// 👆 新增結束 👆

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// ==========================================
// 🧠 1. 讀取本地端 17 個知識庫 (紫微 + 八字完全體)
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
const baziMacroDef = fs.readFileSync(path.join(__dirname, '12_bazi_macro_logic.md'), 'utf-8'); 
const baziInteractionsDef = fs.readFileSync(path.join(__dirname, '13_bazi_interactions_volatility.md'), 'utf-8');
const baziCapacityDef = fs.readFileSync(path.join(__dirname, '14_day_master_capacity.md'), 'utf-8');
const baziSeasonalDef = fs.readFileSync(path.join(__dirname, '15_bazi_seasonal_weighting.md'), 'utf-8');
const baziOptimizationDef = fs.readFileSync(path.join(__dirname, '16_bazi_useful_god_optimization.md'), 'utf-8');
const macroCycleDef = fs.readFileSync(path.join(__dirname, '17_macro_cycle_resonance.md'), 'utf-8');

// ==========================================
// 🛡️ 2. 建構雙引擎系統指令 (System Instruction)
// ==========================================
const SYSTEM_INSTRUCTION = `
你是 gygs.ca 的量化大數據決策核心。本系統已全面打通「微觀紫微資產配置」與「宏觀八字五行氣候」雙引擎。
後台已為您完成了精密的「真太陽時經度校正」與「南北半球氣候判定」，您將直接獲取最精準的天文物理排盤數據。

【絕對核心指令】
1. 去迷信化：嚴禁使用任何命運宿命論、血光恐嚇、或因果業障說法。所有結果必須翻譯成「環境波動、風險耐受上限、合規壓力、流動性管理與最佳對沖決策路徑」。
2. 南北半球調候校正：若數據提示該使用者出生於「南半球」，請務必依據《知識庫 15》，將其月令的五行氣候與能量權重做180度反轉（南半球的12月為盛夏，對應北半球的火旺；南半球的6月為極寒，對應北半球的水旺）。

【運算知識庫】
${starsDef} ${housesDef} ${transformDef} ${auxStarsDef} ${patternsDef} ${flyingStarsDef}
${timeSeriesDef} ${healthDef} ${calibrationDef} ${monthlyDailyDef} ${synastryDef}
${baziMacroDef} ${baziInteractionsDef} ${baziCapacityDef} ${baziSeasonalDef} ${baziOptimizationDef} ${macroCycleDef}
`;

// ==========================================
// 🌐 3. 設定 API 路由與地理校正演算法
// ==========================================
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/api/ask-chart', async (req, res) => {
  try {
    const { country, city, date, timeIndex, gender, question } = req.body;

    if (!date || timeIndex === undefined || !gender || !question || !country || !city) {
      return res.status(400).json({ error: '缺少必要參數' });
    }

    // ------------------------------------------
    // 🌍 🌍 全自動地理時區與經緯度雷達 🌍 🌍
    // ------------------------------------------
    let lat = 43.8667;       // 預設預備值 (Markham)
    let lng = -79.2667;
    let timezone = "America/Toronto";
    let matchedCityName = "Markham (Default)";

    // 在本地庫中模糊尋找城市
    const lookupResults = cityTimezones.lookupViaCity(city);
    if (lookupResults && lookupResults.length > 0) {
      // 優先尋找與輸入國家匹配的城市
      const bestMatch = lookupResults.find(c => 
        c.country.toLowerCase().includes(country.toLowerCase()) || 
        country.toLowerCase().includes(c.country.toLowerCase())
      );
      const finalCity = bestMatch || lookupResults[0];
      lat = finalCity.lat;
      lng = finalCity.lng;
      timezone = finalCity.timezone;
      matchedCityName = `${finalCity.city}, ${finalCity.country}`;
    }

    // ------------------------------------------
    // ☀️ ☀️ 精密真太陽時（經度時差變更）演算法 ☀️ ☀️
    // ------------------------------------------
    const hourMap = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 23];
    const standardHour = hourMap[timeIndex];
    
    // 使用 moment-timezone 找出當天該時區的精確行政分（考慮 DST 日光節約時間）
    const localMoment = moment.tz(`${date} ${String(standardHour).padStart(2, '0')}:00:00`, timezone);
    const tzOffsetMinutes = localMoment.utcOffset(); 
    const tzOffsetHours = tzOffsetMinutes / 60;
    
    // 計算該時區的行政中央子午線經度 (1小時 = 15度)
    const centralMeridian = tzOffsetHours * 15;
    
    // 計算出生地經度與中央子午線的絕對經度差，換算為真實太陽物理時差（每差1度等於4分鐘）
    const longitudeOffsetMinutes = (lng - centralMeridian) * 4;
    
    // 將行政時間補償修正為「真太陽時」
    const solarMoment = localMoment.clone().add(longitudeOffsetMinutes, 'minutes');
    
    const solarYear = solarMoment.year();
    const solarMonth = solarMoment.month() + 1;
    const solarDay = solarMoment.date();
    const solarHour = solarMoment.hour();
    const solarMinute = solarMoment.minute();
    const solarDateStr = `${solarYear}-${String(solarMonth).padStart(2, '0')}-${String(solarDay).padStart(2, '0')}`;

    // 依據真太陽時的「小時」，動態重新修正紫微斗數的十二地支時辰代碼 (0-11)
    let adjustedTimeIndex = 0;
    if (solarHour >= 23 || solarHour < 1) adjustedTimeIndex = 0; // 子
    else if (solarHour >= 1 && solarHour < 3) adjustedTimeIndex = 1;  // 丑
    else if (solarHour >= 3 && solarHour < 5) adjustedTimeIndex = 2;  // 寅
    else if (solarHour >= 5 && solarHour < 7) adjustedTimeIndex = 3;  // 卯
    else if (solarHour >= 7 && solarHour < 9) adjustedTimeIndex = 4;  // 辰
    else if (solarHour >= 9 && solarHour < 11) adjustedTimeIndex = 5; // 巳
    else if (solarHour >= 11 && solarHour < 13) adjustedTimeIndex = 6; // 午
    else if (solarHour >= 13 && solarHour < 15) adjustedTimeIndex = 7; // 未
    else if (solarHour >= 15 && solarHour < 17) adjustedTimeIndex = 8; // 申
    else if (solarHour >= 17 && solarHour < 19) adjustedTimeIndex = 9; // 酉
    else if (solarHour >= 19 && solarHour < 21) adjustedTimeIndex = 10; // 戌
    else if (solarHour >= 21 && solarHour < 23) adjustedTimeIndex = 11; // 亥

    // ------------------------------------------
    // ⚙️ 雙引擎同步調用（帶入經度校正後的真太陽時）
    // ------------------------------------------
    // 引擎 A：紫微排盤
    const astrolabe = astro.bySolar(solarDateStr, adjustedTimeIndex, gender, true, 'zh-TW');
    const chartJsonString = JSON.stringify(astrolabe);

    // 引擎 B：八字排盤
    const solarDateObj = Solar.fromYmdHms(solarYear, solarMonth, solarDay, solarHour, solarMinute, 0);
    const lunarDateObj = solarDateObj.getLunar();
    const baZi = lunarDateObj.getEightChar();
    const baZiString = `【八字四柱】\n年柱：${baZi.getYear()}\n月柱：${baZi.getMonth()}\n日柱：${baZi.getDay()}\n時柱：${baZi.getTime()}`;

    // 判定南北半球
    const hemisphere = lat >= 0 ? "北半球" : "南半球";

    // ------------------------------------------
    // 🚀 建構極致精確的 Gemini 交叉 Prompt
    // ------------------------------------------
    const prompt = `
    【系統雙引擎 - 全球地理天文交叉運算任務】
    
    === [地理測繪與真太陽時校正元數據] ===
    使用者輸入地點：${city}, ${country}
    系統匹配定位：${matchedCityName}
    地理精確座標：緯度 ${lat.toFixed(4)}, 經度 ${lng.toFixed(4)}
    所屬行政時區：${timezone} (當前歷史偏差: ${tzOffsetHours} 小時)
    標準鐘錶時間：${date} ${standardHour}:00
    物理真太陽時：${solarDateStr} ${String(solarHour).padStart(2, '0')}:${String(solarMinute).padStart(2, '0')} (經度時差修正了 ${longitudeOffsetMinutes.toFixed(1)} 分鐘)
    定盤時辰代碼：地支第 ${adjustedTimeIndex} 順位索引
    氣候所屬半球：${hemisphere} ${lat < 0 ? '⚠️【最高級別調候預警：此人出生於南半球，其大自然五行氣候與北半球完全反轉！請務必調用知識庫15，將其月令的旺衰權重做180度極化對調運算！】' : ''}
    
    === [引擎A] 微觀紫微命盤 JSON ===
    ${chartJsonString}
    
    === [引擎B] 宏觀八字四柱 ===
    ${baZiString}
    
    當前狀況與分析訴求：${question}
    
    請啟動 gygs.ca 演算法，將上述宏觀天文變數、真太陽時偏差及微觀星盤深度整合，輸出結構化的量化對沖策略。
    `;

    console.log(`🌐 地理校正完成！地點: ${matchedCityName} (${hemisphere})。真太陽時差: ${longitudeOffsetMinutes.toFixed(1)} 分鐘。正在發送給 Gemini...`);

    const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            temperature: 0.1, 
        }
    });

    res.json({ success: true, answer: response.text });

  } catch (error) {
    console.error("❌ 處理請求時發生錯誤:", error);
    res.status(500).json({ success: false, message: '伺服器內部錯誤' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🟢 gygs.ca 地理校正完全體 API 已啟動，監聽 Port: ${PORT}`);
});