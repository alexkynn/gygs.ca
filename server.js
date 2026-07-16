require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require("@google/generative-ai");
const nodemailer = require('nodemailer');
const crypto = require('crypto'); // 🟢 新增：用來驗證 Lemon Squeezy 的安全簽章

// 🟢 引入剛寫好的 RAG AI 命理檢索大腦 (新增)
const { generateMasterResponse } = require('./ragService');

const app = express();
const port = process.env.PORT || 3000;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 🔴 關鍵修復：改用明確的 SMTP 設定，解決 Render 的 ETIMEDOUT 連線超時問題 🔴
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // 使用 SSL 加密連線
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    tls: {
        // 放寬雲端伺服器的憑證檢查，防止連線被強制阻擋
        rejectUnauthorized: false 
    },
    // 增加連線等待時間，避免稍微延遲就報錯
    connectionTimeout: 10000, 
    greetingTimeout: 10000,
    socketTimeout: 10000
});

app.use(cors());
// 🟢 替換原有的 app.use(express.json());
app.use(express.json({
    verify: (req, res, buf) => {
        // 保留原始的 Buffer 資料，這是驗證 Lemon Squeezy 簽章的關鍵
        req.rawBody = buf;
    }
}));

app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'public, max-age=3600, must-revalidate');
    next();
});

app.use(express.static(__dirname));

// 🌟 共用的 Gemini 大腦函數 (只負責網頁即時對話生成) 🌟
async function generateLifeBlueprint(country, city, date, timeIndex, gender, question) {
    
    const genderZh = gender === 'male' ? '男' : (gender === 'female' ? '女' : gender);

    const systemInstruction = `你是一位頂級的東方命理大師兼首席人生教練（Life Coach）。你精通『紫微斗數』與『四柱八字』，並具備強大的數據分析與心理諮商能力。
    
【你的底層運算邏輯：紫八合一】
你必須將八字五行（日主、格局、喜忌神）與紫微斗數（十二宮位、四化、星曜）完美混合計算。以八字看先天稟賦與大運氣勢，以紫微看具體事件與人生軌跡。若來訪者在南半球，需自動進行節氣調候校正。

【你的表達守則】
1. 溫暖、專業、賦能：拒絕宿命論。吉星是順流，凶星是逆境中的功課。
2. 極度具體：報告中遇到事業、婚姻、財富、健康的高峰或低谷，『必須』明確點出具體的「年份」或「歲數區間」（例如：2027至2029年、35歲至40歲）。
3. 嚴謹詳實：先天命盤大批是一份極其重要的報告，請給出超過 2000 字的深度解析，言之有物，排版清晰（使用適當的標題與條列式）。`;

    const safetySettings = [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    ];

    const model = genAI.getGenerativeModel({ 
        model: "gemini-3.5-flash", 
        systemInstruction: systemInstruction,
        safetySettings: safetySettings 
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
二、 十二宮位全景深度解析
三、 專屬姻緣與子息報告
四、 事業版圖與高峰預測
五、 財富軌跡與週期報告
六、 健康預警系統
七、 人生教練的最終指引

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

// ==========================================
// 🟢 新增：RAG 核心 API 路由 (Pinecone + Gemini)
// ==========================================
app.post('/api/ask', async (req, res) => {
    try {
        const userQuestion = req.body.question;
        
        if (!userQuestion) {
            return res.status(400).json({ 
                success: false,
                error: "請提供問題內容 (例如：{ \"question\": \"我今年的流年運勢如何？\" })" 
            });
        }

        console.log(`\n💬 收到使用者提問: "${userQuestion}"`);
        
        // 將問題交給 RAG 服務處理
        const answer = await generateMasterResponse(userQuestion, 'teaser');
        
        res.json({ success: true, reply: answer });

    } catch (error) {
        console.error("API 端點執行時發生未預期錯誤:", error);
        res.status(500).json({ success: false, error: "伺服器內部發生錯誤，請稍後再試。" });
    }
});

// ==========================================
// 🟢 新增 1：產生 Lemon Squeezy 動態結帳連結
// ==========================================
app.post('/api/checkout', async (req, res) => {
    try {
        const { email, question, birthData } = req.body;

        const response = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
            method: 'POST',
            headers: {
                'Accept': 'application/vnd.api+json',
                'Content-Type': 'application/vnd.api+json',
                'Authorization': `Bearer ${process.env.LEMON_API_KEY}`
            },
            body: JSON.stringify({
                data: {
                    type: "checkouts",
                    attributes: {
                        checkout_data: {
                            email: email,
                            custom: {
                                user_question: question,
                                user_birth: birthData 
                            }
                        },
                        product_options: {
                            enabled_variants: [parseInt(process.env.LEMON_VARIANT_ID)]
                        }
                    },
                    relationships: {
                        store: { data: { type: "stores", id: process.env.LEMON_STORE_ID.toString() } },
                        variant: { data: { type: "variants", id: process.env.LEMON_VARIANT_ID.toString() } }
                    }
                }
            })
        });

        const data = await response.json();
        
        if (data.errors) {
            console.error("Lemon Squeezy API 錯誤:", data.errors);
            return res.status(500).json({ success: false, message: "無法建立結帳連結" });
        }

        res.json({ success: true, checkoutUrl: data.data.attributes.url });

    } catch (error) {
        console.error("建立結帳連結失敗:", error);
        res.status(500).json({ success: false, message: "伺服器錯誤" });
    }
});

// ==========================================
// 🟢 新增 2：Lemon Squeezy Webhook (含您原本的精美 Email 版型)
// ==========================================
app.post('/api/webhook/lemon', async (req, res) => {
    const signature = req.get('X-Signature');
    const secret = process.env.LEMON_WEBHOOK_SECRET;

    try {
        const hmac = crypto.createHmac('sha256', secret);
        const digest = Buffer.from(hmac.update(req.rawBody).digest('hex'), 'utf8');
        const checksum = Buffer.from(signature || '', 'utf8');

        if (checksum.length !== digest.length || !crypto.timingSafeEqual(digest, checksum)) {
            console.log("❌ Webhook 簽章驗證失敗！");
            return res.status(403).send('Invalid signature');
        }

        const payload = req.body;
        const eventName = payload.meta.event_name;

        if (eventName === 'order_created') {
            const customerEmail = payload.data.attributes.user_email;
            const customData = payload.data.attributes.custom_data || {};
            const userQuestion = customData.user_question;

            console.log(`✅ 收到付款！即將開始為 ${customerEmail} 撰寫報告...`);
            res.status(200).send('Webhook received');

            // 呼叫大腦生成 2000 字大批 ('full' 模式)
            generateMasterResponse(userQuestion, 'full').then(async (reportContent) => {
                let formattedReport = reportContent.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                
                const mailOptions = {
                    from: `"gygs.ca 人生導航" <${process.env.EMAIL_USER}>`,
                    to: customerEmail,
                    subject: '【gygs.ca】您的付費專屬命理解析報告已完成',
                    html: `
                        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.8; color: #333; max-width: 700px; margin: 0 auto; background-color: #ffffff; padding: 20px;">
                            <h2 style="color: #38bdf8; text-align: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 15px;">先天命盤大批<br><span style="font-size: 16px; color: #64748b;">深度流年專屬藍圖解析</span></h2>
                            
                            <p style="font-size: 16px;">親愛的朋友，您好：</p>
                            <p style="font-size: 16px;">感謝您的付費解鎖。根據您的提問與命盤，大師已為您完成深度推演：</p>
                            
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
                console.log(`📩 報告已成功寄送給：${customerEmail}`);
            }).catch(err => console.error("背景生成或寄信失敗:", err));

        } else {
            res.status(200).send('Event ignored');
        }

    } catch (error) {
        console.error("Webhook 處理失敗:", error);
        res.status(500).send('Webhook error');
    }
});

app.listen(port, () => {
    console.log(`gygs.ca 伺服器已啟動，正在監聽 Port ${port}`);
    console.log(`🔮 RAG 命理檢索 API 已就緒: POST http://localhost:${port}/api/ask`);
});