require('dotenv').config();
const { Pinecone } = require('@pinecone-database/pinecone');
const { GoogleGenAI } = require('@google/genai');

// 1. 初始化環境
const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const index = pc.Index("gygs-knowledge");

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function generateMasterResponse(userQuestion) {
    try {
        console.log(`[1/3] 正在將使用者問題轉換為向量...`);
        // 使用與 Python 端完全相同的降維設定
        const embedResponse = await ai.models.embedContent({
            model: 'gemini-embedding-001',
            contents: userQuestion,
            config: { outputDimensionality: 768 }
        });
        const queryVector = embedResponse.embeddings[0].values;

        console.log(`[2/3] 正在 Pinecone 知識庫中檢索最相關的古籍文獻...`);
        // 抓取最相關的 3 筆資料
        const searchResults = await index.query({
            vector: queryVector,
            topK: 3,
            includeMetadata: true
        });

        // 將檢索到的資料組合成字串
        let contextText = "";
        searchResults.matches.forEach((match, i) => {
            contextText += `\n參考資料 ${i + 1} (${match.metadata.category}):\n`;
            contextText += `【古文】: ${match.metadata.classic_text}\n`;
            contextText += `【解析】: ${match.metadata.interpretation}\n`;
        });

        console.log(`[3/3] 正在呼叫 Gemini 生成最終命理報告...`);
        // 設計給 Gemini 的終極提示詞
        const finalPrompt = `
        你是一位極具權威且專業的命理諮詢師。請根據以下我為你檢索出的古籍知識，來回答使用者的問題。
        如果檢索出的資料與問題相關，請務必將其邏輯融入你的回答中。
        如果檢索出的資料不足以完全回答，你可以運用你本身的命理知識來補充，但要保持客觀、專業的語氣。

        【檢索到的專屬知識庫】：
        ${contextText}

        【使用者的問題】：
        ${userQuestion}
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash', // 您可以依需求切換模型
            contents: finalPrompt,
        });

        return response.text;

    } catch (error) {
        console.error("RAG 處理過程中發生錯誤:", error);
        return "抱歉，系統正在調閱古籍資料時遇到阻礙，請稍後再試。";
    }
}

module.exports = { generateMasterResponse };