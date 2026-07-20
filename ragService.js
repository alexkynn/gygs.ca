require('dotenv').config();
const { Pinecone } = require('@pinecone-database/pinecone');
const { GoogleGenerativeAI } = require("@google/generative-ai");

// 初始化環境
const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const index = pc.Index("gygs-knowledge");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ==========================================
// 🔴 終極修復：完全捨棄 SDK 呼叫 Embedding，改用最穩定的原生 Fetch
// ==========================================
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
        console.log("⚠️ 向量轉換暫時失敗，錯誤細節:", error.message);
        return null; // 容錯機制
    }
}

// 主力生成大腦
async function generateMasterResponse(question, mode = 'teaser') {
    try {
        let contexts = "";

        if (mode === 'full') {
            console.log("[1/3] 正在將使用者問題轉換為向量 (長篇模式)...");
            const queryEmbedding = await generateEmbeddings(question);

            if (queryEmbedding) {
                console.log("[2/3] 正在 Pinecone 知識庫中檢索最相關的古籍文獻...");
                const searchResults = await index.query({
                    vector: queryEmbedding,
                    topK: 3, 
                    includeMetadata: true
                });
                contexts = searchResults.matches.map(match => match.metadata.text).join('\n\n');
                console.log("✅ 古籍檢索成功，準備融合寫作！");
            }
        } else {
            console.log("⚡ 啟動閃電誘餌模式，繞過向量檢索...");
        }

        console.log(`[3/3] 正在呼叫 Gemini 生成最終命理報告 (模式: ${mode})...`);
        
        // 🟢 取得當前真實世界日期
        const today = new Date();
        const currentDateStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;
        
        let prompt = "";
        
        if (mode === 'teaser') {
            prompt = `
            你是一位精通《滴天髓》與《三命通會》的命理大師。
            今天的確切日期是：${currentDateStr}，請以此為基準。
            請針對使用者的問題，給出 50 到 80 字之間的精簡回答。
            只給出最核心的結論或一個關鍵的暗示，不要給出完整解法，語氣要專業神秘。
            
            使用者問題：${question}
            `;
        } else {
            // 🟢 付費模式：嚴格限制報告結構與日期基準
            prompt = `
            你是一位精通《滴天髓》與《三命通會》的頂尖命理大師。
            【時空基準強制設定】：今天的真實日期是「${currentDateStr}」。所有的流年、歲運推演，絕對必須以 ${today.getFullYear()} 年及其後續年份為基準，絕對不可提及過去年份為未來預測。
            
            請根據以下古籍文獻，為使用者進行深度、詳盡的命盤與流年解析 (約 1500 到 2000 字)。
            
            【嚴格寫作守則】：
            1. 報告開頭第一段，必須以「親愛的緣主，以下是您提供的命理資訊：」起頭，並【完整列出使用者的生辰八字、性別與提問】，絕不可遺漏或顯示 undefined。
            2. 必須引述提供的古籍原文，並將其翻譯為現代白話文解釋。
            3. 給出具體的「${today.getFullYear()}年流年運勢」、「潛在風險」與「行動建議」。
            
            ${contexts ? `【古籍文獻參考】：\n${contexts}\n` : ''}
            
            【使用者傳遞的命盤與提問】：
            ${question}
            `;
        }

        const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });
        const result = await model.generateContent(prompt);
        
        return result.response.text();
    } catch (error) {
        console.error("RAG 處理過程中發生錯誤:", error);
        throw error;
    }
}

module.exports = { generateMasterResponse };