require('dotenv').config();
const { Pinecone } = require('@pinecone-database/pinecone');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const index = pc.Index("gygs-knowledge");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 🔴 修正 3：移除 body 裡面多餘的 model 屬性，徹底消滅 404
async function generateEmbeddings(text) {
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${process.env.GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content: { parts: [{ text: text }] }
            })
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error?.message || "向量 API 拒絕連線");
        }
        return data.embedding.values;
    } catch (error) {
        console.log("⚠️ 向量轉換失敗，細節:", error.message);
        return null; 
    }
}

async function generateMasterResponse(question, mode = 'teaser') {
    try {
        let contexts = "";

        if (mode === 'full') {
            console.log("[1/3] 正在將使用者問題轉換為向量 (長篇模式)...");
            const queryEmbedding = await generateEmbeddings(question);

            if (queryEmbedding) {
                console.log("[2/3] 正在 Pinecone 檢索...");
                const searchResults = await index.query({
                    vector: queryEmbedding,
                    topK: 3, 
                    includeMetadata: true
                });
                contexts = searchResults.matches.map(match => match.metadata.text).join('\n\n');
                console.log("✅ 古籍檢索成功！");
            }
        } else {
            console.log("⚡ 啟動閃電誘餌模式...");
        }

        console.log(`[3/3] 正在呼叫 Gemini 生成最終命理報告 (模式: ${mode})...`);
        
        const today = new Date();
        const currentDateStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;
        
        let prompt = "";
        
        if (mode === 'teaser') {
            prompt = `
            你是一位精通《滴天髓》的命理大師。
            請針對使用者的問題，給出 50 到 80 字之間的精簡回答。
            只給出核心結論或關鍵暗示，語氣要專業神秘。
            使用者問題：${question}
            `;
        } else {
            // 🔴 修正 4：下達死命令，嚴格綁死性別與出生日期
            prompt = `
            你是一位精通《滴天髓》與《三命通會》的頂尖命理大師。
            
            【絕對禁止事項（違反將導致嚴重錯誤）】：
            1. 絕對不可捏造或更改來訪者的性別與出生日期。
            2. 絕對不可把女命寫成乾造（男命）。
            3. 時空基準：今天的真實日期是「${currentDateStr}」，所有的推演必須以此為出發點。
            
            請根據以下古籍文獻，為使用者進行約 2000 字的命盤與流年解析。
            
            【嚴格寫作守則】：
            1. 報告開頭第一段，必須精確讀取下方的【來訪者真實命盤資料】，並以「親愛的緣主，以下是您提供的命理資訊：」起頭，完整列出其西曆出生日期、性別與提問。
            2. 請自行在心中將其西曆日期轉換為正確的八字，並為其解析。
            3. 給出具體的「${today.getFullYear()}年流年運勢」與「行動建議」。
            
            ${contexts ? `【古籍文獻參考】：\n${contexts}\n` : ''}
            
            ${question}
            `;
        }

        const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });
        const result = await model.generateContent(prompt);
        
        return result.response.text();
    } catch (error) {
        console.error("RAG 發生錯誤:", error);
        throw error;
    }
}

module.exports = { generateMasterResponse };