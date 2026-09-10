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

const STEM_PROPS = {
    '甲': { element: '木', polarity: '+' },
    '乙': { element: '木', polarity: '-' },
    '丙': { element: '火', polarity: '+' },
    '丁': { element: '火', polarity: '-' },
    '戊': { element: '土', polarity: '+' },
    '己': { element: '土', polarity: '-' },
    '庚': { element: '金', polarity: '+' },
    '辛': { element: '金', polarity: '-' },
    '壬': { element: '水', polarity: '+' },
    '癸': { element: '水', polarity: '-' }
};

const BRANCH_HIDDEN_STEMS = {
    '子': ['癸'],
    '丑': ['己', '癸', '辛'],
    '寅': ['甲', '丙', '戊'],
    '卯': ['乙'],
    '辰': ['戊', '乙', '癸'],
    '巳': ['丙', '庚', '戊'],
    '午': ['丁', '己'],
    '未': ['己', '丁', '乙'],
    '申': ['庚', '壬', '戊'],
    '酉': ['辛'],
    '戌': ['戊', '辛', '丁'],
    '亥': ['壬', '甲']
};

const FIVE_ELEMENT_ASSETS = {
    '木': {
        numbers: '3、8',
        colors: '綠色、青色、翠色系列',
        directions: '東方、東南方',
        industries: '文化教育、出版傳播、生技醫療、永續綠能、設計創新、林業農業'
    },
    '火': {
        numbers: '2、7',
        colors: '紅色、紫色、粉色系列',
        directions: '南方',
        industries: '知識產權(IP)變現、文化傳播、自媒體影視、高端諮詢、科技算力、光電能源'
    },
    '土': {
        numbers: '5、10',
        colors: '黃色、咖啡色、褐色系列',
        directions: '中央、東北方、西南方',
        industries: '家族信託規劃、實體資產隔離、法律合規審查、高端心理諮詢、地產基建、倉儲管理'
    },
    '金': {
        numbers: '4、9',
        colors: '白色、金色、銀灰色系列',
        directions: '西方、西北方',
        industries: '金融風控、精密製造、法律合規、重工重資產、證券投資、硬體研發'
    },
    '水': {
        numbers: '1、6',
        colors: '黑色、深藍色系列',
        directions: '北方',
        industries: '全球化物流、數位流動性資產、跨境電商、互聯網通訊、流體科技、航運貿易'
    }
};

function getTenGod(dmStem, targetStem) {
    const dm = STEM_PROPS[dmStem];
    const target = STEM_PROPS[targetStem];
    if (!dm || !target) return '';
    
    const samePolarity = dm.polarity === target.polarity;
    
    if (dm.element === target.element) {
        return samePolarity ? '比肩' : '劫財';
    } else if (GENERATES[dm.element] === target.element) {
        return samePolarity ? '食神' : '傷官';
    } else if (CONTROLS[dm.element] === target.element) {
        return samePolarity ? '偏財' : '正財';
    } else if (CONTROLS[target.element] === dm.element) {
        return samePolarity ? '七殺' : '正官';
    } else if (GENERATES[target.element] === dm.element) {
        return samePolarity ? '偏印' : '正印';
    }
    return '';
}

function calculateYongShen(yearStem, yearBranch, monthStem, monthBranch, dayStem, dayBranch, timeStem, timeBranch) {
    const dmElement = STEM_ELEMENTS[dayStem];
    if (!dmElement) return null;

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
    const elementScores = { '木': 0, '火': 0, '土': 0, '金': 0, '水': 0 };

    const parentElement = GENERATED_BY[dmElement];
    const childElement = GENERATES[dmElement];
    const wealthElement = CONTROLS[dmElement];
    const powerElement = GENERATED_BY[parentElement];

    for (const [pos, element] of Object.entries(chart)) {
        elementScores[element] += weights[pos]; 
        if (element === dmElement || element === parentElement) {
            supportScore += weights[pos];
        } else {
            drainScore += weights[pos];
        }
    }

    const totalScore = supportScore + drainScore;
    const supportRatio = supportScore / totalScore; 
    
    let isStrong = supportScore > drainScore;
    let yongShen, jiShen, patternType;
    let isSpecialPattern = false;

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
        patternType = isStrong ? "正格 - 身強 (Normal Strong)" : "正格 - 身弱 (Normal Weak)";
        if (isStrong) {
            yongShen = `${childElement} / ${wealthElement} / ${powerElement} (克洩耗)`;
            jiShen = `${parentElement} / ${dmElement} (生扶)`;
        } else {
            yongShen = `${parentElement} / ${dmElement} (生扶)`;
            jiShen = `${childElement} / ${wealthElement} / ${powerElement} (克洩耗)`;
        }
    }

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

    let baziPattern = "";
    if (isSpecialPattern) {
        baziPattern = patternType;
    } else {
        const mPrincipal = BRANCH_HIDDEN_STEMS[monthBranch][0];
        const mTenGod = getTenGod(dayStem, mPrincipal);
        if (mTenGod === '比肩') {
            baziPattern = '建祿格';
        } else if (mTenGod === '劫財') {
            baziPattern = '羊刃格 (月刃格)';
        } else {
            const emergedStems = [yearStem, monthStem, timeStem];
            let foundPattern = false;
            for (let hs of BRANCH_HIDDEN_STEMS[monthBranch]) {
                if (emergedStems.includes(hs)) {
                    const tg = getTenGod(dayStem, hs);
                    if (tg !== '比肩' && tg !== '劫財') {
                        baziPattern = `${tg}格 (透干取格)`;
                        foundPattern = true;
                        break;
                    }
                }
            }
            if (!foundPattern) baziPattern = `${mTenGod}格 (本氣取格)`;
        }
    }

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
        return '印星'; 
    };

    const extractPrimaryElement = (str) => {
        for (let el of ['木', '火', '土', '金', '水']) {
            if (str && str.includes(el)) return el;
        }
        return parentElement; 
    };

    const primaryYong = extractPrimaryElement(yongShen);
    const primaryJi = extractPrimaryElement(jiShen);

    const yongShenAction = `[專屬行動：${strategyMatrix[getTenGodName(primaryYong)].action}]`;
    const jiShenDetox = `[戒斷行為：${strategyMatrix[getTenGodName(primaryJi)].detox}]`;

    const vaultMap = { '水': '辰', '火': '戌', '金': '丑', '木': '未', '土': '戌' };
    const vaultBranch = vaultMap[dmElement] || '戌';
    const allBranches = [yearBranch, monthBranch, dayBranch, timeBranch];
    const hasVault = allBranches.includes(vaultBranch);
    const wealthVaultStatus = hasVault ? `命局帶有「${vaultBranch}」財庫，具備實體財富鎖定能力` : `原局無「${vaultBranch}」水/財庫，定性為『身弱無庫，防禦築堤型』`;

    const formatPillarTG = (s, b) => {
        const sTG = getTenGod(dayStem, s);
        const hidden = BRANCH_HIDDEN_STEMS[b] || [];
        const hDesc = hidden.map(hs => `${hs}(${getTenGod(dayStem, hs)})`).join('/');
        return `${s}${b}[${sTG}] (藏支:${hDesc})`;
    };
    
    // 🟢 精確寫死四柱的大運歲數區間，徹底防止 AI 在 Section 3.1 自行腦補年紀
    const tenGodsString = `年柱(1歲至16歲): ${formatPillarTG(yearStem, yearBranch)} | 月柱(17歲至32歲): ${formatPillarTG(monthStem, monthBranch)} | 日柱(33歲至48歲): ${formatPillarTG(dayStem, dayBranch)} | 時柱(49歲之後): ${formatPillarTG(timeStem, timeBranch)}`;
    
    const natalInteractions = analyzeNatalInteractions(allBranches);

    const yongElements = [];
    for (let el of ['火', '土', '金', '水', '木']) {
        if (yongShen.includes(el)) yongElements.push(el);
    }
    if (yongElements.length === 0) yongElements.push(parentElement || '火');

    const nums = [...new Set(yongElements.map(e => FIVE_ELEMENT_ASSETS[e].numbers))].join('；');
    const cols = [...new Set(yongElements.map(e => FIVE_ELEMENT_ASSETS[e].colors))].join('；');
    const dirs = [...new Set(yongElements.map(e => FIVE_ELEMENT_ASSETS[e].directions))].join('、');
    const inds = yongElements.map(e => `【${e}行】：${FIVE_ELEMENT_ASSETS[e].industries}`).join(' | ');
    const auspiciousCodes = `幸運數字：${nums} | 幸運色彩：${cols} | 貴人方位：${dirs} | 專屬契合產業：${inds}`;

    return {
        dayMaster: dmElement,
        strength: patternType + climateNote,
        baziPattern: baziPattern,
        supportScore: supportScore.toFixed(2),
        drainScore: drainScore.toFixed(2),
        yongShen: yongShen,
        jiShen: jiShen,
        yongShenAction: yongShenAction,
        jiShenDetox: jiShenDetox,
        defaultMbti: defaultMbti,
        wealthVaultStatus,
        tenGodsString,
        natalInteractions,
        auspiciousCodes
    };
}

function calculateShenSha(yearStem, yearBranch, monthStem, monthBranch, dayStem, dayBranch, timeStem, timeBranch) {
    let stars = new Set();
    const branches = [yearBranch, monthBranch, dayBranch, timeBranch];

    const tianyiMap = {
        '甲': ['丑', '未'], '戊': ['丑', '未'], '庚': ['丑', '未'],
        '乙': ['子', '申'], '己': ['子', '申'],
        '丙': ['亥', '酉'], '丁': ['亥', '酉'],
        '壬': ['卯', '巳'], '癸': ['卯', '巳'],
        '辛': ['寅', '午']
    };
    const wenchangMap = {
        '甲': '巳', '乙': '午', '丙': '申', '戊': '申',
        '丁': '酉', '己': '酉', '庚': '亥', '辛': '子',
        '壬': '寅', '癸': '卯'
    };
    const yangrenMap = {
        '甲': '卯', '丙': '午', '戊': '午', '庚': '酉', '壬': '子'
    };

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

    const kuigangPillars = ['庚辰', '壬辰', '戊戌', '庚戌'];
    if (kuigangPillars.includes(dayStem + dayBranch)) stars.add('魁罡');

    const yinyangPillars = ['丙子', '丁丑', '戊寅', '辛卯', '壬辰', '癸巳', '丙午', '丁未', '戊申', '辛酉', '壬戌', '癸亥'];
    if (yinyangPillars.includes(dayStem + dayBranch)) stars.add('陰陽差錯');

    return Array.from(stars).join('、') || '命局無上述特定神煞';
}

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
    
    clashTags = [...new Set(clashTags)]; 
    return scoreTag + (clashTags.length > 0 ? " " + clashTags.join(" ") : "");
}

function analyzeNatalInteractions(branches) {
    const [yB, mB, dB, tB] = branches;
    const pairs = [
        { b1: yB, b2: mB, pos: '年月' },
        { b1: yB, b2: dB, pos: '年日' },
        { b1: yB, b2: tB, pos: '年時' },
        { b1: mB, b2: dB, pos: '月日' },
        { b1: mB, b2: tB, pos: '月時' },
        { b1: dB, b2: tB, pos: '日時' }
    ];

    const clashes = { '子':'午', '丑':'未', '寅':'申', '卯':'酉', '辰':'戌', '巳':'亥', '午':'子', '未':'丑', '申':'寅', '酉':'卯', '戌':'辰', '亥':'巳' };
    const harms = { '子':'未', '丑':'午', '寅':'巳', '卯':'辰', '辰':'卯', '巳':'寅', '午':'丑', '未':'子', '申':'亥', '酉':'戌', '戌':'酉', '亥':'申' };
    const selfPunish = ['辰', '午', '酉', '亥'];

    let results = [];
    pairs.forEach(p => {
        if (clashes[p.b1] === p.b2) results.push(`${p.pos}(${p.b1}${p.b2})相沖`);
        if (harms[p.b1] === p.b2) results.push(`${p.pos}(${p.b1}${p.b2})相害`);
    });
    
    const branchCounts = {};
    branches.forEach(b => branchCounts[b] = (branchCounts[b] || 0) + 1);
    Object.keys(branchCounts).forEach(b => {
        if (branchCounts[b] >= 2 && selfPunish.includes(b)) {
            results.push(`自刑(${b}${b})`);
        }
    });

    return results.length > 0 ? results.join('、') : '原局地支無重大刑沖害';
}

function calculateSocialMagnetism(dayBranch, yearBranch, yongShen, jiShen) {
    const sanHe = {
        '申': ['子', '辰'], '子': ['申', '辰'], '辰': ['申', '子'],
        '亥': ['卯', '未'], '卯': ['亥', '未'], '未': ['亥', '卯'],
        '寅': ['午', '戌'], '午': ['寅', '戌'], '戌': ['寅', '午'],
        '巳': ['酉', '丑'], '酉': ['巳', '丑'], '丑': ['巳', '酉']
    };
    const liuHe = {
        '子': '丑', '丑': '子', '寅': '亥', '亥': '寅',
        '卯': '戌', '戌': '卯', '辰': '酉', '酉': '辰',
        '巳': '申', '申': '巳', '午': '未', '未': '午'
    };
    const clashes = { '子':'午', '丑':'未', '寅':'申', '卯':'酉', '辰':'戌', '巳':'亥', '午':'子', '未':'丑', '申':'寅', '酉':'卯', '戌':'辰', '亥':'巳' };
    const harms = { '子':'未', '丑':'午', '寅':'巳', '卯':'辰', '辰':'卯', '巳':'寅', '午':'丑', '未':'子', '申':'亥', '酉':'戌', '戌':'酉', '亥':'申' };
    const selfPunish = ['辰', '午', '酉', '亥'];

    let bestSet = new Set();
    let worstSet = new Set();

    [dayBranch, yearBranch].forEach(branch => {
        if (sanHe[branch]) sanHe[branch].forEach(b => bestSet.add(b));
        if (liuHe[branch]) bestSet.add(liuHe[branch]);

        if (clashes[branch]) worstSet.add(clashes[branch]);
        if (harms[branch]) worstSet.add(harms[branch]);
        if (selfPunish.includes(branch)) worstSet.add(branch);
    });

    worstSet.forEach(b => bestSet.delete(b));

    let finalBest = [];
    bestSet.forEach(b => {
        const el = BRANCH_ELEMENTS[b];
        if (!jiShen.includes(el)) finalBest.push(b);
    });
    if (finalBest.length === 0) finalBest = Array.from(bestSet); 

    let finalWorst = [];
    worstSet.forEach(b => {
        const el = BRANCH_ELEMENTS[b];
        if (!yongShen.includes(el)) finalWorst.push(b);
    });
    if (finalWorst.length === 0) finalWorst = Array.from(worstSet);

    return `最佳合夥/伴侶地支為 ${finalBest.join('、')}；必須無情切割的地支為 ${finalWorst.join('、')}`;
}

function analyzeMonthlyPillars(monthsData, yongShen, jiShen) {
    let golden = [];
    let highRisk = [];

    monthsData.forEach(m => {
        const mStemEl = STEM_ELEMENTS[m.ganZhi.charAt(0)];
        const mBranchEl = BRANCH_ELEMENTS[m.ganZhi.charAt(1)];
        
        const isDoubleYong = yongShen.includes(mStemEl) && yongShen.includes(mBranchEl);
        const isDoubleJi = jiShen.includes(mStemEl) && jiShen.includes(mBranchEl);
        
        if (isDoubleYong) golden.push(`${m.gMonth}月(${m.ganZhi})`);
        if (isDoubleJi) highRisk.push(`${m.gMonth}月(${m.ganZhi})`);
    });

    if (golden.length === 0) {
        monthsData.forEach(m => {
            const mBranchEl = BRANCH_ELEMENTS[m.ganZhi.charAt(1)];
            if (yongShen.includes(mBranchEl)) golden.push(`${m.gMonth}月(${m.ganZhi})`); 
        });
    }
    if (highRisk.length === 0) {
        monthsData.forEach(m => {
            const mBranchEl = BRANCH_ELEMENTS[m.ganZhi.charAt(1)];
            if (jiShen.includes(mBranchEl)) highRisk.push(`${m.gMonth}月(${m.ganZhi})`);
        });
    }

    if (golden.length === 0) golden.push('無絕對極值月，以平穩為主');
    if (highRisk.length === 0) highRisk.push('無絕對高危月，以平穩為主');

    return `[黃金爆發期：西曆 ${golden.join('、')}]、[高危避險期：西曆 ${highRisk.join('、')}]`;
}

module.exports = { calculateYongShen, calculateShenSha, analyzeAnnualPillar, calculateSocialMagnetism, analyzeMonthlyPillars };