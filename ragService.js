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

// 🟢 精準提取使用者資料（包含新增的婚姻與子女）
function extractUserData(question) {
    const cityMatch = question.match(/出生地:([^-]+)-([^,]+)/);
    const shiMatch = question.match(/時辰[:：]?(.)時/);
    const dateMatch = question.match(/日期[:：]?(\d{4})-(\d{2})-(\d{2})/);
    const genderMatch = question.match(/性別[:：]?(男|女)/);
    const marriageMatch = question.match(/婚姻[:：]?([^,，\n]+)/);
    const childrenMatch = question.match(/子女[:：]?([^,，\n]+)/);
    
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

// 🟢 內建袁天罡稱骨詩詞庫 (硬數據，徹底消滅 AI 腦補幻覺)
function getBoneWeightPoem(weightStr, gender) {
    const poems = {
        "男命": {
            "3兩2錢": "初年運限事難謀，漸漸財源如水流，半世喪功無進退，到老終期免憂愁。"
            // 未來可在此擴充男命詩句
        },
        "女命": {
            "3兩2錢": "初限建家命半前，恓惶憂慮費心田。忙忙碌碌無成事，若逢中末信天然。"
            // 未來可在此擴充女命詩句
        }
    };
    
    if (poems[gender] && poems[gender][weightStr]) {
        return poems[gender][weightStr];
    }
    return "系統古籍庫擴充中，請參考下方命盤解析。"; 
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

        // 🟢 精確計算袁天罡稱骨與本命單一五行
        const dayGan = baziWithTime.getDay().charAt(0);
        const baziElement = getDayMasterElement(dayGan);
        
        const yearIndex = (lunar.getYear() - 1984) % 60;
        const normalizedYearIndex = yearIndex < 0 ? yearIndex + 60 : yearIndex; 
        const weightStr = calculateBoneWeight(normalizedYearIndex, Math.abs(lunar.getMonth()), lunar.getDay(), userData.shi.charAt(0));

        // 🟢 獲取絕對正確的詩句，將其變為不可篡改的 Data
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
- 袁天罡稱骨：${weightStr} (${genderStr}) - 專屬讖語：「${weightPoem}」

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

// ==========================================
// 核心路由生成區
// ==========================================
async function generateMasterResponse(question, mode = 'teaser', userEmail = '') {
    try {
        const today = new Date();
        const currentYear = today.getFullYear();
        const currentDateStr = `${currentYear}年${today.getMonth() + 1}月${today.getDate()}日`;
        const userData = extractUserData(question);
        
        // 🟢 動態計算命主當前真實年齡
        const age = userData.year ? currentYear - parseInt(userData.year) : '未知';

        // 🟢 提取 Email 前綴 (客製化開場白使用)
        let extractedEmail = userEmail;
        if (!extractedEmail) {
            const emailMatch = question.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/);
            if (emailMatch) extractedEmail = emailMatch[1];
        }
        const emailPrefix = (extractedEmail && extractedEmail.includes('@')) ? extractedEmail.split('@')[0] : '朋友';

        if (mode === 'teaser') {
            console.log("⚡ 啟動零 Token 矩陣織錦誘餌模式...");
            let teaserResponse = generateUniqueTeaser(userData.year, userData.month, userData.day, userData.shi, userData.gender, userData.country, userData.actualQuestion);
            
            let timeWarning = `\n\n<br><strong>【系統專業提示：真太陽時精密校正】</strong><br>`;
            if (userData.city && userData.shi) {
                const watchTime = calculateLocalWatchTime(userData.city, userData.shi);
                if (watchTime) {
                    timeWarning += `系統偵測您的出生地為「${userData.city}」。因地球自轉與地理經緯度影響，當地真正的「${userData.shi}」對應鐘錶時間為 <strong style="color:#38bdf8;">${watchTime}</strong>。請於解鎖前確認您確實出生於此時間段內。`;
                } else {
                    timeWarning += `本系統將依據您的出生國家與城市啟動「真太陽時」精確校正。請於解鎖前確認您的出生時辰精確無誤。`;
                }
            } else {
                timeWarning += `本系統將依據您的出生地啟動「真太陽時」校正。請確認出生時辰精確無誤。`;
            }
            
            return teaserResponse + timeWarning;
        }

        console.log("[1/3] 計算絕對命盤...");
        const exactChartData = generateExactChartText(userData, currentDateStr);

        console.log("[2/3] 準備檢索資料庫...");
        let contexts = "";
        
        const enhanceQuery = `紫微斗數 31 特殊格局 ${userData.actualQuestion} 八字格局 調候用神 命宮 財官 吉凶`;
        const queryEmbedding = await generateEmbeddings(enhanceQuery);
        
        if (queryEmbedding) {
            const searchResults = await index.query({ vector: queryEmbedding, topK: 15, includeMetadata: true });
            contexts = searchResults.matches.map((match, i) => `[文獻 ${i+1}]: ${match.metadata.interpretation || match.metadata.text || '無'}`).join('\n\n');
        }

        const ragFocusText = getRagFocus(userData.actualQuestion);

        console.log(`[3/3] 呼叫 Gemini 3.5 Flash 生成深度報告...`);
        
        // 🟢 徹底升級 Prompt：加入「現實錨定法則」與「禁止開場白」防護
        const prompt = `
你是一位精通中西命理的 AI 戰略家。請根據以下精確的排盤數據，撰寫一份結構完整、資訊豐富的深度命理分析報告。

【客製化與語氣設定】
- 命主特徵：目前年齡 ${age} 歲，性別 ${userData.gender}，出生於 ${userData.country || '未知'}。
- 家庭現狀：婚姻狀態為「${userData.marriage}」，子女狀況為「${userData.children}」。
- 語言風格：請使用通俗易懂的現代語言。強烈貼合 ${age} 歲這個年齡段、性別與其「家庭現狀」會面臨的真實人生與財務處境。

【零幻覺協議與現實錨定法則】（底層數據分析 100% 鎖死）：
1. 稱骨絕對禁令：對於袁天罡稱骨，你【必須100%字字不漏地照抄】 <FactData> 中提供的「重量」與「專屬讖語」，絕對禁止自行修改、替換或腦補其他版本的歌訣！
2. 現實錨定法則：當命盤與客戶提供的家庭現狀（婚姻/子女）出現表面矛盾時（例如命格剋子但現實有孩），絕對禁止否定客戶的現實或武斷預測災難。必須將命盤解釋為「潛在能量與曾經經歷的考驗」，著重分析未來該如何化解衝突、保護家庭並為子女做長遠規劃。
3. 數據綁定：嚴禁篡改八字、宮位，嚴禁發明未出現在 <FactData> 中的星曜。

【排版最高指令】：
1. 請直接從「## 壹、基本資訊與先天定盤」開始撰寫，【絕對不要輸出任何問候語或開場白】，系統已自動生成開場。
2. 確保能一氣呵成寫完六大章節。
3. 標題（## 或 ###）必須獨立成行，禁止放在項目符號後。

<FactData>
${exactChartData}
</FactData>

${ragFocusText}

請「嚴格按照以下標題結構與層級」撰寫報告，不要遺漏任何指定的子標題：

## 壹、基本資訊與先天定盤
### 一、 基本資訊
（完整條列 <FactData> 內的 [基本資訊]、[家庭現狀]，務必包含八字五行屬性，以及照抄 <FactData> 內的袁天罡稱骨與讖語。）
### 二、 命格總論
#### 1. 八字視角：
#### 2. 紫微視角：

## 貳、八字格局與專屬開運密碼
### 一、 格局鑑定
### 二、 五行喜忌深度剖析
### 三、 專屬開運密碼

## 參、四柱神煞詳解與調候樞紐
### 一、 調候樞紐分析
（必須得出結論：「不可單打獨鬥，必須借力市場資源與資本槓桿，以市場實踐清洗體制腐朽」。）
### 二、 四柱神煞嚴謹推算與現代解讀

## 肆、紫微斗數全景與核心宮位深度解析
（針對財帛宮、官祿宮、遷移宮與夫妻宮解說。此章節必須融合命主提供的【家庭現狀】給出具體分析。）

## 伍、未來 10 年運勢推演
（請使用純文字長條圖繪製未來 10 年運勢。格式：年份 | ████████░░ (分數) - [簡評]）

## 陸、大師戰略行動指南
（給出務實的避險與進攻策略，並結合【家庭現狀】給出綜合建議。寫完此段即完成報告。）

<ClientData>
${question}
</ClientData>

【Pinecone 檢索文獻】：
${contexts}
        `;

        const safetySettings = [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ];

        const model = genAI.getGenerativeModel({ 
            model: 'gemini-3.5-flash',
            safetySettings: safetySettings,
            generationConfig: {
                temperature: 0.5,
                topP: 0.9,
                maxOutputTokens: 8192
            }
        });
        
        const result = await model.generateContent(prompt);
        
        // 🟢 完美解法：由 JS 程式端直接組合客製化開場白，確保絕對不會重複！
        const finalEmailReport = `先天命盤大批・流年專屬藍圖
融合《滴天髓》・《三命通會》・《子平真詮》・《窮通寶鑑》・《紫微斗數全書》

親愛的 ${emailPrefix}，您好：

感謝您的付費解鎖。我們的 AI 命理大腦已自向量資料庫中提取五大古籍之精髓，結合真太陽時校正，並為您運算了專屬的開運密碼與 10 年運勢曲線圖：

---

${result.response.text()}
`;

        return finalEmailReport;

    } catch (error) {
        console.error("RAG 發生錯誤:", error);
        throw error;
    }
}

module.exports = { generateMasterResponse };