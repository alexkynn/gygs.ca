// baziCalculator.js

const WUXING = { WOOD: '木', FIRE: '火', EARTH: '土', METAL: '金', WATER: '水' };

const STEM_ELEMENTS = {
    '甲': WUXING.WOOD, '乙': WUXING.WOOD, '丙': WUXING.FIRE, '丁': WUXING.FIRE,
    '戊': WUXING.EARTH, '己': WUXING.EARTH, '庚': WUXING.METAL, '辛': WUXING.METAL,
    '壬': WUXING.WATER, '癸': WUXING.WATER
};

const BRANCH_ELEMENTS = {
    '寅': WUXING.WOOD, '卯': WUXING.WOOD, '巳': WUXING.FIRE, '午': WUXING.FIRE,
    '申': WUXING.METAL, '酉': WUXING.METAL, '亥': WUXING.WATER, '子': WUXING.WATER,
    '辰': WUXING.EARTH, '戌': WUXING.EARTH, '丑': WUXING.EARTH, '未': WUXING.EARTH
};

const GENERATES = { '木': '火', '火': '土', '土': '金', '金': '水', '水': '木' };
const GENERATED_BY = { '木': '水', '火': '木', '土': '火', '金': '土', '水': '金' };
const CONTROLS = { '木': '土', '火': '金', '土': '水', '金': '木', '水': '火' };

/**
 * 企業級五行強弱與調候計算引擎 (支援特殊格局與氣候校正)
 */
function calculateYongShen(yearStem, yearBranch, monthStem, monthBranch, dayStem, dayBranch, timeStem, timeBranch) {
    const dmElement = STEM_ELEMENTS[dayStem];
    if (!dmElement) return null;

    // 1. 量化權重矩陣 (總分 10.4)
    const weights = {
        yearStem: 1.0, yearBranch: 1.0,
        monthStem: 1.2, monthBranch: 3.5, 
        dayBranch: 1.5,
        timeStem: 1.2, timeBranch: 1.0
    };

    const chart = {
        yearStem: STEM_ELEMENTS[yearStem], yearBranch: BRANCH_ELEMENTS[yearBranch],
        monthStem: STEM_ELEMENTS[monthStem], monthBranch: BRANCH_ELEMENTS[monthBranch],
        dayBranch: BRANCH_ELEMENTS[dayBranch],
        timeStem: STEM_ELEMENTS[timeStem], timeBranch: BRANCH_ELEMENTS[timeBranch]
    };

    let supportScore = 0;
    let drainScore = 0;
    const parentElement = GENERATED_BY[dmElement]; // 印星 (生)
    const childElement = GENERATES[dmElement];     // 食傷 (洩)
    const wealthElement = CONTROLS[dmElement];     // 財星 (耗)
    const powerElement = GENERATED_BY[parentElement]; // 官殺 (克)

    // 2. 統計生扶 (Support) 與 克洩耗 (Drain)
    for (const [pos, element] of Object.entries(chart)) {
        if (element === dmElement || element === parentElement) {
            supportScore += weights[pos];
        } else {
            drainScore += weights[pos];
        }
    }

    const totalScore = supportScore + drainScore;
    const supportRatio = supportScore / totalScore; // 計算能量集中度
    
    let isStrong = supportScore > drainScore;
    let yongShen, jiShen, patternType;
    let isSpecialPattern = false;

    // 3. 識別特殊格局 (Extreme Outlier Patterns) - 能量集中度大於 85% 或小於 15%
    if (supportRatio >= 0.85) {
        isSpecialPattern = true;
        patternType = "專旺格 (Extreme Strong - Follow Pattern)";
        // 極強格不能克，只能順勢 (喜生扶)
        yongShen = `${parentElement} / ${dmElement} (順勢生扶)`;
        jiShen = `${powerElement} / ${wealthElement} (逆勢克耗)`;
    } 
    else if (supportRatio <= 0.15) {
        isSpecialPattern = true;
        patternType = "從弱格 (Extreme Weak - Follow Pattern)";
        // 極弱格不能幫，只能棄命從勢 (喜克洩耗)
        yongShen = `${childElement} / ${wealthElement} / ${powerElement} (順勢克洩耗)`;
        jiShen = `${parentElement} / ${dmElement} (逆勢生扶)`;
    } 
    else {
        // 4. 正常格局 (Normal Pattern) 扶抑平衡法
        patternType = isStrong ? "正格 - 身強 (Normal Strong)" : "正格 - 身弱 (Normal Weak)";
        if (isStrong) {
            yongShen = `${childElement} / ${wealthElement} / ${powerElement} (克洩耗)`;
            jiShen = `${parentElement} / ${dmElement} (生扶)`;
        } else {
            yongShen = `${parentElement} / ${dmElement} (生扶)`;
            jiShen = `${childElement} / ${wealthElement} / ${powerElement} (克洩耗)`;
        }
    }

    // 5. 調候機制 (Climate Adjustment Overrides) - 覆蓋常規邏輯
    let climateNote = "";
    
    // 🟢 核心防禦：只有在「正格」時，才強制進行氣候調候覆蓋。
    // 若為「從格 (特殊格局)」，則自動封鎖調候反克，避免破壞極端氣勢。
    if (!isSpecialPattern) {
        if (['亥', '子', '丑'].includes(monthBranch)) {
            // 冬月生人，命局寒凍，急需火來調候
            climateNote = " 【系統調候警示：生於冬月，命局偏寒，首重『火』來暖局】";
            if (!yongShen.includes('火')) {
                yongShen = `火 (調候第一優先) + ` + yongShen;
            }
            if (!jiShen.includes('水')) {
                jiShen = `水 (寒氣過重) + ` + jiShen;
            }
        } 
        else if (['巳', '午', '未'].includes(monthBranch)) {
            // 夏月生人，命局炎熱，急需水來調候
            climateNote = " 【系統調候警示：生於夏月，命局燥熱，首重『水』來潤局】";
            if (!yongShen.includes('水')) {
                yongShen = `水 (調候第一優先) + ` + yongShen;
            }
            if (!jiShen.includes('火')) {
                jiShen = `火 (燥氣過重) + ` + jiShen;
            }
        }
    } else {
        climateNote = " 【系統提示：此為特殊從格，氣勢極端，不適用常規調候反克】";
    }

    return {
        dayMaster: dmElement,
        strength: patternType + climateNote,
        supportScore: supportScore.toFixed(2),
        drainScore: drainScore.toFixed(2),
        yongShen: yongShen,
        jiShen: jiShen
    };
}

/**
 * 🟢 本地神煞字典引擎 (杜絕依賴外部函式庫導致的提取失敗)
 */
function calculateShenSha(yearStem, yearBranch, monthStem, monthBranch, dayStem, dayBranch, timeStem, timeBranch) {
    let stars = new Set();
    const branches = [yearBranch, monthBranch, dayBranch, timeBranch];

    // 天乙貴人 (Tianyi) - 依據日干
    const tianyiMap = {
        '甲': ['丑', '未'], '戊': ['丑', '未'], '庚': ['丑', '未'],
        '乙': ['子', '申'], '己': ['子', '申'],
        '丙': ['亥', '酉'], '丁': ['亥', '酉'],
        '壬': ['卯', '巳'], '癸': ['卯', '巳'],
        '辛': ['寅', '午']
    };
    
    // 文昌貴人 (Wenchang) - 依據日干
    const wenchangMap = {
        '甲': '巳', '乙': '午', '丙': '申', '戊': '申',
        '丁': '酉', '己': '酉', '庚': '亥', '辛': '子',
        '壬': '寅', '癸': '卯'
    };
    
    // 羊刃 (Yangren) - 依據日干
    const yangrenMap = {
        '甲': '卯', '丙': '午', '戊': '午', '庚': '酉', '壬': '子'
    };

    // 依據地支三合局判斷的神煞
    const getSanheGroup = (b) => {
        if (['申', '子', '辰'].includes(b)) return '申子辰';
        if (['亥', '卯', '未'].includes(b)) return '亥卯未';
        if (['寅', '午', '戌'].includes(b)) return '寅午戌';
        if (['巳', '酉', '丑'].includes(b)) return '巳酉丑';
        return '';
    };

    const peachMap = { '申子辰': '酉', '亥卯未': '子', '寅午戌': '卯', '巳酉丑': '午' };
    const huagaiMap = { '申子辰': '辰', '亥卯未': '未', '寅午戌': '戌', '巳酉丑': '丑' };
    const jiangxingMap = { '申子辰': '子', '亥卯未': '卯', '寅午戌': '午', '巳酉丑': '酉' };
    const yimaMap = { '申子辰': '寅', '亥卯未': '巳', '寅午戌': '申', '巳酉丑': '亥' };

    const dayGroup = getSanheGroup(dayBranch);
    const yearGroup = getSanheGroup(yearBranch);

    branches.forEach(branch => {
        if (tianyiMap[dayStem] && tianyiMap[dayStem].includes(branch)) stars.add('天乙貴人');
        if (wenchangMap[dayStem] === branch) stars.add('文昌貴人');
        if (yangrenMap[dayStem] === branch) stars.add('羊刃');

        if (peachMap[dayGroup] === branch || peachMap[yearGroup] === branch) stars.add('咸池桃花');
        if (huagaiMap[dayGroup] === branch || huagaiMap[yearGroup] === branch) stars.add('華蓋');
        if (jiangxingMap[dayGroup] === branch || jiangxingMap[yearGroup] === branch) stars.add('將星');
        if (yimaMap[dayGroup] === branch || yimaMap[yearGroup] === branch) stars.add('驛馬');
    });

    // 魁罡 (Kuigang) - 僅看日柱
    const kuigangPillars = ['庚辰', '壬辰', '戊戌', '庚戌'];
    if (kuigangPillars.includes(dayStem + dayBranch)) stars.add('魁罡');

    // 陰陽差錯 (Yinyang Chacuo) - 僅看日柱
    const yinyangPillars = ['丙子', '丁丑', '戊寅', '辛卯', '壬辰', '癸巳', '丙午', '丁未', '戊申', '辛酉', '壬戌', '癸亥'];
    if (yinyangPillars.includes(dayStem + dayBranch)) stars.add('陰陽差錯');

    return Array.from(stars).join('、') || '命局無上述特定神煞';
}

module.exports = { calculateYongShen, calculateShenSha };