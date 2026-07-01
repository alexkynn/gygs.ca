require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
// 引入安全設定模組
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require("@google/generative-ai");
const nodemailer = require('nodemailer');

const app = express();
const port = process.env.PORT || 3000;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'public, max-age=3600, must-revalidate');
    next();
});

app.use(express.static(__dirname));

// 🌟 旗艦版：共用的 Gemini 大腦函數 🌟
async function generateLifeBlueprint(country, city, date, timeIndex, gender, question) {
    
    const genderZh = gender === 'male' ? '男' : (gender === 'female' ? '女' : gender);

    const systemInstruction = `你是一位頂級的東方命理大師兼首席人生教練（Life Coach）。你精通『紫微斗數』與『四柱八字』，並具備強大的數據分析與心理諮商能力。
    
【你的底層運算邏輯：紫八合一】
你必須將八字五行（日主、格局、喜忌神）與紫微斗數（十二宮位、四化、星曜）完美混合計算。以八字看先天稟賦與大運氣勢，以紫微看具體事件與人生軌跡。若來訪者在南半球，需自動進行節氣調候校正。

【你的表達守則】
1. 溫暖、專業、賦能：拒絕宿命論。吉星是順流，凶星是逆境中的功課。
2. 極度具體：報告中遇到事業、婚姻、財富、健康的高峰或低谷，『必須』明確點出具體的「年份」或「歲數區間」（例如：2027至2029年、35歲至40歲）。
3. 嚴謹詳實：先天命盤大批是一份極其重要的報告，請給出超過 2000 字的深度解析，言之有物，排版清晰（使用適當的標題與條列式）。`;

    // 🔴 關鍵修復：解除 Gemini 命理預測的安全阻擋 🔴
    const safetySettings = [
        {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
            category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
        },
    ];

    const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-pro",
        systemInstruction: systemInstruction,
        safetySettings: safetySettings // 套用安全設定
    }); 
    
    const prompt = `
請為以下來訪者撰寫一份最詳細、最準確的【先天命盤大批（全方位人生藍圖解析）】深度報告。

【來訪者精確資料】
- 出生地：${country} ${city}（請自動進行真太陽時校正）
- 出生日期：${date}
- 時辰索引：${timeIndex} (0=子時, 1=丑時...11=亥時)
- 性別：${genderZh}
- 探索訴求：${question}

【報告必須嚴格包含以下完整結構】

一、 紫八合一核心總評
綜合八字日主格局與紫微命宮主星，精煉出此人一生的核心天賦、性格特質與人生主軸。

二、 十二宮位全景深度解析
請對紫微斗數的每一個獨立宮位（命宮、兄弟、夫妻、子女、財帛、疾厄、遷移、交友、事業、田宅、福德、父母）進行全面且獨立的分析。必須結合八字喜忌，詳細說明各宮位的潛力、貴人方位與隱憂。

三、 專屬姻緣與子息報告
1. 感情特質與正緣樣貌（會被什麼樣的人吸引？伴侶特徵？）。
2. 姻緣時機：請明確推算並寫出最容易結婚、遇到正緣的「具體年份或歲數區間」。
3. 子息預測：與子女的緣分深淺，以及最適合生小孩的「具體年份」。

四、 事業版圖與高峰預測
1. 適合的產業：結合八字喜用神與紫微事業宮，指出最適合從事的具體行業。
2. 職場定位：適合創業、管理職、還是專業技術人員？
3. 高峰預測：明確指出事業起飛的「黃金高峰期（具體年份/歲數）」，以及需要保守沉潛的轉折期。

五、 財富軌跡與週期報告
1. 財富格局分析：屬於正財穩定、偏財暴發、還是創業致富？
2. 賺錢最高峰：明確指出一生中「賺錢能力達到最高峰的年份或大運區間」。
3. 財富低潮期：精準指出最容易破財、需要防守的「財富低潮年份」，並給予針對性的理財避險策略。

六、 健康預警系統
1. 依據八字五行失衡與紫微疾厄宮，點出先天較弱的器官與容易發生的疾病。
2. 健康低谷預測：精準指出健康需要特別小心、容易出狀況的「高風險具體年份」，並給予具體的日常保養建議。

七、 人生教練的最終指引
根據上述所有分析，給予 3 個最落地、最具突破性的人生行動建議。

請以繁體中文撰寫，語氣充滿智慧且具備溫暖的引導力量，並確保內容極度豐富詳實。
`;

    const result = await model.generateContent(prompt);
    return result.response.text();
}

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

app.post('/api/send-report', async (req, res) => {
    const { email, country, city, date, timeIndex, gender, question } = req.body;

    try {
        const aiReport = await generateLifeBlueprint(country, city, date, timeIndex, gender, question);
        
        let formattedReport = aiReport.replace(/\n/g, '<br>');
        formattedReport = formattedReport.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

        const mailOptions = {
            from: `"gygs.ca 人生導航" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: '【gygs.ca】您的先天命盤大批（全方位人生藍圖解析）',
            html: `
                <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.8; color: #333; max-width: 700px; margin: 0 auto; background-color: #ffffff; padding: 20px;">
                    <h2 style="color: #38bdf8; text-align: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 15px;">先天命盤大批<br><span style="font-size: 16px; color: #64748b;">全方位人生藍圖解析</span></h2>
                    
                    <p style="font-size: 16px;">親愛的朋友，您好：</p>
                    <p style="font-size: 16px;">感謝您使用 <strong>gygs.ca</strong>。根據您提供的出生資訊，我們為您結合「紫微斗數」與「四柱八字」雙引擎系統，進行了最高規格的精密運算。</p>
                    <p style="font-size: 16px;">以下為您量身打造的全景人生報告，涵蓋了十二宮位、姻緣、事業、財富與健康預測，請耐心閱讀：</p>
                    
                    <div style="background-color: #f8fafc; padding: 30px; border-radius: 12px; margin: 30px 0; border: 1px solid #e2e8f0; color: #1e293b; font-size: 15px; text-align: justify;">
                        ${formattedReport}
                    </div>
                    
                    <p style="color: #64748b; font-size: 14px; text-align: center; margin-top: 40px; border-top: 1px solid #f1f5f9; padding-top: 20px;">
                        願這份藍圖能為您的下一步提供清晰的視野與前進的力量。<br><br>
                        <strong>gygs.ca 團隊 敬上</strong>
                    </p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        res.json({ success: true, message: "報告已成功寄出！" });

    } catch (error) {
        console.error('Email sending error:', error);
        res.status(500).json({ success: false, message: "寄送信件時發生伺服器錯誤，請確認您的信箱是否填寫正確。" });
    }
});

app.listen(port, () => {
    console.log(`gygs.ca 伺服器已啟動，正在監聽 Port ${port}`);
});