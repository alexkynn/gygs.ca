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
    
    // 用於 MBTI 精算的五行單獨計分
    const elementScores = { '木': 0, '火': 0, '土': 0, '金': 0, '水': 0 };

    const parentElement = GENERATED_BY[dmElement]; // 印星 (生)
    const childElement = GENERATES[dmElement];     // 食傷 (洩)
    const wealthElement = CONTROLS[dmElement];     // 財星 (耗)
    const powerElement = GENERATED_BY[parentElement]; // 官殺 (克)

    // 2. 統計生扶 (Support) 與 克洩耗 (Drain) 兼 五行分數
    for (const [pos, element] of Object.entries(chart)) {
        elementScores[element] += weights[pos]; 

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
        yongShen = `${parentElement} / ${dmElement} (順勢生扶)`;
        jiShen = `${powerElement} / ${wealthElement} (逆勢克耗)`;
    } 
    else if (supportRatio <= 0.15) {
        isSpecialPattern = true;
        patternType = "從弱格 (Extreme Weak - Follow Pattern)";
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
    if (!isSpecialPattern) {
        if (['亥', '子', '丑'].includes(monthBranch)) {
            climateNote = " 【系統調候警示：生於冬月，命局偏寒，首重『火』來暖局】";
            if (!yongShen.includes('火')) yongShen = `火 (調候第一優先) + ` + yongShen;
            if (!jiShen.includes('水')) jiShen = `水 (寒氣過重) + ` + jiShen;
        } 
        else if (['巳', '午', '未'].includes(monthBranch)) {
            climateNote = " 【系統調候警示：生於夏月，命局燥熱，首重『水』來潤局】";
            if (!yongShen.includes('水')) yongShen = `水 (調候第一優先) + ` + yongShen;
            if (!jiShen.includes('火')) jiShen = `火 (燥氣過重) + ` + jiShen;
        }
    } else {
        climateNote = " 【系統提示：此為特殊從格，氣勢極端，不適用常規調候反克】";
    }

    // 🟢 6. Saju-MBTI 決定性後端演算法
    const outwardScore = elementScores[childElement] + elementScores[wealthElement];
    const inwardScore = elementScores[parentElement] + elementScores[dmElement];
    const E_I = outwardScore > inwardScore ? 'E' : 'I';

    const concreteScore = elementScores['土'] + elementScores['金'];
    const abstractScore = elementScores['水'] + elementScores['火'] + elementScores['木'];
    const S_N = concreteScore > abstractScore ? 'S' : 'N';

    const objectiveScore = elementScores['金'] + elementScores['水'] + elementScores[powerElement] + elementScores[wealthElement];
    const subjectiveScore = elementScores['木'] + elementScores['火'] + elementScores[dmElement] + elementScores[parentElement];
    const T_F = objectiveScore > subjectiveScore ? 'T' : 'F';

    const structureScore = elementScores[parentElement] + elementScores[powerElement];
    const fluidScore = elementScores[childElement] + elementScores[wealthElement];
    const J_P = structureScore > fluidScore ? 'J' : 'P';

    const defaultMbti = `${E_I}${S_N}${T_F}${J_P}`;

    // 🟢 7. 十神戰略矩陣 (Ten Gods Tactical Matrix)
    const strategyMatrix = {
        '印星': { action: '依靠知識產權變現、尋求大型機構與長輩權威的實質背書，用專業資質建立護城河。', detox: '戒斷對完美準備的過度執念與精神內耗，遠離喜歡用道德或恩情綁架妳的人。' },
        '比劫': { action: '尋找性格互補的合夥人共同築堤，將個人IP與團隊力量綁定，大膽爭取核心資源。', detox: '戒斷無效的社交應酬與過度泛濫的同理心，無情切割只索取不付出的「吸血型」人脈。' },
        '食傷': { action: '利用降維打擊的創意與獨特的美學品味進行內容輸出，透過個人影響力與技術壁壘變現。', detox: '戒斷不切實際的空想與無休止的自我懷疑，避免因言語過於犀利而得罪行業前輩。' },
        '財星': { action: '將敏銳的商業嗅覺轉化為系統化的資產配置，利用市場流動性與資源整合撬動高溢價。', detox: '戒斷高槓桿的短期投機與無實體支撐的資金遊戲，遠離向妳畫大餅的「暴富型」項目。' },
        '官殺': { action: '主動進入高門檻的體制或大型平台，透過管理制度與強大的抗壓韌性來獲取階層躍升。', detox: '戒斷極端施壓的管理模式與試圖掌控所有細節的強迫症，遠離用權力對妳進行精神打壓的人。' }
    };

    const getTenGodName = (el) => {
        if (el === parentElement) return '印星';
        if (el === dmElement) return '比劫';
        if (el === childElement) return '食傷';
        if (el === wealthElement) return '財星';
        if (el === powerElement) return '官殺';
        return '印星'; // fallback
    };

    const extractPrimaryElement = (str) => {
        for (let el of ['木', '火', '土', '金', '水']) {
            if (str && str.includes(el)) return el;
        }
        return parentElement; // fallback
    };

    const primaryYong = extractPrimaryElement(yongShen);
    const primaryJi = extractPrimaryElement(jiShen);

    const yongShenAction = `[專屬行動：${strategyMatrix[getTenGodName(primaryYong)].action}]`;
    const jiShenDetox = `[戒斷行為：${strategyMatrix[getTenGodName(primaryJi)].detox}]`;

    return {
        dayMaster: dmElement,
        strength: patternType + climateNote,
        supportScore: supportScore.toFixed(2),
        drainScore: drainScore.toFixed(2),
        yongShen: yongShen,
        jiShen: jiShen,
        yongShenAction: yongShenAction,
        jiShenDetox: jiShenDetox,
        defaultMbti: defaultMbti
    };
}

/**
 * 🟢 本地神煞字典引擎
 */
function calculateShenSha(yearStem, yearBranch, monthStem, monthBranch, dayStem, dayBranch, timeStem, timeBranch) {
    let stars = new Set();
    const branches = [yearBranch, monthBranch, dayBranch, timeBranch];

    // 天乙貴人
    const tianyiMap = {
        '甲': ['丑', '未'], '戊': ['丑', '未'], '庚': ['丑', '未'],
        '乙': ['子', '申'], '己': ['子', '申'],
        '丙': ['亥', '酉'], '丁': ['亥', '酉'],
        '壬': ['卯', '巳'], '癸': ['卯', '巳'],
        '辛': ['寅', '午']
    };
    
    // 文昌貴人
    const wenchangMap = {
        '甲': '巳', '乙': '午', '丙': '申', '戊': '申',
        '丁': '酉', '己': '酉', '庚': '亥', '辛': '子',
        '壬': '寅', '癸': '卯'
    };
    
    // 羊刃
    const yangrenMap = {
        '甲': '卯', '丙': '午', '戊': '午', '庚': '酉', '壬': '子'
    };

    // 三合局判斷
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

    // 魁罡
    const kuigangPillars = ['庚辰', '壬辰', '戊戌', '庚戌'];
    if (kuigangPillars.includes(dayStem + dayBranch)) stars.add('魁罡');

    // 陰陽差錯
    const yinyangPillars = ['丙子', '丁丑', '戊寅', '辛卯', '壬辰', '癸巳', '丙午', '丁未', '戊申', '辛酉', '壬戌', '癸亥'];
    if (yinyangPillars.includes(dayStem + dayBranch)) stars.add('陰陽差錯');

    return Array.from(stars).join('、') || '命局無上述特定神煞';
}

/**
 * 🟢 流年吉凶精算與刑沖合害鎖定引擎
 */
function analyzeAnnualPillar(yearStem, yearBranch, natalBranches, yongShen, jiShen) {
    const yStemEl = STEM_ELEMENTS[yearStem];
    const yBranchEl = BRANCH_ELEMENTS[yearBranch];
    
    const isYong = (yongShen.includes(yStemEl) || yongShen.includes(yBranchEl));
    const isJi = (jiShen.includes(yStemEl) || jiShen.includes(yBranchEl));
    const isDoubleYong = yongShen.includes(yStemEl) && yongShen.includes(yBranchEl);
    const isDoubleJi = jiShen.includes(yStemEl) && jiShen.includes(yBranchEl);
    
    let scoreTag = "";
    if (isDoubleYong) {
        scoreTag = `[流年大吉：喜用神${yStemEl}${yBranchEl}到位]`;
    } else if (isDoubleJi) {
        scoreTag = `[流年大凶：忌神${yStemEl}${yBranchEl}肆虐]`;
    } else if (isYong && !isJi) {
        scoreTag = "[流年平順：喜用神發力]";
    } else if (isJi && !isYong) {
        scoreTag = "[流年承壓：忌神干擾]";
    } else {
        scoreTag = "[流年過渡：吉凶參半]";
    }
    
    let clashTags = [];
    const clashes = { '子':'午', '丑':'未', '寅':'申', '卯':'酉', '辰':'戌', '巳':'亥', '午':'子', '未':'丑', '申':'寅', '酉':'卯', '戌':'辰', '亥':'巳' };
    const harms = { '子':'未', '丑':'午', '寅':'巳', '卯':'辰', '辰':'卯', '巳':'寅', '午':'丑', '未':'子', '申':'亥', '酉':'戌', '戌':'酉', '亥':'申' };
    const selfPunish = ['辰', '午', '酉', '亥'];
    
    natalBranches.forEach(nb => {
        if (clashes[yearBranch] === nb) clashTags.push(`[系統警示：流年與原局${nb}${yearBranch}相沖]`);
        if (harms[yearBranch] === nb) clashTags.push(`[系統警示：流年與原局${nb}${yearBranch}相害]`);
        if (yearBranch === nb && selfPunish.includes(yearBranch)) clashTags.push(`[系統警示：流年與原局${yearBranch}${yearBranch}自刑]`);
    });
    
    clashTags = [...new Set(clashTags)]; // 移除重複的警示
    return scoreTag + (clashTags.length > 0 ? " " + clashTags.join(" ") : "");
}

module.exports = { calculateYongShen, calculateShenSha, analyzeAnnualPillar };