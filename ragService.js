require('dotenv').config();
const { Pinecone } = require('@pinecone-database/pinecone');
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require("@google/generative-ai");

// 🟢 引入原生 File System 模組供數據分析儲存使用
const fs = require('fs');
const path = require('path');

// 🟢 引入兩大數學曆法排盤引擎 (徹底消滅 AI 幻覺)
const { Solar } = require('lunar-javascript');
const { astro } = require('iztro');
const locationsData = require('./locations.js');
const { generateUniqueTeaser } = require('./teaserLibrary.js');
// 🟢 引入外部袁天罡稱骨詩詞庫
const boneWeightPoems = require('./boneWeightPoems.js');

const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const index = pc.Index("gygs-knowledge");
// 🟢 初始化 Gemini AI
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

// 🟢 精準提取使用者資料（包含婚姻與子女狀態）
function extractUserData(question) {
    const cityMatch = question.match(/出生地:([^-]+)-([^,]+)/);
    const shiMatch = question.match(/時辰[:：]?(.)時/);
    const dateMatch = question.match(/日期[:：]?(\d{4})-(\d{2})-(\d{2})/);
    const genderMatch = question.match(/性別[:：]?(男|女)/);
    const marriageMatch = question.match(/婚姻[:：]?([^,\n]+)/);
    const childrenMatch = question.match(/子女[:：]?([^,\n]+)/);
    
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
        marriage: marriageMatch ? marriageMatch[1].trim() : "未提供",
        children: childrenMatch ? childrenMatch[1].trim() : "未提供",
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

// 🟢 內建獲取單一五行屬性 (日元天干五行)
function getDayMasterElement(dayGan) {
    const elements = { "甲":"木", "乙":"木", "丙":"火", "丁":"火", "戊":"土", "己":"土", "庚":"金", "辛":"金", "壬":"水", "癸":"水" };
    return elements[dayGan] || "未知";
}

// 🟢 內建袁天罡稱骨演算法
function calculateBoneWeight(yearIndex, month, day, shiZhi) {
    const yearW = [12,9,6,7,12,5,9,8,7,8,15,9,16,8,8,19,12,6,8,7,5,15,6,16,15,7,9,12,10,7,15,6,5,14,14,9,7,7,9,12,8,7,13,5,14,5,9,17,15,7,12,8,8,6,19,6,8,16,14,7];
    const monthW = [0, 6,7,18,9,5,16,9,15,18,8,9,5];
    const dayW = [0, 5,10,8,15,16,15,8,16,8,16,9,17,8,17,10,8,9,18,5,15,10,9,8,9,15,18,7,8,16,6];
    const shiW = { "子":16, "丑":6, "寅":7, "卯":10, "辰":9, "巳":16, "午":10, "未":8, "申":8, "酉":9, "戌":6, "亥":6 };
    
    let total = yearW[yearIndex] + monthW[month] + dayW[day] + (shiW[shiZhi] || 0);
    return Math.floor(total / 10) + "兩" + (total % 10) + "錢";
}

// 🟢 從外部讀取袁天罡稱骨詩詞
function getBoneWeightPoem(weightStr, gender) {
    if (boneWeightPoems[gender] && boneWeightPoems[gender][weightStr]) {
        return boneWeightPoems[gender][weightStr];
    }
    return `骨重${weightStr}，此命局自有天地之機，詳見下方核心解析。`; 
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

        // 精確計算袁天罡稱骨與本命單一五行
        const dayGan = baziWithTime.getDay().charAt(0);
        const baziElement = getDayMasterElement(dayGan);
        
        const yearIndex = (lunar.getYear() - 1984) % 60;
        const normalizedYearIndex = yearIndex < 0 ? yearIndex + 60 : yearIndex; 
        const weightStr = calculateBoneWeight(normalizedYearIndex, Math.abs(lunar.getMonth()), lunar.getDay(), userData.shi.charAt(0));

        // 獲取絕對正確的詩句，將其變為不可篡改的 Data
        const genderStr = userData.gender === '男' ? '男命' : '女命';
        const weightPoem = getBoneWeightPoem(weightStr, genderStr);

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
- 性別：${genderStr}
- 當前時空基準：${currentDateStr}

[家庭現狀]
- 婚姻狀態：${userData.marriage}
- 子女狀況：${userData.children}

[系統底層四柱八字]
- 西洋星座：${zodiacSign}
- 八字干支：${baziString}
- 八字五行屬性：${baziElement}
- 袁天罡稱骨：${weightStr} (${genderStr})
- 專屬讖語：「${weightPoem}」

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

async function generateEmbeddings(text) {
    try {
        const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });
        const result = await embeddingModel.embedContent(text);
        return result.embedding.values;
    } catch (error) {
        return null; 
    }
}

// 🟢 數據分析日誌記錄函數 (JSONL Format)
function logTransactionForAnalytics(userData, actualQuestion, finalAiText, userEmail) {
    const logEntry = {
        timestamp: new Date().toISOString(),
        email: userEmail || "anonymous",
        demographics: {
            country: userData.country,
            city: userData.city,
            birthYear: userData.year,
            gender: userData.gender,
            maritalStatus: userData.marriage,
            children: userData.children
        },
        question: actualQuestion,
        report_length: finalAiText.length,
        ai_report: finalAiText
    };

    const logFilePath = path.join(__dirname, 'analytics_log.jsonl');

    fs.appendFile(logFilePath, JSON.stringify(logEntry) + '\n', (err) => {
        if (err) {
            console.error("⚠️ Failed to write to analytics log:", err);
        } else {
            console.log("📊 Transaction successfully logged for analytics.");
        }
    });
}

// ==========================================
// 核心路由生成區 (🟢 三階段生成防斷尾與深度擴充)
// ==========================================
async function generateMasterResponse(question, mode = 'teaser', userEmail = '') {
    try {
        const today = new Date();
        const currentYear = today.getFullYear();
        const currentDateStr = `${currentYear}年${today.getMonth() + 1}月${today.getDate()}日`;
        const userData = extractUserData(question);
        
        const age = userData.year ? currentYear - parseInt(userData.year) : '未知';

        let extractedEmail = userEmail;
        if (!extractedEmail) {
            const emailMatch = question.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/);
            if (emailMatch) extractedEmail = emailMatch[1];
        }

        if (mode === 'teaser') {
            console.log("⚡ 啟動零 Token 矩陣織錦誘餌模式...");
            let teaserResponse = generateUniqueTeaser(userData.year, userData.month, userData.day, userData.shi, userData.gender, userData.country, userData.actualQuestion);
            
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

        console.log("[1/5] 計算絕對命盤...");
        const exactChartData = generateExactChartText(userData, currentDateStr);

        console.log("[2/5] 準備檢索資料庫...");
        let contexts = "";
        
        const enhanceQuery = `紫微斗數 31 特殊格局 ${userData.actualQuestion} 八字格局 調候用神 命宮 財官 吉凶`;
        const queryEmbedding = await generateEmbeddings(enhanceQuery);
        
        if (queryEmbedding) {
            const searchResults = await index.query({ vector: queryEmbedding, topK: 15, includeMetadata: true });
            contexts = searchResults.matches.map((match, i) => `[文獻 ${i+1}]: ${match.metadata.interpretation || match.metadata.text || '無'}`).join('\n\n');
        }

        const ragFocusText = getRagFocus(userData.actualQuestion);

        const safetySettings = [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ];

        // 🟢 使用確認穩定的 gemini-3.5-flash
        const model = genAI.getGenerativeModel({ 
            model: 'gemini-3.5-flash',
            safetySettings: safetySettings,
            generationConfig: {
                temperature: 0.5,
                topP: 0.9,
                maxOutputTokens: 8192
            }
        });

        // ==========================================
        // 🚀 第一階段生成：報告第一部分 (第 1 ~ 2 章)
        // ==========================================
        console.log(`[3/5] 呼叫 Gemini 3.5 Flash 生成深度報告【第一階段：系統定盤與行為套利】...`);
        const promptPart1 = `
你是一位精通中西命理的 AI 戰略家。請根據精確排盤，撰寫命理報告的【第一部分】。

【客製化設定】命主年齡 ${age} 歲，性別 ${userData.gender}。婚姻：「${userData.marriage}」，子女：「${userData.children}」。
【數據鐵律】必須字字不漏照抄 <FactData> 中的「袁天罡稱骨」與「專屬讖語」。絕對禁止篡改八字或自行發明神煞。
【開運鐵律】吉利數字與顏色必須對應推導出的「最喜用神」(木=3,8; 火=2,7; 土=5,0; 金=4,9; 水=1,6)。
【防斷尾指令】你「只能」撰寫第一章至第二章，寫完第二章後立刻停止。禁止寫後續章節，絕對禁止任何問候開場白！

<FactData>
${exactChartData}
</FactData>

${ragFocusText}

請「嚴格按照以下結構」開始撰寫（第一行必須是標題）：

## 壹、基本資訊與先天定盤
### 一、 基本資訊
（列出 <FactData> 內所有資訊。包含：八字五行、稱骨及讖語、五行局、命/身主、命/身宮位置。）
### 二、 命格總論
#### 1. 八字視角（原局系統特徵）：
（除了總結五行強弱，請務必分析命主的「人生波動率（Volatility）」：屬於平穩爆發型還是大起大落型？並點出其最核心的「底層驅動力」，例如：是受權力、財富、還是自由所驅動？）
#### 2. 紫微視角（核心風險與決策模型）：
（分析命主的「風險承受度」與「控制點」。他們是屬於主動開創的強勢格局，還是需要借力打力、順勢而為的環境依賴型格局？點出其一生中最核心的優勢戰場。）

## 貳、八字格局與專屬開運密碼
### 一、 格局鑑定
（明確判定為正格或變格/特殊格局。此格局在現代商業社會的稀缺性與核心競爭力為何？）
### 二、 五行喜忌深度剖析與行為套利
（明確指出「最喜用神」為何種五行。更重要的是，給出「行為套利」建議：該五行在現代職場對應何種具體行為？例如喜木者應專注內容創作與教育；喜金者應著重建立制度與砍掉冗餘。該如何將此五行落實到日常決策中？）
### 三、 專屬開運密碼與產業佈局
（數字與顏色必須與「最喜用神」嚴格對應。此外，請具體點出最能發揮其喜用神能量的 2-3 個「現代商業板塊或產業」，讓其在正確的賽道上發力。）
        `;
        
        const resultPart1 = await model.generateContent(promptPart1);
        let aiTextPart1 = resultPart1.response.text().trim();


        // ==========================================
        // 🚀 第二階段生成：報告第二部分 (第 3 ~ 4 章)
        // ==========================================
        console.log(`[4/5] 呼叫 Gemini 3.5 Flash 生成深度報告【第二階段：神煞調候與核心資產】...`);
        const promptPart2 = `
你是一位精通中西命理的 AI 戰略家。我們正在分段撰寫一份深度命理分析報告。
請根據相同的命盤數據，直接接續撰寫【第二部分】（第三至第四章）。

【第一部分報告內容參考】（請保持邏輯一致性，特別是喜用神的判斷）：
${aiTextPart1}

【排版與邏輯鐵律】：
1. 嚴禁任何開場白，你的第一行輸出必須直接是「## 參、四柱神煞詳解與調候樞紐」。
2. 現實錨定：針對紫微宮位分析，必須融合命主提供的【婚姻：${userData.marriage}】與【子女：${userData.children}】現狀給出實際建議。
3. 【防斷尾指令】你「只能」撰寫第三章至第四章，寫完第四章後立刻停止。

<FactData>
${exactChartData}
</FactData>

<ClientData>
提問重點：${userData.actualQuestion}
</ClientData>

請「嚴格按照以下結構」接續撰寫：

## 參、四柱神煞詳解與調候樞紐
### 一、 調候樞紐分析
（請嚴格依據命主八字真實的寒暖燥濕與喜用神，推演出客觀且專屬的調候與戰略指引，絕不可套用固定結論模板。）
### 二、 四柱神煞與現代解讀
（挑選 2-3 個命局神煞，寫成一段通順白話文即可，嚴禁逐柱條列推演。）

## 肆、紫微斗數全景與核心宮位深度解析
（請從檢索文獻中比對「紫微斗數 31 特殊格局」，明確鑑定命主的星曜組合符合哪些特殊大格或破格。將以下四宮視為命主的「核心資產」，進行深度解碼，並融合家庭現狀給出實際建議：）
1. 財帛宮（現金流與資本操作）：（命主的財富屬於主動勞務收入、專業技能變現，還是帶有高槓桿的偏財/投機獲利？該如何建立防守機制？）
2. 官祿宮（事業軌跡與領導力）：（適合獨立作戰、企業高管，還是創業合夥？事業的最大天花板與突破口在哪？）
3. 遷移宮（外部擴張與地理紅利）：（外出發展的吉凶如何？是否具備跨國、跨界的紅利？是否應該轉換地理環境來打破目前的瓶頸？）
4. 夫妻宮（合夥與婚姻綜效）：（配偶或長期伴侶在命主的事業與財富板塊中，扮演的是助力（戰略資產）還是阻力（風險敞口）？現狀下該如何優化雙方協作？）

【Pinecone 檢索文獻】：
${contexts}
        `;

        const resultPart2 = await model.generateContent(promptPart2);
        let aiTextPart2 = resultPart2.response.text().trim();


        // ==========================================
        // 🚀 第三階段生成：報告第三部分 (第 5 ~ 6 章)
        // ==========================================
        console.log(`[5/5] 呼叫 Gemini 3.5 Flash 生成深度報告【第三階段：十年運勢與行動指南】...`);
        const promptPart3 = `
你是一位精通中西命理的 AI 戰略家。我們正在分段撰寫一份深度命理分析報告。
請根據相同的命盤數據，直接接續撰寫【第三部分】（第五至第六章）。

【前半部報告內容參考】（請務必依據前文推導出的格局與風險，進行戰略延伸）：
${aiTextPart1}
${aiTextPart2}

【排版與邏輯鐵律】：
1. 嚴禁任何開場白，你的第一行輸出必須直接是「## 伍、未來 10 年運勢推演」。
2. 運勢格式：第五章十年運勢【嚴禁使用長條圖特殊符號】！格式必須為「年份 | 分數/100 | 一句話簡評」，每一年僅限一行。
3. 必須寫到第六章「戰略行動指南」結束，並針對提問給出務實策略。嚴禁寫任何結語或問候。

<ClientData>
提問重點：${userData.actualQuestion}
</ClientData>

請「嚴格按照以下結構」接續撰寫：

## 伍、未來 10 年運勢推演（含黑天鵝風險警示）
（禁用區塊符號。必須以嚴謹的數據預測風格呈現。請為每一年加入「週期定調（如：爆發期、盤整期、防守期）」。）
（【極度重要】：基於紫微與八字原局，請明確標示出這十年中哪一年是極度高危的「黑天鵝年（Black Swan）」，並給出該年度的核心防守策略，如：現金為王、嚴防合夥背叛、注意健康血光。）
（格式範例：2026年 | 80分 | 【破局爆發期】事業出現重大轉折，利於跨界佈局與高風險進攻。）

## 陸、大師戰略行動指南（針對「${userData.actualQuestion}」的專屬破局方案）
（此為整份報告最具價值的核心！必須佔據極大篇幅，且極度客製化，讓來訪者感受到這完全是針對其具體提問的深度解答。請務必包含以下四個子標題撰寫：）

### 1. 核心癥結剖析
（用命理大數據的角度精準點出，為什麼來訪者會遇到這個具體問題？其命局中的優勢在哪裡？盲區或致命傷又是什麼？）

### 2. 關鍵時間節點（未來 12-24 個月）
（拒絕模糊！請明確指出針對此問題的「進攻黃金期（例如：西曆 8-10 月利於轉換跑道或談判）」與「防守避險期（例如：西曆 3-5 月容易破財或犯小人，應按兵不動）」。）

### 3. 進攻與避險戰略
（條列式給出 3 項極度務實的現代行動建議。包含「該主動做什麼」與「絕對要避免什麼」，將古籍智慧轉化為現代職場、商場、投資或人際關係的具體執行手冊。）

### 4. 五行環境與心理調校
（結合來訪者的「最喜用神」，給出針對此問題的環境風水、穿搭顏色、數字選擇或決安心態調整建議，作為最後的開運加持。寫完此段即完成報告，嚴禁寫任何結語或問候。）
        `;

        const resultPart3 = await model.generateContent(promptPart3);
        let aiTextPart3 = resultPart3.response.text().trim();


        // ==========================================
        // 🚀 組合並清理最終報告
        // ==========================================
        let finalAiText = aiTextPart1 + '\n\n' + aiTextPart2 + '\n\n' + aiTextPart3;
        
        // 最終安全網：清理各段落頭部可能的殘留開場白或 markdown 標籤
        finalAiText = finalAiText.replace(/^```markdown\n/gm, '').replace(/^```\n/gm, '').replace(/```$/gm, ''); 
        const startIndex = finalAiText.indexOf('## 壹');
        if (startIndex > 0) {
            finalAiText = finalAiText.substring(startIndex);
        }
        
        // 🟢 記錄數據以供內部數據分析使用
        logTransactionForAnalytics(userData, userData.actualQuestion, finalAiText, extractedEmail);

        return finalAiText;

    } catch (error) {
        console.error("RAG 發生錯誤:", error);
        throw error;
    }
}

module.exports = { generateMasterResponse };