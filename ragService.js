require('dotenv').config();
const { Pinecone } = require('@pinecone-database/pinecone');
const { GoogleGenerativeAI } = require("@google/generative-ai");

// 初始化環境
const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const index = pc.Index("gygs-knowledge");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 將文字轉換為向量 (保留給付費長篇報告使用)
async function generateEmbeddings(text) {
    try {
        // 使用最相容的寫法
        const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
        const result = await model.embedContent(text);
        return result.embedding.values;
    } catch (error) {
        console.log("⚠️ 向量轉換暫時失敗，將改用無古籍模式生成");
        return null; // 如果報錯，回傳 null，不要讓程式崩潰
    }
}

// 主力生成大腦
async function generateMasterResponse(question, mode = 'teaser') {
    try {
        let contexts = "";

        // 🟢 您的絕佳點子：如果是誘餌模式，直接跳過 Pinecone 檢索！
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
            }
        } else {
            console.log("⚡ 啟動閃電誘餌模式，繞過向量檢索...");
        }

        console.log(`[3/3] 正在呼叫 Gemini 生成最終命理報告 (模式: ${mode})...`);
        
        let prompt = "";
        
        if (mode === 'teaser') {
            // 免費誘餌模式：不需要 contexts，直接讓大師發揮
            prompt = `
            你是一位精通《滴天髓》與《三命通會》的命理大師。
            請針對使用者的問題，給出一個精簡的回答。
            
            【嚴格限制】：
            1. 字數必須控制在 50 到 80 字之間。
            2. 只給出最核心的結論或一個關鍵的暗示，絕對不要給出完整解法，要留下懸念。
            3. 語氣要專業、神秘。
            4. 寫成一段流暢的文字。
            
            使用者問題：${question}
            `;
        } else {
            // 付費解鎖模式：帶入古籍
            prompt = `
            你是一位精通《滴天髓》與《三命通會》的頂尖命理大師。
            請根據以下古籍文獻，為使用者進行深度、詳盡的命盤與流年解析。
            
            【要求】：
            1. 報告長度約 1500 到 2000 字，結構清晰，使用標題與段落。
            2. ${contexts ? '必須引述提供的古籍原文，並將其翻譯為現代白話文解釋。' : '請運用你深厚的紫微斗數與八字知識進行推演。'}
            3. 給出具體的「流年運勢」、「潛在風險」與「行動建議」。
            4. 語氣要溫暖、踏實。
            
            ${contexts ? `古籍文獻參考：\n${contexts}` : ''}
            
            使用者問題：${question}
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