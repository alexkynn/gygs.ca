require('dotenv').config();
const { Pinecone } = require('@pinecone-database/pinecone');
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require("@google/generative-ai");

const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');
const cityTimezones = require('city-timezones');
const { Solar, Lunar } = require('lunar-javascript');
const { astro } = require('iztro');

const locationsData = require('./locations.js');
const { generateUniqueTeaser } = require('./teaserLibrary.js');
const boneWeightPoems = require('./boneWeightPoems.js');
const { getPromptPart1, getPromptPart2, getPromptPart3, getPromptPart4, getPromptPart5, getPromptPart6, getPromptPart7 } = require('./promptTemplates.js');
const { calculateYongShen } = require('./baziCalculator.js');

const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const index = pc.Index("gygs-knowledge");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const shiTimeMap = {
    "子時": { hour: 0, minute: 0, index: 0 },
    "丑時": { hour: 2, minute: 0, index: 1 },
    "寅時": { hour: 4, minute: 0, index: 2 },
    "卯時": { hour: 6, minute: 0, index: 3 },
    "辰時": { hour: 8, minute: 0, index: 4 },
    "巳時": { hour: 10, minute: 0, index: 5 },
    "午時": { hour: 12, minute: 0, index: 6 },
    "未時": { hour: 14, minute: 0, index: 7 },
    "申時": { hour: 16, minute: 0, index: 8 },
    "酉時": { hour: 18, minute: 0, index: 9 },
    "戌時": { hour: 20, minute: 0, index: 10 },
    "亥時": { hour: 22, minute: 0, index: 11 }
};

function getCityCoordinates(cityName) {
    if (typeof locationsData !== 'undefined') {
        for (const country in locationsData) {
            const cityObj = locationsData[country].find(c => c.name === cityName || cityName.includes(c.name));
            if (cityObj && cityObj.offset !== undefined) {
                return { offsetMinutes: cityObj.offset, timezone: null };
            }
        }
    }

    const cityLookup = cityTimezones.lookupViaCity(cityName);
    if (cityLookup && cityLookup.length > 0) {
        const cityInfo = cityLookup[0];
        const tz = cityInfo.timezone;
        const now = moment().tz(tz);
        const standardMeridian = (now.utcOffset() / 60) * 15;
        const lngDiff = cityInfo.lng - standardMeridian;
        const offsetMinutes = Math.round(lngDiff * 4);
        return { offsetMinutes, timezone: tz };
    }

    return { offsetMinutes: 0, timezone: 'UTC' };
}

function calculateTrueSolarTime(year, month, day, shiName, cityName, exactTime) {
    const shiConfig = shiTimeMap[shiName] || { hour: 12, minute: 0, index: 6 };
    const { offsetMinutes } = getCityCoordinates(cityName);

    let baseHour = shiConfig.hour;
    let baseMinute = shiConfig.minute;

    if (exactTime && exactTime !== "未提供" && exactTime.includes(":")) {
        const parts = exactTime.split(":");
        baseHour = parseInt(parts[0], 10);
        baseMinute = parseInt(parts[1], 10);
    }

    let calYear = parseInt(year, 10);
    let calMonth = parseInt(month, 10);
    let calDay = parseInt(day, 10);

    let totalMinutes = baseHour * 60 + baseMinute + offsetMinutes;
    
    if (totalMinutes < 0) {
        totalMinutes += 1440;
        const prevDay = moment(`${calYear}-${calMonth}-${calDay}`, 'YYYY-MM-DD').subtract(1, 'days');
        calYear = prevDay.year();
        calMonth = prevDay.month() + 1;
        calDay = prevDay.date();
    } else if (totalMinutes >= 1440) {
        totalMinutes -= 1440;
        const nextDay = moment(`${calYear}-${calMonth}-${calDay}`, 'YYYY-MM-DD').add(1, 'days');
        calYear = nextDay.year();
        calMonth = nextDay.month() + 1;
        calDay = nextDay.date();
    }

    const solarHour = Math.floor(totalMinutes / 60);
    const solarMinute = totalMinutes % 60;

    let solarShiIndex = Math.floor((solarHour + 1) / 2) % 12;

    return {
        year: calYear,
        month: calMonth,
        day: calDay,
        hour: solarHour,
        minute: solarMinute,
        solarShiIndex,
        offsetMinutes,
        providedExactTime: (exactTime && exactTime !== "未提供") ? exactTime : null
    };
}

const shiNames = ["子時", "丑時", "寅時", "卯時", "辰時", "巳時", "午時", "未時", "申時", "酉時", "戌時", "亥時"];

function getDayMasterElement(dayGan) {
    const elements = { "甲":"木", "乙":"木", "丙":"火", "丁":"火", "戊":"土", "己":"土", "庚":"金", "辛":"金", "壬":"水", "癸":"水" };
    return elements[dayGan] || "未知";
}

function calculateBoneWeight(yearIndex, month, day, shiIndex) {
    const yearW = [12,9,6,7,12,5,9,8,7,8,15,9,16,8,8,19,12,6,8,7,5,15,6,16,15,7,9,12,10,7,15,6,5,14,14,9,7,7,9,12,8,7,13,5,14,5,9,17,15,7,12,8,8,6,19,6,8,16,14,7];
    const monthW = [0, 6,7,18,9,5,16,9,15,18,8,9,5];
    const dayW = [0, 5,10,8,15,16,15,8,16,8,16,9,17,8,17,10,8,9,18,5,15,10,9,8,9,15,18,7,8,16,6];
    const shiW = [16, 6, 7, 10, 9, 16, 10, 8, 8, 9, 6, 6];
    
    let total = yearW[yearIndex] + monthW[month] + dayW[day] + (shiW[shiIndex] || 0);
    return Math.floor(total / 10) + "兩" + (total % 10) + "錢";
}

function getBoneWeightPoem(weightStr, gender) {
    if (boneWeightPoems[gender] && boneWeightPoems[gender][weightStr]) {
        return boneWeightPoems[gender][weightStr];
    }
    return `骨重${weightStr}，此命局自有天地之機，詳見下方核心解析。`; 
}

function generateDeterministicFactData(userData, currentDateStr) {
    try {
        if (!userData.year || !userData.month || !userData.day) {
            return "【提示：無法獲取完整出生日期】";
        }

        const tst = calculateTrueSolarTime(userData.year, userData.month, userData.day, userData.shi, userData.city, userData.exactTime);

        const solarDate = Solar.fromYmdHms(tst.year, tst.month, tst.day, tst.hour, tst.minute, 0);
        const lunarDate = solarDate.getLunar();
        const lunarDateStr = `${lunarDate.getYearInGanZhi()}年 ${lunarDate.getMonthInChinese()}月 ${lunarDate.getDayInChinese()}日`;
        
        const bazi = lunarDate.getEightChar();
        const baziString = `年柱：${bazi.getYear()}，月柱：${bazi.getMonth()}，日柱：${bazi.getDay()}，時柱：${bazi.getTime()}`;
        
        const calculatedBazi = calculateYongShen(
            bazi.getYear().charAt(0), bazi.getYear().charAt(1),
            bazi.getMonth().charAt(0), bazi.getMonth().charAt(1),
            bazi.getDay().charAt(0), bazi.getDay().charAt(1),
            bazi.getTime().charAt(0), bazi.getTime().charAt(1)
        );

        const currentYear = new Date().getFullYear();
        let future10Years = "";
        for (let i = 0; i < 10; i++) {
            let targetYear = currentYear + i;
            let tempLunar = Lunar.fromYmd(targetYear, 1, 1);
            future10Years += `- ${targetYear}年: ${tempLunar.getYearInGanZhi()}年\n`;
        }

        const zodiacSign = solarDate.getXingZuo() + "座";

        const yearIndex = (lunarDate.getYear() - 1984) % 60;
        const normalizedYearIndex = yearIndex < 0 ? yearIndex + 60 : yearIndex;
        const weightStr = calculateBoneWeight(normalizedYearIndex, Math.abs(lunarDate.getMonth()), lunarDate.getDay(), tst.solarShiIndex);
        const genderStr = userData.gender === '男' ? '男命' : '女命';
        const weightPoem = getBoneWeightPoem(weightStr, genderStr);

        const dateStrForIztro = `${tst.year}-${tst.month}-${tst.day}`;
        const genderForIztro = userData.gender === '男' ? 'male' : 'female';
        const astrolabe = astro.bySolar(dateStrForIztro, tst.solarShiIndex, genderForIztro, true, 'zh-CN');

        let palacesString = "";
        if (astrolabe && astrolabe.palaces) {
            astrolabe.palaces.forEach(p => {
                let stars = [];
                if (p.majorStars) stars.push(...p.majorStars.map(s => s.name + (s.mutagen ? `(化${s.mutagen})` : '')));
                if (p.minorStars) stars.push(...p.minorStars.map(s => s.name));
                if (p.adjectiveStars) stars.push(...p.adjectiveStars.map(s => s.name));
                palacesString += `- 【${p.name}】: ${stars.join('、 ') || '空宮'}\n`;
            });
        }

        const inputTimeDisplay = userData.exactTime !== '未提供' ? userData.exactTime : userData.shi;

        return `
[系統時空校正基準]
- 出生地：${userData.country || '未知'} - ${userData.city || '未知'}
- 輸入鐘錶時間：${userData.year}年${userData.month}月${userData.day}日 ${inputTimeDisplay}
- 真太陽時校正結果：${tst.year}年${tst.month}月${tst.day}日 ${String(tst.hour).padStart(2, '0')}:${String(tst.minute).padStart(2, '0')} (${shiNames[tst.solarShiIndex]}，經度誤差偏移 ${tst.offsetMinutes >= 0 ? '+' : ''}${tst.offsetMinutes} 分鐘)
- 農曆對應：${lunarDateStr}
- 性別：${genderStr}
- 當前時空基準：${currentDateStr}

[家庭現狀]
- 婚姻狀態：${userData.marriage}
- 子女狀況：${userData.children}

[系統底層四柱八字 (不可篡改數據)]
- 西洋星座：${zodiacSign}
- 八字干支：${baziString}
- 系統判定日元強度：${calculatedBazi.strength} (生扶指數: ${calculatedBazi.supportScore}, 克洩指數: ${calculatedBazi.drainScore})
- 絕對最喜用神：${calculatedBazi.yongShen}
- 絕對最忌五行：${calculatedBazi.jiShen}
- 袁天罡稱骨：${weightStr} (${genderStr})
- 專屬讖語：「${weightPoem}」

[未來 10 年客觀流年干支 (預測依據)]
${future10Years}

[系統底層紫微斗數 (不可篡改數據)]
- 五行局：${astrolabe.fiveElementsClass || '未知'}
- 命主：${astrolabe.soul || '未知'}
- 身主：${astrolabe.body || '未知'}
- 命宮位置：地支${astrolabe.earthlyBranchOfSoulPalace || '未知'}宮
- 身宮位置：地支${astrolabe.earthlyBranchOfBodyPalace || '未知'}宮
- 十二宮位星曜配置：
${palacesString}
`;
    } catch (e) {
        console.error("排盤運算失敗:", e);
        return "【系統提示：本地排盤計算發生異常】";
    }
}

function extractUserData(question) {
    const cityMatch = question.match(/出生地:([^-]+)-([^,]+)/);
    const shiMatch = question.match(/時辰[:：]?(.)時/);
    const exactTimeMatch = question.match(/精確時間[:：]?([^,\n]+)/); 
    const dateMatch = question.match(/日期[:：]?(\d{4})-(\d{2})-(\d{2})/);
    const genderMatch = question.match(/性別[:：]?(男|女)/);
    const marriageMatch = question.match(/婚姻[:：]?([^,\n]+)/);
    const childrenMatch = question.match(/子女[:：]?([^,\n]+)/);
    const mbtiMatch = question.match(/MBTI[:：]?([^,\n]+)/);
    
    const questionTextMatch = question.match(/提問:(.*)/) || question.match(/【來訪者提問】：(.*)/);
    const actualQuestion = questionTextMatch ? questionTextMatch[1].trim() : question;

    return {
        country: cityMatch ? cityMatch[1].trim() : null,
        city: cityMatch ? cityMatch[2].trim() : null,
        shi: shiMatch ? shiMatch[1] + "時" : "子時",
        exactTime: exactTimeMatch ? exactTimeMatch[1].trim() : "未提供",
        year: dateMatch ? dateMatch[1] : null,
        month: dateMatch ? parseInt(dateMatch[2], 10) : null,
        day: dateMatch ? parseInt(dateMatch[3], 10) : null,
        gender: genderMatch ? genderMatch[1] : "女命",
        marriage: marriageMatch ? marriageMatch[1].trim() : "未提供",
        children: childrenMatch ? childrenMatch[1].trim() : "未提供",
        mbti: mbtiMatch ? mbtiMatch[1].trim() : "未提供",
        actualQuestion: actualQuestion
    };
}

function getRagFocus(questionStr) {
    if (questionStr.includes("事業") || questionStr.includes("創業") || questionStr.includes("跳槽")) {
        return "【專屬分析重點】：評估事業格局與成就上限。精準點出事業轉折時機，並給出職場防小人與最契合的天賦行業方向。";
    } else if (questionStr.includes("財") || questionStr.includes("投資") || questionStr.includes("資金")) {
        return "【專屬分析重點】：結合財星格局，定調其為正財或偏財。指出資產暴漲或破財危機的高危月份，給出投資佈局建議。";
    } else if (questionStr.includes("姻緣") || questionStr.includes("桃花") || questionStr.includes("感情")) {
        return "【專屬分析重點】：分析夫妻宮。描繪未來伴侶特質與紅鸞星動年份。評估感情障礙，並提供趨吉避凶的情感防線。";
    } else if (questionStr.includes("健康") || questionStr.includes("身體") || questionStr.includes("疾病")) {
        return "【專屬分析重點】：結合五行偏枯點出先天體質弱點。梳理意外血光高危月份，給出改善健康與精神內耗的指南。";
    } else {
        return "【專屬分析重點】：梳理十年起伏軌跡，畫出黃金爆發期與低谷期。面對人生重大抉擇，給出利弊對比與風險提示。";
    }
}

async function generateEmbeddings(text) {
    try {
        const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });
        const result = await embeddingModel.embedContent(text);
        return result.embedding.values;
    } catch (error) {
        return null;
    }
}

// 🟢 支援本機與 Google Sheets 雙軌即時同步
function logTransactionForAnalytics(userData, actualQuestion, finalAiText, userEmail) {
    const payload = {
        timestamp: new Date().toISOString(),
        email: userEmail || "anonymous",
        country: userData.country || "",
        city: userData.city || "",
        birthYear: userData.year || "",
        gender: userData.gender || "",
        maritalStatus: userData.marriage || "",
        children: userData.children || "",
        mbti: userData.mbti || "",
        exactTime: userData.exactTime || "",
        question: actualQuestion || "",
        report_length: finalAiText ? finalAiText.length : 0
    };

    // 1. 本地備份日誌
    fs.appendFile(path.join(__dirname, 'analytics_log.jsonl'), JSON.stringify(payload) + '\n', (err) => {
        if (err) console.error("⚠️ Failed to write to analytics log:", err);
    });

    // 2. 自動傳送至 Google Sheets Webhook (零 Token 消耗)
    const webhookUrl = process.env.GOOGLE_SHEET_WEBHOOK_URL;
    if (webhookUrl && webhookUrl.startsWith('https://script.google.com')) {
        fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        }).then(res => res.json())
          .then(data => console.log("📊 [Analytics] 數據已成功同步至 Google Sheets:", data.result))
          .catch(err => console.error("⚠️ [Analytics] Google Sheets Webhook 同步失敗:", err));
    }
}

// =========================================================================
// 4. 核心路由生成區 (🟢 7 階段終極防截斷架構)
// =========================================================================

async function generateMasterResponse(question, mode = 'teaser', userEmail = '') {
    try {
        const today = new Date();
        const currentDateStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;
        const userData = extractUserData(question);
        const age = userData.year ? today.getFullYear() - parseInt(userData.year, 10) : '未知';
        
        let extractedEmail = userEmail || (question.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/) || [])[1];

        if (mode === 'teaser') {
            let teaserResponse = generateUniqueTeaser(userData.year, userData.month, userData.day, userData.shi, userData.gender, userData.country, userData.actualQuestion);
            let timeWarning = `\n\n<br><strong>【系統專業提示：真太陽時精密校正】</strong><br>`;
            if (userData.city && userData.shi) {
                const tst = calculateTrueSolarTime(userData.year, userData.month, userData.day, userData.shi, userData.city, userData.exactTime);
                const inputTimeDisplay = userData.exactTime !== '未提供' ? userData.exactTime : userData.shi;
                timeWarning += `系統已根據出生地「${userData.city}」之物理經緯度完成真太陽時校正（時差偏差 ${tst.offsetMinutes >= 0 ? '+' : ''}${tst.offsetMinutes} 分鐘）。您輸入的時間「${inputTimeDisplay}」，實際定盤基準將為「${shiNames[tst.solarShiIndex]}」。解鎖後將以此天文標準生成專屬報告。`;
            } else {
                timeWarning += `本系統將依據您的出生國家與城市啟動「真太陽時」精確校正。`;
            }
            return teaserResponse + timeWarning;
        }

        console.log("⚡ [1/9] 執行本地物理經緯度真太陽時轉換與確定性排盤...");
        const exactFactData = generateDeterministicFactData(userData, currentDateStr);

        console.log("🔍 [2/9] 檢索 Pinecone 向量庫古籍知識...");
        let contexts = "";
        const enhanceQuery = `紫微斗數 31 特殊格局 ${userData.actualQuestion} 八字格局 調候用神 命宮 財官 吉凶`;
        const queryEmbedding = await generateEmbeddings(enhanceQuery);
        if (queryEmbedding) {
            const searchResults = await index.query({ vector: queryEmbedding, topK: 15, includeMetadata: true });
            contexts = searchResults.matches.map((match, i) => `[文獻 ${i+1}]: ${match.metadata.interpretation || match.metadata.text || '無'}`).join('\n\n');
        }

        const ragFocusText = getRagFocus(userData.actualQuestion);

        const systemInstruction = `你是一位精通東方哲學與現代商業戰略的首席決策顧問兼心理學家。
【任務核心】
基於 <FactData> 中由系統底層天文排盤引擎計算出的「不可篡改數據」，進行高維度戰略解讀。
【絕對執行準則 (不可省略任何細節)】
1. 嚴格遵守 <FactData> 的星曜與八字，嚴禁篡改或憑空發明。
2. 凡是 Prompt 中標示（【必須...】）的要求，包含生肖星座、時間錨點、正變格判定、週期定調等，皆為硬性指標，絕對不可為了節省篇幅而略過。
3. 你的解讀必須極度深湛、詳盡，每一段落都必須提供具體的現代職場或商業套利指導。
4. 嚴格遵循指定的層級編號格式 (1., 1.1, 1.1.1)，不可發明新的排版。`;

        const model = genAI.getGenerativeModel({ 
            model: 'gemini-3.5-flash',
            systemInstruction: systemInstruction,
            safetySettings: [
                { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE }
            ],
            generationConfig: { 
                temperature: 0.3, 
                topP: 0.8,
                maxOutputTokens: 8192 
            }
        });

        console.log("📝 [3/9] 生成階段一：系統定盤與財庫分析 (Sections 1-2)...");
        const promptPart1 = getPromptPart1(age, userData, exactFactData, ragFocusText, currentDateStr);
        const resultPart1 = await model.generateContent(promptPart1);
        let aiTextPart1 = resultPart1.response.text().trim();

        console.log("📝 [4/9] 生成階段二：時空軌跡與神煞套利 (Section 3)...");
        const promptPart2 = getPromptPart2(aiTextPart1, exactFactData, userData, contexts, currentDateStr);
        const resultPart2 = await model.generateContent(promptPart2);
        let aiTextPart2 = resultPart2.response.text().trim();

        console.log("📝 [5/9] 生成階段三：十二宮位前六宮 (Section 4A)...");
        const promptPart3 = getPromptPart3(aiTextPart1, aiTextPart2, exactFactData, userData, contexts, currentDateStr);
        const resultPart3 = await model.generateContent(promptPart3);
        let aiTextPart3 = resultPart3.response.text().trim();

        console.log("📝 [6/9] 生成階段四：十二宮位後六宮 (Section 4B)...");
        const promptPart4 = getPromptPart4(aiTextPart1, aiTextPart2, aiTextPart3, exactFactData, userData, contexts, currentDateStr);
        const resultPart4 = await model.generateContent(promptPart4);
        let aiTextPart4 = resultPart4.response.text().trim();

        // 🟢 完美縫合紫微斗數 12 宮
        const aiTextSection4 = `${aiTextPart3}\n\n${aiTextPart4}`;

        console.log("📈 [7/9] 生成階段五：未來 10 年運勢推演 (Section 5)...");
        const promptPart5 = getPromptPart5(aiTextPart1, aiTextPart2, aiTextSection4, userData, contexts, currentDateStr);
        const resultPart5 = await model.generateContent(promptPart5);
        let aiTextPart5 = resultPart5.response.text().trim();

        console.log("📈 [8/9] 生成階段六：戰略行動指南 (Section 6)...");
        const promptPart6 = getPromptPart6(aiTextPart1, aiTextSection4, aiTextPart5, userData, contexts, currentDateStr);
        const resultPart6 = await model.generateContent(promptPart6);
        let aiTextPart6 = resultPart6.response.text().trim();

        console.log("🧠 [9/9] 生成階段七：Saju-MBTI 心理分析 (Section 7)...");
        const promptPart7 = getPromptPart7(aiTextPart1, aiTextSection4, aiTextPart6, userData, currentDateStr);
        const resultPart7 = await model.generateContent(promptPart7);
        let aiTextPart7 = resultPart7.response.text().trim();

        // 🟢 最終組裝 7 階段內容
        let finalAiText = `${aiTextPart1}\n\n${aiTextPart2}\n\n${aiTextSection4}\n\n${aiTextPart5}\n\n${aiTextPart6}\n\n${aiTextPart7}`;
        finalAiText = finalAiText.replace(/^```markdown\n/gm, '').replace(/^```\n/gm, '').replace(/```$/gm, ''); 
        const startIndex = finalAiText.indexOf('## 1');
        if (startIndex > 0) finalAiText = finalAiText.substring(startIndex);
        
        logTransactionForAnalytics(userData, userData.actualQuestion, finalAiText, extractedEmail);
        return finalAiText;

    } catch (error) {
        console.error("RAG 流程發生錯誤:", error);
        throw error;
    }
}

module.exports = { generateMasterResponse };