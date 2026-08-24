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

    // 3. 識別特殊格局 (Extreme Outlier Patterns) - 能量集中度大於 85% 或小於 15%
    if (supportRatio >= 0.85) {
        patternType = "專旺格 (Extreme Strong - Follow Pattern)";
        // 極強格不能克，只能順勢 (喜生扶)
        yongShen = `${parentElement} / ${dmElement} (順勢生扶)`;
        jiShen = `${powerElement} / ${wealthElement} (逆勢克耗)`;
    } 
    else if (supportRatio <= 0.15) {
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

    return {
        dayMaster: dmElement,
        strength: patternType + climateNote,
        supportScore: supportScore.toFixed(2),
        drainScore: drainScore.toFixed(2),
        yongShen: yongShen,
        jiShen: jiShen
    };
}

module.exports = { calculateYongShen };