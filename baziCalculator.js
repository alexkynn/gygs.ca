// baziCalculator.js

const WUXING = {
    WOOD: '木',
    FIRE: '火',
    EARTH: '土',
    METAL: '金',
    WATER: '水'
};

// 天干五行映射
const STEM_ELEMENTS = {
    '甲': WUXING.WOOD, '乙': WUXING.WOOD,
    '丙': WUXING.FIRE, '丁': WUXING.FIRE,
    '戊': WUXING.EARTH, '己': WUXING.EARTH,
    '庚': WUXING.METAL, '辛': WUXING.METAL,
    '壬': WUXING.WATER, '癸': WUXING.WATER
};

// 地支五行映射 (以本氣為主進行量化)
const BRANCH_ELEMENTS = {
    '寅': WUXING.WOOD, '卯': WUXING.WOOD,
    '巳': WUXING.FIRE, '午': WUXING.FIRE,
    '申': WUXING.METAL, '酉': WUXING.METAL,
    '亥': WUXING.WATER, '子': WUXING.WATER,
    '辰': WUXING.EARTH, '戌': WUXING.EARTH, '丑': WUXING.EARTH, '未': WUXING.EARTH
};

// 五行相生 (Generates)
const GENERATES = {
    '木': '火', '火': '土', '土': '金', '金': '水', '水': '木'
};

// 五行相剋 (Controls / Is Controlled By) - 用於判定克洩耗
const GENERATED_BY = {
    '木': '水', '火': '木', '土': '火', '金': '土', '水': '金'
};

/**
 * 系統化五行強弱計算引擎
 * @param {string} yearStem 年干
 * @param {string} yearBranch 年支
 * @param {string} monthStem 月干
 * @param {string} monthBranch 月令
 * @param {string} dayStem 日元 (Day Master)
 * @param {string} dayBranch 日支
 * @param {string} timeStem 時干
 * @param {string} timeBranch 時支
 * @returns {Object} 確定性的喜忌運算結果
 */
function calculateYongShen(yearStem, yearBranch, monthStem, monthBranch, dayStem, dayBranch, timeStem, timeBranch) {
    const dmElement = STEM_ELEMENTS[dayStem];
    if (!dmElement) return null;

    // 量化權重矩陣 (Month Branch 擁有最高權重 3.5)
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

    const parentElement = GENERATED_BY[dmElement]; // 印星 (生扶)

    // 演算法迴圈：統計生扶 (Support) 與 克洩耗 (Drain)
    for (const [pos, element] of Object.entries(chart)) {
        if (element === dmElement || element === parentElement) {
            supportScore += weights[pos];
        } else {
            drainScore += weights[pos];
        }
    }

    const isStrong = supportScore > drainScore;

    let yongShen, jiShen;

    // 找出所有克洩耗的五行
    const childElement = GENERATES[dmElement]; // 食傷
    const wealthElement = GENERATES[childElement]; // 財星
    const powerElement = GENERATED_BY[parentElement]; // 官殺

    if (isStrong) {
        yongShen = `${childElement} / ${wealthElement} / ${powerElement} (克洩耗)`;
        jiShen = `${parentElement} / ${dmElement} (生扶)`;
    } else {
        yongShen = `${parentElement} / ${dmElement} (生扶)`;
        jiShen = `${childElement} / ${wealthElement} / ${powerElement} (克洩耗)`;
    }

    return {
        dayMaster: dmElement,
        strength: isStrong ? "身強 (Strong)" : "身弱 (Weak)",
        supportScore: supportScore.toFixed(1),
        drainScore: drainScore.toFixed(1),
        yongShen: yongShen,
        jiShen: jiShen
    };
}

module.exports = { calculateYongShen };