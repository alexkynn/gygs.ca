require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require("@google/generative-ai");
const nodemailer = require('nodemailer');
const crypto = require('crypto'); // 🟢 用來驗證 Lemon Squeezy 的安全簽章
const puppeteer = require('puppeteer'); // 🟢 100% 免費的 in-house PDF 生成引擎

// 🟢 引入 RAG AI 命理檢索大腦
const { generateMasterResponse } = require('./ragService');

const app = express();
const port = process.env.PORT || 3000;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 👇 發信系統檢查
console.log("【發信系統檢查】信箱帳號抓取結果：", process.env.EMAIL_USER);
console.log("【發信系統檢查】信箱密碼抓取結果：", process.env.EMAIL_PASS ? "有抓到密碼 (長度: " + process.env.EMAIL_PASS.length + ")" : "空值 (undefined)");

// 🔴 IONOS 專屬 SMTP 伺服器
const transporter = nodemailer.createTransport({
    host: 'smtp.ionos.com',
    port: 465,
    secure: true, 
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    tls: { rejectUnauthorized: false },
    connectionTimeout: 10000, 
    greetingTimeout: 10000,
    socketTimeout: 10000
});

app.use(cors());

// 🟢 保留原始的 Buffer 資料，這是驗證 Lemon Squeezy 簽章的關鍵
app.use(express.json({
    verify: (req, res, buf) => {
        req.rawBody = buf;
    }
}));

app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'public, max-age=3600, must-revalidate');
    next();
});

app.use(express.static(__dirname));

// 🌟 共用的 Gemini 大腦函數 (只負責網頁即時對話生成)
async function generateLifeBlueprint(country, city, date, timeIndex, gender, question) {
    const genderZh = gender === 'male' ? '男' : (gender === 'female' ? '女' : gender);
    const systemInstruction = `你是一位頂級的東方命理大師兼首席人生教練。精通『紫微斗數』與『四柱八字』。
    
【你的底層運算邏輯：紫八合一】
將八字五行與紫微斗數完美混合計算。若來訪者在南半球，需自動進行節氣調候校正。

【你的表達守則】
1. 溫暖、專業、賦能：拒絕宿命論。
2. 極度具體：遇到高峰或低谷，『必須』明確點出具體的「年份」或「歲數區間」。
3. 嚴謹詳實：請給出超過 3000 字的深度解析，排版清晰。`;

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
    
    const prompt = `請為以下來訪者撰寫【先天命盤大批（全方位人生藍圖解析）】。
出生地：${country} ${city}（請自動進行真太陽時校正）
出生日期：${date}
時辰索引：${timeIndex} (0=子時, 1=丑時...11=亥時)
性別：${genderZh}
探索訴求：${question}

結構要求：
一、 紫八合一核心總評
二、 十二宮位全景深度解析
三、 專屬姻緣與子息報告
四、 事業版圖與高峰預測
五、 財富軌跡與週期報告
六、 健康預警系統
七、 人生教練的最終指引`;

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
// 🟢 RAG 核心 API 路由 (Pinecone + Gemini)
// ==========================================
app.post('/api/ask', async (req, res) => {
    try {
        const userQuestion = req.body.question;
        if (!userQuestion) {
            return res.status(400).json({ success: false, error: "請提供問題內容" });
        }
        console.log(`\n💬 收到使用者提問: "${userQuestion}"`);
        const answer = await generateMasterResponse(userQuestion, 'teaser');
        res.json({ success: true, answer: answer });
    } catch (error) {
        console.error("API 端點執行時發生未預期錯誤:", error);
        res.status(500).json({ success: false, error: "伺服器內部發生錯誤，請稍後再試。" });
    }
});

// ==========================================
// 🟢 產生 Lemon Squeezy 動態結帳連結
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
                        checkout_data: { email: email, custom: { user_question: question, user_birth: birthData } },
                        product_options: {
                            enabled_variants: [parseInt(process.env.LEMON_VARIANT_ID)],
                            redirect_url: "https://gygs.ca/?status=success",       // 🟢 加上 ?status=success 參數，以便前端辨識並保留畫面
                            receipt_link_url: "https://gygs.ca",   
                            receipt_button_text: "返回 gygs.ca 首頁" 
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
            console.error("Lemon Squeezy API 錯誤:", JSON.stringify(data.errors, null, 2));
            return res.status(500).json({ success: false, message: "無法建立結帳連結" });
        }
        res.json({ success: true, checkoutUrl: data.data.attributes.url });
    } catch (error) {
        console.error("建立結帳連結失敗:", error);
        res.status(500).json({ success: false, message: "伺服器錯誤" });
    }
});

// ==========================================
// 🟢 Lemon Squeezy Webhook (含 PDF 動態生成與寄送)
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
            
            const customData = payload.meta.custom_data || payload.data.attributes?.custom_data || {};
            const userQuestion = customData.user_question || "未提供具體提問";
            let userBirth = customData.user_birth || "未提供生辰資料";

            userBirth = userBirth.replace('性別:female', '性別：女命（坤造）')
                                 .replace('性別:male', '性別：男命（乾造）')
                                 .replace('時辰:0', '時辰：子時').replace('時辰:1', '時辰：丑時')
                                 .replace('時辰:2', '時辰：寅時').replace('時辰:3', '時辰：卯時')
                                 .replace('時辰:4', '時辰：辰時').replace('時辰:5', '時辰：巳時')
                                 .replace('時辰:6', '時辰：午時').replace('時辰:7', '時辰：未時')
                                 .replace('時辰:8', '時辰：申時').replace('時辰:9', '時辰：酉時')
                                 .replace('時辰:10', '時辰：戌時').replace('時辰:11', '時辰：亥時');

            console.log(`✅ 收到付款！準備為 ${customerEmail} 撰寫報告...`);
            console.log(`🔍 翻譯後的命盤資料: ${userBirth}`); 

            const finalPromptForAI = `【來訪者真實命盤資料】：${userBirth}\n【來訪者提問】：${userQuestion}`;
            res.status(200).send('Webhook received');

            // 呼叫大腦生成 3000 字大批 ('full' 模式)
            generateMasterResponse(finalPromptForAI, 'full').then(async (reportContent) => {
                let formattedReport = reportContent.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                
                // 🟢 準備 PDF 專用的 HTML 結構
                const pdfHtmlContent = `
                <!DOCTYPE html>
                <html lang="zh-TW">
                <head>
                    <meta charset="UTF-8">
                    <style>
                        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.8; color: #333; padding: 40px; background-color: #ffffff; }
                        h2 { color: #8e44ad; text-align: center; border-bottom: 2px solid #8e44ad; padding-bottom: 10px; margin-bottom: 5px; }
                        .subtitle { text-align: center; color: #64748b; font-size: 14px; margin-bottom: 30px; }
                        .content { background-color: #f8fafc; padding: 30px; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 14px; text-align: justify; }
                        strong { color: #1e293b; }
                    </style>
                </head>
                <body>
                    <h2>gygs.ca 專屬人生戰略導航</h2>
                    <div class="subtitle">先天命盤大批・流年專屬藍圖</div>
                    <div class="content">${formattedReport}</div>
                </body>
                </html>
                `;

                // 🟢 使用 Puppeteer 產生記憶體內的 PDF Buffer
                console.log(`📄 正在生成 PDF 報告...`);
                const browser = await puppeteer.launch({ 
                    headless: "new", 
                    args: ['--no-sandbox', '--disable-setuid-sandbox'] // 確保在伺服器環境順利運行
                });
                const page = await browser.newPage();
                await page.setContent(pdfHtmlContent, { waitUntil: 'networkidle0' });
                const pdfBuffer = await page.pdf({ 
                    format: 'A4', 
                    printBackground: true, 
                    margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' } 
                });
                await browser.close();

                const mailOptions = {
                    from: `"gygs.ca 人生導航" <${process.env.EMAIL_USER}>`,
                    to: customerEmail,
                    subject: '【gygs.ca】五庫全書・專屬命理戰略解析報告已完成',
                    html: `
                        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.8; color: #333; max-width: 750px; margin: 0 auto; background-color: #ffffff; padding: 20px;">
                            <p style="font-size: 16px;">親愛的朋友，您好：</p>
                            <p style="font-size: 16px;">感謝您的耐心等候。我們的 AI 命理大腦已自向量資料庫中提取五大古籍之精髓，結合真太陽時校正，並為您運算了專屬的開運密碼與 10 年運勢曲線圖。</p>
                            <p style="font-size: 16px; color: #8e44ad; font-weight: bold;">
                                👉 您的專屬戰略報告已轉換為高畫質 PDF 檔，請見本信件附件。
                            </p>
                            <p style="color: #64748b; font-size: 14px; text-align: center; margin-top: 40px; border-top: 1px solid #f1f5f9; padding-top: 20px;">
                                願這份集結古人智慧的藍圖，能為您的下一步提供清晰的視野與無懼的力量。<br><br>
                                <strong>gygs.ca 團隊 敬上</strong>
                            </p>
                        </div>
                    `,
                    attachments: [
                        {
                            filename: 'gygs_strategy_report.pdf',
                            content: pdfBuffer,
                            contentType: 'application/pdf'
                        }
                    ]
                };
                await transporter.sendMail(mailOptions);
                console.log(`📩 報告及 PDF 附件已成功寄送給：${customerEmail}`);
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