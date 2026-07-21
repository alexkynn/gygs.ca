require('dotenv').config();
const { Pinecone } = require('@pinecone-database/pinecone');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const index = pc.Index("gygs-knowledge");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 🔴 向量修復：強制走 v1 正式版 API，避開 404 報錯
async function generateEmbeddings(text) {
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/text-embedding-004:embedContent?key=${process.env.GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: "models/text-embedding-004", // 嚴格符合 v1 規範
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
        console.log("💡 提示：若持續報錯，請在 Google AI Studio 確認該 API Key 是否有啟用 Embedding 模型權限。");
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
            } else {
                console.log("⚠️ 啟動無古籍純淨推演模式。");
            }
        } else {
            console.log("⚡ 啟動閃電誘餌模式...");
        }

        console.log(`[3/3] 正在呼叫 Gemini 生成最終命理報告 (模式: ${mode})...`);
        
        const today = new Date();
        const currentDateStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;
        
        let prompt = "";
        
        if (mode === 'teaser') {
            // 🔴 Teaser 升級：加入真太陽時誤差提醒
            prompt = `
            你是一位精通《滴天髓》、《三命通會》與《紫微斗數全書》的頂尖命理大師。
            請針對使用者的問題，給出 50 到 80 字之間的精簡回答。
            
            【寫作守則】：
            1. 前半段給出命理核心結論或關鍵暗示，語氣要專業神秘。
            2. 後半段務必加上這句專業提醒：「因出生地經緯度差異，真太陽時可能有15-20分鐘誤差。請於解鎖前務必確認時辰無誤，以免排盤失準。」
            
            使用者提問：${question}
            `;
        } else {
            // 🔴 幻覺修復與古籍升級：整合三大古籍，並使用明確的 XML 標籤
            prompt = `
            你是一位精通《滴天髓》、《三命通會》與《紫微斗數全書》的頂尖命理大師。
            
            【最高優先級指令】：
            請你務必先讀取下方 <ClientData> 標籤內的【來訪者真實命盤資料】。
            絕對不可回覆「客戶未提供資料」，絕對不可捏造出生日期，絕對不可更改性別。
            
            【時空基準】：
            今天的真實日期是「${currentDateStr}」，所有的流年歲運推演必須以此日期為出發點。
            
            請為使用者進行約 2000 字的深度命盤與 ${today.getFullYear()} 年流年解析。
            
            【嚴格寫作守則】：
            1. 報告開頭第一段，請精確讀取 <ClientData> 內的西曆出生日期與性別，並以「親愛的緣主，以下是您提供的命理資訊：」起頭，完整列出。
            2. 請自行在心中將其西曆日期轉換為正確的八字與紫微命盤，並為其解析。
            3. 【核心學理要求】：你的每一次分析，必須同時融合《滴天髓》、《三命通會》（八字）與《紫微斗數全書》（紫微）這三本古籍的理論進行交叉分析，缺一不可。請在文中自然地引述這三本書的觀點。
            4. 給出具體的流年轉機與行動建議。
            
            ${contexts ? `【Pinecone 檢索到的古籍文獻參考】：\n${contexts}\n` : ''}
            
            <ClientData>
            ${question}
            </ClientData>
            `;
        }

        // ✅ 使用您確認可用的 gemini-3.5-flash
        const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });
        const result = await model.generateContent(prompt);
        
        return result.response.text();
    } catch (error) {
        console.error("RAG 發生錯誤:", error);
        throw error;
    }
}

module.exports = { generateMasterResponse };