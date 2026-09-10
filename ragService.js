// ragService.js

require('dotenv').config();
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require("@google/generative-ai");

const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');
const cityTimezones = require('city-timezones');
const { Solar, Lunar, LunarMonth } = require('lunar-javascript'); 
const { astro } = require('iztro');

const locationsData = require('./locations.js');
const { generateUniqueTeaser } = require('./teaserLibrary.js');
const boneWeightPoems = require('./boneWeightPoems.js');
const { getPromptPart1, getPromptPart2, getPromptPart3, getPromptPart4, getPromptPart5, getPromptPart6, getPromptPart7, getPromptPart8, getPromptPart9 } = require('./promptTemplates.js');
const { calculateYongShen, calculateShenSha, analyzeAnnualPillar, calculateSocialMagnetism, analyzeMonthlyPillars } = require('./baziCalculator.js'); 

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const shiTimeMap = {
    "子時": { hour: 0, minute: 0, index: 0 },
    "丑時": { hour: 2, minute: 0, index: 1 },
    "寅時": { hour: 4, minute: 0, index: 2 },
    "卯時": { hour: 6, minute: 0, index: 3 },
    "辰時": { hour: 8, minute: 0, index: 4 },
    "巳時": { hour: 10, minute: 0, index: 5 },
    "午時": { hour: 12, minute: 0, index: 6 },
    "未時": { hour: 14, minute: 0, index: 7 },
    "申時": { hour: 16, minute: 0, index: 8 },
    "酉時": { hour: 18, minute: 0, index: 9 },
    "戌時": { hour: 20, minute: 0, index: 10 },
    "亥時": { hour: 22, minute: 0, index: 11 }
};

const SOUL_STAR_MAP = {
    '貪狼': '底層驅動力在於對物慾、機會與人際資源的極致追逐',
    '巨門': '底層驅動力在於懷疑精神、深度研究與言語表達',
    '祿存': '底層驅動力在於對安全感、財富積累與自我保護的極度渴望',
    '文曲': '底層驅動力在於對才華展現、情感共鳴與浪漫理想的追求',
    '廉貞': '底層驅動力在於傲骨、秩序掌控與精神層面的自我要求',
    '武曲': '底層驅動力在於務實執行、財富掌控與剛毅不屈的行動',
    '破軍': '底層驅動力在於顛覆現狀、消耗資源以換取開創的破壞性力量'
};

const BODY_STAR_MAP = {
    '鈴星': '行為執行上帶有隱忍、緊繃與暗中發力的特質',
    '天相': '行為執行上展現出注重體面、輔佐協調與循規蹈矩的特質',
    '天機': '行為執行上表現為思維活躍、持續變動與神經緊繃的特質',
    '天同': '行為執行上傾向於尋求安逸、避開衝突與情緒化主導的特質',
    '文昌': '行為執行上注重條理、契約精神與憑藉專業才華行事的特質',
    '天梁': '行為執行上帶有老成持重、愛面子與庇蔭他人的特質',
    '火星': '行為執行上展現出爆發力強、急躁且難以持久的特質'
};

function getCityCoordinates(cityName) {
    if (typeof locationsData !== 'undefined') {
        for (const country in locationsData) {
            const cityObj = locationsData[country].find(c => c.name === cityName || cityName.includes(c.name));
            if (cityObj && cityObj.offset !== undefined) {
                return { offsetMinutes: cityObj.offset, timezone: null };
            }
        }
    }

    const cityLookup = cityTimezones.lookupViaCity(cityName);
    if (cityLookup && cityLookup.length > 0) {
        const cityInfo = cityLookup[0];
        const tz = cityInfo.timezone;
        const now = moment().tz(tz);
        const standardMeridian = (now.utcOffset() / 60) * 15;
        const lngDiff = cityInfo.lng - standardMeridian;
        const offsetMinutes = Math.round(lngDiff * 4);
        return { offsetMinutes, timezone: tz };
    }

    return { offsetMinutes: 0, timezone: 'UTC' };
}

function calculateTrueSolarTime(year, month, day, shiName, cityName, exactTime) {
    const shiConfig = shiTimeMap[shiName] || { hour: 12, minute: 0, index: 6 };
    const { offsetMinutes } = getCityCoordinates(cityName);

    let baseHour = shiConfig.hour;
    let baseMinute = shiConfig.minute;

    if (exactTime && exactTime !== "未提供" && exactTime.includes(":")) {
        const parts = exactTime.split(":");
        baseHour = parseInt(parts[0], 10);
        baseMinute = parseInt(parts[1], 10);
    }

    let calYear = parseInt(year, 10);
    let calMonth = parseInt(month, 10);
    let calDay = parseInt(day, 10);

    const dateMoment = moment(`${calYear}-${String(calMonth).padStart(2, '0')}-${String(calDay).padStart(2, '0')}`, 'YYYY-MM-DD');
    const N = dateMoment.dayOfYear();
    const B_rad = (360 / 365.24) * (N - 81) * (Math.PI / 180);
    const eotMinutes = 9.87 * Math.sin(2 * B_rad) - 7.53 * Math.cos(B_rad) - 1.5 * Math.sin(B_rad);

    const totalOffset = offsetMinutes + eotMinutes;
    let totalMinutes = Math.round(baseHour * 60 + baseMinute + totalOffset);
    
    if (totalMinutes < 0) {
        totalMinutes += 1440;
        const prevDay = moment(`${calYear}-${calMonth}-${calDay}`, 'YYYY-MM-DD').subtract(1, 'days');
        calYear = prevDay.year();
        calMonth = prevDay.month() + 1;
        calDay = prevDay.date();
    } else if (totalMinutes >= 1440) {
        totalMinutes -= 1440;
        const nextDay = moment(`${calYear}-${calMonth}-${calDay}`, 'YYYY-MM-DD').add(1, 'days');
        calYear = nextDay.year();
        calMonth = nextDay.month() + 1;
        calDay = nextDay.date();
    }

    const solarHour = Math.floor(totalMinutes / 60);
    const solarMinute = totalMinutes % 60;

    let solarShiIndex = Math.floor((solarHour + 1) / 2) % 12;

    return {
        year: calYear,
        month: calMonth,
        day: calDay,
        hour: solarHour,
        minute: solarMinute,
        solarShiIndex,
        offsetMinutes: Math.round(totalOffset), 
        providedExactTime: (exactTime && exactTime !== "未提供") ? exactTime : null
    };
}

const shiNames = ["子時", "丑時", "寅時", "卯時", "辰時", "巳時", "午時", "未時", "申時", "酉時", "戌時", "亥時"];

function calculateBoneWeight(yearIndex, month, day, shiIndex) {
    const yearW = [12,9,6,7,12,5,9,8,7,8,15,9,16,8,8,19,12,6,8,7,5,15,6,16,15,7,9,12,10,7,15,6,5,14,14,9,7,7,9,12,8,7,13,5,14,5,9,17,15,7,12,8,8,6,19,6,8,16,14,7];
    const monthW = [0, 6,7,18,9,5,16,9,15,18,8,9,5];
    const dayW = [0, 5,10,8,15,16,15,8,16,8,16,9,17,8,17,10,8,9,18,5,15,10,9,8,9,15,18,7,8,16,6];
    const shiW = [16, 6, 7, 10, 9, 16, 10, 8, 8, 9, 6, 6];
    
    let total = yearW[yearIndex] + monthW[month] + dayW[day] + (shiW[shiIndex] || 0);
    return Math.floor(total / 10) + "兩" + (total % 10) + "錢";
}

function getBoneWeightPoem(weightStr, gender) {
    if (boneWeightPoems[gender] && boneWeightPoems[gender][weightStr]) {
        return boneWeightPoems[gender][weightStr];
    }
    return `骨重${weightStr}，此命局自有天地之機，詳見下方核心解析。`; 
}

function generateDeterministicFactData(userData, currentDateStr, ragFocusText) {
    try {
        if (!userData.year || !userData.month || !userData.day) {
            return "【提示：無法獲取完整出生日期】";
        }

        const tst = calculateTrueSolarTime(userData.year, userData.month, userData.day, userData.shi, userData.city, userData.exactTime);

        const solarDate = Solar.fromYmdHms(tst.year, tst.month, tst.day, tst.hour, tst.minute, 0);
        const lunarDate = solarDate.getLunar();
        const lunarDateStr = `${lunarDate.getYearInGanZhi()}年 ${lunarDate.getMonthInChinese()}月 ${lunarDate.getDayInChinese()}日`;
        
        const bazi = lunarDate.getEightChar();
        const baziString = `年柱：${bazi.getYear()}，月柱：${bazi.getMonth()}，日柱：${bazi.getDay()}，時柱：${bazi.getTime()}`;
        
        const shenShaString = calculateShenSha(
            bazi.getYear().charAt(0), bazi.getYear().charAt(1),
            bazi.getMonth().charAt(0), bazi.getMonth().charAt(1),
            bazi.getDay().charAt(0), bazi.getDay().charAt(1),
            bazi.getTime().charAt(0), bazi.getTime().charAt(1)
        );
        
        const calculatedBazi = calculateYongShen(
            bazi.getYear().charAt(0), bazi.getYear().charAt(1),
            bazi.getMonth().charAt(0), bazi.getMonth().charAt(1),
            bazi.getDay().charAt(0), bazi.getDay().charAt(1),
            bazi.getTime().charAt(0), bazi.getTime().charAt(1)
        );

        const socialMagnetism = calculateSocialMagnetism(
            bazi.getDay().charAt(1), 
            bazi.getYear().charAt(1), 
            calculatedBazi.yongShen, 
            calculatedBazi.jiShen
        );

        const currentYear = new Date().getFullYear();

        let currentDaYunStr = "未知";
        try {
            const genderIndex = userData.gender === '男' ? 1 : 0;
            const yun = bazi.getYun(genderIndex);
            const daYuns = yun.getDaYun();
            for (let i = 0; i < daYuns.length; i++) {
                const dy = daYuns[i];
                if (currentYear >= dy.getStartYear() && currentYear <= dy.getEndYear()) {
                    currentDaYunStr = `${dy.getGanZhi()}大運 (${dy.getStartYear()}年-${dy.getEndYear()}年)`;
                    break;
                }
            }
        } catch (e) {
            console.error("Da Yun Error:", e);
        }

        let future10Years = "";
        const natalBranches = [
            bazi.getYear().charAt(1), 
            bazi.getMonth().charAt(1), 
            bazi.getDay().charAt(1), 
            bazi.getTime().charAt(1)
        ];

        for (let i = 0; i < 10; i++) {
            let targetYear = currentYear + i;
            let tempLunar = Lunar.fromYmd(targetYear, 1, 1);
            let yearGanZhi = tempLunar.getYearInGanZhi();
            let yearStem = yearGanZhi.charAt(0);
            let yearBranch = yearGanZhi.charAt(1);
            
            let annualAnalysis = analyzeAnnualPillar(yearStem, yearBranch, natalBranches, calculatedBazi.yongShen, calculatedBazi.jiShen);
            future10Years += `- ${targetYear}年: ${yearGanZhi}年 ${annualAnalysis}\n`;
        }

        let future12Months = "";
        let monthsDataForEval = [];
        const evalStartDate = new Date();
        let startYear = evalStartDate.getFullYear();
        let startMonth = evalStartDate.getMonth() + 1; 

        for (let i = 0; i < 12; i++) {
            let evalYear = startYear;
            let evalMonth = startMonth + i;
            if (evalMonth > 12) {
                evalYear += Math.floor((evalMonth - 1) / 12);
                evalMonth = ((evalMonth - 1) % 12) + 1;
            }
            
            const tempSolar = Solar.fromYmd(evalYear, evalMonth, 15);
            const exactGanZhi = tempSolar.getLunar().getMonthInGanZhiExact();
            
            future12Months += `- 西曆 ${evalYear}年 ${evalMonth}月: ${exactGanZhi}月\n`;
            monthsDataForEval.push({ gMonth: evalMonth, ganZhi: exactGanZhi });
        }

        const monthlyExtremes = analyzeMonthlyPillars(monthsDataForEval, calculatedBazi.yongShen, calculatedBazi.jiShen);

        const zodiacSign = solarDate.getXingZuo() + "座";

        const yearIndex = (lunarDate.getYear() - 1984) % 60;
        const normalizedYearIndex = yearIndex < 0 ? yearIndex + 60 : yearIndex;
        const weightStr = calculateBoneWeight(normalizedYearIndex, Math.abs(lunarDate.getMonth()), lunarDate.getDay(), tst.solarShiIndex);
        const genderStr = userData.gender === '男' ? '男命' : '女命';
        const weightPoem = getBoneWeightPoem(weightStr, genderStr);

        const dateStrForIztro = `${tst.year}-${tst.month}-${tst.day}`;
        const genderForIztro = userData.gender === '男' ? 'male' : 'female';
        
        const astrolabe = astro.bySolar(dateStrForIztro, tst.solarShiIndex, genderForIztro, true, 'zh-TW');

        let palacesString = "";
        let bodyPalaceName = "未知";
        let sanFangSiZhengStr = ""; 
        let siHuaStr = "";          

        if (astrolabe && astrolabe.palaces) {
            const bodyPalaceObj = astrolabe.palaces.find(p => p.isBodyPalace);
            if (bodyPalaceObj) {
                bodyPalaceName = bodyPalaceObj.name;
            }

            let lu, quan, ke, ji;

            astrolabe.palaces.forEach((p, index) => {
                let stars = [];
                // 🟢 注入主星亮度 [廟/旺/得/利/平/不/陷]
                if (p.majorStars) stars.push(...p.majorStars.map(s => `${s.name}${s.brightness ? `[${s.brightness}]` : ''}${s.mutagen ? `(化${s.mutagen})` : ''}`));
                // 🟢 注入輔曜亮度
                if (p.minorStars) stars.push(...p.minorStars.map(s => `${s.name}${s.brightness ? `[${s.brightness}]` : ''}`));
                if (p.adjectiveStars) stars.push(...p.adjectiveStars.map(s => s.name));
                palacesString += `- 【${p.name}】: ${stars.join('、 ') || '空宮'}\n`;

                const allStars = [...(p.majorStars||[]), ...(p.minorStars||[])];
                allStars.forEach(s => {
                    if(s.mutagen === '祿' || s.mutagen === '禄') lu = `${p.name}(${s.name})`;
                    if(s.mutagen === '權' || s.mutagen === '权') quan = `${p.name}(${s.name})`;
                    if(s.mutagen === '科') ke = `${p.name}(${s.name})`;
                    if(s.mutagen === '忌') ji = `${p.name}(${s.name})`;
                });

                const opp = astrolabe.palaces[(index + 6) % 12];
                const tri1 = astrolabe.palaces[(index + 4) % 12];
                const tri2 = astrolabe.palaces[(index + 8) % 12];
                const getMajorStars = (pal) => {
                    let s = [];
                    if (pal.majorStars) s.push(...pal.majorStars.map(st => `${st.name}${st.brightness ? `[${st.brightness}]` : ''}${st.mutagen ? `(化${st.mutagen})` : ''}`));
                    return s.join('、') || '空宮';
                };
                sanFangSiZhengStr += `- 【${p.name}三方四正】：本宮(${getMajorStars(p)}) + 對宮(${getMajorStars(opp)}) + 三合(${getMajorStars(tri1)}, ${getMajorStars(tri2)})\n`;
            });
            
            siHuaStr = `[全盤能量樞紐]：最大資源點(化祿)落於【${lu || '未知'}】，權威控制點(化權)落於【${quan || '未知'}】，聲名貴人點(化科)落於【${ke || '未知'}】，最大業力與防守點(化忌)落於【${ji || '未知'}】`;
        }

        const inputTimeDisplay = userData.exactTime !== '未提供' ? userData.exactTime : userData.shi;
        
        const soulDesc = SOUL_STAR_MAP[astrolabe.soul] || '未知';
        const bodyDesc = BODY_STAR_MAP[astrolabe.body] || '未知';

        return `
[系統時空校正基準]
- 出生地：${userData.country || '未知'} - ${userData.city || '未知'}
- 輸入鐘錶時間：${userData.year}年${userData.month}月${userData.day}日 ${inputTimeDisplay}
- 真太陽時校正結果：${tst.year}年${tst.month}月${tst.day}日 ${String(tst.hour).padStart(2, '0')}:${String(tst.minute).padStart(2, '0')} (${shiNames[tst.solarShiIndex]}，經度與均時差總偏移 ${tst.offsetMinutes >= 0 ? '+' : ''}${tst.offsetMinutes} 分鐘)
- 農曆對應：${lunarDateStr}
- 性別：${genderStr}
- 當前時空基準：${currentDateStr}

[家庭現狀]
- 婚姻狀態：${userData.marriage}
- 子女狀況：${userData.children}

[系統底層四柱八字 (不可篡改數據)]
- 西洋星座：${zodiacSign}
- 八字干支：${baziString}
- 系統鎖定八字格局：${calculatedBazi.baziPattern}
- 當前大運：${currentDaYunStr}
- 四柱十神透解：${calculatedBazi.tenGodsString}
- 財庫狀態判定：${calculatedBazi.wealthVaultStatus}
- 開運密碼與產業資產矩陣：${calculatedBazi.auspiciousCodes}
- 原局刑沖害合狀態：${calculatedBazi.natalInteractions}
- 社交磁場矩陣：${socialMagnetism}
- 四柱神煞配置：${shenShaString}
- 系統判定日元強度：${calculatedBazi.strength} (生扶指數: ${calculatedBazi.supportScore}, 克洩指數: ${calculatedBazi.drainScore})
- 絕對最喜用神：${calculatedBazi.yongShen}
- 絕對最忌五行：${calculatedBazi.jiShen}
- 十神戰略矩陣 (專屬行動)：${calculatedBazi.yongShenAction}
- 十神戰略矩陣 (戒斷行為)：${calculatedBazi.jiShenDetox}
- 系統精算預設 MBTI：${calculatedBazi.defaultMbti}
- 袁天罡稱骨：${weightStr} (${genderStr})
- 專屬讖語：「${weightPoem}」

[專屬戰略框架]
${ragFocusText}

[未來 10 年客觀流年干支 (預測依據)]
${future10Years}

[未來 12 個月客觀流月干支 (預測依據)]
${future12Months}
- 未來12個月系統鎖定極值：${monthlyExtremes}

[系統底層紫微斗數 (不可篡改數據)]
- 五行局：${astrolabe.fiveElementsClass || '未知'}
- 命宮位置：地支${astrolabe.earthlyBranchOfSoulPalace || '未知'}宮
- 身宮位置：地支${astrolabe.earthlyBranchOfBodyPalace || '未知'}宮 (重疊於：${bodyPalaceName})
- 命主樞紐：${astrolabe.soul} (${soulDesc})
- 身主樞紐：${astrolabe.body} (${bodyDesc})
- 生年四化樞紐：
${siHuaStr}
- 十二宮位星曜配置 (含廟旺平陷與生年四化)：
${palacesString}
- 十二宮位三方四正矩陣：
${sanFangSiZhengStr}
`;
    } catch (e) {
        console.error("排盤運算失敗:", e);
        return "【系統提示：本地排盤計算發生異常】";
    }
}

function extractUserData(question) {
    const cityMatch = question.match(/出生地:([^-]+)-([^,]+)/);
    const shiMatch = question.match(/時辰[:：]?(.)時/);
    const exactTimeMatch = question.match(/精確時間[:：]?([^,\n]+)/); 
    const dateMatch = question.match(/日期[:：]?(\d{4})-(\d{2})-(\d{2})/);
    const genderMatch = question.match(/性別[:：]?(男|女)/);
    const marriageMatch = question.match(/婚姻[:：]?([^,\n]+)/);
    const childrenMatch = question.match(/子女[:：]?([^,\n]+)/);
    const mbtiMatch = question.match(/MBTI[:：]?([^,\n]+)/);
    
    const questionTextMatch = question.match(/提問:(.*)/) || question.match(/【來訪者提問】：(.*)/);
    const actualQuestion = questionTextMatch ? questionTextMatch[1].trim() : question;

    return {
        country: cityMatch ? cityMatch[1].trim() : null,
        city: cityMatch ? cityMatch[2].trim() : null,
        shi: shiMatch ? shiMatch[1] + "時" : "子時",
        exactTime: exactTimeMatch ? exactTimeMatch[1].trim() : "未提供",
        year: dateMatch ? dateMatch[1] : null,
        month: dateMatch ? parseInt(dateMatch[2], 10) : null,
        day: dateMatch ? parseInt(dateMatch[3], 10) : null,
        gender: genderMatch ? genderMatch[1] : "女命",
        marriage: marriageMatch ? marriageMatch[1].trim() : "未提供",
        children: childrenMatch ? childrenMatch[1].trim() : "未提供",
        mbti: mbtiMatch ? mbtiMatch[1].trim() : "未提供",
        actualQuestion: actualQuestion
    };
}

function getRagFocus(questionStr) {
    if (questionStr.includes("事業") || questionStr.includes("創業") || questionStr.includes("跳槽")) {
        return "【專屬戰略框架 - 事業與職涯】：核心在於建立『不可替代的專業護城河』與『向上管理的槓桿』。行動指南必須聚焦於：1. 尋找高資源平台背書，2. 建立技術或管理壁壘，3. 利用信息差與人脈網絡進行降維打擊。";
    } else if (questionStr.includes("財") || questionStr.includes("投資") || questionStr.includes("資金")) {
        return "【專屬戰略框架 - 財富與資產】：核心在於『防禦性資產隔離』與『非線性收益撬動』。行動指南必須聚焦於：1. 建立嚴格的現金流與信託防火牆，2. 剝離重資產，運用輕資產與知識產權（IP）獲取溢價，3. 杜絕高槓桿投機。";
    } else if (questionStr.includes("姻緣") || questionStr.includes("桃花") || questionStr.includes("感情") || questionStr.includes("婚姻")) {
        return "【專屬戰略框架 - 愛情與婚姻】：核心在於『情感邊界確立』與『高維度精神共鳴』。行動指南必須聚焦於：1. 建立清晰的情感與財務防線，拒絕情感勒索，2. 尋求能在事業或智慧上提供雙向賦能的伴侶，3. 將情感轉化為共同成長的戰略同盟。";
    } else if (questionStr.includes("健康") || questionStr.includes("身體") || questionStr.includes("疾病") || questionStr.includes("家庭") || questionStr.includes("移民") || questionStr.includes("居所")) {
        return "【專屬戰略框架 - 家庭, 居所與身心】：核心在於『物理環境調候』與『大腦強制斷電』。行動指南必須聚焦於：1. 依據喜用神選擇有利的居住方位與空間採光，2. 建立日常的物理隔離與冥想儀式，防範神經內耗，3. 在家庭與事業間設立防火牆。";
    } else {
        return "【專屬戰略框架 - 人生時機與大師破局】：核心在於『順勢爆發』與『逆勢蟄伏』。行動指南必須聚焦於：1. 精準踩準未來 12 個月的流月起伏進行資源配置，2. 針對命局最致命的盲區進行物理與心理雙重防禦，3. 押注核心優勢，執行降維打擊的破局動作。";
    }
}

function logTransactionForAnalytics(userData, actualQuestion, finalAiText, userEmail) {
    const payload = {
        timestamp: new Date().toISOString(),
        email: userEmail || "anonymous",
        country: userData.country || "",
        city: userData.city || "",
        birthYear: userData.year || "",
        gender: userData.gender || "",
        maritalStatus: userData.marriage || "",
        children: userData.children || "",
        mbti: userData.mbti || "",
        exactTime: userData.exactTime || "",
        question: actualQuestion || "",
        report_length: finalAiText ? finalAiText.length : 0
    };

    fs.appendFile(path.join(__dirname, 'analytics_log.jsonl'), JSON.stringify(payload) + '\n', (err) => {
        if (err) console.error("⚠️ Failed to write to analytics log:", err);
    });

    const webhookUrl = process.env.GOOGLE_SHEET_WEBHOOK_URL;
    if (webhookUrl && webhookUrl.startsWith('https://script.google.com')) {
        fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        }).then(res => res.json())
          .then(data => console.log("📊 [Analytics] 數據已成功同步至 Google Sheets:", data.result))
          .catch(err => console.error("⚠️ [Analytics] Google Sheets Webhook 同步失敗:", err));
    }
}

async function generateMasterResponse(question, mode = 'teaser', userEmail = '') {
    try {
        const today = new Date();
        const currentDateStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;
        const userData = extractUserData(question);
        const age = userData.year ? today.getFullYear() - parseInt(userData.year, 10) : '未知';
        
        let extractedEmail = userEmail || (question.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/) || [])[1];

        if (mode === 'teaser') {
            let teaserResponse = generateUniqueTeaser(userData.year, userData.month, userData.day, userData.shi, userData.gender, userData.country, userData.actualQuestion);
            let timeWarning = `\n\n<br><strong>【系統專業提示：真太陽時精密校正】</strong><br>`;
            if (userData.city && userData.shi) {
                const tst = calculateTrueSolarTime(userData.year, userData.month, userData.day, userData.shi, userData.city, userData.exactTime);
                const inputTimeDisplay = userData.exactTime !== '未提供' ? userData.exactTime : userData.shi;
                timeWarning += `系統已根據出生地「${userData.city}」之物理經緯度與地球公轉「均時差 (EoT)」完成雙重真太陽時校正（總時差偏移 ${tst.offsetMinutes >= 0 ? '+' : ''}${tst.offsetMinutes} 分鐘）。您輸入的時間「${inputTimeDisplay}」，實際定盤基準將為「${shiNames[tst.solarShiIndex]}」。解鎖後將以此天文標準生成專屬報告。`;
            } else {
                timeWarning += `本系統將依據您的出生國家與城市啟動「真太陽時」精確校正。`;
            }
            return teaserResponse + timeWarning;
        }

        const ragFocusText = getRagFocus(userData.actualQuestion);
        console.log("⚡ [1/10] 執行本地物理經緯度真太陽時轉換與確定性排盤...");
        const exactFactData = generateDeterministicFactData(userData, currentDateStr, ragFocusText);

        const systemInstruction = `你是一位精通東方哲學與現代職業戰略的首席決策顧問兼心理學家。
【任務核心】
基於下方 <FactData> 中由系統底層天文排盤引擎計算出的「不可篡改數據」，進行高維度戰略解讀。

【全球通用鐵律 (Global Rules - 必須在所有生成階段嚴格遵守)】
1. 嚴格遵守 <FactData>，包含真太陽時、五行局、命/身主、生年四化、三方四正矩陣、星曜廟旺平陷強度等，【絕對禁止】自行推算、張冠李戴或憑空發明。若數據與你內建知識衝突，以 <FactData> 為絕對準則！若 <FactData> 未提供，請寫「未提供」，嚴禁瞎猜。
2. 【隱藏指令鐵律】：絕對禁止在報告正文中印出或提及任何 Prompt 規則指令！例如嚴禁寫出「【絕對禁止商業分析】」、「強制使用...」或「妳的專屬東方英雄原型可提煉為...」，必須默默執行，無痕融入行文中。
3. 【禁止水平分割線鐵律】：絕對禁止在任何段落結尾或文字之間輸出「---」等任何形式的水平分割線符號！
4. 【星曜廟陷力量鐵律】：凡涉及紫微斗數星曜解讀，必須嚴格依據 <FactData> 中標註的 [廟/旺/得/利/平/不/陷] 強度定性吉凶與能量發揮。廟旺者吉星增輝、煞星收斂；落陷者吉星無力、煞曜猖獗。嚴禁自行變更或顛倒星曜力量強弱。
5. 【大運防幻覺鐵律】：在提及任何「大運」（如辛酉大運）時，【絕對禁止】自行推算、捏造或寫出大運的起訖歲數區間（例如嚴禁寫出「12歲至21歲」等具體年齡段）。違規將導致系統嚴重錯誤！
6. 【防迴音與去油膩鐵律】：絕對禁止反覆咀嚼同一個命理概念。嚴禁使用現代農場文職場套話。
7. 嚴格遵循 Prompt 指定的層級編號格式 (1., 1.1, 1.1.1)，不可發明新的排版。

<FactData>
${exactFactData}
</FactData>`;

        const model = genAI.getGenerativeModel({ 
            model: 'gemini-3.5-flash',
            systemInstruction: systemInstruction,
            safetySettings: [
                { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE }
            ],
            generationConfig: { 
                temperature: 0.3, 
                topP: 0.8,
                maxOutputTokens: 8192 
            }
        });

        console.log("📝 [2/10] 生成階段一：系統定盤與財庫分析 (Sections 1-2)...");
        const promptPart1 = getPromptPart1(age, userData, exactFactData, currentDateStr);
        const resultPart1 = await model.generateContent(promptPart1);
        let aiTextPart1 = resultPart1.response.text().trim();

        console.log("📝 [3/10] 生成階段二：時空軌跡與神煞套利 (Section 3)...");
        const promptPart2 = getPromptPart2(aiTextPart1, exactFactData, userData, currentDateStr);
        const resultPart2 = await model.generateContent(promptPart2);
        let aiTextPart2 = resultPart2.response.text().trim();

        console.log("📝 [4/10] 生成階段三：十二宮位 (4.1 - 4.3)...");
        const promptPart3 = getPromptPart3(aiTextPart1, aiTextPart2, exactFactData, userData, currentDateStr);
        const resultPart3 = await model.generateContent(promptPart3);
        let aiTextPart3 = resultPart3.response.text().trim();

        console.log("📝 [5/10] 生成階段四：十二宮位 (4.4 - 4.6)...");
        const promptPart4 = getPromptPart4(aiTextPart1, aiTextPart2, aiTextPart3, exactFactData, userData, currentDateStr);
        const resultPart4 = await model.generateContent(promptPart4);
        let aiTextPart4 = resultPart4.response.text().trim();

        console.log("📝 [6/10] 生成階段五：十二宮位 (4.7 - 4.9)...");
        const promptPart5 = getPromptPart5(aiTextPart3, aiTextPart4, exactFactData, userData, currentDateStr);
        const resultPart5 = await model.generateContent(promptPart5);
        let aiTextPart5 = resultPart5.response.text().trim();

        console.log("📝 [7/10] 生成階段六：十二宮位 (4.10 - 4.12)...");
        const promptPart6 = getPromptPart6(aiTextPart3, aiTextPart5, exactFactData, userData, currentDateStr);
        const resultPart6 = await model.generateContent(promptPart6);
        let aiTextPart6 = resultPart6.response.text().trim();

        const aiTextSection4 = `${aiTextPart3}\n\n${aiTextPart4}\n\n${aiTextPart5}\n\n${aiTextPart6}`;

        console.log("📈 [8/10] 生成階段七：未來 10 年運勢推演 (Section 5)...");
        const promptPart7 = getPromptPart7(aiTextPart1, aiTextPart2, aiTextSection4, userData, currentDateStr);
        const resultPart7 = await model.generateContent(promptPart7);
        let aiTextPart7 = resultPart7.response.text().trim();

        console.log("📈 [9/10] 生成階段八：大師專屬行動指南 (Section 6)...");
        const promptPart8 = getPromptPart8(aiTextPart1, aiTextSection4, aiTextPart7, userData, currentDateStr);
        const resultPart8 = await model.generateContent(promptPart8);
        let aiTextPart8 = resultPart8.response.text().trim();

        console.log("🧠 [10/10] 生成階段九：Saju-MBTI 心理分析 (Section 7)...");
        const promptPart9 = getPromptPart9(aiTextPart1, aiTextSection4, aiTextPart8, userData, currentDateStr);
        const resultPart9 = await model.generateContent(promptPart9);
        let aiTextPart9 = resultPart9.response.text().trim();

        let finalAiText = `${aiTextPart1}\n\n${aiTextPart2}\n\n${aiTextSection4}\n\n${aiTextPart7}\n\n${aiTextPart8}\n\n${aiTextPart9}`;
        finalAiText = finalAiText.replace(/^```markdown\n/gm, '').replace(/^```\n/gm, '').replace(/```$/gm, ''); 
        
        finalAiText = finalAiText.replace(/^---+$/gm, '').replace(/\n{3,}/g, '\n\n'); 

        const startIndex = finalAiText.indexOf('## 1');
        if (startIndex > 0) finalAiText = finalAiText.substring(startIndex);
        
        logTransactionForAnalytics(userData, userData.actualQuestion, finalAiText, extractedEmail);
        return finalAiText;

    } catch (error) {
        console.error("生成流程發生錯誤:", error);
        throw error;
    }
}

module.exports = { generateMasterResponse };