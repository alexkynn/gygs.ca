// A simple hashing function to create a deterministic seed based on user input
function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash);
}

function generateUniqueTeaser(year, month, day, shi, gender, country, actualQuestion) {
    // Create a unique seed based on the user's specific data
    const seedString = `${year}-${month}-${day}-${shi}-${country}-${actualQuestion}`;
    const seed = hashString(seedString);

    // ==========================================
    // 0. 純 JS 天干地支、生肖與節氣時辰換算 (Zero-Token Astrological Logic)
    // ==========================================
    const y = parseInt(year, 10);
    // 天干 (Heavenly Stems): 1984 was 甲(4)
    const stemMap = ["庚", "辛", "壬", "癸", "甲", "乙", "丙", "丁", "戊", "己"];
    const stem = stemMap[y % 10];
    
    // 地支 (Earthly Branches) & 生肖 (Zodiac): 1984 was 子(4) / 鼠
    const branchMap = ["申", "酉", "戌", "亥", "子", "丑", "寅", "卯", "辰", "巳", "午", "未"];
    const zodiacMap = ["猴", "雞", "狗", "豬", "鼠", "牛", "虎", "兔", "龍", "蛇", "馬", "羊"];
    const branchIndex = y % 12;
    const branch = branchMap[branchIndex];
    const zodiac = zodiacMap[branchIndex];
    
    const baziYearStr = `${stem}${branch}`; // e.g., 丙辰
    const genderTerm = (gender === 'female' || gender.includes('女')) ? '坤造' : '乾造';

    // 季節與五行氣場推算 (以公曆月份粗略劃分)
    const m = parseInt(month, 10);
    let seasonDesc = "";
    if (m >= 2 && m <= 4) seasonDesc = "春季木旺生發";
    else if (m >= 5 && m <= 7) seasonDesc = "夏季火炎灼熱";
    else if (m >= 8 && m <= 10) seasonDesc = "秋季金銳肅殺";
    else seasonDesc = "冬季水寒沉潛";

    // 時辰能量場推算
    let timeVibe = "";
    if (shi.includes("子") || shi.includes("丑") || shi.includes("亥")) timeVibe = "深沉內斂的暗夜之氣";
    else if (shi.includes("寅") || shi.includes("卯") || shi.includes("辰")) timeVibe = "破曉而出的旭日之氣";
    else if (shi.includes("巳") || shi.includes("午") || shi.includes("未")) timeVibe = "日正當中的極陽之氣";
    else timeVibe = "沉澱收斂的夕暮之氣"; // 申, 酉, 戌

    // ==========================================
    // 1. 動態開場白 (Dynamic & Calculated Opening Hooks)
    // ==========================================
    const openings = [
        `【五庫全書系統已鎖定時空座標】\n大師已接收到您（${baziYearStr}年屬${zodiac}，${genderTerm}）在 ${country} 誕生的先天生辰。初步的八字掃描顯示，您生於${seasonDesc}之時，配合「${shi}」${timeVibe}，這在您的命盤中留下了極其深刻的烙印，賦予了您異於常人的思維模式與爆發潛力。`,
        `【星曜陣列與八字原局已載入】\n我們已精準捕獲您的先天能量場。${baziYearStr} 年的干支排列，遇上${seasonDesc}的節氣，以及專屬於您的「${shi}」，正在系統中勾勒出一幅極具張力的人生軌跡圖。這並不是一個平庸的命格，屬${zodiac}的您充滿著跨界與破局的特質。`,
        `【命理雙引擎已啟動解析】\n來自 ${country} 的時空數據已成功導入。大師初步排盤發現，作為一名${baziYearStr}年的${genderTerm}，您的紫微命宮與八字日元之間存在著強烈的能量共振。${seasonDesc}與${timeVibe}的交織，註定了您在面對人生重大轉折時，總能展現出驚人的直覺力與韌性。`,
        `【先天格局掃描完成】\n大師已為您啟動了深度的命盤重組。根據您命局中${seasonDesc}的五行氣場分佈，以及「${shi}」的時空引力，我們發現屬${zodiac}的您底層性格中潛藏著一股尚未完全釋放的『暗流』，這股力量正是您突破現狀的關鍵鑰匙。`,
        `【命盤天干地支解碼中】\n系統已精準鎖定您${baziYearStr}年的先天基因。在 ${country} 出生的您，承載著${seasonDesc}的天地之氣與「${shi}」${timeVibe}。這種獨特的星象配置，暗示著您具備在逆境中翻盤的罕見格局。`
    ];

    // ==========================================
    // 2. 針對性提問解析 (Contextual Analysis)
    // ==========================================
    let focusText = "";
    if (actualQuestion.includes("事業") || actualQuestion.includes("工作") || actualQuestion.includes("創業") || actualQuestion.includes("職涯") || actualQuestion.includes("晉升")) {
        const careerTexts = [
            `針對您關於「事業與職涯」的疑惑，系統正深入比對《滴天髓》中的官殺格局。我們發現您作為屬${zodiac}的人，事業天花板遠比您目前所感知的還要高。然而，真正的突破口並不在於盲目擴張，而在於精準的『時機點』與『資源借力』。`,
            `您對「事業破局」的渴望，恰好呼應了您紫微盤中官祿宮的隱性星曜。要打破目前的僵局，您需要的不是加倍的體力勞動，而是找到命局中最核心的『戰略槓桿支點』。大師正在為您推演這條阻力最小的路徑。`,
            `關於您在職場與事業上的提問，初步跡象顯示您目前正處於一個重要的能量轉換期。過去的模式正在失效，而新的『印星』智慧套利機會即將浮現。`
        ];
        focusText = careerTexts[seed % careerTexts.length];
    } else if (actualQuestion.includes("財") || actualQuestion.includes("投資") || actualQuestion.includes("資產") || actualQuestion.includes("買房")) {
        const wealthTexts = [
            `關於您所關心的「財富與資產佈局」，八字財庫的開合與紫微財帛宮的煞曜分佈，正為我們提供精準的解答。您的命中不僅有財，更隱藏著一條特殊的『非線性偏財套利』路徑。`,
            `在「財富增長與避險」這條路上，系統初步判定您的命格極具爆發力。但硬幣的另一面是，如何防範黑天鵝風險並在流年大運中精準抄底？這將是大師為您梳理的核心重點。`,
            `針對您的財務與投資疑惑，大師正在計算您命局中的『絕對最喜用神』。找到您的財富密碼，意味著您將能避開高風險的重資產陷阱，轉向高溢價的輕資產變現。`
        ];
        focusText = wealthTexts[seed % wealthTexts.length];
    } else if (actualQuestion.includes("感情") || actualQuestion.includes("婚姻") || actualQuestion.includes("緣分") || actualQuestion.includes("另一半")) {
        const loveTexts = [
            `針對您在「感情與婚姻緣分」上的困惑，大師正透過夫妻宮與八字桃花星的交叉比對為您尋找答案。您在親密關係中所經歷的摩擦，其實是命盤中『業力與性格』碰撞的必然結果。`,
            `您對「情感歸宿」的探問，觸動了星盤中深層的心理代碼。真正的正緣往往出現在特定的流年大運節點，大師將為您揭示那條通往和諧關係與靈魂共鳴的隱秘軌跡。`,
            `在您的感情世界中，紫微盤顯示配偶不僅是您的伴侶，更極可能是您財富與運勢的『隱形守護者』。系統正為您解析如何透過情感的調和，進而催旺整體的事業風水。`
        ];
        focusText = loveTexts[seed % loveTexts.length];
    } else if (actualQuestion.includes("健康") || actualQuestion.includes("能量") || actualQuestion.includes("疾病") || actualQuestion.includes("壓力")) {
        const healthTexts = [
            `您所關心的「健康與能量」問題，精準對應了您疾厄宮中的核心星曜。初步掃描顯示，您目前的極度壓力與疲憊，更多是來自於內在五行能量的失衡，而非單純的外部勞累。`,
            `針對您的身心狀況，大師正在結合中醫五行生剋理論進行深度推演。找到您體質中最脆弱的『破口』，並透過物理風水與作息調校來進行防禦，是這份報告的首要任務。`
        ];
        focusText = healthTexts[seed % healthTexts.length];
    } else {
        const generalTexts = [
            `針對您提出的深層提問：「${actualQuestion}」，這不僅僅是一個單一事件，而是您十年大運交接期的縮影。大師正在為您梳理這背後的深層因果與專屬破局之道。`,
            `您所提出的疑惑：「${actualQuestion}」，正是您當前生命週期中最核心的覺醒課題。系統正調閱《紫微斗數全書》與《三命通會》，為您尋找最務實、最能落地的行動指南。`,
            `這是一個極具戰略深度的提問（「${actualQuestion}」）。表面的困境往往掩蓋了底層的機遇，大師正在透過交叉比對，為您找出隱藏在危機背後的『絕對優勢』。`
        ];
        focusText = generalTexts[seed % generalTexts.length];
    }

    // ==========================================
    // 3. 演算法與方法論 (Methodology/Process)
    // ==========================================
    const methodologies = [
        `我們絕不提供模稜兩可的宿命論。目前的初步運算已過濾掉無效的雜曜，正專注於定位您命局中的「黑天鵝風險年份」與「黃金爆發期」。這是一場結合東方命理與現代商業戰略的極致推演。`,
        `紫微斗數的十二宮位與四柱八字的調候系統正在進行高強度的交叉驗證。初步數據顯示，您在未來的 12 至 24 個月內，將迎來一次不可忽視的磁場轉換。該防守還是該進攻？大師即將給出定論。`,
        `大師正在為您調取 Saju-MBTI 心理與命理的深度交叉分析模組。這不僅能解構您的先天命運，更會透視您的認知盲區，為您量身打造一套現代職場與人生的『防禦與套利手冊』。`,
        `系統正在利用五庫全書的古籍演算法，對您未來的 10 年流年進行逐年掃描。我們致力於將傳統玄學轉化為極度務實的「現代行為套利策略」，讓您看清格局，走對人生。`,
        `所有的八字干支與紫微星曜數據已完成矩陣排列。我們發現您的命局中存在一種特殊的『制衡力量』，這股力量一旦被正確引導，將能極大地降低未來的決策失誤率。`
    ];

    // ==========================================
    // 4. 行動呼籲 (Call to Action)
    // ==========================================
    const closings = [
        `👉 完整的大批報告將為您提供超過 10,000 字的精確推演與行動藍圖。大師已準備就緒，請解鎖以獲取您的專屬人生戰略導航。`,
        `👉 命運的樞紐已經顯現。解鎖 10,000+ 字的專屬精裝 PDF 報告，讓大師為您詳細拆解未來的流年軌跡與破局之法。`,
        `👉 欲了解您的真實天花板、最佳進攻月份及專屬的五行開運密碼，請立即解鎖高達萬字的深度戰略解析。`,
        `👉 面對未來的挑戰，您需要的是精準的戰略地圖。解鎖完整報告，獲取您專屬的流年避險與資產配置指南。`
    ];

    // Select the methodology and closing using safe math addition to ensure variety and prevent negative indexes
    const mid1 = focusText;
    const mid2 = methodologies[(seed + 17) % methodologies.length];
    const close = closings[(seed + 31) % closings.length];

    // Combine them into the final teaser
    return `${openings[seed % openings.length]}\n\n${mid1}\n\n${mid2}\n\n${close}`;
}

module.exports = { generateUniqueTeaser };