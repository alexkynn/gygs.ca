require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const nodemailer = require('nodemailer');

// 如果你有用到 city-timezones 等其他自訂套件，請保留在這裡
// const cityTimezones = require('city-timezones'); 

const app = express();
const port = process.env.PORT || 3000;

// 初始化 Gemini API (請確保 Render 有設定 GEMINI_API_KEY 環境變數)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 設定 Email 發送器 (請確保 Render 有設定 EMAIL_USER 與 EMAIL_PASS 環境變數)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

app.use(cors());
app.use(express.json());

// 全域安全標頭與靜態資源快取優化
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'public, max-age=3600, must-revalidate');
    next();
});

// 設定靜態檔案資料夾 (讓 Express 可以讀取你的 index.html 與圖片)
app.use(express.static(__dirname));

// 🌟 共用的 Gemini 大腦函數 🌟
async function generateLifeBlueprint(country, city, date, timeIndex, gender, question) {
    // 這裡我們直接把系統指令寫入 systemInstruction，確保 AI 永遠保持人生教練的溫暖語氣
    const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-pro",
        systemInstruction: `你是一位充滿智慧、具備深厚同理心，且精通東西方哲學與數據分析的人生教練（Life Coach）。你現在正透過 gygs.ca 為來訪者提供人生導航與決策諮詢。本系統已為你全面打通「微觀紫微命盤」與「宏觀八字氣候」雙引擎，並已為你完成精密的真太陽時校正與南北半球調候。你擁有最精準的客觀變數。\n\n【你的核心對話守則】\n1. 語氣與口吻：請像一位認識多年的忘年之交或導師，語氣溫暖、誠懇、充滿鼓勵。避免使用過度冰冷生硬的「量化、對沖、資產矩陣」等生澀術語，而是將這些數據轉化為生活化、接地氣的建議。\n2. 絕對去迷信化（Free Will First）：嚴禁使用任何命定論、宿命論、血光之災、或因果業障等恐嚇性說法。請將命盤中的「凶星或沖剋」解釋為「成長的挑戰、需要調整的心態、或是環境的波動期」；將「吉星」解釋為「你與生俱來的優勢與順流的方向」。\n3. 具體且有建設性：傾聽使用者的訴求，先同理他們的處境，再結合紫微與八字的數據，提供 2 到 3 個「具體、可執行、能落實於日常生活或工作」的前進方向。幫助他們看見盲點，找回內心的安定與力量。\n\n【天文調候特別指令】\n若數據提示使用者出生於「南半球」，請務必依據知識庫，將其月令的五行氣候做180度反轉（例如南半球的12月對應北半球的火旺盛夏），並以溫和的方式將氣候對個人身心與環境的影響融入你的分析中。`
    }); 
    
    const prompt = `
        來訪者資料：
        - 出生地：${country} ${city} (請執行真太陽時校正)
        - 出生日期：${date}
        - 時辰索引：${timeIndex}
        - 性別：${gender}
        - 探索訴求：${question}
        
        請根據以上資訊，為他梳理專屬的人生藍圖。
    `;

    const result = await model.generateContent(prompt);
    return result.response.text();
}

// 🟢 網頁即時顯示用的 API (/api/ask-chart)
app.post('/api/ask-chart', async (req, res) => {
    const { country, city, date, timeIndex, gender, question } = req.body;

    try {
        const answer = await generateLifeBlueprint(country, city, date, timeIndex, gender, question);
        res.json({ success: true, answer: answer });
    } catch (error) {
        console.error('AI Generation Error:', error);
        res.status(500).json({ success: false, message: "伺服器運算時發生錯誤，請稍後再試。" });
    }
});

// 🔵 寄送 Email 完整報告用的 API (/api/send-report)
app.post('/api/send-report', async (req, res) => {
    const { email, country, city, date, timeIndex, gender, question } = req.body;

    try {
        // 1. 呼叫共用函數產出內容
        const aiReport = await generateLifeBlueprint(country, city, date, timeIndex, gender, question);
        
        // 2. 將換行符號轉為 HTML 的 <br>，確保 Email 內文排版正常
        const formattedReport = aiReport.replace(/\n/g, '<br>');

        // 3. 設定 Email 內容與 RWD 自適應精美排版
        const mailOptions = {
            from: `"gygs.ca 人生導航" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: '【gygs.ca】您的專屬人生藍圖與決策指南',
            html: `
                <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 650px; margin: 0 auto; background-color: #ffffff; padding: 20px;">
                    <h2 style="color: #38bdf8; text-align: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 10px;">專屬人生藍圖</h2>
                    <p style="font-size: 16px;">親愛的朋友，您好：</p>
                    <p style="font-size: 16px;">感謝您使用 <strong>gygs.ca</strong>。根據您提供的出生資訊與目前面臨的訴求，我們為您梳理了專屬的人生指南，希望能為您的下一步提供清晰的視野與方向：</p>
                    
                    <div style="background-color: #f8fafc; padding: 30px; border-radius: 12px; margin: 25px 0; border: 1px solid #e2e8f0; color: #1e293b; font-size: 15px;">
                        ${formattedReport}
                    </div>
                    
                    <p style="color: #64748b; font-size: 14px; text-align: center; margin-top: 40px; border-top: 1px solid #f1f5f9; padding-top: 20px;">
                        願這份藍圖能帶給您安定與前進的力量。<br><br>
                        <strong>gygs.ca 團隊 敬上</strong>
                    </p>
                </div>
            `
        };

        // 4. 執行寄件
        await transporter.sendMail(mailOptions);
        
        res.json({ success: true, message: "報告已成功寄出！" });

    } catch (error) {
        console.error('Email sending error:', error);
        res.status(500).json({ success: false, message: "寄送信件時發生伺服器錯誤，請確認您的信箱是否填寫正確。" });
    }
});

// 啟動伺服器
app.listen(port, () => {
    console.log(`gygs.ca 伺服器已啟動，正在監聽 Port ${port}`);
});