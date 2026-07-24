require('dotenv').config();
const { Pinecone } = require('@pinecone-database/pinecone');
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require("@google/generative-ai");

// 🟢 引入兩大數學曆法排盤引擎 (徹底消滅 AI 幻覺)
const { Solar } = require('lunar-javascript');
const { astro } = require('iztro');

// 🟢 引入兩大核心：全球真太陽時資料庫 + Teaser 引擎
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
    if (questionStr.includes("事業") || questionStr.includes("創業") || questionStr.includes("跳槽") || questionStr.includes("行業") || questionStr.includes("天花板") || questionStr.includes("瓶頸")) {
        return "【專屬分析重點】：著重評估八字格局與紫微官祿宮。比較「體制內」與「創業」的成就上限。精準點出事業轉折時機，並給出職場防小人與最契合的天賦行業方向。";
    } else if (questionStr.includes("財") || questionStr.includes("投資") || questionStr.includes("破產") || questionStr.includes("資金")) {
        return "【專屬分析重點】：結合財星格局與紫微財帛宮、田宅宮。定調其為「正財」或「偏財」。精準指出資產暴漲或破財危機的高危月份，並給出適合的投資佈局。";
    } else if (questionStr.includes("姻緣") || questionStr.includes("桃花") || questionStr.includes("伴侶") || questionStr.includes("感情") || questionStr.includes("婚姻")) {
        return "【專屬分析重點】：分析夫妻宮主星與桃花星。描繪未來伴侶特質、紅鸞星動的具體年份。評估感情障礙根源，並針對桃花煞提供趨吉避凶的情感防線。";
    } else if (questionStr.includes("健康") || questionStr.includes("身體") || questionStr.includes("血光") || questionStr.includes("疾病") || questionStr.includes("長輩")) {
        return "【專屬分析重點】：結合八字五行偏枯與紫微疾厄宮，點出先天體質弱點。梳理近年的意外血光高危月份。並從五行調候給出改善慢性病與精神內耗的具體指南。";
    } else {
        return "【專屬分析重點】：梳理十年大限起伏軌跡，畫出未來黃金爆發期與低谷期。面對人生重大抉擇，給出利弊對比。並驗證命盤特殊大格，梳理今年關鍵轉折月份與風險。";
    }
}

// 🟢 產生絕對正確的命盤資料 (Fact Data)
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

        const wuxingClass = astrolabe.fiveElementsClass || '未知';
        const soulRuler = astrolabe.soul || '未知';
        const bodyRuler = astrolabe.body || '未知';

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
- 出生時辰：${userData.shi} (${exactHour}:00 - ${exactHour+1}:59)
- 性別：${userData.gender === '男' ? '乾造 (男命)' : '坤造 (女命)'}
- 當前時空基準：${currentDateStr}

[系統底層四柱八字]
- 西洋星座：${zodiacSign}
- 八字干支：${baziString}

[系統底層紫微斗數]
- 五行局：${wuxingClass}
- 命主：${soulRuler}
- 身主：${bodyRuler}
- 命宮主星位置：命宮在${astrolabe.earthlyBranchOfSoulPalace || '未知'}，身宮在${astrolabe.earthlyBranchOfBodyPalace || '未知'}
- 十二宮位星曜詳細分佈：
${palacesString}
`;
    } catch (e) {
        console.error("排盤引擎發生錯誤:", e);
        return "【系統提示：排盤引擎計算發生異常】";
    }
}

// 🟢 向量模型生成區 (含降級容錯機制)
async function generateEmbeddings(text) {
    try {
        const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });
        const result = await embeddingModel.embedContent(text);
        return result.embedding.values;
    } catch (error) {
        console.log("⚠️ 向量轉換失敗 (已啟動無向量降級模式):", error.message);
        return null; 
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
            
            let teaserResponse = generateUniqueTeaser(
                userData.year, userData.month, userData.day, userData.shi, 
                userData.gender, userData.country, userData.actualQuestion
            );
            
            let timeWarning = `\n\n<br><strong>【系統專業提示：真太陽時精密校正】</strong><br>`;
            if (userData.city && userData.shi) {
                const watchTime = calculateLocalWatchTime(userData.city, userData.shi);
                if (watchTime) {
                    timeWarning += `系統偵測您的出生地為「${userData.city}」。因地球自轉與地理經緯度影響，當地真正的「${userData.shi}」對應鐘錶時間為 <strong style="color:#38bdf8;">${watchTime}</strong>。請於解鎖前確認您確實出生於此時間段內。`;
                } else {
                    timeWarning += `本系統將依據您的出生國家與城市啟動「真太陽時」精確校正。地理位置往往有 15-20 分鐘誤差，請於解鎖前確認您的出生時辰精確無誤。`;
                }
            } else {
                timeWarning += `本系統將依據您的出生地啟動「真太陽時」校正。請確認出生時辰精確無誤。`;
            }
            
            return teaserResponse + timeWarning;
        }

        console.log("[1/4] 正在透過 iztro 與 lunar-javascript 計算絕對命盤...");
        const exactChartData = generateExactChartText(userData, currentDateStr);

        console.log("[2/4] 正在轉換向量 (五大古籍深度檢索模式)...");
        let contexts = "";
        
        const enhanceQuery = `${userData.actualQuestion} 八字格局 調候用神 紫微斗數 命宮 財官 吉凶`;
        const queryEmbedding = await generateEmbeddings(enhanceQuery);
        
        if (queryEmbedding) {
            console.log("[3/4] 正在 Pinecone 檢索五大古籍...");
            const searchResults = await index.query({ vector: queryEmbedding, topK: 20, includeMetadata: true });
            
            contexts = searchResults.matches.map((match, i) => {
                const tags = Array.isArray(match.metadata.tags) ? match.metadata.tags.join(', ') : match.metadata.tags;
                return `[文獻 ${i+1}] 來源：${tags}\n【大師解析】：${match.metadata.interpretation || match.metadata.classic_text || '無'}`;
            }).join('\n\n');
        } else {
            console.log("[3/4] 向量檢索略過 (將直接使用 Gemini 基礎大腦分析)");
        }

        const ragFocusText = getRagFocus(userData.actualQuestion);

        console.log(`[4/4] 呼叫 Gemini 3.1 Pro 生成深度報告...`);
        
        const prompt = `
你是一位匯通中西、精通五大命理古籍（《滴天髓》、《三命通會》、《子平真詮》、《窮通寶鑑》、《紫微斗數全書》）的宗師級 AI 命理戰略家與首席人生教練。

【篇幅與 Token 最高控制指令】：
1. 請將全文目標字數精準控制在 3,000 至 3,500 中文字 之間，既保證內容豐富詳實、資訊密度極高，又能確保在 Token 上限內【100% 寫完全部六大章節】，絕不允許中途斷尾！
2. 【排版禁令】：呈現內容時只允許使用標準 Markdown 標題與列表（如：- 年柱：丙辰）。【絕對禁止】使用 LaTeX、MathJax、HTML 或表格排版（嚴禁出現 "$$" 或 "\\begin" 等數學語法），否則系統會崩潰！

【零幻覺協議】：
下方 <FactData> 區塊是精確排盤事實，請 100% 忠實讀取，嚴禁自己篡改八字或紫微星曜！

${ragFocusText}

請依序撰寫以下六大章節（請嚴格使用 Markdown 標題 # 與 ##，必須寫到第六章才算完整結束）：

## 壹、基本資訊與先天定盤
（必須完整列出 <FactData> 中的 [基本資訊]。條列八字干支、西洋星座、紫微五行局、命/身主。定調其一生格局的高低與核心天賦。）

## 貳、八字格局與專屬開運密碼
（深度分析五行喜忌用神。請明確給出專屬的【吉利數字】、【吉利方位】與【吉利顏色】。）

## 參、四柱神煞詳解與調候樞紐
（根據 <FactData> 詳加解釋「年柱、月柱、日柱、時柱」上的關鍵神煞對命運的影響與調候用神。）

## 肆、紫微斗數全景與特殊格局鑑定
（剖析命宮、身宮及三方四正。嚴謹鑑定是否構成紫微斗數的【特別格局】並深入解析。）

## 伍、紫八合一：未來 10 年運勢曲線圖與大勢推演
（請務必使用「純文字長條圖」格式繪製未來 10 年運勢，絕不可漏掉任何一年！
格式範例：
2026年 | ████████░░ (80分) - [運勢簡評]
2027年 | ██████░░░░ (60分) - [運勢簡評]
請依此格式連續寫滿 10 年，畫完後再進行大勢文字推演。）

## 陸、大師戰略級行動指南
（給出極度務實、可操作的避險防守與進攻策略。寫完此段報告方算完結。）

【Pinecone 檢索之五大古籍文獻參考】：
${contexts}

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
            model: 'gemini-3.1-pro',
            safetySettings: safetySettings,
            generationConfig: {
                temperature: 0.3, 
                maxOutputTokens: 8192 
            }
        });
        
        const result = await model.generateContent(prompt);
        return result.response.text();

    } catch (error) {
        console.error("RAG 發生錯誤:", error);
        throw error;
    }
}

module.exports = { generateMasterResponse };