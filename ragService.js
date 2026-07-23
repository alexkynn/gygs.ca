require('dotenv').config();
const { Pinecone } = require('@pinecone-database/pinecone');
const { GoogleGenerativeAI } = require("@google/generative-ai");

// 🟢 引入兩大核心：全球真太陽時資料庫 + 百萬級零 Token 模版引擎
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

// 提取國家、城市、時辰、年份、月份、日期、性別
function extractUserData(question) {
    const cityMatch = question.match(/出生地:([^-]+)-([^,]+)/);
    const shiMatch = question.match(/時辰:?(.)時/);
    const dateMatch = question.match(/日期:(\d{4})-(\d{2})-(\d{2})/);
    const genderMatch = question.match(/性別:(男命|女命)/);
    
    return {
        country: cityMatch ? cityMatch[1].trim() : null,
        city: cityMatch ? cityMatch[2].trim() : null,
        shi: shiMatch ? shiMatch[1] + "時" : null,
        year: dateMatch ? dateMatch[1] : null,
        month: dateMatch ? parseInt(dateMatch[2], 10) : null,
        day: dateMatch ? parseInt(dateMatch[3], 10) : null,
        gender: genderMatch ? genderMatch[1] : "女命"
    };
}

// 🔴 向量轉換：強制走 v1 正式版 API，徹底避開 404 報錯 (僅 Full 模式使用)
async function generateEmbeddings(text) {
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/text-embedding-004:embedContent?key=${process.env.GEMINI_API_KEY}`, {
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

        // 🟢 模式一：Teaser 誘餌模式 (百萬種矩陣織錦，0 Token 消耗)
        if (mode === 'teaser') {
            console.log("⚡ 啟動零 Token 矩陣織錦誘餌模式...");
            
            const userData = extractUserData(question);
            
            // 1. 動態生成 1 / 1,036,800 的專屬古籍懸念文案
            let teaserResponse = generateUniqueTeaser(
                userData.year, 
                userData.month, 
                userData.day, 
                userData.shi, 
                userData.gender, 
                userData.country, 
                question
            );
            
            // 2. 攔截並計算真太陽時警告
            let timeWarning = `\n\n<br><strong>【系統專業提示：真太陽時精密校正】</strong><br>`;
            if (userData.city && userData.shi) {
                const watchTime = calculateLocalWatchTime(userData.city, userData.shi);
                if (watchTime) {
                    timeWarning += `系統偵測您的出生地為「${userData.city}」。因地球自轉與地理經緯度影響，當地真正的「${userData.shi}」對應鐘錶時間為 <strong style="color:#38bdf8;">${watchTime}</strong>。請於下方付款解鎖前，務必確認您確實出生於此時間段內，以免排盤失準，差之毫釐，謬以千里。`;
                } else {
                    timeWarning += `本系統將依據您的出生國家與城市啟動「真太陽時」精確校正。地理位置往往有 15-20 分鐘誤差，請於解鎖前確認您的出生時辰精確無誤。`;
                }
            } else {
                timeWarning += `本系統將依據您的出生地啟動「真太陽時」校正。請確認出生時辰精確無誤。`;
            }
            
            // 3. 瞬間回傳
            return teaserResponse + timeWarning;
        }

        // 🔴 模式二：Full 深度大批模式 (花費 Token，軍事級防幻覺協議)
        console.log("[1/3] 正在轉換向量 (長篇模式)...");
        let contexts = "";
        const queryEmbedding = await generateEmbeddings(question);
        
        if (queryEmbedding) {
            console.log("[2/3] 正在 Pinecone 檢索古籍...");
            const searchResults = await index.query({ vector: queryEmbedding, topK: 3, includeMetadata: true });
            contexts = searchResults.matches.map(match => match.metadata.text).join('\n\n');
        }

        console.log(`[3/3] 正在呼叫 Gemini 生成 2500 字深度命理報告...`);
        
        const prompt = `
        你是一位精通《滴天髓》、《三命通會》與《紫微斗數全書》的頂尖命理學泰斗。
        
        【零幻覺嚴格協議 (Zero-Hallucination Protocol)】：
        1. 數據絕對忠誠：務必像電腦編譯器一樣，精確讀取下方 <ClientData> 內的資料。絕對不可竄改出生年、月、日、時與性別。是女命就絕對是坤造，是男命就絕對是乾造。
        2. 古籍絕對嚴謹：你的論述必須基於正統命理學理，絕對不可自己捏造或發明不存在的古籍經文或星曜賦文。
        
        【時空基準】：今天是「${currentDateStr}」，所有的流年歲運推演必須以此日期為現在的時間點。
        
        請為使用者撰寫一份至少 2500 字以上，極度精密、深度超越以往的「專屬流年大批報告」。
        報告必須具備以下【史詩級學理結構】：
        
        第一部分：【資訊核實與命盤定海神針】
        以「親愛的緣主，以下是您提供的命理資訊：」起頭，一字不差地重述其輸入的資料，並自行在心中轉換為正確的八字與紫微盤。
        
        第二部分：【八字宏觀氣象 (融合三命通會與滴天髓)】
        - 運用《三命通會》定出格局層次與神煞。
        - 運用《滴天髓》分析日主的五行氣勢、強弱、調候與喜忌。
        
        第三部分：【紫微微觀精準落點 (基於紫微斗數全書)】
        - 點出命宮、身宮的主星性質，以及三方四正的吉凶煞星交會。
        - 結合原局四化，精準刻畫其潛在的性格矛盾與天賦優勢。
        
        第四部分：【紫八交叉驗證與 ${today.getFullYear()} 年大勢推演】
        - 這是一份報告的靈魂！必須指出八字的「流年大運干支」與紫微的「流年命宮、流年四化」是如何在今年產生共振的。
        - 針對客戶的提問（如事業、姻緣、財富），給出具體的月份轉折點與現象預測。
        
        第五部分：【大師戰略級行動指南】
        給出極度務實、可操作的避險與進攻策略，拒絕空泛的套話。
        
        ${contexts ? `【Pinecone 古籍文獻參考 (請精準引用)】：\n${contexts}\n` : ''}
        
        <ClientData>\n${question}\n</ClientData>
        `;

        const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });
        const result = await model.generateContent(prompt);
        return result.response.text();

    } catch (error) {
        console.error("RAG 發生錯誤:", error);
        throw error;
    }
}

module.exports = { generateMasterResponse };