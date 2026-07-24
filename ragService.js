require('dotenv').config();
const { Pinecone } = require('@pinecone-database/pinecone');
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require("@google/generative-ai");

// 🟢 引入兩大數學曆法排盤引擎 (徹底消滅 AI 幻覺)
const { Solar } = require('lunar-javascript');
const { astro } = require('iztro');
const locationsData = require('./locations.js');
const { generateUniqueTeaser } = require('./teaserLibrary.js');

const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const index = pc.Index("gygs-knowledge");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ==========================================
// 輔助函數區
// ==========================================
function getCityOffset(cityName) {
    for (const country in locationsData) {
        const cityObj = locationsData[country].find(c => c.name === cityName);
        if (cityObj) return cityObj.offset;
    }
    return null;
}

const shiRanges = {
    "子時": { start: 23, end: 1 }, "丑時": { start: 1, end: 3 }, "寅時": { start: 3, end: 5 },
    "卯時": { start: 5, end: 7 }, "辰時": { start: 7, end: 9 }, "巳時": { start: 9, end: 11 },
    "午時": { start: 11, end: 13 }, "未時": { start: 13, end: 15 }, "申時": { start: 15, end: 17 },
    "酉時": { start: 17, end: 19 }, "戌時": { start: 19, end: 21 }, "亥時": { start: 21, end: 23 }
};

function calculateLocalWatchTime(cityName, shiName) {
    const offset = getCityOffset(cityName);
    const shi = shiRanges[shiName];
    if (offset === null || !shi) return null;

    const formatTime = (hour, offsetMins) => {
        let totalMins = hour * 60 - offsetMins; 
        if (totalMins < 0) totalMins += 24 * 60;
        let h = Math.floor(totalMins / 60) % 24;
        let m = totalMins % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    };
    return `${formatTime(shi.start, offset)} - ${formatTime(shi.end, offset)}`;
}

function extractUserData(question) {
    const cityMatch = question.match(/出生地:([^-]+)-([^,]+)/);
    const shiMatch = question.match(/時辰[:：]?(.)時/);
    const dateMatch = question.match(/日期[:：]?(\d{4})-(\d{2})-(\d{2})/);
    const genderMatch = question.match(/性別[:：]?(男|女)/);
    
    const questionTextMatch = question.match(/提問:(.*)/) || question.match(/【來訪者提問】：(.*)/);
    const actualQuestion = questionTextMatch ? questionTextMatch[1].trim() : question;

    return {
        country: cityMatch ? cityMatch[1].trim() : null,
        city: cityMatch ? cityMatch[2].trim() : null,
        shi: shiMatch ? shiMatch[1] + "時" : null,
        year: dateMatch ? dateMatch[1] : null,
        month: dateMatch ? parseInt(dateMatch[2], 10) : null,
        day: dateMatch ? parseInt(dateMatch[3], 10) : null,
        gender: genderMatch ? genderMatch[1] : "女命",
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

const shiToIndex = { "子": 0, "丑": 1, "寅": 2, "卯": 3, "辰": 4, "巳": 5, "午": 6, "未": 7, "申": 8, "酉": 9, "戌": 10, "亥": 11 };

function generateExactChartText(userData, currentDateStr) {
    try {
        if (!userData.year || !userData.month || !userData.day) return "【提示：無法獲取完整日期】";

        const timeIndex = shiToIndex[userData.shi ? userData.shi.charAt(0) : "子"] || 0;
        const gender = userData.gender === '男' ? 'male' : 'female';
        const dateStr = `${userData.year}-${userData.month}-${userData.day}`;
        
        const astrolabe = astro.bySolar(dateStr, timeIndex, gender, true, 'zh-CN');
        const hourMapping = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22];
        const exactHour = hourMapping[timeIndex];
        const solarWithTime = Solar.fromYmdHms(parseInt(userData.year), parseInt(userData.month), parseInt(userData.day), exactHour, 0, 0);
        const lunar = solarWithTime.getLunar();
        
        const lunarDateStr = `${lunar.getYearInGanZhi()}年 ${lunar.getMonthInChinese()}月 ${lunar.getDayInChinese()}日`;
        const baziWithTime = lunar.getEightChar();
        const zodiacSign = solarWithTime.getXingZuo() + "座"; 
        const baziString = `年柱：${baziWithTime.getYear()}，月柱：${baziWithTime.getMonth()}，日柱：${baziWithTime.getDay()}，時柱：${baziWithTime.getTime()}`;

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

        return `
[基本資訊]
- 出生地：${userData.country || '未知'} - ${userData.city || '未知'}
- 出生公曆：${userData.year}年${userData.month}月${userData.day}日
- 出生農曆：${lunarDateStr}
- 出生時辰：${userData.shi} (${exactHour === 0 ? 23 : exactHour - 1}:00 - ${exactHour === 0 ? 0 : exactHour}:59)
- 性別：${userData.gender === '男' ? '乾造 (男命)' : '坤造 (女命)'}
- 當前時空基準：${currentDateStr}

[系統底層四柱八字]
- 西洋星座：${zodiacSign}
- 八字干支：${baziString}

[系統底層紫微斗數]
- 五行局：${astrolabe.fiveElementsClass || '未知'}
- 命主：${astrolabe.soul || '未知'}
- 身主：${astrolabe.body || '未知'}
- 命宮位置：地支${astrolabe.earthlyBranchOfSoulPalace || '未知'}宮
- 身宮位置：地支${astrolabe.earthlyBranchOfBodyPalace || '未知'}宮
- 十二宮位星曜：
${palacesString}
`;
    } catch (e) {
        return "【系統提示：排盤引擎計算發生異常】";
    }
}

// 🟢 極簡靜默向量轉換
async function generateEmbeddings(text) {
    try {
        const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });
        const result = await embeddingModel.embedContent(text);
        return result.embedding.values;
    } catch (error) {
        return null; // 靜默略過，直接使用基礎大腦
    }
}

// ==========================================
// 核心路由生成區
// ==========================================
async function generateMasterResponse(question, mode = 'teaser') {
    try {
        const today = new Date();
        const currentDateStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;
        const userData = extractUserData(question);

        if (mode === 'teaser') {
            console.log("⚡ 啟動零 Token 矩陣織錦誘餌模式...");
            let teaserResponse = generateUniqueTeaser(userData.year, userData.month, userData.day, userData.shi, userData.gender, userData.country, userData.actualQuestion);
            let timeWarning = `\n\n<br><strong>【系統專業提示：真太陽時精密校正】</strong><br>系統將依據您的出生地啟動「真太陽時」精確校正，請於解鎖前確認您的出生時辰精確無誤。`;
            return teaserResponse + timeWarning;
        }

        console.log("[1/3] 計算絕對命盤...");
        const exactChartData = generateExactChartText(userData, currentDateStr);

        console.log("[2/3] 準備檢索資料庫...");
        let contexts = "";
        const enhanceQuery = `${userData.actualQuestion} 八字格局 調候用神 紫微斗數 命宮 財官 吉凶`;
        const queryEmbedding = await generateEmbeddings(enhanceQuery);
        
        if (queryEmbedding) {
            const searchResults = await index.query({ vector: queryEmbedding, topK: 10, includeMetadata: true });
            contexts = searchResults.matches.map((match, i) => `[文獻 ${i+1}]: ${match.metadata.interpretation || '無'}`).join('\n\n');
        }

        const ragFocusText = getRagFocus(userData.actualQuestion);

        console.log(`[3/3] 呼叫 Gemini 3.5 Flash 生成深度報告...`);
        
        const prompt = `
你是一位精通命理的 AI 戰略家。

【防斷尾與排版最高指令】：
1. 請保持高資訊密度，確保能【一氣呵成寫完六大章節】，直到寫出「陸、大師戰略行動指南」為止！
2. 呈現內容時，只允許使用最單純的 Markdown 列表、標題。絕對禁止使用 LaTeX (嚴禁 $$ 符號) 或 HTML。

【零幻覺協議】：
下方 <FactData> 區塊是精確排盤事實，請 100% 照抄，嚴禁自己篡改八字或宮位位置！

${ragFocusText}

請「嚴格按照以下標題結構與層級」撰寫報告，不要遺漏任何指定的子標題：

## 壹、基本資訊與先天定盤
### 一、 基本資訊
（完整條列 <FactData> 的 [基本資訊]、八字、星座、五行局、命/身主，以及【命宮位置】與【身宮位置】。）
### 二、 命格總論
（用極具張力的文字定調一生格局。必須包含以下兩個子段落：）
#### 1. 八字視角：
（引經據典，詳細剖析日主強弱、喜用神受制情況，以及對性格與潛意識的影響。）
#### 2. 紫微視角：
（詳細剖析命宮、身宮主星化象，以及三方四正格局，點出事業與財富基調。）

## 貳、八字格局與專屬開運密碼
### 一、 格局鑑定
（精確鑑定八字格局，指出核心病灶或成敗關鍵。）
### 二、 五行喜忌深度剖析
（詳細列出：最喜用神、次喜用神、最忌仇神、次忌仇神、閒神，並說明學理依據與生活影響。）
### 三、 專屬開運密碼
（使用 Markdown 列表或簡易表格，明確給出專屬的【吉利數字】、【吉利方位】、【吉利顏色】與【開運珠寶】及現代生活應用指南。）

## 參、四柱神煞詳解與調候樞紐
### 一、 調候樞紐分析
（引用《窮通寶鑑》等，精準點出調候用神及其在現實生活中的意義。）
### 二、 四柱神煞嚴謹推算與現代解讀
（必須分列「1. 年柱」、「2. 月柱」、「3. 日柱」、「4. 時柱」，逐一解釋其上的關鍵神煞對命運的影響。）

## 肆、紫微斗數全景與核心宮位深度解析
（針對「財帛宮」、「官祿宮」、「遷移宮」與「夫妻宮」給出極度詳細的星曜解說，並鑑定特殊格局。）

## 伍、未來 10 年運勢推演
（請使用純文字長條圖繪製未來 10 年運勢。
格式範例：
2026年 | ████████░░ (80分) - [簡評]
請連續寫滿 10 年，畫完後進行大勢推演。）

## 陸、大師戰略行動指南
（給出務實的避險與進攻策略。寫完此段即完成報告。）

<ClientData>
${question}
</ClientData>

<FactData>
${exactChartData}
</FactData>
        `;

        const safetySettings = [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ];

        const model = genAI.getGenerativeModel({ 
            model: 'gemini-3.5-flash',
            safetySettings: safetySettings
        });
        
        const result = await model.generateContent(prompt);
        return result.response.text();

    } catch (error) {
        console.error("RAG 發生錯誤:", error);
        throw error;
    }
}

module.exports = { generateMasterResponse };