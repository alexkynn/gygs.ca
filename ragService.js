require('dotenv').config();
const { Pinecone } = require('@pinecone-database/pinecone');
// 🟢 修正：使用與 server.js 相同的 @google/generative-ai，確保語法相容
const { GoogleGenerativeAI } = require("@google/generative-ai");

// 1. 初始化環境
const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const index = pc.Index("gygs-knowledge");

// 🟢 修正：宣告 genAI 變數，讓下方的模型可以順利呼叫
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function generateEmbeddings(text) {
    // 使用 Gemini 的 embedding 模型
    const model = genAI.getGenerativeModel({ model: "embedding-001" });
    const result = await model.embedContent(text);
    return result.embedding.values;
}

// 加入 mode 參數，預設為 'teaser' (誘餌)
async function generateMasterResponse(question, mode = 'teaser') {
    try {
        console.log(`[1/3] 正在將使用者問題轉換為向量 (模式: ${mode})...`);
        const queryEmbedding = await generateEmbeddings(question);

        console.log("[2/3] 正在 Pinecone 知識庫中檢索最相關的古籍文獻...");
        const searchResults = await index.query({
            vector: queryEmbedding,
            topK: 3, 
            includeMetadata: true
        });

        const contexts = searchResults.matches.map(match => match.metadata.text).join('\n\n');

        console.log("[3/3] 正在呼叫 Gemini 生成最終命理報告...");
        
        // 🟢 雙軌提示詞系統
        let prompt = "";
        
        if (mode === 'teaser') {
            // 免費誘餌模式：只給 50 字，勾起好奇心
            prompt = `
            你是一位精通《滴天髓》與《三命通會》的命理大師。
            請根據以下古籍文獻，回答使用者的問題。
            
            【嚴格限制】：
            1. 字數必須控制在 50 到 80 字之間。
            2. 只給出最核心的結論或一個關鍵的吉凶暗示，不要給出完整解法。
            3. 語氣要專業、神秘且具備權威感。
            4. 不要使用條列式，請寫成一段完整的流暢文字。
            
            古籍文獻參考：
            ${contexts}
            
            使用者問題：${question}
            `;
        } else {
            // 付費解鎖模式：產出 2000 字深度解析
            prompt = `
            你是一位精通《滴天髓》與《三命通會》的頂尖命理大師。
            請根據以下古籍文獻，為使用者進行深度、詳盡的命盤與流年解析。
            
            【要求】：
            1. 報告長度約 1500 到 2000 字，結構清晰，使用標題與段落。
            2. 必須引述提供的古籍原文，並將其翻譯為現代白話文解釋。
            3. 針對使用者的問題，給出具體的「流年運勢」、「潛在風險」與「行動建議」。
            4. 語氣要溫暖、踏實且具備高度專業性。
            
            古籍文獻參考：
            ${contexts}
            
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