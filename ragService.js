require('dotenv').config();
const { Pinecone } = require('@pinecone-database/pinecone');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const index = pc.Index("gygs-knowledge");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 🔴 終極修復 1：使用官方 SDK，並加入自動降級機制，徹底消滅 404
async function generateEmbeddings(text) {
    try {
        // 首選最新模型
        const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });
        const result = await embeddingModel.embedContent(text);
        return result.embedding.values;
    } catch (error) {
        console.log("⚠️ text-embedding-004 不適用，自動切換至備用模型 embedding-001...");
        try {
            // 備用舊版模型
            const fallbackModel = genAI.getGenerativeModel({ model: "embedding-001" });
            const result = await fallbackModel.embedContent(text);
            return result.embedding.values;
        } catch (fallbackError) {
            console.log("⚠️ 向量轉換模型目前均不可用，系統將自動啟動「無古籍純淨推演模式」。");
            return null; // 優雅降級，不影響最終報告生成
        }
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
            // 🔴 終極修復 2：使用 XML 標籤強制綁定客戶資料，根治「待補」的幻覺
            prompt = `
            你是一位精通《滴天髓》與《三命通會》的頂尖命理大師。
            
            【最高優先級指令】：
            請你務必、絕對要先讀取最下方 <ClientData> 標籤內的【來訪者真實命盤資料】。
            絕對不可說客戶未提供資料，絕對不可捏造出生日期，絕對不可把女命（坤造）寫成男命。
            
            【時空基準】：
            今天的真實日期是「${currentDateStr}」，所有的流年歲運推演必須以此日期為出發點。
            
            請為使用者進行約 2000 字的深度命盤與 ${today.getFullYear()} 年流年解析。
            
            【嚴格寫作守則】：
            1. 報告開頭第一段，請精確讀取 <ClientData> 內的西曆出生日期與性別，並以「親愛的緣主，以下是您提供的命理資訊：」起頭，完整列出。
            2. 請自行在心中將其西曆日期轉換為正確的八字，並為其解析。
            3. 給出具體的流年轉機與行動建議。
            
            ${contexts ? `【古籍文獻參考】：\n${contexts}\n` : ''}
            
            <ClientData>
            ${question}
            </ClientData>
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