require('dotenv').config();
const { Pinecone } = require('@pinecone-database/pinecone');
const { GoogleGenerativeAI } = require("@google/generative-ai");

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

// 🟢 判斷提問類別，給予 AI 專屬的 RAG 深度分析指令
function getRagFocus(questionStr) {
    if (questionStr.includes("事業") || questionStr.includes("創業") || questionStr.includes("跳槽") || questionStr.includes("行業") || questionStr.includes("天花板") || questionStr.includes("瓶頸")) {
        return "【專屬分析重點】：著重評估八字格局與紫微官祿宮。比較「體制內」與「創業」的成就上限。精準點出近 1~3 年事業轉折與跳槽時機，並給出職場防小人與最契合天賦的行業方向。";
    } else if (questionStr.includes("財") || questionStr.includes("投資") || questionStr.includes("破產") || questionStr.includes("資金")) {
        return "【專屬分析重點】：結合財星格局與紫微財帛宮、田宅宮。定調其為「累積型正財」或「爆發型偏財」。精準指出資產暴漲或破財危機的黃金機遇期與高危月份，並給出適合的投資佈局。";
    } else if (questionStr.includes("姻緣") || questionStr.includes("桃花") || questionStr.includes("伴侶") || questionStr.includes("感情") || questionStr.includes("婚姻")) {
        return "【專屬分析重點】：分析夫妻宮主星與桃花星。精準描繪未來伴侶特質、紅鸞星動的具體年份。評估感情障礙根源，並針對桃花煞、第三者介入或劫緣提供趨吉避凶的情感防線與抉擇指引。";
    } else if (questionStr.includes("健康") || questionStr.includes("身體") || questionStr.includes("血光") || questionStr.includes("疾病") || questionStr.includes("長輩")) {
        return "【專屬分析重點】：結合八字五行偏枯與紫微疾厄宮，點出先天體質弱點（如心血管、消化等）。梳理近年的意外血光或手術風險高危月份。並從五行調候給出改善慢性病與精神內耗的具體指南。";
    } else {
        return "【專屬分析重點】：梳理十年大限起伏軌跡，畫出未來黃金爆發期與低谷期。面對人生重大抉擇（如轉行/買房/移民），給出利弊對比。並驗證命盤特殊大格，梳理今年關鍵轉折月份與風險。";
    }
}

// 🟢 產生絕對正確的命盤資料 (Fact Data)
const shiToIndex = { "子": 0, "丑": 1, "寅": 2, "卯": 3, "辰": 4, "巳": 5, "午": 6, "未": 7, "申": 8, "酉": 9, "戌": 10, "亥": 11 };

function generateExactChartText(userData) {
    try {
        if (!userData.year || !userData.month || !userData.day) return "【提示：無法獲取完整日期】";

        const timeIndex = shiToIndex[userData.shi ? userData.shi.charAt(0) : "子"] || 0;
        const gender = userData.gender === '男' ? 'male' : 'female';
        const dateStr = `${userData.year}-${userData.month}-${userData.day}`;
        
        // 1. 呼叫 iztro 引擎產生精準紫微斗數星盤
        const astrolabe = astro.bySolar(dateStr, timeIndex, gender, true, 'zh-CN');
        
        // 2. 呼叫 lunar-javascript 產生精準四柱八字與星座
        const hourMapping = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22];
        const exactHour = hourMapping[timeIndex];
        const solarWithTime = Solar.fromYmdHms(parseInt(userData.year), parseInt(userData.month), parseInt(userData.day), exactHour, 0, 0);
        const baziWithTime = solarWithTime.getLunar().getEightChar();
        
        // 修正：使用 getXingZuo() 獲取西洋星座
        const zodiacSign = solarWithTime.getXingZuo() + "座"; 

        const baziString = `年柱：${baziWithTime.getYear()}，月柱：${baziWithTime.getMonth()}，日柱：${baziWithTime.getDay()}，時柱：${baziWithTime.getTime()}`;

        // 3. 整理紫微資訊 (五行局、命主、身主、宮位星曜)
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
                palacesString += `- 【${p.name}】 (地支${p.earthlyBranch}宮): ${stars.join('、 ') || '空宮'}\n`;
            });
        }

        return `
[系統底層四柱八字與基本資訊]
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
        return "【系統提示：排盤引擎計算發生異常，請 AI 依據使用者提供的生辰自行推演八字與命盤】";
    }
}

async function generateEmbeddings(text) {
    try {
        // 修正：將 v1 改為 v1beta，以支援 text-embedding-004 模型
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${process.env.GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: "models/text-embedding-004", 
                content: { parts: [{ text: text }] }
            })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || "向量 API 拒絕連線");
        return data.embedding.values;
    } catch (error) {
        console.log("⚠️ 向量轉換失敗:", error.message);
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

        // 🔴 模式二：Full 深度大批模式 (五書合參 RAG 檢索 + 零幻覺 Fact Data 注入)
        console.log("[1/4] 正在透過 iztro 與 lunar-javascript 計算絕對命盤...");
        const exactChartData = generateExactChartText(userData);

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
        }

        // 修正：直接在內部呼叫 getRagFocus 獲取專屬指令
        const ragFocusText = getRagFocus(userData.actualQuestion);

        console.log(`[4/4] 呼叫 Gemini 3.5 Flash 生成深度報告...`);
        
        const prompt = `
你是一位匯通中西、精通五大命理古籍（《滴天髓》、《三命通會》、《子平真詮》、《窮通寶鑑》、《紫微斗數全書》）的宗師級 AI 命理戰略家與首席人生教練。

【零幻覺嚴格協議 (Zero-Hallucination Protocol)】：
1. 命盤絕對忠誠：下方 <FactData> 區塊內提供的「四柱八字、星座、五行局、命/身主」與「紫微星曜」，是由精密引擎算出的「絕對事實」。你「嚴禁」自己推演八字或猜測星曜位置，必須 100% 讀取 <FactData> 的資料進行分析。
2. 古籍絕對嚴謹：論述必須基於正統學理與下方【Pinecone 檢索古籍文獻】，絕不可捏造經文。

【時空基準】：今天是「${currentDateStr}」，所有的推演以此為基準點。

${ragFocusText}

請為使用者撰寫一份「字數達 3000 字以上」，極度精密、資訊密度極高、超越以往的「五大古籍合參・流年大批戰略報告」。
報告必須具備以下【史詩級學理結構】（請嚴格使用 Markdown 標題，排版力求精美易讀）：

## 壹、先天定盤與命格總論
（列出從 <FactData> 讀取到的八字、西洋星座、紫微五行局、命主與身主。定調其一生格局的高低、核心天賦與潛在業力。）

## 貳、八字格局與專屬開運密碼
（依據 <FactData> 提供的八字定出格局，深度分析五行喜忌用神。
 **特別要求**：請明確給出專屬於該命主的【吉利數字】、【吉利方位】與【吉利顏色】。）

## 參、四柱神煞詳解與調候樞紐
（運用《窮通寶鑑》點出調候用神。
 **特別要求**：根據 <FactData> 的八字干支，嚴謹推算並詳加解釋其「年柱、月柱、日柱、時柱」上的關鍵神煞（如天乙貴人、文昌、驛馬、羊刃、華蓋等）對性格與命運的影響。）

## 肆、紫微斗數全景與特殊格局鑑定
（依據 <FactData> 剖析命宮、身宮及三方四正。
 **特別要求**：請嚴謹鑑定該命盤是否構成紫微斗數的【特別格局】（如機月同梁、巨日同宮、殺破狼、石中隱玉等），若有，請特別點出並解析其爆發力與危機。）

## 伍、紫八合一：未來 10 年運勢曲線圖與大勢推演
（針對客戶的提問給出流年/流月現象預測。
 **特別要求**：請使用 Markdown 與文字符號繪製出一個【未來 10 年運勢起伏曲線圖】，並輔以精要的趨勢解說，讓客戶一眼看懂未來十年的黃金期與低谷期。）

## 陸、大師戰略級行動指南
（將古文的凶煞轉化為現代的危機處理。給出極度務實、可操作的避險防守與進攻策略。）

【Pinecone 檢索之五大古籍文獻參考】：
${contexts}

<ClientData>
${question}
</ClientData>

<FactData>
${exactChartData}
</FactData>
        `;

        const model = genAI.getGenerativeModel({ 
            model: 'gemini-3.5-flash',
            generationConfig: {
                temperature: 0.4, 
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