require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require("@google/generative-ai");
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const puppeteer = require('puppeteer');

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
    const systemInstruction = `你是一位頂級的東方命理大師兼首席人生教練。精通『紫微斗數』與『四柱八字』，同時也是 Saju-MBTI (命理與心理學交叉分析) 的頂尖專家。
    
【你的底層運算邏輯：紫八合一】
將八字五行與紫微斗數完美混合計算。若來訪者在南半球，需自動進行節氣調候校正。

【你的表達守則】
1. 溫暖、專業、賦能：拒絕宿命論。
2. 極度具體：遇到高峰或低谷，『必須』明確點出具體的「年份」或「歲數區間」。
3. 嚴謹詳實：請給出超過 10000 字的深度解析，排版清晰。`;

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
一、 基本資訊與先天定盤（含真太陽時、八字視角與紫微視角總論）
二、 八字格局與專屬開運密碼（含五行喜忌剖析與行為套利策略）
三、 四柱神煞詳解與調候樞紐分析
四、 紫微斗數全景與十二宮位深度解析（需涵蓋命身宮及其他十宮之具體指引）
五、 未來 10 年運勢推演（需包含週期定調與黑天鵝風險警示）
六、 大師戰略行動指南（針對探索訴求的專屬破局方案、關鍵時間節點與避險戰略）
七、 Saju-MBTI 心理與命理深度交叉分析（性格助力與命理共鳴、認知盲區與專屬溝通執行套利策略）`;

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
                            redirect_url: "https://gygs.ca/?status=success",
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
// 🟢 Lemon Squeezy Webhook (含高階 PDF 動態生成與寄送)
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

            const finalPromptForAI = `【來訪者真實命盤資料】：${userBirth}\n【來訪者提問】：${userQuestion}`;
            res.status(200).send('Webhook received');

            generateMasterResponse(finalPromptForAI, 'full').then(async (reportContent) => {
                
                // 🟢 階層化 DOM 轉換
                let htmlFormattedReport = reportContent
                    .replace(/^#### (.*$)/gim, '<h4>$1</h4>') // 1.1.1
                    .replace(/^### (.*$)/gim, '<h3>$1</h3>')  // 1.1
                    .replace(/^## (.*$)/gim, '<h2>$1</h2>')   // 1.
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\n\n/g, '</p><p>')
                    .replace(/\n/g, '<br>');
                
                htmlFormattedReport = `<p>${htmlFormattedReport}</p>`
                    .replace(/<p><\/p>/g, '') 
                    .replace(/<br><\/p>/g, '</p>'); 

                // 🟢 修復標題與內文分離問題：移除標題周圍干擾斷頁的 <br> 與 <p> 標籤，確保標題與內文緊密相連
                htmlFormattedReport = htmlFormattedReport.replace(/(<\/h[234]>)<br>/gi, '$1');
                htmlFormattedReport = htmlFormattedReport.replace(/(<\/h[234]>)<\/p><p>/gi, '$1');
                htmlFormattedReport = htmlFormattedReport.replace(/<p>(<h[234]>)/gi, '$1');
                htmlFormattedReport = htmlFormattedReport.replace(/(<\/h[234]>)<\/p>/gi, '$1');
                
                // 🟢 統一分頁防護黑科技 (Unified Page Break Instructions)
                // 將 <h4> 區塊 (例如 2.3.2 或 6.4.2) 獨立打包，若本頁塞不下自動整體移至下頁，避免子段落被腰斬
                htmlFormattedReport = htmlFormattedReport.replace(/(<h4>[\s\S]*?)(?=<h[234]>|$)/gi, '<div class="h4-subsection" style="page-break-inside: avoid; break-inside: avoid;">$1</div>');
                
                // 🟢 加入官方報告運算終了聲明
                htmlFormattedReport += `<div style="text-align: center; font-weight: bold; color: #8e44ad; font-size: 16px; margin-top: 40px; padding-top: 20px; border-top: 1px dashed #cbd5e1; page-break-inside: avoid; break-inside: avoid;">—— gygs.ca 專屬人生戰略報告 運算終了 ——</div>`;
                
                // 讀取 Logo 並轉換為 base64
                let logoBase64 = '';
                try {
                    const logoPath = path.join(__dirname, 'gygs_galaxy_logo.png');
                    if (fs.existsSync(logoPath)) {
                        const logoData = fs.readFileSync(logoPath);
                        logoBase64 = `data:image/png;base64,${logoData.toString('base64')}`;
                    }
                } catch (err) {
                    console.error("⚠️ 讀取 Logo 發生錯誤:", err);
                }

                // 🟢 高階列印專用 CSS
                const pdfHtmlContent = `
                <!DOCTYPE html>
                <html lang="zh-TW">
                <head>
                    <meta charset="UTF-8">
                    <style>
                        html, body { 
                            margin: 0 !important; 
                            padding: 0 !important; 
                            font-family: 'SF Pro Display', 'Helvetica Neue', Helvetica, Arial, sans-serif; 
                            color: #1e293b; 
                            background-color: #ffffff;
                        }
                        
                        /* 🟢 首頁封面區塊 */
                        .cover-page {
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            gap: 20px;
                            padding-top: 20vh;
                            padding-bottom: 25px;
                            margin-bottom: 0;
                            page-break-after: always;
                            break-after: page;
                        }
                        .logo-img { max-width: 90px; border-radius: 8px; }
                        .title-group { text-align: left; }
                        h1.main-title { color: #8e44ad; margin: 0 0 5px 0; font-size: 28px; letter-spacing: 1px; border: none; padding: 0; }
                        .subtitle { color: #64748b; font-size: 16px; font-weight: bold; }
                        
                        /* 內文排版 */
                        .content-container { font-size: 14.5px; line-height: 1.8; text-align: justify; }
                        
                        /* 🟢 七大章節嚴格斷頁系統 */
                        h2 { 
                            color: #8e44ad; 
                            font-size: 20px;
                            border-bottom: 1px solid #e2e8f0; 
                            padding-bottom: 6px; 
                            margin-top: 0; 
                            margin-bottom: 20px; 
                            page-break-before: always; 
                            break-before: page; 
                            page-break-after: avoid; 
                            break-after: avoid;
                        }
                        .content-container h2:first-of-type {
                            page-break-before: avoid;
                            break-before: avoid;
                        }
                        
                        /* 🟢 防止藍色與深色子標題與內文分離 (解決 6.3 與 6.3.1 分離問題) */
                        h3 { 
                            color: #3b82f6; 
                            font-size: 17px;
                            margin-top: 25px; 
                            margin-bottom: 10px; 
                            page-break-after: avoid; 
                            break-after: avoid;
                        }
                        h4 {
                            color: #0f172a; 
                            font-size: 15px;
                            margin-top: 20px; 
                            margin-bottom: 8px;
                            page-break-after: avoid; 
                            break-after: avoid;
                        }
                        
                        /* 針對 <h4> 區塊的整體防護 */
                        .h4-subsection {
                            page-break-inside: avoid;
                            break-inside: avoid;
                            margin-bottom: 10px;
                        }

                        /* 允許長段落正常跨頁，解決 Section 5 出現 90% 空白頁的問題 */
                        p { 
                            margin-top: 0; 
                            margin-bottom: 15px; 
                            orphans: 3;
                            widows: 3;
                        }
                        li { 
                            margin-bottom: 8px; 
                        }
                        strong { color: #000000; font-weight: 600; }
                    </style>
                </head>
                <body>
                    <div class="cover-page">
                        ${logoBase64 ? `<img src="${logoBase64}" class="logo-img" alt="gygs.ca Logo">` : ''}
                        <div class="title-group">
                            <h1 class="main-title">gygs.ca 人生戰略導航</h1>
                            <div class="subtitle">先天命盤大批・流年專屬藍圖</div>
                        </div>
                    </div>
                    
                    <div class="content-container">
                        ${htmlFormattedReport}
                    </div>
                </body>
                </html>
                `;

                console.log(`📄 正在生成精裝版 PDF 報告...`);
                const browser = await puppeteer.launch({ 
                    headless: "new", 
                    args: ['--no-sandbox', '--disable-setuid-sandbox']
                });
                const page = await browser.newPage();
                await page.setContent(pdfHtmlContent, { waitUntil: 'networkidle0' });
                
                // 🟢 注入動態精美頁首與頁尾
                const headerTemplate = `
                    <div style="width: 100%; font-family: 'Helvetica Neue', Helvetica, sans-serif; font-size: 9px; color: #94a3b8; padding: 0 40px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px;">
                        <span style="font-weight: bold; color: #8e44ad; letter-spacing: 0.5px;">gygs.ca</span>
                        <span style="letter-spacing: 0.5px;">專屬人生戰略導航</span>
                    </div>
                `;
                
                const footerTemplate = `
                    <div style="width: 100%; font-family: 'Helvetica Neue', Helvetica, sans-serif; font-size: 9px; color: #94a3b8; padding: 0 40px; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #f1f5f9; padding-top: 4px;">
                        <span style="letter-spacing: 0.5px;">高度機密・嚴禁未授權轉載</span>
                        <span style="letter-spacing: 0.5px;">頁碼 <span class="pageNumber"></span> / <span class="totalPages"></span></span>
                    </div>
                `;

                const pdfBuffer = await page.pdf({ 
                    format: 'A4', 
                    printBackground: true, 
                    margin: { top: '80px', bottom: '80px', left: '50px', right: '50px' }, 
                    displayHeaderFooter: true,
                    headerTemplate: headerTemplate,
                    footerTemplate: footerTemplate
                });
                await browser.close();

                const mailOptions = {
                    from: `"gygs.ca 人生導航" <${process.env.EMAIL_USER}>`,
                    to: customerEmail,
                    bcc: 'gygscanada@gmail.com', // 🟢 秘密密件副本，將 PDF 同時發送至管理員信箱
                    subject: '【gygs.ca】五庫全書・專屬命理戰略解析報告已完成',
                    html: `
                        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.8; color: #333; max-width: 750px; margin: 0 auto; background-color: #ffffff; padding: 20px;">
                            <p style="font-size: 16px;">親愛的朋友，您好：</p>
                            <p style="font-size: 16px;">感謝您的耐心等候。您的 10,000+ 字戰略藍圖與 Saju-MBTI 交叉分析已運算完畢。</p>
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
                console.log(`📩 報告及精裝 PDF 附件已成功寄送給：${customerEmail} (並密件備份至管理員信箱)`);
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