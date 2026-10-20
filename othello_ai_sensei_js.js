
/* ==========================================================================
  【オセロプログラム ロジック・AI思考エンジン】
  ファイル名: othello_ai_sensei_js.js
  バージョン: Ver 8.6.5 (2026/10/20)
  
  [Ver 8.6.5] 2026/10/20 更新内容:
  - 【全モード完全同一スロット・盤面＆説明枠絶対不動エディション】
  - 講義・検定・検討・通常対局の4大カードを下部固定スロット（player-control-zone）へ完全統合。
  - モード切り替え時の盤面上下動を100%根絶し、1ピクセルも動かない盤面絶対静止レイアウトを確立。
  - タップ時の先読み探索即時中断（isPrefetchAborted）による0秒即時着手を完全維持。
  - ヒントAIの深さ（深さ9手／終盤16手完全読み切り）をLv.10老賢王オルレアン撃破仕様のまま100%維持。
  - セリフ優雅アンビエント発光、同一セリフ静止維持、αβ探索置換表フラグ完全管理を継続。
========================================================================== */

const boardSize = 8;

let humanColor = BLACK, cpuColor = WHITE;
let board, currentPlayer, gameOver, isBusy = false, isMuted = false;
let pendingAnimation = null, hintMove = null;
let historyStack = [];

let lastMove = null, usedHintInGame = false;
let currentGameSessionId = 0;

let gameStepLogs = [], reviewStepIndex = 0, isReviewMode = false;
let tacticsBestIndex = -1, tacticsWorstIndex = -1, tacticsWorstAlternative = null;
let tacticsTurningPointIndex = -1;

let elapsedSeconds = 0, playerSeconds = 0, cpuSeconds = 0;
let isAiThinkingHint = false, timerInterval = null;
let talkingTimeout = null, toastTimeout = null, curtainTimeout = null, pulseTimeout = null;
let typeWriterInterval = null, speakingGlowTimeout = null;

let playerMoveLogs = [];
let minPlayerWinrateInGame = 50;

// 直前のセリフテキスト保持（同一セリフのリセット・チラつき防止用）
let lastOpponentQuoteText = "";

// 事前計算（プリフェッチ）キャッシュ ＆ 即時中断フラグ
let cachedMoveEvaluations = null;
let isPrefetching = false;
let isPrefetchAborted = false;

// 探索高速化用トランスポジションテーブル（置換表）フラグ定数
const TT_EXACT = 0;
const TT_LOWERBOUND = 1; // αカット
const TT_UPPERBOUND = 2; // βカット
const transpositionTable = new Map();

// 🎯 宮廷次の一手検定（全15問類題特訓）管理変数
let isDrillMode = false;
let currentDrillQuestionIndex = 1;
let savedBoardStateForDrill = null;
const drillPassedMap = {};
let isSimulatingDrillMistake = false;

// 📖 盤面動的ビジュアル講義 管理変数
let isLectureMode = false;
let currentLectureId = "lec-1";
let currentLectureStepIndex = 0;
let savedBoardStateForLecture = null;
let isLecturePlaying = false;
let lectureSessionId = 0;

const STORAGE_KEY_ARCHIVES = "othello_dynasty_archives_v1";

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const DOM = {
    board: document.getElementById("board"),
    boardChassis: document.getElementById("boardChassis"),
    stageCurtainBanner: document.getElementById("stageCurtainBanner"),
    curtainStageLabel: document.getElementById("curtainStageLabel"),
    curtainSalonTitle: document.getElementById("curtainSalonTitle"),
    curtainRelicSub: document.getElementById("curtainRelicSub"),
    status: document.getElementById("status"),
    playerTime: document.getElementById("playerTime"),
    opponentTime: document.getElementById("opponentTime"),
    playerScore: document.getElementById("playerScore"),
    opponentScore: document.getElementById("opponentScore"),
    playerPieceIcon: document.getElementById("playerPieceIcon"),
    opponentPieceIcon: document.getElementById("opponentPieceIcon"),
    opponentAvatarWrap: document.getElementById("opponentAvatarWrap"),
    opponentAvatarFrame: document.getElementById("opponentAvatarFrame"),
    avatarImgBox: document.getElementById("avatarImgBox"),
    opponentRankBadge: document.getElementById("opponentRankBadge"),
    opponentThinkingBadge: document.getElementById("opponentThinkingBadge"),
    opponentName: document.getElementById("opponentName"),
    opponentTitle: document.getElementById("opponentTitle"),
    badgeSalonName: document.getElementById("badgeSalonName"),
    badgeMaterial: document.getElementById("badgeMaterial"),
    opponentSpeech: document.getElementById("opponentSpeech"),
    speechText: document.getElementById("speechText"),
    characterSelect: document.getElementById("characterSelect"),
    hintMode: document.getElementById("hintMode"),
    hintButton: document.getElementById("hintButton"),
    hintBadgeTag: document.getElementById("hintBadgeTag"),
    hintFixedDisplay: document.getElementById("hintFixedDisplay"),
    hintCoordText: document.getElementById("hintCoordText"),
    hintBodyText: document.getElementById("hintBodyText"),
    undoButton: document.getElementById("undoButton"),
    moveToast: document.getElementById("moveToast"),
    battleGaugeContainer: document.getElementById("battleGaugeContainer"),
    battlePowerPlayer: document.getElementById("battlePowerPlayer"),
    battlePowerOpponent: document.getElementById("battlePowerOpponent"),
    battleClashSpark: document.getElementById("battleClashSpark"),
    battleStatPlayerText: document.getElementById("battleStatPlayerText"),
    battleStatOpponentText: document.getElementById("battleStatOpponentText"),
    battlePiecePlayer: document.getElementById("battlePiecePlayer"),
    battlePieceOpponent: document.getElementById("battlePieceOpponent"),
    battleSituationBadge: document.getElementById("battleSituationBadge"),
    btnPlayerBlack: document.getElementById("btnPlayerBlack"),
    btnPlayerWhite: document.getElementById("btnPlayerWhite"),
    normalControlCard: document.getElementById("normalControlCard"),
    btnOpenDrillMain: document.getElementById("btnOpenDrillMain"),
    reviewModePanel: document.getElementById("reviewModePanel"),
    reviewTurnInfo: document.getElementById("reviewTurnInfo"),
    reviewContextBox: document.getElementById("reviewContextBox"),
    btnReviewPrev: document.getElementById("btnReviewPrev"),
    btnReviewNext: document.getElementById("btnReviewNext"),
    btnJumpGood: document.getElementById("btnJumpGood"),
    btnJumpBad: document.getElementById("btnJumpBad"),
    btnReviewExit: document.getElementById("btnReviewExit"),
    btnStartReview: document.getElementById("btnStartReview"),
    btnResultArchive: document.getElementById("btnResultArchive"),
    royalResultModal: document.getElementById("royalResultModal"),
    resultMainTitle: document.getElementById("resultMainTitle"),
    opponentStatusTag: document.getElementById("opponentStatusTag"),
    resultAvatarFrame: document.getElementById("resultAvatarFrame"),
    resultCharNameBadge: document.getElementById("resultCharNameBadge"),
    resultQuoteBox: document.getElementById("resultQuoteBox"),
    resultStonesDetail: document.getElementById("resultStonesDetail"),
    resultTimesDetail: document.getElementById("resultTimesDetail"),
    carteHintAdvice: document.getElementById("carteHintAdvice"),
    carteStoryTimeline: document.getElementById("carteStoryTimeline"),
    btnResultAdvance: document.getElementById("btnResultAdvance"),
    btnAdvanceIcon: document.getElementById("btnAdvanceIcon"),
    btnAdvanceText: document.getElementById("btnAdvanceText"),
    endingModal: document.getElementById("endingModal"),
    btnRestartFromBeginning: document.getElementById("btnRestartFromBeginning"),
    archiveOpenBtn: document.getElementById("archiveOpenBtn"),
    archiveOverlay: document.getElementById("archiveOverlay"),
    archiveCloseButton: document.getElementById("archiveCloseButton"),
    archStatWinrate: document.getElementById("archStatWinrate"),
    archStatWld: document.getElementById("archStatWld"),
    archStatStreak: document.getElementById("archStatStreak"),
    archStatBestRate: document.getElementById("archStatBestRate"),
    archiveCrownGrid: document.getElementById("archiveCrownGrid"),
    archFilterOpponent: document.getElementById("archFilterOpponent"),
    archFilterMode: document.getElementById("archFilterMode"),
    archFilterResult: document.getElementById("archFilterResult"),
    archSortOrder: document.getElementById("archSortOrder"),
    btnArchiveClear: document.getElementById("btnArchiveClear"),
    archiveTableBody: document.getElementById("archiveTableBody"),
    versionBadge: document.getElementById("versionBadge"),
    chronicleTimeline: document.getElementById("chronicleTimeline"),
    // ミニ解説ポップアップ
    termPopup: document.getElementById("termPopup"),
    termPopupTitle: document.getElementById("termPopupTitle"),
    termPopupClose: document.getElementById("termPopupClose"),
    termPopupBody: document.getElementById("termPopupBody"),
    termPopupDrillBtn: document.getElementById("termPopupDrillBtn"),
    termPopupMore: document.getElementById("termPopupMore"),
    guideOverlay: document.getElementById("guideOverlay"),
    // 🎯 宮廷次の一手検定用DOM
    drillControlCard: document.getElementById("drillControlCard"),
    drillTopicBadge: document.getElementById("drillTopicBadge"),
    drillDiffBadge: document.getElementById("drillDiffBadge"),
    drillQuestionText: document.getElementById("drillQuestionText"),
    drillQuestionSub: document.getElementById("drillQuestionSub"),
    drillFeedbackBox: document.getElementById("drillFeedbackBox"),
    drillFeedbackTitle: document.getElementById("drillFeedbackTitle"),
    drillFeedbackReason: document.getElementById("drillFeedbackReason"),
    btnDrillRetry: document.getElementById("btnDrillRetry"),
    btnDrillBackToLecture: document.getElementById("btnDrillBackToLecture"),
    btnDrillNextQuestion: document.getElementById("btnDrillNextQuestion"),
    btnDrillList: document.getElementById("btnDrillList"),
    btnDrillExit: document.getElementById("btnDrillExit"),
    drillCourseModal: document.getElementById("drillCourseModal"),
    drillCourseList: document.getElementById("drillCourseList"),
    drillCertificateModal: document.getElementById("drillCertificateModal"),
    // 📖 盤面動的ビジュアル講義用DOM
    lectureControlCard: document.getElementById("lectureControlCard"),
    lectureTopicBadge: document.getElementById("lectureTopicBadge"),
    lectureStepIndicator: document.getElementById("lectureStepIndicator"),
    lectureTitleText: document.getElementById("lectureTitleText"),
    lectureDescText: document.getElementById("lectureDescText"),
    lectureExplainBox: document.getElementById("lectureExplainBox"),
    btnLecturePlay: document.getElementById("btnLecturePlay"),
    btnLectureReset: document.getElementById("btnLectureReset"),
    btnLectureToDrill: document.getElementById("btnLectureToDrill"),
    btnLectureExit: document.getElementById("btnLectureExit"),
    // 📜 豪傑人物伝モーダル用DOM
    charProfileModal: document.getElementById("charProfileModal"),
    profileCharNameHeader: document.getElementById("profileCharNameHeader"),
    profileAvatarBox: document.getElementById("profileAvatarBox"),
    profileTitleBadge: document.getElementById("profileTitleBadge"),
    profileSalonBadge: document.getElementById("profileSalonBadge"),
    profileMaterialBadge: document.getElementById("profileMaterialBadge"),
    profileBioText: document.getElementById("profileBioText"),
    profileTacticsText: document.getElementById("profileTacticsText"),
    // 📜 宮廷思案所 体系化コンテナDOM
    opsGuideContainer: document.getElementById("opsGuideContainer"),
    strategyPhasesContainer: document.getElementById("strategyPhasesContainer"),
    strategyRoadmapContainer: document.getElementById("strategyRoadmapContainer"),
    charGalleryList: document.getElementById("charGalleryList")
};

const cornerSquares = [[0, 0], [0, 7], [7, 0], [7, 7]];
const directions = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];

const FLIP_INTERVAL_MS = 115;
const FLIP_ANIMATION_DURATION_MS = 680;

/* WebAudio 音響合成 */
const bgm = document.getElementById("bgmAudio");
if (bgm) bgm.volume = 0.32;
let audioCtx = null;

function getAudioContext() {
    try {
        const AudioClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioClass) return null;
        if (!audioCtx || audioCtx.state === "closed") audioCtx = new AudioClass();
        if (audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
        return audioCtx;
    } catch (e) { return null; }
}

function tryPlayBgm() { if (!isMuted && bgm && bgm.paused && !document.hidden) bgm.play().catch(() => {}); }
const unlockAudio = () => { tryPlayBgm(); getAudioContext(); };
document.addEventListener("click", unlockAudio, { once: true });
document.addEventListener("touchstart", unlockAudio, { once: true });

document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
        try { if (bgm && !bgm.paused) bgm.pause(); if (audioCtx && audioCtx.state === "running") audioCtx.suspend().catch(() => {}); } catch(e){}
    } else if (!isMuted) {
        tryPlayBgm();
        if (audioCtx && audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
    }
});

function createSynthesizedHit(duration, decay, filterFreq, filterQ, oscStartFreq, oscEndFreq, vol) {
    if (isMuted || document.hidden) return;
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        const len = Math.floor(ctx.sampleRate * duration);
        if (len > 0) {
            const buf = ctx.createBuffer(1, len, ctx.sampleRate);
            const data = buf.getChannelData(0);
            for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * decay));
            const noise = ctx.createBufferSource();
            noise.buffer = buf;
            const filter = ctx.createBiquadFilter();
            filter.type = "bandpass"; filter.frequency.setValueAtTime(filterFreq, now); filter.Q.setValueAtTime(filterQ, now);
            const nGain = ctx.createGain();
            nGain.gain.setValueAtTime(vol, now); nGain.gain.exponentialRampToValueAtTime(0.001, now + duration);
            noise.connect(filter).connect(nGain).connect(ctx.destination);
            noise.start(now);
        }
        const osc = ctx.createOscillator();
        osc.frequency.setValueAtTime(oscStartFreq, now);
        osc.frequency.exponentialRampToValueAtTime(oscEndFreq, now + duration * 1.3);
        const tGain = ctx.createGain();
        tGain.gain.setValueAtTime(vol * 1.1, now);
        tGain.gain.exponentialRampToValueAtTime(0.001, now + duration * 1.3);
        osc.connect(tGain).connect(ctx.destination);
        osc.start(now); osc.stop(now + duration * 1.3);
    } catch (e) {}
}

function playPlaceSound() { createSynthesizedHit(0.045, 0.16, 1400, 1.8, 220, 45, 0.95); }
function playFlipSingleSound(pitch = 1.0, isLast = false) {
    createSynthesizedHit(0.042, 0.28, (isLast ? 2400 : 1800) * pitch, 2.0, 260 * pitch, 90 * pitch, isLast ? 0.68 : 0.52);
}

function playFlipSequence(count) {
    if (isMuted || document.hidden) return;
    for (let i = 0; i < count; i++) {
        setTimeout(() => playFlipSingleSound(0.92 + i * 0.05, i === count - 1), i * FLIP_INTERVAL_MS + 80);
    }
}

function playFanfareSound() {
    if (isMuted || document.hidden) return;
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const startTime = ctx.currentTime + (idx * 0.08);
            osc.type = "triangle";
            osc.frequency.setValueAtTime(freq, startTime);
            gain.gain.setValueAtTime(0.4, startTime);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.45);
            osc.connect(gain).connect(ctx.destination);
            osc.start(startTime);
            osc.stop(startTime + 0.45);
        });
    } catch (e) {}
}

function playBuzzerSound() {
    if (isMuted || document.hidden) return;
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.setValueAtTime(110, now + 0.12);
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.32);
    } catch (e) {}
}

function getBoardStats(targetBoard = board) {
    let black = 0, white = 0, empty = 0;
    if (!targetBoard) return { black: 0, white: 0, empty: 64 };
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const val = targetBoard[r][c];
            if (val === BLACK) black++; else if (val === WHITE) white++; else empty++;
        }
    }
    return { black, white, empty };
}
const getEmptyCount = (target = board) => getBoardStats(target).empty;
const isInside = (r, c) => r >= 0 && r < boardSize && c >= 0 && c < boardSize;
const opposite = (p) => (p === BLACK ? WHITE : BLACK);
const cloneBoard = (src) => src.map(r => r.slice());
const toNotation = (r, c) => String.fromCharCode(65 + c) + (r + 1);

function getBoardCell(r, c) {
    if (!DOM.board) return null;
    return DOM.board.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`);
}

function initCoordLabels() {
    const chassis = DOM.boardChassis;
    if (!chassis) return;
    chassis.querySelectorAll(".coord-label").forEach(l => l.remove());

    ['A','B','C','D','E','F','G','H'].forEach((col, i) => {
        const pos = `calc(var(--frame-pad) + (100% - var(--frame-pad) * 2) * (${i} + 0.5) / 8)`;
        const topL = document.createElement("div"), botL = document.createElement("div");
        topL.className = botL.className = "coord-label";
        topL.textContent = botL.textContent = col;
        topL.style.cssText = `left: ${pos}; top: calc(var(--frame-pad) / 2); transform: translate(-50%, -50%);`;
        botL.style.cssText = `left: ${pos}; bottom: calc(var(--frame-pad) / 2); transform: translate(-50%, 50%);`;
        chassis.append(topL, botL);
    });
    ['1','2','3','4','5','6','7','8'].forEach((row, i) => {
        const pos = `calc(var(--frame-pad) + (100% - var(--frame-pad) * 2) * (${i} + 0.5) / 8)`;
        const leftL = document.createElement("div"), rightL = document.createElement("div");
        leftL.className = rightL.className = "coord-label";
        leftL.textContent = rightL.textContent = row;
        leftL.style.cssText = `top: ${pos}; left: calc(var(--frame-pad) / 2); transform: translate(-50%, -50%);`;
        rightL.style.cssText = `top: ${pos}; right: calc(var(--frame-pad) / 2); transform: translate(50%, -50%);`;
        chassis.append(leftL, rightL);
    });
}

function renderSystemVersionInfo() {
    if (DOM.versionBadge && typeof SYSTEM_VERSION_INFO !== "undefined") DOM.versionBadge.textContent = SYSTEM_VERSION_INFO.version;
    if (DOM.chronicleTimeline && typeof SYSTEM_VERSION_INFO !== "undefined" && Array.isArray(SYSTEM_VERSION_INFO.history)) {
        DOM.chronicleTimeline.innerHTML = SYSTEM_VERSION_INFO.history.map(item => `
            <div class="chronicle-item">
                <span class="chronicle-version">${item.ver}</span><span class="chronicle-date">${item.date}</span>
                <div class="chronicle-desc">${item.desc}</div>
            </div>
        `).join("");
    }
}

function setStatus(type, text) {
    if (!DOM.status) return;
    DOM.status.className = `status-${type}`;
    DOM.status.textContent = text;
}

function triggerTurnPulse() {
    if (!DOM.normalControlCard) return;
    DOM.normalControlCard.classList.remove("turn-notify-pulse");
    DOM.normalControlCard.offsetHeight;
    DOM.normalControlCard.classList.add("turn-notify-pulse");
    if (pulseTimeout) clearTimeout(pulseTimeout);
    pulseTimeout = setTimeout(() => DOM.normalControlCard.classList.remove("turn-notify-pulse"), 800);
}

const baseStaticWeights = [
    [ 1200, -2500,   80,   20,   20,   80, -2500, 1200],
    [-2500, -3000,  -30,  -30,  -30,  -30, -3000, -2500],
    [   80,   -30,   30,   10,   10,   30,   -30,   80],
    [   20,   -30,   10,    2,    2,   10,   -30,   20],
    [   20,   -30,   10,    2,    2,   10,   -30,   20],
    [   80,   -30,   30,   10,   10,   30,   -30,   80],
    [-2500, -3000,  -30,  -30,  -30,  -30, -3000, -2500],
    [ 1200, -2500,   80,   20,   20,   80, -2500, 1200]
];

const cornerDangerDefinitions = [
    { corner: [0, 0], x: [1, 1], c: [[0, 1], [1, 0]] },
    { corner: [0, 7], x: [1, 6], c: [[0, 6], [1, 7]] },
    { corner: [7, 0], x: [6, 1], c: [[6, 0], [7, 1]] },
    { corner: [7, 7], x: [6, 6], c: [[6, 7], [7, 6]] }
];

function isXSquare(r, c) {
    return (r === 1 && c === 1) || (r === 1 && c === 6) || (r === 6 && c === 1) || (r === 6 && c === 6);
}

function isCSquare(r, c) {
    const cSquares = [[0,1],[1,0],[0,6],[1,7],[6,0],[7,1],[6,7],[7,6]];
    return cSquares.some(([cr, cc]) => cr === r && cc === c);
}

function getDynamicCellWeights(targetBoard, perspectivePlayer) {
    const weights = baseStaticWeights.map(row => row.slice());
    const opp = opposite(perspectivePlayer);

    for (const def of cornerDangerDefinitions) {
        const [cr, cc] = def.corner;
        const cornerOwner = targetBoard[cr][cc];

        if (cornerOwner === 0) {
            weights[def.x[0]][def.x[1]] = -2500;
            for (const [crPos, ccPos] of def.c) weights[crPos][ccPos] = -800;
        } else if (cornerOwner === perspectivePlayer) {
            weights[def.x[0]][def.x[1]] = 120;
            for (const [crPos, ccPos] of def.c) weights[crPos][ccPos] = 100;
        } else if (cornerOwner === opp) {
            weights[def.x[0]][def.x[1]] = -40;
            for (const [crPos, ccPos] of def.c) weights[crPos][ccPos] = -50;
        }
    }
    return weights;
}

const getCurrentCharacter = () => CHARACTERS[Number(DOM.characterSelect.value) || 1] || CHARACTERS[1];

function renderCharacterAvatar() {
    const char = getCurrentCharacter();
    if (!DOM.avatarImgBox) return;
    DOM.avatarImgBox.innerHTML = "";
    const img = new Image();
    img.src = char.image;
    img.alt = char.name;
    img.style.objectPosition = char.imgFocus || "center 20%";
    img.onload = () => { DOM.avatarImgBox.innerHTML = ""; DOM.avatarImgBox.appendChild(img); };
    img.onerror = () => { DOM.avatarImgBox.innerHTML = `<span class="avatar-fallback-icon">${char.icon}</span>`; };
}

/* ==========================================================================
  【セリフ表示制御（同一セリフ静止 ＆ 枠内ぼわ〜っとアンビエント発光）】
========================================================================== */
function typeWriterSpeech(fullText) {
    if (typeWriterInterval) clearInterval(typeWriterInterval);
    if (!DOM.speechText || !DOM.opponentSpeech) return;

    DOM.opponentSpeech.classList.remove("is-speaking");
    DOM.opponentSpeech.offsetHeight;
    DOM.opponentSpeech.classList.add("is-speaking");

    if (speakingGlowTimeout) clearTimeout(speakingGlowTimeout);
    speakingGlowTimeout = setTimeout(() => {
        if (DOM.opponentSpeech) DOM.opponentSpeech.classList.remove("is-speaking");
    }, 1800);

    DOM.speechText.textContent = "";
    let index = 0;
    const total = fullText.length;
    typeWriterInterval = setInterval(() => {
        if (index < total) {
            DOM.speechText.textContent += fullText.charAt(index);
            index++;
        } else {
            clearInterval(typeWriterInterval);
            typeWriterInterval = null;
        }
    }, 22);
}

function setOpponentQuote(category) {
    if (isReviewMode || isDrillMode || isLectureMode) return;
    const char = getCurrentCharacter();
    let targetCategory = category;
    const emptyCount = getEmptyCount(board);
    if (targetCategory === "thinking" && board) {
        const pStones = (humanColor === BLACK) ? getBoardStats(board).black : getBoardStats(board).white;
        const cStones = (cpuColor === BLACK) ? getBoardStats(board).black : getBoardStats(board).white;
        if (pStones >= cStones + 10 && char.quotes.losing && Math.random() < 0.45) targetCategory = "losing";
    }

    let list = char.quotes[targetCategory] || char.quotes.thinking;
    if (!Array.isArray(list)) list = [list];
    const text = list[Math.floor(Math.random() * list.length)];
    const isClimax = (emptyCount <= 12) || targetCategory === "climax" || targetCategory === "win" || targetCategory === "lose";

    // ⚡【チラつき防止ガード】：前回と「同一のセリフ」なら文字消去も再タイピングも発光もスキップし静止維持！
    if (text === lastOpponentQuoteText && DOM.speechText && DOM.speechText.textContent.trim() === text.trim()) {
        if (DOM.opponentSpeech) DOM.opponentSpeech.classList.toggle("is-climax", isClimax);
        return;
    }

    lastOpponentQuoteText = text;

    if (DOM.opponentSpeech) {
        DOM.opponentSpeech.classList.toggle("is-climax", isClimax);
    }

    typeWriterSpeech(text);

    const motionClass = `motion-char-${char.id}`;
    if (DOM.opponentAvatarFrame) {
        DOM.opponentAvatarFrame.classList.remove(motionClass);
        DOM.opponentAvatarFrame.offsetHeight;
        DOM.opponentAvatarFrame.classList.add(motionClass);
    }

    if (DOM.opponentAvatarWrap) {
        DOM.opponentAvatarWrap.classList.remove("is-talking");
        DOM.opponentAvatarWrap.offsetHeight;
        DOM.opponentAvatarWrap.classList.add("is-talking");
    }

    if (talkingTimeout) clearTimeout(talkingTimeout);
    talkingTimeout = setTimeout(() => {
        if (DOM.opponentAvatarWrap) DOM.opponentAvatarWrap.classList.remove("is-talking");
        if (DOM.opponentAvatarFrame) DOM.opponentAvatarFrame.classList.remove(motionClass);
    }, 850);
}

function updateOpponentStageUI(showBanner = true) {
    const char = getCurrentCharacter();
    document.documentElement.style.setProperty('--char-accent', char.themeColor);
    document.documentElement.style.setProperty('--char-glow', char.themeGlow);
    document.body.className = `stage-theme-${char.id}`;

    if (DOM.opponentRankBadge) DOM.opponentRankBadge.textContent = `Lv.${char.id}`;
    if (DOM.opponentName) DOM.opponentName.textContent = char.name;
    if (DOM.opponentTitle) DOM.opponentTitle.textContent = `${char.rankLabel} ${char.title}`;

    if (DOM.opponentPieceIcon) DOM.opponentPieceIcon.className = `mini-piece-stone ${cpuColor === BLACK ? "piece-black" : "piece-white"}`;
    if (DOM.playerPieceIcon) DOM.playerPieceIcon.className = `mini-piece-stone ${humanColor === BLACK ? "piece-black" : "piece-white"}`;

    if (DOM.badgeSalonName) DOM.badgeSalonName.textContent = char.salonName;
    if (DOM.badgeMaterial) DOM.badgeMaterial.textContent = char.materialDesc;

    renderCharacterAvatar();
    setOpponentQuote("start");

    if (showBanner && !isReviewMode && !isDrillMode && !isLectureMode) {
        if (curtainTimeout) clearTimeout(curtainTimeout);
        if (DOM.curtainStageLabel) DOM.curtainStageLabel.textContent = `STAGE ${char.id}`;
        if (DOM.curtainSalonTitle) DOM.curtainSalonTitle.textContent = char.salonName;
        if (DOM.curtainRelicSub) DOM.curtainRelicSub.textContent = `盤面：${char.boardDesc} / 石：${char.materialDesc}`;
        if (DOM.stageCurtainBanner) {
            DOM.stageCurtainBanner.classList.add("show");
            curtainTimeout = setTimeout(() => DOM.stageCurtainBanner.classList.remove("show"), 1300);
        }
    }
}

/* ==========================================================================
  【天秤ゲージ更新（立体ミニ石による白黒反転バグ根絶）】
========================================================================== */
function updateBalanceGauge(targetBoard = board) {
    if (!targetBoard || isDrillMode || isLectureMode) return;
    const emptyCount = getEmptyCount(targetBoard);
    const evalScore = evaluateBoard(targetBoard, humanColor, emptyCount);
    const winratePlayer = Math.max(5, Math.min(95, Math.round((1 / (1 + Math.exp(-evalScore / 600))) * 100)));
    const winrateOpponent = 100 - winratePlayer;

    if (!gameOver && !isReviewMode && winratePlayer < minPlayerWinrateInGame) {
        minPlayerWinrateInGame = winratePlayer;
    }

    if (DOM.battleGaugeContainer) {
        DOM.battleGaugeContainer.className = `battle-gauge-container ${humanColor === BLACK ? "gauge-player-black" : "gauge-player-white"}`;
    }

    if (DOM.battlePowerPlayer) DOM.battlePowerPlayer.style.width = `${winratePlayer}%`;
    if (DOM.battleClashSpark) DOM.battleClashSpark.style.left = `${winratePlayer}%`;

    const char = getCurrentCharacter();
    
    if (DOM.battlePiecePlayer) {
        DOM.battlePiecePlayer.className = `mini-piece-stone ${humanColor === BLACK ? "piece-black" : "piece-white"}`;
    }
    if (DOM.battlePieceOpponent) {
        DOM.battlePieceOpponent.className = `mini-piece-stone ${cpuColor === BLACK ? "piece-black" : "piece-white"}`;
    }

    if (DOM.battleStatPlayerText) DOM.battleStatPlayerText.textContent = `あなた ${winratePlayer}%`;
    if (DOM.battleStatOpponentText) DOM.battleStatOpponentText.textContent = `${winrateOpponent}% ${char.name.split(" ")[0]}`;

    if (DOM.battleSituationBadge) {
        if (winratePlayer >= 75) DOM.battleSituationBadge.textContent = "⚖️ あなた 圧倒的優勢";
        else if (winratePlayer >= 58) DOM.battleSituationBadge.textContent = "⚖️ あなた 優勢";
        else if (winrateOpponent >= 75) DOM.battleSituationBadge.textContent = "⚖️ 相手 圧倒的優勢";
        else if (winrateOpponent >= 58) DOM.battleSituationBadge.textContent = "⚖️ 相手 優勢";
        else DOM.battleSituationBadge.textContent = "⚖️ 運命の天秤：互角";
    }
}

function showMoveToast(type, text) {
    if (!DOM.moveToast) return;
    if (toastTimeout) clearTimeout(toastTimeout);
    DOM.moveToast.className = `move-toast toast-${type} show`;
    DOM.moveToast.textContent = text;
    const delay = (type === "finish") ? 1800 : (type === "pass" ? 1300 : 1200);
    toastTimeout = setTimeout(() => DOM.moveToast.classList.remove("show"), delay);
}
const hideMoveToast = () => { if (toastTimeout) clearTimeout(toastTimeout); if (DOM.moveToast) DOM.moveToast.classList.remove("show"); };

function saveHistory() {
    historyStack.push({
        board: cloneBoard(board), currentPlayer,
        lastMove: lastMove ? [...lastMove] : null,
        elapsedSeconds, playerSeconds, cpuSeconds, usedHintInGame,
        minPlayerWinrateInGame,
        playerMoveLogs: JSON.parse(JSON.stringify(playerMoveLogs)),
        gameStepLogsLength: gameStepLogs.length
    });
    updateUndoButtonState();
}

function updateUndoButtonState() {
    if (DOM.undoButton) {
        DOM.undoButton.disabled = (historyStack.length === 0) || isBusy || isAiThinkingHint || gameOver || isReviewMode || isDrillMode || isLectureMode;
    }
}

async function undoMove() {
    if (historyStack.length === 0 || isBusy || isAiThinkingHint || gameOver || isReviewMode || isDrillMode || isLectureMode) return;
    isPrefetchAborted = true;
    currentGameSessionId++;
    cachedMoveEvaluations = null;
    clearHint();
    isBusy = true;

    let targetState = null;
    while (historyStack.length > 0) {
        const state = historyStack.pop();
        if (state.currentPlayer === humanColor) { targetState = state; break; }
    }

    if (targetState) {
        board = cloneBoard(targetState.board);
        currentPlayer = targetState.currentPlayer;
        lastMove = targetState.lastMove;
        elapsedSeconds = targetState.elapsedSeconds;
        playerSeconds = targetState.playerSeconds;
        cpuSeconds = targetState.cpuSeconds;
        usedHintInGame = targetState.usedHintInGame || false;
        minPlayerWinrateInGame = targetState.minPlayerWinrateInGame || 50;
        playerMoveLogs = targetState.playerMoveLogs || [];
        gameStepLogs = gameStepLogs.slice(0, targetState.gameStepLogsLength || 0);
        pendingAnimation = null;

        if (DOM.opponentAvatarFrame) DOM.opponentAvatarFrame.classList.remove("thinking-aura");
        if (DOM.opponentThinkingBadge) DOM.opponentThinkingBadge.classList.remove("show");

        const pColorName = (humanColor === BLACK) ? "黒" : "白";
        setStatus("human-turn", `👑 あなたの番です（${pColorName}）…（時を戻しました）`);
        triggerTurnPulse();
        setOpponentQuote("thinking");
        updateTimerDisplay();
        drawBoard();
        updateBalanceGauge();

        prefetchPlayerEvaluationsAsync();
    }

    isBusy = false;
    updateUndoButtonState();
}

function recordGameStep(move, playerColor, contextNote = "", alternativeBest = null, isPass = false) {
    gameStepLogs.push({
        move: move ? [...move] : null,
        playerColor,
        board: cloneBoard(board),
        turnIndex: gameStepLogs.length + 1,
        contextNote,
        alternativeBest: alternativeBest ? [...alternativeBest] : null,
        isPass,
        statsSnapshot: { ...getBoardStats(board) }
    });
}

function getCurrentMoveSequence() {
    const seq = [];
    for (let i = 1; i < gameStepLogs.length; i++) {
        const step = gameStepLogs[i];
        if (step && step.move && !step.isPass) seq.push(toNotation(step.move[0], step.move[1]));
    }
    return seq.join("-");
}

function getBookMove(maxPly = 16) {
    const seq = getCurrentMoveSequence();
    const currentPly = seq === "" ? 0 : seq.split("-").length;
    if (currentPly >= maxPly) return null;

    const candidates = OPENING_BOOK[seq];
    if (!candidates || candidates.length === 0) return null;

    let totalW = candidates.reduce((sum, c) => sum + c.weight, 0);
    let rand = Math.random() * totalW;
    for (const c of candidates) {
        rand -= c.weight;
        if (rand <= 0) return c;
    }
    return candidates[0];
}

function getBestCounterBookMove() {
    const seq = getCurrentMoveSequence();
    const candidates = OPENING_BOOK[seq];
    if (!candidates || candidates.length === 0) return null;
    if (candidates.length === 1) return candidates[0];

    let totalW = candidates.reduce((sum, c) => sum + c.weight, 0);
    let rand = Math.random() * totalW;
    for (const c of candidates) {
        rand -= c.weight;
        if (rand <= 0) return c;
    }
    return candidates[0];
}

function startGame() {
    tryPlayBgm();
    exitReviewMode();
    exitDrillMode();
    exitLectureMode();
    isPrefetchAborted = true;
    currentGameSessionId++;
    cachedMoveEvaluations = null;
    isPrefetching = false;
    transpositionTable.clear();
    lastOpponentQuoteText = "";

    board = Array.from({ length: boardSize }, () => Array(boardSize).fill(0));
    board[3][3] = WHITE; board[3][4] = BLACK;
    board[4][3] = BLACK; board[4][4] = WHITE;

    cpuColor = (humanColor === BLACK) ? WHITE : BLACK;
    currentPlayer = BLACK;
    gameOver = false;
    isBusy = false;
    isAiThinkingHint = false;
    lastMove = null;
    usedHintInGame = (getHintMode() === "always");
    minPlayerWinrateInGame = 50;
    pendingAnimation = null;
    historyStack = [];
    playerMoveLogs = [];
    gameStepLogs = [];
    tacticsTurningPointIndex = -1;
    clearHint();

    recordGameStep(null, null, "対局開始時の初期配置です。右上(E4)と左下(D5)が黒、左上(D4)と右下(E5)が白です。");
    if (DOM.royalResultModal) DOM.royalResultModal.classList.remove("show");
    if (DOM.endingModal) DOM.endingModal.classList.remove("show");
    if (DOM.drillCourseModal) DOM.drillCourseModal.classList.remove("show");
    if (DOM.drillCertificateModal) DOM.drillCertificateModal.classList.remove("show");
    if (DOM.charProfileModal) DOM.charProfileModal.classList.remove("show");

    elapsedSeconds = playerSeconds = cpuSeconds = 0;
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        if (!gameOver && !isReviewMode && !isAiThinkingHint && !isDrillMode && !isLectureMode) {
            elapsedSeconds++;
            if (currentPlayer === humanColor && !isBusy) playerSeconds++;
            else if (currentPlayer === cpuColor || isBusy) cpuSeconds++;
            updateTimerDisplay();
        }
    }, 1000);

    updateTimerDisplay();
    updateUndoButtonState();
    updateOpponentStageUI(true);
    updateHintModeUI();
    drawBoard();
    updateBalanceGauge();

    if (humanColor === BLACK) {
        setStatus("human-turn", "👑 あなたの番です（黒）最初の一手を置いてください");
        triggerTurnPulse();
        if (DOM.opponentAvatarFrame) DOM.opponentAvatarFrame.classList.remove("thinking-aura");
        if (DOM.opponentThinkingBadge) DOM.opponentThinkingBadge.classList.remove("show");
        prefetchPlayerEvaluationsAsync();
    } else {
        setStatus("cpu-turn", "相手（黒）が先手です。思案中...");
        if (DOM.opponentAvatarFrame) DOM.opponentAvatarFrame.classList.add("thinking-aura");
        if (DOM.opponentThinkingBadge) DOM.opponentThinkingBadge.classList.add("show");
        setTimeout(computerMove, 600);
    }
}

const formatMinSec = (sec) => `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;
function updateTimerDisplay() {
    if (DOM.playerTime) DOM.playerTime.textContent = `⏱️ ${formatMinSec(playerSeconds)}`;
    if (DOM.opponentTime) DOM.opponentTime.textContent = `⏱️ ${formatMinSec(cpuSeconds)}`;
}

function getFlippableStones(row, col, player = currentPlayer, targetBoard = board) {
    if (!targetBoard || targetBoard[row][col] !== 0) return [];
    const opponent = opposite(player);
    const flippable = [];

    for (const [dr, dc] of directions) {
        let r = row + dr, c = col + dc;
        const line = [];
        while (isInside(r, c) && targetBoard[r][c] === opponent) {
            line.push([r, c]);
            r += dr; c += dc;
        }
        if (line.length > 0 && isInside(r, c) && targetBoard[r][c] === player) {
            flippable.push(...line);
        }
    }
    return flippable;
}

function canPlace(row, col, player = currentPlayer, targetBoard = board) {
    if (!targetBoard || targetBoard[row][col] !== 0) return false;
    const opponent = opposite(player);
    for (const [dr, dc] of directions) {
        let r = row + dr, c = col + dc;
        let count = 0;
        while (isInside(r, c) && targetBoard[r][c] === opponent) {
            count++;
            r += dr; c += dc;
        }
        if (count > 0 && isInside(r, c) && targetBoard[r][c] === player) return true;
    }
    return false;
}

function sortFlippedByDistance(placedRow, placedCol, flipped) {
    return flipped.slice().sort((a, b) => {
        const distA = Math.max(Math.abs(a[0] - placedRow), Math.abs(a[1] - placedCol));
        const distB = Math.max(Math.abs(b[0] - placedRow), Math.abs(b[1] - placedCol));
        return distA - distB;
    });
}

function getValidMoves(player, targetBoard) {
    const moves = [];
    for (let r = 0; r < boardSize; r++) {
        for (let c = 0; c < boardSize; c++) {
            if (canPlace(r, c, player, targetBoard)) moves.push([r, c]);
        }
    }
    return moves;
}

function makeMove(targetBoard, row, col, player) {
    const flippable = getFlippableStones(row, col, player, targetBoard);
    if (flippable.length === 0) return false;
    targetBoard[row][col] = player;
    for (const [r, c] of flippable) targetBoard[r][c] = player;
    return true;
}

const isCorner = (r, c) => cornerSquares.some(([cr, cc]) => cr === r && cc === c);

function isRealDanger(r, c, targetBoard) {
    for (const item of cornerDangerDefinitions) {
        if ((item.x[0] === r && item.x[1] === c) || item.c.some(([dr, dc]) => dr === r && dc === c)) {
            return (targetBoard[item.corner[0]][item.corner[1]] === 0);
        }
    }
    return false;
}

function countStableStones(targetBoard, player) {
    const stable = new Set();
    for (const [cr, cc] of cornerSquares) {
        if (targetBoard[cr][cc] !== player) continue;
        stable.add(`${cr},${cc}`);
        for (const [dr, dc] of [[cr === 0 ? 1 : -1, 0], [0, cc === 0 ? 1 : -1]]) {
            let r = cr + dr, c = cc + dc;
            while (isInside(r, c) && targetBoard[r][c] === player) {
                stable.add(`${r},${c}`);
                r += dr; c += dc;
            }
        }
    }

    const edges = [
        [[0,0],[0,1],[0,2],[0,3],[0,4],[0,5],[0,6],[0,7]],
        [[7,0],[7,1],[7,2],[7,3],[7,4],[7,5],[7,6],[7,7]],
        [[0,0],[1,0],[2,0],[3,0],[4,0],[5,0],[6,0],[7,0]],
        [[0,7],[1,7],[2,7],[3,7],[4,7],[5,7],[6,7],[7,7]]
    ];
    for (const edge of edges) {
        const isFull = edge.every(([er, ec]) => targetBoard[er][ec] !== 0);
        if (isFull) {
            for (const [er, ec] of edge) {
                if (targetBoard[er][ec] === player) stable.add(`${er},${ec}`);
            }
        }
    }
    return stable.size;
}

function countFrontierStones(targetBoard, player) {
    let frontier = 0;
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (targetBoard[r][c] !== player) continue;
            for (const [dr, dc] of directions) {
                const nr = r + dr, nc = c + dc;
                if (isInside(nr, nc) && targetBoard[nr][nc] === 0) { frontier++; break; }
            }
        }
    }
    return frontier;
}

function evaluateBoard(targetBoard, player, emptyCount) {
    const opponent = opposite(player);
    let myStones = 0, oppStones = 0;
    let myPosScore = 0, oppPosScore = 0;

    const dynamicWeights = getDynamicCellWeights(targetBoard, player);

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = targetBoard[r][c];
            if (piece === player) {
                myStones++;
                myPosScore += dynamicWeights[r][c];
            } else if (piece === opponent) {
                oppStones++;
                oppPosScore += dynamicWeights[r][c];
            }
        }
    }

    if (emptyCount === 0) return (myStones - oppStones) * 10000;

    const myMoves = getValidMoves(player, targetBoard).length;
    const oppMoves = getValidMoves(opponent, targetBoard).length;
    const mobilityDiff = (myMoves - oppMoves) * 45;

    const myFrontier = countFrontierStones(targetBoard, player);
    const oppFrontier = countFrontierStones(targetBoard, opponent);
    const frontierDiff = -(myFrontier - oppFrontier) * 15;

    const stableDiff = (countStableStones(targetBoard, player) - countStableStones(targetBoard, opponent)) * 250;

    let score = 0;
    if (emptyCount > 30) {
        score = (myPosScore - oppPosScore) + mobilityDiff + frontierDiff;
    } else if (emptyCount > 12) {
        score = (myPosScore - oppPosScore) * 1.1 + stableDiff + mobilityDiff * 0.8 + frontierDiff;
    } else {
        score = (myStones - oppStones) * 80 + stableDiff + (myPosScore - oppPosScore) * 0.5;
        if (emptyCount % 2 !== 0) score += 60;
    }
    return score;
}

function orderMoves(moves, targetBoard, player) {
    const dynamicWeights = getDynamicCellWeights(targetBoard, player);
    return moves.slice().sort((a, b) => {
        const aCorner = isCorner(a[0], a[1]) ? 1 : 0, bCorner = isCorner(b[0], b[1]) ? 1 : 0;
        if (aCorner !== bCorner) return bCorner - aCorner;
        return dynamicWeights[b[0]][b[1]] - dynamicWeights[a[0]][a[1]];
    });
}

/* ==========================================================================
  【αβ探索（置換表フラグ管理＆パス処理・完全読み切り版）】
========================================================================== */
function negamax(targetBoard, player, depth, alpha, beta, emptyCount) {
    if (emptyCount === 0) return evaluateBoard(targetBoard, player, 0);

    const originalAlpha = alpha;
    let boardKey = null;

    if (depth >= 4) {
        boardKey = `${player}:${targetBoard.map(r => r.join("")).join("")}`;
        if (transpositionTable.has(boardKey)) {
            const entry = transpositionTable.get(boardKey);
            if (entry.depth >= depth) {
                if (entry.flag === TT_EXACT) return entry.score;
                else if (entry.flag === TT_LOWERBOUND && entry.score > alpha) alpha = entry.score;
                else if (entry.flag === TT_UPPERBOUND && entry.score < beta) beta = entry.score;
                if (alpha >= beta) return entry.score;
            }
        }
    }

    if (depth <= 0) return evaluateBoard(targetBoard, player, emptyCount);

    const moves = getValidMoves(player, targetBoard);
    if (moves.length === 0) {
        const opp = opposite(player);
        const oppMoves = getValidMoves(opp, targetBoard);
        if (oppMoves.length === 0) return evaluateBoard(targetBoard, player, 0);
        return -negamax(targetBoard, opp, depth, -beta, -alpha, emptyCount);
    }

    let maxScore = -Infinity;
    const sortedMoves = orderMoves(moves, targetBoard, player);

    for (const move of sortedMoves) {
        const next = cloneBoard(targetBoard);
        makeMove(next, move[0], move[1], player);
        const score = -negamax(next, opposite(player), depth - 1, -beta, -alpha, emptyCount - 1);
        if (score > maxScore) maxScore = score;
        if (score > alpha) alpha = score;
        if (alpha >= beta) break;
    }

    if (boardKey && transpositionTable.size < 60000) {
        let flag = TT_EXACT;
        if (maxScore <= originalAlpha) flag = TT_UPPERBOUND;
        else if (maxScore >= beta) flag = TT_LOWERBOUND;
        transpositionTable.set(boardKey, { score: maxScore, depth, flag });
    }

    return maxScore;
}

/* ==========================================================================
  【ヒント探索エンジン（深さ9手／終盤16手完全読み切り・中断保護付き）】
========================================================================== */
async function prefetchPlayerEvaluationsAsync() {
    if (gameOver || isReviewMode || isDrillMode || isLectureMode || currentPlayer !== humanColor || isPrefetching) return;
    const session = currentGameSessionId;
    isPrefetching = true;
    isPrefetchAborted = false;

    const moves = getValidMoves(humanColor, board);
    if (moves.length === 0) {
        cachedMoveEvaluations = { moves: [], best: null, scoredMoves: [] };
        isPrefetching = false;
        return;
    }

    const bookEntry = getBestCounterBookMove();
    if (bookEntry && moves.some(([r, c]) => r === bookEntry.move[0] && c === bookEntry.move[1])) {
        const bestMove = bookEntry.move;
        const scored = moves.map(m => ({
            move: m,
            coord: toNotation(m[0], m[1]),
            score: (m[0] === bestMove[0] && m[1] === bestMove[1]) ? 99999 : 0,
            isBook: (m[0] === bestMove[0] && m[1] === bestMove[1]),
            bookName: bookEntry.name
        }));
        scored.sort((a, b) => b.score - a.score);
        cachedMoveEvaluations = { moves, best: bestMove, scoredMoves: scored, isBook: true, bookName: bookEntry.name };
        isPrefetching = false;

        if (getHintMode() === "always" && currentPlayer === humanColor) applyHintFromCache();
        return;
    }

    // 最高峰の強さ（深さ9手／終盤16手完全読み切り）
    const emptyCount = getEmptyCount(board);
    const depth = (emptyCount <= 16) ? emptyCount : 9;
    const scored = [];
    const sortedMoves = orderMoves(moves, board, humanColor);

    for (const move of sortedMoves) {
        if (isPrefetchAborted || session !== currentGameSessionId || currentPlayer !== humanColor) {
            isPrefetching = false;
            return;
        }
        await sleep(0); // 他イベントへの制御解放

        const next = cloneBoard(board);
        makeMove(next, move[0], move[1], humanColor);
        const score = -negamax(next, cpuColor, depth - 1, -Infinity, Infinity, emptyCount - 1);
        scored.push({ move, coord: toNotation(move[0], move[1]), score, isBook: false });
    }

    if (isPrefetchAborted || session !== currentGameSessionId || currentPlayer !== humanColor) {
        isPrefetching = false;
        return;
    }

    scored.sort((a, b) => b.score - a.score);
    const chosen = scored[0];

    cachedMoveEvaluations = { moves, best: chosen.move, scoredMoves: scored, isBook: false };
    isPrefetching = false;

    if (getHintMode() === "always" && currentPlayer === humanColor) applyHintFromCache();
}

function applyHintFromCache() {
    if (!cachedMoveEvaluations || !cachedMoveEvaluations.best) return;
    const chosenMove = cachedMoveEvaluations.best;
    hintMove = chosenMove;
    const coordStr = toNotation(chosenMove[0], chosenMove[1]);
    if (DOM.hintCoordText) DOM.hintCoordText.textContent = coordStr;

    const reasons = [];
    if (cachedMoveEvaluations.isBook) {
        reasons.push(`📖 日本オセロ連盟公認定石【<span class="term-link" data-term="${cachedMoveEvaluations.bookName.includes('馬')?'馬定石':(cachedMoveEvaluations.bookName.includes('牛')?'牛定石':'虎定石')}">${cachedMoveEvaluations.bookName}</span>】の高勝率ルートです。`);
        reasons.push("🎯 序盤の骨格を完璧に保ち、主導権を握る絶対の定石手筋です。");
    } else {
        const [r, c] = chosenMove;
        if (isCorner(r, c)) reasons.push("👑 角（四隅）を確保する安全確実な一手です。");
        else if (!isRealDanger(r, c, board)) reasons.push(`🛡️ 危険マスを避け、内側の石だけを返す鋭い<span class="term-link" data-term="中割り">中割り</span>です。`);

        const oppBefore = getValidMoves(cpuColor, board).length;
        const nextB = cloneBoard(board);
        makeMove(nextB, r, c, humanColor);
        const oppAfter = getValidMoves(cpuColor, nextB).length;
        if (oppAfter < oppBefore) reasons.push(`📉 相手の<span class="term-link" data-term="開放度">開放度</span>を奪い、選択肢を ${oppBefore} → ${oppAfter} 箇所に激減させます。`);

        if (reasons.length === 0) reasons.push("🎯 宮廷AIの深層読み（深さ9手／終盤16手）が導き出した至高の最善手です。");
    }

    if (DOM.hintBodyText) DOM.hintBodyText.innerHTML = reasons.map(r => `<div>${r}</div>`).join("");
    drawBoard();

    const pColorName = (humanColor === BLACK) ? "黒" : "白";
    setStatus("human-turn", `👑 あなたの番です（${pColorName}）…`);
}

async function executeTurnAction(row, col, player, isHuman) {
    const session = currentGameSessionId;
    const opponent = opposite(player);
    const flippable = getFlippableStones(row, col, player, board);
    const flipped = sortFlippedByDistance(row, col, flippable);

    makeMove(board, row, col, player);
    lastMove = [row, col];

    pendingAnimation = {
        placedRow: row, placedCol: col, flipped,
        newColor: player, oldColor: opponent, isHuman
    };

    playPlaceSound();
    if (flipped.length > 0) playFlipSequence(flipped.length);

    drawBoard();
    updateBalanceGauge();

    const totalWaitMs = (flipped.length * FLIP_INTERVAL_MS) + FLIP_ANIMATION_DURATION_MS;
    await sleep(totalWaitMs);
    if (session !== currentGameSessionId) return false;

    hideMoveToast();
    clearHintForOpponentTurn();
    drawBoard();
    return true;
}

/* ==========================================================================
  【プレイヤー着手（完全ゼロ遅延化・0秒即時着手＆アニメーション裏での1手判定）】
========================================================================== */
async function putStone(row, col) {
    if (isLectureMode) return;
    if (isDrillMode) {
        handleDrillCellClick(row, col);
        return;
    }
    if (gameOver || isBusy || isAiThinkingHint || currentPlayer !== humanColor || isReviewMode) return;
    if (!canPlace(row, col, humanColor, board)) return;

    // ⚡【核心】：画面を触った瞬間、裏で動いていた先読み計算を0秒で即座に強制中断！
    isPrefetchAborted = true;

    saveHistory();
    isBusy = true;
    if (getHintMode() === "always") usedHintInGame = true;

    const boardBefore = cloneBoard(board);
    const emptyCount = getEmptyCount(board);
    const myAvailableMovesBefore = getValidMoves(humanColor, board);
    const oppMovesBefore = getValidMoves(cpuColor, boardBefore).length;

    // ⚡【待ち時間ゼロ】：計算を待たずに、タップした瞬間に0秒で石配置＆アニメーション開始！
    const actionPromise = executeTurnAction(row, col, humanColor, true);

    // ⚡【裏側非同期判定】：石がパタパタ裏返っているアニメーション時間（約700ms）を使って1手だけを判定！
    let objectiveBest = cachedMoveEvaluations ? cachedMoveEvaluations.best : null;
    let scoredList = cachedMoveEvaluations ? cachedMoveEvaluations.scoredMoves : [];

    if (!objectiveBest) {
        const bookEntry = getBestCounterBookMove();
        if (bookEntry) objectiveBest = bookEntry.move;
        else {
            const sorted = orderMoves(myAvailableMovesBefore, boardBefore, humanColor);
            objectiveBest = sorted[0];
        }
    }

    const chosenScoreObj = scoredList.find(s => s.move[0] === row && s.move[1] === col);
    const chosenScore = chosenScoreObj ? chosenScoreObj.score : 0;
    const topScore = scoredList[0] ? scoredList[0].score : 0;

    const flippable = getFlippableStones(row, col, humanColor, boardBefore);
    const flipsCount = flippable.length;

    const oppMovesAfter = getValidMoves(cpuColor, board).length;
    const mobilityDelta = oppMovesAfter - oppMovesBefore;

    const isMatchedWithObjectiveBest = (objectiveBest && objectiveBest[0] === row && objectiveBest[1] === col);
    const isCornerMove = isCorner(row, col);
    const isX = isXSquare(row, col);
    const isC = isCSquare(row, col);
    const danger = isRealDanger(row, col, boardBefore);

    let moveRating = "NORMAL";
    const scoreDiffFromBest = topScore - chosenScore;

    if (flipsCount >= 5 && Math.random() < 0.7) {
        setOpponentQuote("bigReversal");
    } else if (isMatchedWithObjectiveBest) {
        moveRating = "BEST";
        if (getHintMode() !== "off") showMoveToast("best", "🎯 最善手 (BEST)");
        setOpponentQuote("playerGood");
    } else if (isCornerMove) {
        moveRating = "GOOD";
        if (getHintMode() !== "off") showMoveToast("good", "⚜️ 好手 (GOOD)");
        setOpponentQuote("playerCorner");
    } else if (myAvailableMovesBefore.length > 1 && (danger || scoreDiffFromBest >= 500 || mobilityDelta >= 3)) {
        moveRating = "BAD";
        if (getHintMode() !== "off") showMoveToast("bad", "⚠️ 悪手 (BAD)");
        setOpponentQuote("playerBad");
    } else if (scoreDiffFromBest <= 80) {
        moveRating = "GOOD";
        if (getHintMode() !== "off") showMoveToast("good", "⚜️ 好手 (GOOD)");
        setOpponentQuote("playerGood");
    } else if (emptyCount <= 12) {
        setOpponentQuote("climax");
    }

    const coord = toNotation(row, col);
    let contextNote = `あなたの着手（${coord}）。`;
    if (moveRating === "BEST") {
        contextNote += cachedMoveEvaluations && cachedMoveEvaluations.isBook
            ? `【最善手】公式プロ定石（${cachedMoveEvaluations.bookName}）通りの完璧な一着。`
            : "【最善手】隙のない宮廷AI推奨の完璧な着手。";
    } else if (moveRating === "GOOD") {
        contextNote += isCornerMove ? "【好手】四隅の要塞を確保。" : "【好手】要所を押さえる堅実な一打。";
    } else if (moveRating === "BAD") {
        const alt = objectiveBest ? `（推奨手は【${toNotation(objectiveBest[0], objectiveBest[1])}】）` : "";
        if (danger && isX) contextNote += `【悪手】空いた角の斜め前（Xマス）に打ち、角献上の足場を与えてしまいました${alt}。`;
        else if (mobilityDelta >= 3) contextNote += `【悪手】石を${flipsCount}枚裏返したことで、相手の打てるマスが${oppMovesBefore}箇所➔${oppMovesAfter}箇所に急増してしまいました${alt}。`;
        else contextNote += `【悪手】相手に好機を与える危険な打点でした${alt}。`;
    }

    recordGameStep([row, col], humanColor, contextNote, objectiveBest, false);

    playerMoveLogs.push({
        row, col, coord,
        isCornerMove, isX, isC, danger,
        flips: flipsCount,
        rating: moveRating,
        isObjectiveBest: isMatchedWithObjectiveBest,
        scoreDiff: -scoreDiffFromBest,
        emptyCount,
        objectiveBest,
        oppMovesBefore, oppMovesAfter, mobilityDelta,
        stepIndex: gameStepLogs.length - 1
    });

    cachedMoveEvaluations = null;

    const success = await actionPromise;
    if (!success) return;

    currentPlayer = cpuColor;
    isBusy = false;
    processTurn();
}

function clearHintForOpponentTurn() {
    hintMove = null;
    if (DOM.hintCoordText) DOM.hintCoordText.textContent = "--";
    if (DOM.hintBodyText) DOM.hintBodyText.innerHTML = '<div class="hint-placeholder-text">相手の手番です（思案中…）</div>';
}

async function processTurn() {
    if (gameOver || isReviewMode || isDrillMode || isLectureMode) return;
    const currentMoves = getValidMoves(currentPlayer, board);

    if (currentMoves.length === 0) {
        const opp = opposite(currentPlayer);
        if (getValidMoves(opp, board).length === 0) { endGame(); return; }

        const passName = (currentPlayer === humanColor) ? "あなた" : getCurrentCharacter().name;
        recordGameStep(null, currentPlayer, `${passName}が置ける場所がないため【パス】しました。`, null, true);

        showMoveToast("pass", `⚜️ ${passName} はパス（PASS）です`);

        if (currentPlayer === humanColor) {
            setOpponentQuote("playerPass");
            setStatus("cpu-turn", "置けるマスがないためパスしました…");
        } else {
            setOpponentQuote("cpuPass");
            setStatus("human-turn", "相手がパスしました。あなたの番です！");
        }

        await sleep(950);
        currentPlayer = opp;
        drawBoard();
        updateBalanceGauge();

        const pColorName = (humanColor === BLACK) ? "黒" : "白";
        if (currentPlayer === humanColor) {
            if (DOM.opponentAvatarFrame) DOM.opponentAvatarFrame.classList.remove("thinking-aura");
            if (DOM.opponentThinkingBadge) DOM.opponentThinkingBadge.classList.remove("show");

            if (getHintMode() === "always") setStatus("hint-thinking", "💡 宮廷AIが最善手を思案中…");
            else setStatus("human-turn", `👑 あなたの番です（${pColorName}）…`);

            triggerTurnPulse();
            prefetchPlayerEvaluationsAsync();
        } else {
            setStatus("cpu-turn", "相手が思考を巡らせています…");
            if (DOM.opponentAvatarFrame) DOM.opponentAvatarFrame.classList.add("thinking-aura");
            if (DOM.opponentThinkingBadge) DOM.opponentThinkingBadge.classList.add("show");
            setTimeout(computerMove, 500);
        }
        updateUndoButtonState();
        return;
    }

    const pColorName = (humanColor === BLACK) ? "黒" : "白";
    if (currentPlayer === humanColor) {
        if (DOM.opponentAvatarFrame) DOM.opponentAvatarFrame.classList.remove("thinking-aura");
        if (DOM.opponentThinkingBadge) DOM.opponentThinkingBadge.classList.remove("show");

        if (getHintMode() === "always") setStatus("hint-thinking", "💡 宮廷AIが最善手を思案中…");
        else setStatus("human-turn", `👑 あなたの番です（${pColorName}）…`);

        triggerTurnPulse();
        drawBoard();
        updateBalanceGauge();
        prefetchPlayerEvaluationsAsync();
        updateUndoButtonState();
    } else {
        setStatus("cpu-turn", "相手が思考を巡らせています…");
        if (DOM.opponentAvatarFrame) DOM.opponentAvatarFrame.classList.add("thinking-aura");
        if (DOM.opponentThinkingBadge) DOM.opponentThinkingBadge.classList.add("show");
        computerMove();
    }
}

/* ==========================================================================
  【全10レベル思考エンジン】
========================================================================== */
function getComputerMove(targetBoard, player, charConfig) {
    const moves = getValidMoves(player, targetBoard);
    if (moves.length === 0) return null;
    if (moves.length === 1) return moves[0];

    if (charConfig.id === 1) {
        const dangerMoves = moves.filter(([r, c]) => isRealDanger(r, c, targetBoard));
        if (dangerMoves.length > 0 && Math.random() < 0.40) {
            return dangerMoves[Math.floor(Math.random() * dangerMoves.length)];
        }
        return moves[Math.floor(Math.random() * moves.length)];
    }

    if (charConfig.id === 2) {
        const corners = moves.filter(([r, c]) => isCorner(r, c));
        if (corners.length > 0) return corners[0];

        const scored = moves.map(m => ({ move: m, flips: getFlippableStones(m[0], m[1], player, targetBoard).length }));
        scored.sort((a, b) => b.flips - a.flips);
        const topFlips = scored[0].flips;
        const candidates = scored.filter(s => s.flips === topFlips);
        return candidates[Math.floor(Math.random() * candidates.length)].move;
    }

    if (charConfig.id === 3) {
        const dangerMoves = moves.filter(([r, c]) => isRealDanger(r, c, targetBoard));
        if (dangerMoves.length > 0 && Math.random() < 0.20) {
            return dangerMoves[Math.floor(Math.random() * dangerMoves.length)];
        }
    }

    if (charConfig.bookMaxPly > 0) {
        const bookMoveObj = getBookMove(charConfig.bookMaxPly);
        if (bookMoveObj && moves.some(([r, c]) => r === bookMoveObj.move[0] && c === bookMoveObj.move[1])) {
            return bookMoveObj.move;
        }
    }

    const emptyCount = getEmptyCount(targetBoard);
    const depth = (charConfig.exact > 0 && emptyCount <= charConfig.exact) ? emptyCount : charConfig.depth;
    const scores = [];

    const sortedMoves = orderMoves(moves, targetBoard, player);
    for (const move of sortedMoves) {
        const next = cloneBoard(targetBoard);
        makeMove(next, move[0], move[1], player);
        const score = -negamax(next, opposite(player), depth - 1, -Infinity, Infinity, emptyCount - 1);
        scores.push({ move, score });
    }

    scores.sort((a, b) => b.score - a.score);
    const bestScore = scores[0].score;

    if (charConfig.id === 10 || (charConfig.exact > 0 && emptyCount <= charConfig.exact)) {
        const topMoves = scores.filter(s => s.score === bestScore);
        return topMoves[Math.floor(Math.random() * topMoves.length)].move;
    }

    let margin = 0;
    if (charConfig.id === 3) margin = 85;
    else if (charConfig.id === 4) margin = 60;
    else if (charConfig.id === 5) margin = 40;
    else if (charConfig.id === 6) margin = 25;
    else if (charConfig.id === 7) margin = 18;
    else if (charConfig.id === 8) margin = 10;
    else if (charConfig.id === 9) margin = 5;

    const eligible = scores.filter(s => (bestScore - s.score) <= margin);
    return eligible[Math.floor(Math.random() * eligible.length)].move;
}

async function computerMove() {
    if (gameOver || isReviewMode || isDrillMode || isLectureMode) return;
    const session = currentGameSessionId;

    clearHintForOpponentTurn();
    isBusy = true;
    updateUndoButtonState();
    setStatus("cpu-turn", "相手が思考を巡らせています…");
    if (DOM.opponentAvatarFrame) DOM.opponentAvatarFrame.classList.add("thinking-aura");
    if (DOM.opponentThinkingBadge) DOM.opponentThinkingBadge.classList.add("show");

    const char = getCurrentCharacter();
    const jitter = Math.floor((Math.random() * 200) - 100);
    const thinkingWaitMs = Math.max(400, (char.thinkingBaseMs || 850) + jitter);

    await sleep(thinkingWaitMs);
    if (session !== currentGameSessionId || gameOver || isReviewMode || isDrillMode || isLectureMode) return;

    const move = getComputerMove(board, cpuColor, char);
    if (move) {
        let contextNote = `${char.name}の応手（${toNotation(move[0], move[1])}）。`;
        if (isCorner(move[0], move[1])) {
            contextNote += "要塞となる角を奪取されました。";
            setOpponentQuote("cpuCorner");
        } else if (getEmptyCount(board) <= 12) {
            contextNote += "終盤の詰めに入っています。";
            setOpponentQuote("climax");
        } else {
            setOpponentQuote("thinking");
        }
        recordGameStep(move, cpuColor, contextNote, null, false);

        const success = await executeTurnAction(move[0], move[1], cpuColor, false);
        if (!success) return;
    }

    if (DOM.opponentAvatarFrame) DOM.opponentAvatarFrame.classList.remove("thinking-aura");
    if (DOM.opponentThinkingBadge) DOM.opponentThinkingBadge.classList.remove("show");

    isBusy = false;
    currentPlayer = humanColor;
    processTurn();
}

function clearHint() {
    hintMove = null;
    if (DOM.hintCoordText) DOM.hintCoordText.textContent = "--";
    if (DOM.hintBodyText) DOM.hintBodyText.innerHTML = '<div class="hint-placeholder-text">「ヒント」ボタンを押すと最善手と思案理由が表示されます</div>';
}

const getHintMode = () => DOM.hintMode ? DOM.hintMode.value : "manual";

function updateHintModeUI() {
    const mode = getHintMode();
    if (DOM.hintButton) DOM.hintButton.style.display = (mode === "manual") ? "" : "none";

    if (mode === "off") {
        if (DOM.hintFixedDisplay) DOM.hintFixedDisplay.classList.add("hint-mode-sealed");
        if (DOM.hintBadgeTag) DOM.hintBadgeTag.textContent = "⚔️【真剣勝負モード】";
        if (DOM.hintCoordText) DOM.hintCoordText.textContent = "--";
        if (DOM.hintBodyText) DOM.hintBodyText.innerHTML = '<div class="hint-placeholder-text" style="color:#d4a748; font-weight:700;">己の知謀のみで挑む格式高き真剣勝負（指南封印中）</div>';
    } else {
        if (DOM.hintFixedDisplay) DOM.hintFixedDisplay.classList.remove("hint-mode-sealed");
        if (DOM.hintBadgeTag) DOM.hintBadgeTag.textContent = "💡【宮廷AI指南・最善手】";
        if (mode === "always") {
            usedHintInGame = true;
            if (cachedMoveEvaluations && cachedMoveEvaluations.best) applyHintFromCache();
            else prefetchPlayerEvaluationsAsync();
        } else {
            clearHint();
        }
    }
    drawBoard();
}

async function computeHint() {
    if (gameOver || isBusy || currentPlayer !== humanColor || isReviewMode || isDrillMode || isLectureMode) return;
    usedHintInGame = true;

    if (!cachedMoveEvaluations || !cachedMoveEvaluations.best) {
        setStatus("hint-thinking", "💡 宮廷AIが最善手を思案中…");
        await prefetchPlayerEvaluationsAsync();
    }
    applyHintFromCache();
}

function drawBoard() {
    if (!DOM.board) return;
    DOM.board.querySelectorAll(".cell").forEach(cell => cell.remove());
    const previewClass = (humanColor === BLACK) ? "preview-black" : "preview-white";
    const isHintOff = (getHintMode() === "off");

    for (let r = 0; r < boardSize; r++) {
        for (let c = 0; c < boardSize; c++) {
            const cell = document.createElement("div");
            cell.className = "cell";
            cell.dataset.r = r;
            cell.dataset.c = c;

            if (isLectureMode) {
                // 講義モード中はタップ無効
            } else if (isDrillMode) {
                const qData = DRILL_QUESTIONS[currentDrillQuestionIndex - 1];
                if (!isSimulatingDrillMistake && canPlace(r, c, qData.turn, board)) {
                    cell.classList.add("can-place", qData.turn === BLACK ? "preview-black" : "preview-white");
                }
            } else {
                if (!isHintOff && !isReviewMode && !gameOver && !isBusy && !isAiThinkingHint && currentPlayer === humanColor && canPlace(r, c, humanColor, board)) {
                    cell.classList.add("can-place", previewClass);
                }
                if (!isReviewMode && lastMove && lastMove[0] === r && lastMove[1] === c) {
                    cell.classList.add("last-move-cell");
                }
                if (!isReviewMode && !isHintOff && hintMove && hintMove[0] === r && hintMove[1] === c) {
                    cell.classList.add("hint-cell");
                }

                if (isReviewMode && reviewStepIndex > 0) {
                    const step = gameStepLogs[reviewStepIndex];
                    if (step && step.move && step.move[0] === r && step.move[1] === c) {
                        cell.classList.add(reviewStepIndex === tacticsWorstIndex ? "review-bad-cell" : "review-focus-cell");
                    }
                    if (reviewStepIndex === tacticsWorstIndex && tacticsWorstAlternative && tacticsWorstAlternative[0] === r && tacticsWorstAlternative[1] === c) {
                        cell.classList.add("review-correct-cell");
                    }
                }
            }

            if (board[r][c] !== 0) {
                const wrapper = document.createElement("div");
                wrapper.className = "stone-wrapper";

                const isFlipping = !isDrillMode && !isReviewMode && !isLectureMode && pendingAnimation && pendingAnimation.flipped.some(([fr, fc]) => fr === r && fc === c);
                if (isFlipping) {
                    const flipWrap = document.createElement("div");
                    flipWrap.className = "stone-flip-wrapper";

                    const cylinder = document.createElement("div");
                    cylinder.className = `stone-flip-cylinder ${pendingAnimation.isHuman ? "flip-player" : "flip-cpu"}`;

                    const fIdx = pendingAnimation.flipped.findIndex(([fr, fc]) => fr === r && fc === c);
                    if (fIdx >= 0) {
                        const delayStr = `${fIdx * FLIP_INTERVAL_MS}ms`;
                        flipWrap.style.animationDelay = delayStr;
                        cylinder.style.animationDelay = delayStr;
                    }

                    cylinder.innerHTML = `
                        <div class="stone-face stone-face-front ${pendingAnimation.oldColor === BLACK ? "black-stone" : "white-stone"}"></div>
                        <div class="stone-edge-rim"></div>
                        <div class="stone-face stone-face-back ${pendingAnimation.newColor === BLACK ? "black-stone" : "white-stone"}"></div>
                    `;
                    flipWrap.appendChild(cylinder);
                    wrapper.appendChild(flipWrap);
                } else {
                    const stone = document.createElement("div");
                    stone.className = `stone ${board[r][c] === BLACK ? "black-stone" : "white-stone"}`;
                    if (!isDrillMode && !isReviewMode && !isLectureMode && pendingAnimation && pendingAnimation.placedRow === r && pendingAnimation.placedCol === c) {
                        stone.classList.add("stone-new");
                    }
                    wrapper.appendChild(stone);
                }
                cell.appendChild(wrapper);
            }

            if (!isReviewMode && !isLectureMode) {
                cell.addEventListener("click", () => putStone(r, c));
            }
            DOM.board.appendChild(cell);
        }
    }

    pendingAnimation = null;
    updateScore();
    if (DOM.hintButton) {
        DOM.hintButton.disabled = gameOver || isBusy || isAiThinkingHint || currentPlayer !== humanColor || isReviewMode || isHintOff || isDrillMode || isLectureMode;
    }
}

function updateScore(targetBoard = board) {
    const stats = getBoardStats(targetBoard);
    if (DOM.opponentScore) DOM.opponentScore.textContent = (cpuColor === BLACK) ? stats.black : stats.white;
    if (DOM.playerScore) DOM.playerScore.textContent = (humanColor === BLACK) ? stats.black : stats.white;
}

/* ==========================================================================
  【📜 豪傑人物伝・攻略指南モーダル制御】
========================================================================== */
function openCharProfileModal(charId = null) {
    playPlaceSound();
    const id = charId ? Number(charId) : Number(DOM.characterSelect.value || 1);
    const char = CHARACTERS[id] || CHARACTERS[1];

    if (DOM.profileCharNameHeader) DOM.profileCharNameHeader.textContent = `📜 ${char.name} 人物伝`;
    if (DOM.profileTitleBadge) DOM.profileTitleBadge.textContent = `${char.rankLabel} ${char.title}`;
    if (DOM.profileSalonBadge) DOM.profileSalonBadge.textContent = `🏛️ ${char.salonName}`;
    if (DOM.profileMaterialBadge) DOM.profileMaterialBadge.textContent = `石：${char.materialDesc}（${char.boardDesc}）`;
    if (DOM.profileBioText) DOM.profileBioText.textContent = char.profile || "宮廷に仕える歴戦のオセロの使い手。";
    if (DOM.profileTacticsText) DOM.profileTacticsText.textContent = char.tacticsInfo || "基本に忠実に攻めましょう。";

    if (DOM.profileAvatarBox) {
        DOM.profileAvatarBox.innerHTML = "";
        const img = new Image();
        img.src = char.image;
        img.alt = char.name;
        img.style.objectPosition = char.imgFocus || "center 20%";
        img.onload = () => { DOM.profileAvatarBox.innerHTML = ""; DOM.profileAvatarBox.appendChild(img); };
        img.onerror = () => { DOM.profileAvatarBox.innerHTML = `<span style="font-size:42px;">${char.icon}</span>`; };
    }

    if (DOM.charProfileModal) {
        DOM.charProfileModal.classList.add("show");
        document.body.classList.add("modal-open-lock");
    }
}
window.openCharProfileModal = openCharProfileModal;

function closeCharProfileModal() {
    if (DOM.charProfileModal) DOM.charProfileModal.classList.remove("show");
    document.body.classList.remove("modal-open-lock");
}
window.closeCharProfileModal = closeCharProfileModal;

/* ==========================================================================
  【📖 盤面動的ビジュアル講義エンジン】
========================================================================== */
function startLectureMode(lectureId) {
    if (!LESSON_LECTURES[lectureId]) return;
    if (isReviewMode) exitReviewMode();
    if (isDrillMode) exitDrillMode();

    if (!isLectureMode) {
        savedBoardStateForLecture = {
            board: cloneBoard(board),
            currentPlayer, lastMove,
            statusType: DOM.status.className,
            statusText: DOM.status.textContent
        };
    }

    isLectureMode = true;
    currentLectureId = lectureId;
    currentLectureStepIndex = 0;
    lectureSessionId++;

    closeDrillCourseModal();
    closeTermPopup();
    if (DOM.guideOverlay) DOM.guideOverlay.classList.remove("show");
    document.body.classList.remove("modal-open-lock");

    // ⚡【全モード同一スロット統合】：下部固定枠内で講義カードだけを表示
    if (DOM.normalControlCard) DOM.normalControlCard.style.display = "none";
    if (DOM.reviewModePanel) DOM.reviewModePanel.classList.remove("show");
    if (DOM.drillControlCard) DOM.drillControlCard.classList.remove("show");
    if (DOM.lectureControlCard) DOM.lectureControlCard.classList.add("show");

    playPlaceSound();
    loadLectureState();
}
window.startLectureMode = startLectureMode;

function loadLectureState() {
    const lecture = LESSON_LECTURES[currentLectureId];
    if (!lecture) return;

    if (DOM.lectureTopicBadge) DOM.lectureTopicBadge.textContent = `📖 【第 ${lecture.themeId} 奥義】盤面講義`;
    if (DOM.lectureTitleText) DOM.lectureTitleText.textContent = lecture.title;
    if (DOM.lectureDescText) DOM.lectureDescText.textContent = lecture.introText;
    if (DOM.lectureStepIndicator) DOM.lectureStepIndicator.textContent = `ステップ 0 / ${lecture.steps.length}`;

    if (DOM.lectureExplainBox) {
        DOM.lectureExplainBox.style.display = "none";
        DOM.lectureExplainBox.innerHTML = "";
    }

    if (DOM.btnLecturePlay) {
        DOM.btnLecturePlay.style.display = "inline-block";
        DOM.btnLecturePlay.disabled = false;
        DOM.btnLecturePlay.textContent = "▶ 実演を再生する";
    }

    board = Array.from({ length: 8 }, () => Array(8).fill(0));
    lecture.setup(board);
    currentPlayer = lecture.turn;
    currentLectureStepIndex = 0;

    setStatus("hint-thinking", `📖 盤面講義：${lecture.title}`);
    drawBoard();
    clearDrillBadges();
}

async function playCurrentLectureStep() {
    const lecture = LESSON_LECTURES[currentLectureId];
    if (!lecture || currentLectureStepIndex >= lecture.steps.length || isLecturePlaying) return;

    isLecturePlaying = true;
    const session = lectureSessionId;
    if (DOM.btnLecturePlay) DOM.btnLecturePlay.disabled = true;

    while (currentLectureStepIndex < lecture.steps.length) {
        if (!isLectureMode || session !== lectureSessionId) {
            isLecturePlaying = false;
            return;
        }

        const step = lecture.steps[currentLectureStepIndex];
        currentLectureStepIndex++;

        if (DOM.lectureStepIndicator) {
            DOM.lectureStepIndicator.textContent = `ステップ ${currentLectureStepIndex} / ${lecture.steps.length}`;
        }

        const [r, c] = step.move;
        makeMove(board, r, c, step.player);
        playPlaceSound();
        drawBoard();

        const cell = getBoardCell(r, c);
        if (cell) {
            const badgeType = (step.player === BLACK) ? "player" : "cpu";
            const badgeText = (step.player === BLACK) ? "⚫ 着手" : "💀 相手の急所打ち！";
            addDrillBadge(r, c, badgeType, badgeText);
        }

        if (DOM.lectureExplainBox) {
            DOM.lectureExplainBox.style.display = "block";
            DOM.lectureExplainBox.innerHTML += `
                <div class="lecture-step-log">
                    <b>${step.desc}</b><br>
                    <span>${step.explain}</span>
                </div>
            `;
            DOM.lectureExplainBox.scrollTop = DOM.lectureExplainBox.scrollHeight;
        }

        await sleep(1100);
    }

    if (DOM.lectureExplainBox && lecture.solutionNote) {
        DOM.lectureExplainBox.innerHTML += `
            <div class="lecture-solution-card">
                ${lecture.solutionNote}
            </div>
        `;
        DOM.lectureExplainBox.scrollTop = DOM.lectureExplainBox.scrollHeight;
    }

    if (DOM.btnLecturePlay) DOM.btnLecturePlay.style.display = "none";
    if (DOM.btnLectureToDrill) {
        DOM.btnLectureToDrill.style.display = "inline-block";
        DOM.btnLectureToDrill.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
    isLecturePlaying = false;
}
window.playCurrentLectureStep = playCurrentLectureStep;

function resetCurrentLecture() {
    lectureSessionId++;
    isLecturePlaying = false;
    playPlaceSound();
    loadLectureState();
}
window.resetCurrentLecture = resetCurrentLecture;

function proceedToDrillFromLecture() {
    const lecture = LESSON_LECTURES[currentLectureId];
    exitLectureMode(false);
    const firstQId = (lecture && lecture.themeId) ? (lecture.themeId - 1) * 3 + 1 : 1;
    startDrillQuestion(firstQId);
}
window.proceedToDrillFromLecture = proceedToDrillFromLecture;

function returnToLectureFromDrill() {
    const qData = DRILL_QUESTIONS[currentDrillQuestionIndex - 1];
    const lecId = `lec-${qData.themeId}`;
    exitDrillMode(false);
    startLectureMode(lecId);
}
window.returnToLectureFromDrill = returnToLectureFromDrill;

function exitLectureMode(restoreBoard = true) {
    if (!isLectureMode) return;
    lectureSessionId++;
    isLecturePlaying = false;
    playPlaceSound();
    clearDrillBadges();

    if (restoreBoard && savedBoardStateForLecture) {
        board = cloneBoard(savedBoardStateForLecture.board);
        currentPlayer = savedBoardStateForLecture.currentPlayer;
        lastMove = savedBoardStateForLecture.lastMove;
        DOM.status.className = savedBoardStateForLecture.statusType;
        DOM.status.textContent = savedBoardStateForLecture.statusText;
        drawBoard();
        updateBalanceGauge();
    }

    isLectureMode = false;
    savedBoardStateForLecture = null;

    if (DOM.lectureControlCard) DOM.lectureControlCard.classList.remove("show");
    if (DOM.normalControlCard && !isDrillMode && !isReviewMode) DOM.normalControlCard.style.display = "flex";
    updateUndoButtonState();
}
window.exitLectureMode = exitLectureMode;

/* ==========================================================================
  【ストーリー型戦局総括＆勝負の分岐点生成エンジン】
========================================================================== */
function generateTacticsStory(isWin, isDraw, hStones, cStones) {
    if (playerMoveLogs.length === 0) {
        return {
            openingHtml: "対局記録が不足しているため総括できません。",
            turningPointHtml: "分岐点データなし",
            endingHtml: "終盤データなし",
            worstStep: -1, turningStep: -1, bestStep: -1
        };
    }

    const openingMoves = playerMoveLogs.filter(l => l.emptyCount >= 44);
    const openingBad = openingMoves.find(l => l.rating === "BAD");
    let openingHtml = "";
    if (openingBad) {
        tacticsWorstIndex = openingBad.stepIndex;
        tacticsWorstAlternative = openingBad.objectiveBest;
        
        openingHtml = `
            <div>序盤、第${openingBad.stepIndex}手【${openingBad.coord}】で外側の石を取りすぎ、外壁を作って相手に打てるマスを急増させてしまう隙が生じました。</div>
            <div class="story-deep-link-wrap">
                <span class="story-deep-btn" onclick="jumpToReviewStep(${openingBad.stepIndex})">🔍 なぜ危険だったのか？ 盤面で深掘り検証 ▶</span>
            </div>
        `;
    } else {
        openingHtml = `
            <div>序盤は定石と<span class="term-link" data-term="中割り">中割り</span>を遵守し、相手に余計な足場を与えない落ち着いた堅実な立ち上がりでした。</div>
        `;
    }

    let turningMove = playerMoveLogs.find(l => l.isCornerMove);
    if (!turningMove) {
        turningMove = playerMoveLogs.find(l => l.isObjectiveBest) || playerMoveLogs[Math.floor(playerMoveLogs.length / 2)];
    }

    tacticsTurningPointIndex = turningMove.stepIndex;
    let turningHtml = "";

    if (isWin) {
        if (turningMove.isCornerMove) {
            turningHtml = `
                <div>第${turningMove.stepIndex}手、相手が空けた隙を見逃さず要衝【${turningMove.coord}（角）】を奪取！ これにより絶対に裏返らない<span class="term-link" data-term="確定石">確定石</span>の拠点を築き、本局の主導権を完全に掌握しました。</div>
                <div class="story-deep-link-wrap">
                    <span class="story-deep-btn" onclick="jumpToReviewStep(${turningMove.stepIndex})">🎯 勝負を決めた分岐点の盤面を見る ▶</span>
                </div>
            `;
        } else {
            turningHtml = `
                <div>第${turningMove.stepIndex}手【${turningMove.coord}】の鋭い中割りで相手の打てる場所を削り取り、一気に優勢の天秤を引き寄せました。</div>
                <div class="story-deep-link-wrap">
                    <span class="story-deep-btn" onclick="jumpToReviewStep(${turningMove.stepIndex})">🎯 流れを掴んだ分岐点の盤面を見る ▶</span>
                </div>
            `;
        }
    } else {
        const midBad = playerMoveLogs.find(l => l.rating === "BAD" && l.emptyCount < 44);
        if (midBad) {
            tacticsTurningPointIndex = midBad.stepIndex;
            turningHtml = `
                <div>第${midBad.stepIndex}手【${midBad.coord}】での着手により、相手に反撃の足場を許してしまい、ここから戦況の天秤が相手へと傾いていきました。</div>
                <div class="story-deep-link-wrap">
                    <span class="story-deep-btn" onclick="jumpToReviewStep(${midBad.stepIndex})">⚠️ 敗着となった分岐点を検証する ▶</span>
                </div>
            `;
        } else {
            turningHtml = `<div>中盤は互角の攻防が続きましたが、わずかな足場の差で相手にリードを許しました。</div>`;
        }
    }

    let endingHtml = "";
    if (isWin) {
        if (hStones >= 55) {
            endingHtml = `
                <div>終盤は相手の選択肢をゼロ（パス）へと追い込み、最終盤面【${hStones}対${cStones}】という圧倒的包囲網で文句なしの完全制覇を達成しました！</div>
            `;
        } else {
            endingHtml = `
                <div>終盤の偶数理論（<span class="term-link" data-term="パリティ">パリティ</span>）を的確に制し、最後の一手を独占して見事な勝利を飾りました。</div>
            `;
        }
    } else if (isDraw) {
        endingHtml = `<div>最後の一手まで双方が全力を尽くし、互角の引き分け（DRAW）で終局を迎えました。</div>`;
    } else {
        endingHtml = `<div>終盤、相手に要所を封鎖され、反撃の手が届かず惜敗となりました。</div>`;
    }

    return {
        openingHtml,
        turningPointHtml: turningHtml,
        endingHtml,
        worstStep: tacticsWorstIndex,
        turningStep: tacticsTurningPointIndex
    };
}

function jumpToReviewStep(stepIndex) {
    if (stepIndex < 0 || stepIndex >= gameStepLogs.length) return;
    if (DOM.royalResultModal) DOM.royalResultModal.classList.remove("show");
    document.body.classList.remove("modal-open-lock");
    enterReviewMode();
    applyReviewStep(stepIndex);
}
window.jumpToReviewStep = jumpToReviewStep;

/* ==========================================================================
  【🎯 宮廷次の一手検定（全15問）】
========================================================================== */
function addDrillBadge(r, c, type, text) {
    const cell = getBoardCell(r, c);
    if (!cell) return;
    cell.querySelectorAll(".drill-mark-badge").forEach(b => b.remove());

    const badge = document.createElement("div");
    badge.className = `drill-mark-badge drill-mark-${type}`;
    badge.textContent = text;
    cell.appendChild(badge);
}

function clearDrillBadges() {
    if (!DOM.board) return;
    DOM.board.querySelectorAll(".drill-mark-badge").forEach(b => b.remove());
    DOM.board.querySelectorAll(".drill-correct-pulse, .drill-wrong-shake").forEach(el => {
        el.classList.remove("drill-correct-pulse", "drill-wrong-shake");
    });
}

function openDrillCourseModal() {
    playPlaceSound();
    renderDrillCourseList();
    if (DOM.drillCourseModal) DOM.drillCourseModal.classList.add("show");
    document.body.classList.add("modal-open-lock");
}
window.openDrillCourseModal = openDrillCourseModal;

function closeDrillCourseModal() {
    if (DOM.drillCourseModal) DOM.drillCourseModal.classList.remove("show");
    document.body.classList.remove("modal-open-lock");
}
window.closeDrillCourseModal = closeDrillCourseModal;

function openDrillFromTopicKey(topicKey) {
    const idxMap = { "Xマス": 1, "壁": 4, "中割り": 7, "Cマス": 10, "パリティ": 13 };
    const qIndex = idxMap[topicKey] || 1;
    if (DOM.guideOverlay) DOM.guideOverlay.classList.remove("show");
    startDrillQuestion(qIndex);
}
window.openDrillFromTopicKey = openDrillFromTopicKey;

function renderDrillCourseList() {
    if (!DOM.drillCourseList) return;
    DOM.drillCourseList.innerHTML = DRILL_THEMES.map(theme => {
        const questionsInTheme = DRILL_QUESTIONS.filter(q => q.themeId === theme.id);
        const clearedCount = questionsInTheme.filter(q => !!drillPassedMap[q.id]).length;
        const isAllCleared = clearedCount === questionsInTheme.length;

        const questionsHtml = questionsInTheme.map(q => {
            const isCleared = !!drillPassedMap[q.id];
            return `
                <div class="drill-sub-question-card ${isCleared ? 'cleared' : ''}">
                    <div class="drill-sub-info">
                        <span class="drill-step-tag">${q.stepInTheme}</span>
                        <span class="drill-sub-title">${q.title}</span>
                    </div>
                    <button type="button" class="btn-sub-drill" onclick="startDrillQuestion(${q.id})">
                        ${isCleared ? '復習 ↺' : '挑戦 ▶'}
                    </button>
                </div>
            `;
        }).join("");

        return `
            <div class="drill-theme-category-card ${isAllCleared ? 'all-cleared' : ''}">
                <div class="drill-theme-header">
                    <div class="drill-theme-header-left">
                        <span class="drill-theme-icon">${theme.icon}</span>
                        <div class="drill-theme-text-group">
                            <div class="drill-theme-title">${theme.name}</div>
                            <div class="drill-theme-meta">${theme.rankLabel} ｜ 進捗：${clearedCount} / 3 制覇</div>
                        </div>
                    </div>
                    <button type="button" class="btn-theme-lecture" onclick="startLectureMode('${theme.lectureId}')">
                        📖 盤面講義を見る
                    </button>
                </div>
                <div class="drill-theme-summary">${theme.summary}</div>
                <div class="drill-theme-questions-list">
                    ${questionsHtml}
                </div>
            </div>
        `;
    }).join("");
}

function startDrillQuestion(qIndex) {
    if (isReviewMode) exitReviewMode();
    if (isLectureMode) exitLectureMode(false);

    if (!isDrillMode) {
        savedBoardStateForDrill = {
            board: cloneBoard(board),
            currentPlayer, lastMove,
            statusType: DOM.status.className,
            statusText: DOM.status.textContent
        };
    }

    isDrillMode = true;
    isSimulatingDrillMistake = false;
    currentDrillQuestionIndex = Math.max(1, Math.min(15, qIndex));

    closeDrillCourseModal();
    closeTermPopup();
    if (DOM.guideOverlay) DOM.guideOverlay.classList.remove("show");
    document.body.classList.remove("modal-open-lock");

    // ⚡【全モード同一スロット統合】：下部固定枠内で検定カードだけを表示
    if (DOM.normalControlCard) DOM.normalControlCard.style.display = "none";
    if (DOM.reviewModePanel) DOM.reviewModePanel.classList.remove("show");
    if (DOM.lectureControlCard) DOM.lectureControlCard.classList.remove("show");
    if (DOM.drillControlCard) DOM.drillControlCard.classList.add("show");

    playPlaceSound();
    loadDrillQuestion();
}
window.startDrillQuestion = startDrillQuestion;

function loadDrillQuestion() {
    const qData = DRILL_QUESTIONS[currentDrillQuestionIndex - 1];
    if (!qData) return;

    if (DOM.drillTopicBadge) DOM.drillTopicBadge.textContent = `🎯 【${qData.themeName}】（第 ${qData.id} 問 / 全 15 問・${qData.stepInTheme}）`;
    if (DOM.drillDiffBadge) DOM.drillDiffBadge.textContent = qData.diffLabel;
    if (DOM.drillQuestionText) DOM.drillQuestionText.textContent = qData.question;
    const turnColorName = (qData.turn === BLACK) ? "黒番（⚫）" : "白番（⚪）";
    if (DOM.drillQuestionSub) DOM.drillQuestionSub.textContent = `手番：あなたの${turnColorName} ［狙い：${qData.desc}］`;

    if (DOM.btnDrillRetry) DOM.btnDrillRetry.style.display = "none";
    if (DOM.btnDrillNextQuestion) DOM.btnDrillNextQuestion.style.display = "none";
    if (DOM.drillFeedbackBox) {
        DOM.drillFeedbackBox.className = "drill-feedback-box";
        DOM.drillFeedbackBox.style.display = "none";
    }

    setStatus("hint-thinking", `🎯 次の一手検定：第 ${qData.id} 問【${qData.title}】`);
    if (DOM.speechText) DOM.speechText.textContent = `【第 ${qData.id} 問】${qData.themeName}の急所を見極めよ！ 理由を理解して着手するのじゃ！`;

    board = Array.from({ length: 8 }, () => Array(8).fill(0));
    qData.setup(board);
    currentPlayer = qData.turn;
    drawBoard();
    clearDrillBadges();
}

function resetCurrentDrill() {
    playPlaceSound();
    isSimulatingDrillMistake = false;
    loadDrillQuestion();
}
window.resetCurrentDrill = resetCurrentDrill;

async function handleDrillCellClick(r, c) {
    if (!isDrillMode || isSimulatingDrillMistake) return;
    const qData = DRILL_QUESTIONS[currentDrillQuestionIndex - 1];
    if (!qData) return;

    if (!canPlace(r, c, qData.turn, board)) return;

    clearDrillBadges();

    const [cr, cc] = qData.correctMove;
    const isCorrect = (r === cr && c === cc);
    const key = `${r},${c}`;

    if (isCorrect) {
        playFanfareSound();
        drillPassedMap[qData.id] = true;

        makeMove(board, r, c, qData.turn);
        drawBoard();

        const placedCell = getBoardCell(r, c);
        if (placedCell) {
            placedCell.classList.add("drill-correct-pulse");
            addDrillBadge(r, c, "correct", "⭕ 正解！");
        }

        if (DOM.drillFeedbackBox) {
            DOM.drillFeedbackBox.className = "drill-feedback-box correct";
            DOM.drillFeedbackTitle.textContent = "正解！🎉 完璧な着手理由です！";
            DOM.drillFeedbackReason.innerHTML = qData.correctReason;
        }

        if (DOM.btnDrillRetry) DOM.btnDrillRetry.style.display = "none";
        if (DOM.btnDrillNextQuestion) {
            DOM.btnDrillNextQuestion.style.display = "inline-block";
            if (currentDrillQuestionIndex >= 15) {
                DOM.btnDrillNextQuestion.textContent = "🏆 免許皆伝の合格証を受け取る！";
            } else if (qData.id % 3 === 0) {
                DOM.btnDrillNextQuestion.textContent = `奥義制覇！ 次の奥義（第${currentDrillQuestionIndex + 1}問）へ進む ▶`;
            } else {
                DOM.btnDrillNextQuestion.textContent = `次の類似問題（第${currentDrillQuestionIndex + 1}問）へ進む ▶`;
            }
        }

        if (DOM.speechText) DOM.speechText.textContent = "素晴らしい！急所の理由を完璧に見抜いたぞ！これぞオセロの真髄じゃ！";
        setStatus("win", "🎉 正解！ 奥義の本質を完全に体得しました！");
    } else {
        playBuzzerSound();
        isSimulatingDrillMistake = true;

        makeMove(board, r, c, qData.turn);
        drawBoard();

        const placedCell = getBoardCell(r, c);
        if (placedCell) {
            placedCell.classList.add("drill-wrong-shake");
            addDrillBadge(r, c, "player", "❌ あなたの手");
        }

        const mistakeInfo = (qData.mistakes && qData.mistakes[key]) || null;
        const reasonText = mistakeInfo ? mistakeInfo.reason : qData.defaultMistakeReason;

        if (DOM.drillFeedbackBox) {
            DOM.drillFeedbackBox.className = "drill-feedback-box wrong";
            DOM.drillFeedbackTitle.textContent = "惜しい！❌ なぜ悪手なのか確認しましょう";
            DOM.drillFeedbackReason.innerHTML = reasonText;
        }

        if (DOM.btnDrillRetry) DOM.btnDrillRetry.style.display = "inline-block";
        if (DOM.btnDrillNextQuestion) DOM.btnDrillNextQuestion.style.display = "none";

        if (mistakeInfo && mistakeInfo.cpuResponse) {
            await sleep(750);
            const [cpur, cpuc] = mistakeInfo.cpuResponse;
            if (canPlace(cpur, cpuc, opposite(qData.turn), board)) {
                makeMove(board, cpur, cpuc, opposite(qData.turn));
                playPlaceSound();
                drawBoard();

                addDrillBadge(r, c, "player", "❌ あなたの手");

                const cpuCell = getBoardCell(cpur, cpuc);
                if (cpuCell) {
                    cpuCell.classList.add("drill-wrong-shake");
                    addDrillBadge(cpur, cpuc, "cpu", "💀 相手の痛烈な反撃！");
                }
            }
        }

        if (DOM.speechText) DOM.speechText.textContent = "あちゃー！ 相手に反撃の隙を与えてしもうた！ 理由を読んで「もう一度やり直す ↺」を押すのじゃ！";
        setStatus("lose", "⚠️ 悪手でした！ なぜダメなのか解説を読んで「もう一度やり直す ↺」を押してください。");
        isSimulatingDrillMistake = false;
    }
}

function advanceNextDrillQuestion() {
    playPlaceSound();
    if (currentDrillQuestionIndex >= 15) {
        exitDrillMode();
        if (DOM.drillCertificateModal) DOM.drillCertificateModal.classList.add("show");
        document.body.classList.add("modal-open-lock");
    } else {
        startDrillQuestion(currentDrillQuestionIndex + 1);
    }
}
window.advanceNextDrillQuestion = advanceNextDrillQuestion;

function closeCertificateModal() {
    if (DOM.drillCertificateModal) DOM.drillCertificateModal.classList.remove("show");
    document.body.classList.remove("modal-open-lock");
}
window.closeCertificateModal = closeCertificateModal;

function closeCertificateAndChallengeKing() {
    closeCertificateModal();
    if (DOM.characterSelect) DOM.characterSelect.value = "10";
    if (DOM.hintMode) DOM.hintMode.value = "off";
    updateOpponentStageUI(true);
    updateHintModeUI();
    startGame();
}
window.closeCertificateAndChallengeKing = closeCertificateAndChallengeKing;

function exitDrillMode(restoreBoard = true) {
    if (!isDrillMode) return;
    playPlaceSound();
    clearDrillBadges();

    if (restoreBoard && savedBoardStateForDrill) {
        board = cloneBoard(savedBoardStateForDrill.board);
        currentPlayer = savedBoardStateForDrill.currentPlayer;
        lastMove = savedBoardStateForDrill.lastMove;
        DOM.status.className = savedBoardStateForDrill.statusType;
        DOM.status.textContent = savedBoardStateForDrill.statusText;
        drawBoard();
        updateBalanceGauge();
    }

    isDrillMode = false;
    savedBoardStateForDrill = null;
    isSimulatingDrillMistake = false;

    if (DOM.drillControlCard) DOM.drillControlCard.classList.remove("show");
    if (DOM.normalControlCard && !isLectureMode && !isReviewMode) DOM.normalControlCard.style.display = "flex";
    updateUndoButtonState();
}
window.exitDrillMode = exitDrillMode;

/* ==========================================================================
  【宮廷思案所：新体系コンテンツ動的レンダリング】
========================================================================== */
function renderGuideModalContents() {
    if (DOM.opsGuideContainer && typeof OPERATION_GUIDE_DATA !== "undefined") {
        DOM.opsGuideContainer.innerHTML = OPERATION_GUIDE_DATA.map(item => `
            <div class="manual-card">
                <div class="manual-card-title">
                    <span>${item.icon} ${item.title}</span>
                </div>
                <div>${item.desc}</div>
            </div>
        `).join("");
    }

    if (DOM.strategyPhasesContainer && typeof STRATEGY_GUIDE_DATA !== "undefined" && STRATEGY_GUIDE_DATA.phases) {
        DOM.strategyPhasesContainer.innerHTML = STRATEGY_GUIDE_DATA.phases.map(item => `
            <div class="manual-card">
                <div class="manual-card-title" style="color:#ffd700;">
                    <span>${item.phase}</span>
                </div>
                <div style="font-size:11px; font-weight:800; color:#fff4bd; margin-bottom:4px;">
                    「${item.catchphrase}」
                </div>
                <div style="display:flex; flex-direction:column; gap:3px;">
                    ${item.rules.map(r => `<div>${r}</div>`).join("")}
                </div>
            </div>
        `).join("");
    }

    if (DOM.strategyRoadmapContainer && typeof STRATEGY_GUIDE_DATA !== "undefined" && STRATEGY_GUIDE_DATA.roadmap) {
        DOM.strategyRoadmapContainer.innerHTML = STRATEGY_GUIDE_DATA.roadmap.map(item => `
            <div class="roadmap-card">
                <div class="roadmap-level-tag">${item.level}</div>
                <div class="roadmap-target-text">${item.target}</div>
                <div class="roadmap-desc-text">${item.desc}</div>
            </div>
        `).join("");
    }

    if (DOM.charGalleryList && typeof CHARACTERS !== "undefined") {
        let galleryHtml = "";
        for (let i = 1; i <= 10; i++) {
            const char = CHARACTERS[i];
            galleryHtml += `
                <div class="char-gallery-card">
                    <div class="char-gallery-avatar-wrap">
                        <img src="${char.image}" alt="${char.name}" onerror="this.src='';this.parentElement.textContent='${char.icon}'">
                        <div class="char-gallery-lvl">Lv.${i}</div>
                    </div>
                    <div class="char-gallery-info">
                        <div class="char-gallery-name">${char.name}</div>
                        <div class="char-gallery-rank">${char.rankLabel} ${char.title}</div>
                        <div class="char-gallery-bio">${char.profile}</div>
                        <div class="char-gallery-tactics"><b>攻略法：</b>${char.tacticsInfo}</div>
                    </div>
                    <button type="button" class="btn-select-fighter" onclick="selectFighterFromGallery(${i})">
                        対戦する ⚔️
                    </button>
                </div>
            `;
        }
        DOM.charGalleryList.innerHTML = galleryHtml;
    }
}

function selectFighterFromGallery(charId) {
    playPlaceSound();
    if (DOM.characterSelect) DOM.characterSelect.value = charId;
    if (DOM.guideOverlay) DOM.guideOverlay.classList.remove("show");
    document.body.classList.remove("modal-open-lock");
    updateOpponentStageUI(true);
    startGame();
}
window.selectFighterFromGallery = selectFighterFromGallery;

/* ==========================================================================
  【ミニ解説ポップアップ】
========================================================================== */
let activePopupTerm = null;

function showTermPopup(termKey, event) {
    if (typeof TERMS_DICTIONARY === "undefined" || !TERMS_DICTIONARY[termKey]) return;
    const termData = TERMS_DICTIONARY[termKey];
    activePopupTerm = termKey;

    if (DOM.termPopupTitle) DOM.termPopupTitle.textContent = termData.title;
    if (DOM.termPopupBody) DOM.termPopupBody.textContent = termData.desc;

    if (gameOver || isReviewMode) {
        if (DOM.termPopupDrillBtn) DOM.termPopupDrillBtn.style.display = "none";
    } else {
        if (DOM.termPopupDrillBtn) DOM.termPopupDrillBtn.style.display = "";
    }

    const popup = DOM.termPopup;
    if (!popup) return;
    popup.style.display = "block";

    let x = event ? (event.clientX || event.pageX) : window.innerWidth / 2;
    let y = event ? (event.clientY || event.pageY) : window.innerHeight / 2;

    const pw = popup.offsetWidth || 280;
    const ph = popup.offsetHeight || 140;

    let left = x - pw / 2;
    let top = y - ph - 12;

    if (left < 10) left = 10;
    if (left + pw > window.innerWidth - 10) left = window.innerWidth - pw - 10;
    if (top < 10) top = y + 16;

    popup.style.left = `${left}px`;
    popup.style.top = `${top}px`;
}

function closeTermPopup() {
    if (DOM.termPopup) DOM.termPopup.style.display = "none";
    activePopupTerm = null;
}

if (DOM.termPopupClose) {
    DOM.termPopupClose.addEventListener("click", (e) => {
        e.stopPropagation();
        closeTermPopup();
    });
}

if (DOM.termPopupDrillBtn) {
    DOM.termPopupDrillBtn.addEventListener("click", () => {
        if (!activePopupTerm || typeof TERMS_DICTIONARY === "undefined" || !TERMS_DICTIONARY[activePopupTerm]) return;
        const qIdx = TERMS_DICTIONARY[activePopupTerm].drillIndex || 1;
        startDrillQuestion(qIdx);
    });
}

if (DOM.termPopupMore) {
    DOM.termPopupMore.addEventListener("click", () => {
        if (!activePopupTerm || typeof TERMS_DICTIONARY === "undefined" || !TERMS_DICTIONARY[activePopupTerm]) return;
        const targetSecId = TERMS_DICTIONARY[activePopupTerm].tabSec;
        closeTermPopup();

        if (DOM.guideOverlay) {
            DOM.guideOverlay.classList.add("show");
            document.body.classList.add("modal-open-lock");
        }

        manualTabBtns.forEach(b => b.classList.toggle("active", b.dataset.tab === "tab-terms"));
        manualTabContents.forEach(c => c.classList.toggle("active", c.id === "tab-terms"));

        const secEl = document.getElementById(targetSecId);
        if (secEl) setTimeout(() => secEl.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    });
}

document.addEventListener("click", (e) => {
    if (e.target.classList.contains("term-link")) {
        e.stopPropagation();
        const term = e.target.dataset.term;
        showTermPopup(term, e);
    } else if (DOM.termPopup && !DOM.termPopup.contains(e.target)) {
        closeTermPopup();
    }
});

/* 王宮戦績録 データ管理 */
function getArchiveLogs() {
    try {
        const data = localStorage.getItem(STORAGE_KEY_ARCHIVES);
        return data ? JSON.parse(data) : [];
    } catch (e) { return []; }
}

function saveArchiveLogs(logs) {
    try { localStorage.setItem(STORAGE_KEY_ARCHIVES, JSON.stringify(logs.slice(0, 100))); } catch (e) {}
}

function clearArchiveLogs() {
    if (confirm("これまでに記録されたすべての戦績履歴を初期化しますか？\n（この操作は取り消せません）")) {
        localStorage.removeItem(STORAGE_KEY_ARCHIVES);
        renderArchiveView();
    }
}

function determineInitialCharacterLevel() {
    const logs = getArchiveLogs();
    for (let lv = 1; lv <= 10; lv++) {
        const hasWonGenuinely = logs.some(r => r.charId === lv && r.isWin && r.isGenuine);
        if (!hasWonGenuinely) return String(lv);
    }
    return "10";
}

function determineDramaTitle(isWin, isDraw, diff, playerStones, oppStones, minWinrate) {
    if (isDraw) return "⚖️ 格式高き引き分け";
    if (isWin) {
        if (oppStones === 0 || playerStones === 64) return "👑 完全勝利（パーフェクト）";
        if (diff >= 40) return "👑 圧倒的完勝";
        if (minWinrate <= 28) return "⚡ 劇的大逆転";
        if (diff >= 20) return "⚜️ 大差圧勝";
        if (diff <= 4) return "⚔️ 激闘辛勝";
        return "👑 堂々勝利";
    } else {
        if (diff <= 4) return "🥀 惜敗（あと一歩）";
        if (playerStones === 0) return "🥀 屈辱の全滅";
        if (diff >= 36) return "🥀 大敗完敗";
        return "🥀 無念の敗北";
    }
}

function recordGameResultToArchive(isWin, isDraw, hStones, cStones, char) {
    const logs = getArchiveLogs();
    const now = new Date();
    const dateStr = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    const totalMoves = playerMoveLogs.length;
    const bestCount = playerMoveLogs.filter(l => l.isObjectiveBest).length;
    const badCount = playerMoveLogs.filter(l => l.rating === "BAD").length;
    const bestRate = totalMoves > 0 ? Math.round((bestCount / totalMoves) * 1000) / 10 : 0;

    const isGenuine = !usedHintInGame;
    const diff = Math.abs(hStones - cStones);
    const dramaTitle = determineDramaTitle(isWin, isDraw, diff, hStones, cStones, minPlayerWinrateInGame);

    const record = {
        id: Date.now(),
        date: dateStr,
        charId: char.id,
        charName: char.name,
        charTitle: char.rankLabel,
        playerColor: humanColor,
        isWin, isDraw,
        playerStones: hStones,
        cpuStones: cStones,
        diff, isGenuine,
        dramaTitle,
        bestCount, badCount, bestRate, totalMoves,
        playerTimeStr: formatMinSec(playerSeconds),
        totalTurns: gameStepLogs.length - 1
    };

    logs.unshift(record);
    saveArchiveLogs(logs);
}

function renderArchiveView() {
    const logs = getArchiveLogs();
    const genuineLogs = logs.filter(r => r.isGenuine);
    const totalGenuineGames = genuineLogs.length;
    let wins = 0, loses = 0, draws = 0;
    let currentStreak = 0, maxStreak = 0, tempStreak = 0;
    let sumBestRate = 0;

    const chronologicalGenuine = genuineLogs.slice().reverse();
    for (const r of chronologicalGenuine) {
        if (r.isWin) {
            tempStreak++;
            if (tempStreak > maxStreak) maxStreak = tempStreak;
        } else if (!r.isDraw) {
            tempStreak = 0;
        }
    }
    for (const r of genuineLogs) {
        if (r.isWin) currentStreak++;
        else break;
    }

    genuineLogs.forEach(r => {
        if (r.isWin) wins++;
        else if (r.isDraw) draws++;
        else loses++;
        sumBestRate += (r.bestRate || 0);
    });

    const winrate = totalGenuineGames > 0 ? Math.round((wins / totalGenuineGames) * 100) : 0;
    const avgBestRate = totalGenuineGames > 0 ? (sumBestRate / totalGenuineGames).toFixed(1) : "0.0";

    if (DOM.archStatWinrate) DOM.archStatWinrate.textContent = `${totalGenuineGames}戦 ${winrate}%`;
    if (DOM.archStatWld) DOM.archStatWld.textContent = `${wins}勝-${loses}敗-${draws}分`;
    if (DOM.archStatStreak) DOM.archStatStreak.textContent = `${currentStreak} / ${maxStreak}連勝`;
    if (DOM.archStatBestRate) DOM.archStatBestRate.textContent = `${avgBestRate}%`;

    if (DOM.archiveCrownGrid) {
        DOM.archiveCrownGrid.innerHTML = "";
        for (let i = 1; i <= 10; i++) {
            const char = CHARACTERS[i];
            const isConquered = logs.some(r => r.charId === i && r.isWin && r.isGenuine);
            const nameParts = char.name.split(" ");
            const charLastName = nameParts[1] || char.name;

            const item = document.createElement("div");
            item.className = `crown-item ${isConquered ? "conquered" : ""}`;
            item.innerHTML = `
                <div class="crown-item-avatar">
                    <img src="${char.image}" alt="${char.name}" onerror="this.src='';this.parentElement.textContent='${char.icon}'">
                    <div class="crown-item-overlay">
                        <div class="crown-badge-mark">${isConquered ? "👑制覇" : `Lv.${i}`}</div>
                        <div class="crown-item-name">${charLastName}</div>
                    </div>
                </div>
            `;
            DOM.archiveCrownGrid.appendChild(item);
        }
    }

    if (!DOM.archFilterOpponent || !DOM.archiveTableBody) return;
    const filterOpp = DOM.archFilterOpponent.value;
    const filterMode = DOM.archFilterMode.value;
    const filterRes = DOM.archFilterResult.value;
    const sortOrder = DOM.archSortOrder.value;

    let filtered = logs.filter(r => {
        if (filterOpp !== "all" && r.charId !== Number(filterOpp)) return false;
        if (filterMode === "genuine" && !r.isGenuine) return false;
        if (filterMode === "hinted" && r.isGenuine) return false;
        if (filterRes === "win" && !r.isWin) return false;
        if (filterRes === "lose" && (r.isWin || r.isDraw)) return false;
        return true;
    });

    filtered.sort((a, b) => {
        if (sortOrder === "date-desc") return b.id - a.id;
        if (sortOrder === "date-asc") return a.id - b.id;
        if (sortOrder === "diff-desc") return b.diff - a.diff;
        if (sortOrder === "best-desc") return (b.bestRate || 0) - (a.bestRate || 0);
        return 0;
    });

    DOM.archiveTableBody.innerHTML = "";
    if (filtered.length === 0) {
        DOM.archiveTableBody.innerHTML = `<tr><td colspan="8" class="archive-empty-placeholder">該当する戦績データがありません</td></tr>`;
        return;
    }

    filtered.forEach(r => {
        const tr = document.createElement("tr");

        let resBadge = "";
        if (r.isWin) resBadge = `<span class="badge-win-gold">${r.dramaTitle}</span>`;
        else if (r.isDraw) resBadge = `<span class="badge-draw-dim">${r.dramaTitle}</span>`;
        else resBadge = `<span class="badge-lose-dim">${r.dramaTitle}</span>`;

        const modeBadge = r.isGenuine
            ? `<div class="badge-mode-standard badge-genuine-crown"><span>⚔️ 自力</span><span>真剣</span></div>`
            : `<div class="badge-mode-standard badge-hinted"><span>💡 指南</span><span>受講</span></div>`;

        const [datePart, timePart] = (r.date || "").split(" ");
        const oppParts = (r.charName || "").split(" ");
        const oppTitle = oppParts[0] || "";
        const oppPersonalName = oppParts[1] || r.charName;

        const pColorIcon = (r.playerColor === BLACK) ? "⚫ 先手" : "⚪ 後手";
        const scoreLine1 = `${r.playerStones} vs ${r.cpuStones}`;
        const scoreLine2 = `(${r.playerStones >= r.cpuStones ? "+" : "-"}${r.diff})`;
        const bestRateLine1 = `🎯 ${r.bestRate || 0}%`;
        const bestRateLine2 = `<span style="font-size:8px; color:#a89b80;">(最善${r.bestCount}/悪${r.badCount})</span>`;
        const timeLine1 = `⏱️ ${r.playerTimeStr}`;
        const timeLine2 = `<span style="font-size:8.5px; color:#c7ba9f;">(${r.totalTurns}手)</span>`;

        tr.innerHTML = `
            <td>
                <div style="font-size:9.5px; color:#c7ba9f;">${datePart}</div>
                <div style="font-size:8.5px; color:#8e8474;">${timePart || ""}</div>
            </td>
            <td>
                <div style="font-size:10px; font-weight:800; color:#ecd08c;">Lv.${r.charId} ${oppTitle}</div>
                <div style="font-size:11px; font-weight:900; color:#fff4bd;">${oppPersonalName}</div>
            </td>
            <td style="font-size:9.5px; vertical-align:middle;">${pColorIcon}</td>
            <td style="vertical-align:middle;">${resBadge}</td>
            <td style="font-family:'Cinzel',serif; font-weight:800;">
                <div style="font-size:11.5px; color:#fff4bd;">${scoreLine1}</div>
                <div style="font-size:9px; color:#ecd08c;">${scoreLine2}</div>
            </td>
            <td style="vertical-align:middle;">${modeBadge}</td>
            <td>
                <div style="font-size:10px; font-weight:800; color:#ffd700;">${bestRateLine1}</div>
                <div>${bestRateLine2}</div>
            </td>
            <td>
                <div style="font-size:10px; color:#d1b888;">${timeLine1}</div>
                <div>${timeLine2}</div>
            </td>
        `;
        DOM.archiveTableBody.appendChild(tr);
    });
}

function openArchiveModal() {
    renderArchiveView();
    if (DOM.archiveOverlay) {
        DOM.archiveOverlay.classList.add("show");
        document.body.classList.add("modal-open-lock");
    }
}

function closeArchiveModal() {
    if (DOM.archiveOverlay) {
        DOM.archiveOverlay.classList.remove("show");
        document.body.classList.remove("modal-open-lock");
    }
}

/* ==========================================================================
  【終局処理】
========================================================================== */
function endGame() {
    gameOver = true;
    isBusy = false;
    clearHint();
    cachedMoveEvaluations = null;
    isPrefetching = false;
    isPrefetchAborted = true;
    if (timerInterval) clearInterval(timerInterval);
    if (typeWriterInterval) clearInterval(typeWriterInterval);

    if (DOM.opponentAvatarFrame) DOM.opponentAvatarFrame.classList.remove("thinking-aura");
    if (DOM.opponentThinkingBadge) DOM.opponentThinkingBadge.classList.remove("show");
    drawBoard();
    updateBalanceGauge();
    updateUndoButtonState();

    showMoveToast("finish", "👑 決着（FINISH）");

    const stats = getBoardStats(board);
    const hStones = (humanColor === BLACK) ? stats.black : stats.white;
    const cStones = (cpuColor === BLACK) ? stats.black : stats.white;
    const isWin = hStones > cStones;
    const isDraw = hStones === cStones;
    const char = getCurrentCharacter();

    if (DOM.resultAvatarFrame) {
        DOM.resultAvatarFrame.innerHTML = "";
        const bigImg = new Image();
        bigImg.src = char.image;
        bigImg.alt = char.name;
        bigImg.style.objectPosition = char.imgFocus || "center 20%";
        bigImg.onload = () => { DOM.resultAvatarFrame.innerHTML = ""; DOM.resultAvatarFrame.appendChild(bigImg); };
        bigImg.onerror = () => { DOM.resultAvatarFrame.innerHTML = `<span style="font-size: 56px; color:#ffd700;">${char.icon}</span>`; };
    }

    if (DOM.resultCharNameBadge) DOM.resultCharNameBadge.textContent = `${char.name} ${char.rankLabel}（${char.salonName}）`;
    if (DOM.resultStonesDetail) DOM.resultStonesDetail.textContent = `⚫ ${stats.black} vs ${stats.white} ⚪`;
    if (DOM.resultTimesDetail) DOM.resultTimesDetail.textContent = `あなた ${formatMinSec(playerSeconds)} / 相手 ${formatMinSec(cpuSeconds)}`;

    let quoteText = "";

    if (isWin) {
        if (DOM.resultMainTitle) {
            DOM.resultMainTitle.className = "result-main-title result-title-win";
            DOM.resultMainTitle.textContent = "👑 完全勝利 (VICTORY)";
        }
        setStatus("win", "👑 栄光の勝利！ あなたの勝ちです！");
        setOpponentQuote("lose");

        if (DOM.opponentStatusTag) {
            DOM.opponentStatusTag.className = "opponent-status-tag tag-opponent-surrendered";
            DOM.opponentStatusTag.textContent = `【対戦相手】${char.name}（降参・完敗）`;
        }
        if (DOM.resultAvatarFrame) DOM.resultAvatarFrame.classList.add("opponent-lost-filter");

        if (usedHintInGame) {
            quoteText = `見事な勝利…だが、AIの知恵を借りていたようだな！ 貴殿の真の知謀を示すためにも、次はぜひ己のお力のみで挑まれよ！`;
        } else {
            quoteText = Array.isArray(char.quotes.lose) ? char.quotes.lose[Math.floor(Math.random() * char.quotes.lose.length)] : char.quotes.lose;
        }
    } else if (isDraw) {
        if (DOM.resultMainTitle) {
            DOM.resultMainTitle.className = "result-main-title result-title-draw";
            DOM.resultMainTitle.textContent = "⚖️ 格式高き引き分け (DRAW)";
        }
        setStatus("draw", "⚖️ ゲーム終了！ 格式高き引き分けです。");

        if (DOM.opponentStatusTag) {
            DOM.opponentStatusTag.className = "opponent-status-tag tag-opponent-surrendered";
            DOM.opponentStatusTag.textContent = `【対戦相手】${char.name}（互角の勝負）`;
        }
        if (DOM.resultAvatarFrame) DOM.resultAvatarFrame.classList.remove("opponent-lost-filter");
        quoteText = "見事な勝負… まさに互角の知略であったな。";
    } else {
        if (DOM.resultMainTitle) {
            DOM.resultMainTitle.className = "result-main-title result-title-lose";
            DOM.resultMainTitle.textContent = "🥀 惜敗… 無念の敗北 (DEFEAT)";
        }
        setStatus("lose", "🥀 惜敗… 相手の勝利です。");
        setOpponentQuote("win");

        if (DOM.opponentStatusTag) {
            DOM.opponentStatusTag.className = "opponent-status-tag tag-opponent-triumphant";
            DOM.opponentStatusTag.textContent = `【対戦相手】${char.name}（会心の勝利）`;
        }
        if (DOM.resultAvatarFrame) DOM.resultAvatarFrame.classList.remove("opponent-lost-filter");
        quoteText = Array.isArray(char.quotes.win) ? char.quotes.win[Math.floor(Math.random() * char.quotes.win.length)] : char.quotes.win;
    }

    if (DOM.resultQuoteBox) DOM.resultQuoteBox.textContent = `「${quoteText}」`;

    const story = generateTacticsStory(isWin, isDraw, hStones, cStones);
    if (DOM.carteStoryTimeline) {
        DOM.carteStoryTimeline.innerHTML = `
            <div class="story-act-card">
                <div class="story-act-title">1.【序盤の立ち上がり】</div>
                <div class="story-act-body">${story.openingHtml}</div>
            </div>
            <div class="story-act-card highlight">
                <div class="story-act-title">2.【中盤・最大の勝負の分岐点】</div>
                <div class="story-act-body">${story.turningPointHtml}</div>
            </div>
            <div class="story-act-card">
                <div class="story-act-title">3.【終盤の収束と結末】</div>
                <div class="story-act-body">${story.endingHtml}</div>
            </div>
        `;
    }

    recordGameResultToArchive(isWin, isDraw, hStones, cStones, char);

    if (DOM.btnResultAdvance) {
        if (isWin) {
            if (usedHintInGame) {
                if (DOM.btnAdvanceIcon) DOM.btnAdvanceIcon.textContent = "👑";
                if (DOM.btnAdvanceText) DOM.btnAdvanceText.textContent = `ヒントなし（自力勝負）で ${char.name.split(" ")[0]} と再戦`;
                DOM.btnResultAdvance.onclick = () => {
                    if (DOM.hintMode) DOM.hintMode.value = "off";
                    updateHintModeUI();
                    if (DOM.royalResultModal) DOM.royalResultModal.classList.remove("show");
                    document.body.classList.remove("modal-open-lock");
                    startGame();
                };
            } else {
                if (char.id < 10) {
                    const nextChar = CHARACTERS[char.id + 1];
                    if (DOM.btnAdvanceIcon) DOM.btnAdvanceIcon.textContent = "⚔️";
                    if (DOM.btnAdvanceText) DOM.btnAdvanceText.textContent = `次の強敵へ挑む（Lv.${nextChar.id} ${nextChar.name} ${nextChar.rankLabel}）`;
                    DOM.btnResultAdvance.onclick = () => {
                        if (DOM.characterSelect) DOM.characterSelect.value = char.id + 1;
                        if (DOM.royalResultModal) DOM.royalResultModal.classList.remove("show");
                        document.body.classList.remove("modal-open-lock");
                        startGame();
                    };
                } else {
                    if (DOM.btnAdvanceIcon) DOM.btnAdvanceIcon.textContent = "🏆";
                    if (DOM.btnAdvanceText) DOM.btnAdvanceText.textContent = "全10豪傑完全制覇！ 栄光の戴冠式へ";
                    DOM.btnResultAdvance.onclick = () => {
                        if (DOM.royalResultModal) DOM.royalResultModal.classList.remove("show");
                        if (DOM.endingModal) DOM.endingModal.classList.add("show");
                    };
                }
            }
        } else {
            if (DOM.btnAdvanceIcon) DOM.btnAdvanceIcon.textContent = "⚜️";
            if (DOM.btnAdvanceText) DOM.btnAdvanceText.textContent = "雪辱を期す（再戦を挑む）";
            DOM.btnResultAdvance.onclick = () => {
                if (DOM.royalResultModal) DOM.royalResultModal.classList.remove("show");
                document.body.classList.remove("modal-open-lock");
                startGame();
            };
        }
    }

    setTimeout(() => {
        if (DOM.royalResultModal) {
            DOM.royalResultModal.classList.add("show");
            document.body.classList.add("modal-open-lock");
        }
    }, 1400);
}

function enterReviewMode() {
    if (gameStepLogs.length === 0 || isDrillMode || isLectureMode) return;
    isReviewMode = true;
    if (DOM.royalResultModal) DOM.royalResultModal.classList.remove("show");
    document.body.classList.remove("modal-open-lock");

    // ⚡【全モード同一スロット統合】：下部固定枠内で検討カードだけを表示
    if (DOM.normalControlCard) DOM.normalControlCard.style.display = "none";
    if (DOM.lectureControlCard) DOM.lectureControlCard.classList.remove("show");
    if (DOM.drillControlCard) DOM.drillControlCard.classList.remove("show");
    if (DOM.reviewModePanel) DOM.reviewModePanel.classList.add("show");

    if (DOM.btnJumpGood) DOM.btnJumpGood.disabled = (tacticsTurningPointIndex < 0);
    if (DOM.btnJumpBad) DOM.btnJumpBad.disabled = (tacticsWorstIndex < 0);

    reviewStepIndex = gameStepLogs.length - 1;
    applyReviewStep(reviewStepIndex);
    setStatus("human-turn", "🔍 棋譜検証モード：対局の全手筋を検証中");
}

function exitReviewMode() {
    isReviewMode = false;
    if (DOM.reviewModePanel) DOM.reviewModePanel.classList.remove("show");
    if (DOM.normalControlCard && !isDrillMode && !isLectureMode) DOM.normalControlCard.style.display = "flex";
    updateUndoButtonState();
    updateScore(board);
    updateBalanceGauge(board);
}

function applyReviewStep(index) {
    if (index < 0 || index >= gameStepLogs.length) return;
    reviewStepIndex = index;
    const step = gameStepLogs[index];
    board = cloneBoard(step.board);

    const totalSteps = gameStepLogs.length - 1;
    if (DOM.reviewTurnInfo) DOM.reviewTurnInfo.textContent = `第 ${index} 手 / 全 ${totalSteps} 手`;

    if (DOM.btnReviewPrev) DOM.btnReviewPrev.disabled = (index === 0);
    if (DOM.btnReviewNext) DOM.btnReviewNext.disabled = (index === totalSteps);

    const matchingPlayerLog = playerMoveLogs.find(l => l.stepIndex === index);
    let contextHtml = "";

    if (index === 0) {
        contextHtml = `<div>【初期配置】対局開始時の盤面です。</div>`;
    } else if (index === tacticsTurningPointIndex) {
        contextHtml = `
            <div class="review-deep-card turn-highlight">
                <div class="deep-card-title">🎯【勝負の分岐点（ターニングポイント）】</div>
                <div>${step.contextNote}</div>
                <div class="deep-card-detail">ここでの着手が決定打となり、戦局の主導権を完全に手中に収めました。</div>
            </div>
        `;
    } else if (index === tacticsWorstIndex && matchingPlayerLog) {
        const altNotation = tacticsWorstAlternative ? `【${toNotation(tacticsWorstAlternative[0], tacticsWorstAlternative[1])}】` : "内側の安全なマス";
        contextHtml = `
            <div class="review-deep-card bad-highlight">
                <div class="deep-card-title">⚠️【深掘り解説：なぜこの手が悪手・危険なのか？】</div>
                <div>あなたの打点：<b>${matchingPlayerLog.coord}</b>（裏返した枚数：${matchingPlayerLog.flips}枚）</div>
                <div class="deep-metrics-row">
                    <span>相手の打てる場所：${matchingPlayerLog.oppMovesBefore}箇所 ➔ <b>${matchingPlayerLog.oppMovesAfter}箇所（+${matchingPlayerLog.mobilityDelta}箇所急増）</b></span>
                </div>
                <div class="deep-card-detail">
                    オセロ序盤〜中盤では、石を取りすぎると外側に自分の石が露出（壁を形成）し、相手にあらゆる方向への足場を与えてしまいます。<br>
                    💡 推奨手：金枠の<b>${altNotation}</b>へ打てば、内側だけを返す「中割り」となり、相手の選択肢を抑え込めていました。
                </div>
            </div>
        `;
    } else {
        contextHtml = `<div>${step.contextNote || "棋譜の一手です。"}</div>`;
    }

    if (DOM.reviewContextBox) DOM.reviewContextBox.innerHTML = contextHtml;
    updateScore(board);
    updateBalanceGauge(board);
    drawBoard();
}

/* ==========================================================================
  【イベントリスナー登録】
========================================================================== */
const restartBtn = document.getElementById("restartButton");
if (restartBtn) restartBtn.addEventListener("click", startGame);

if (DOM.undoButton) DOM.undoButton.addEventListener("click", undoMove);
if (DOM.hintButton) DOM.hintButton.addEventListener("click", computeHint);
if (DOM.btnStartReview) DOM.btnStartReview.addEventListener("click", enterReviewMode);

if (DOM.btnReviewPrev) {
    DOM.btnReviewPrev.addEventListener("click", () => {
        if (reviewStepIndex > 0) applyReviewStep(reviewStepIndex - 1);
    });
}

if (DOM.btnReviewNext) {
    DOM.btnReviewNext.addEventListener("click", () => {
        if (reviewStepIndex < gameStepLogs.length - 1) applyReviewStep(reviewStepIndex + 1);
    });
}

if (DOM.btnJumpGood) {
    DOM.btnJumpGood.addEventListener("click", () => {
        if (tacticsTurningPointIndex >= 0) applyReviewStep(tacticsTurningPointIndex);
    });
}

if (DOM.btnJumpBad) {
    DOM.btnJumpBad.addEventListener("click", () => {
        if (tacticsWorstIndex >= 0) applyReviewStep(tacticsWorstIndex);
    });
}

if (DOM.btnReviewExit) {
    DOM.btnReviewExit.addEventListener("click", () => {
        applyReviewStep(gameStepLogs.length - 1);
        if (DOM.royalResultModal) {
            DOM.royalResultModal.classList.add("show");
            document.body.classList.add("modal-open-lock");
        }
    });
}

if (DOM.btnRestartFromBeginning) {
    DOM.btnRestartFromBeginning.addEventListener("click", () => {
        if (DOM.endingModal) DOM.endingModal.classList.remove("show");
        document.body.classList.remove("modal-open-lock");
        if (DOM.characterSelect) DOM.characterSelect.value = "1";
        startGame();
    });
}

if (DOM.characterSelect) {
    DOM.characterSelect.addEventListener("change", () => {
        updateOpponentStageUI(true);
        startGame();
    });
}

if (DOM.opponentAvatarWrap) {
    DOM.opponentAvatarWrap.addEventListener("click", () => openCharProfileModal());
}

if (DOM.btnPlayerBlack && DOM.btnPlayerWhite) {
    [DOM.btnPlayerBlack, DOM.btnPlayerWhite].forEach((btn, idx) => {
        btn.addEventListener("click", () => {
            const targetColor = (idx === 0) ? BLACK : WHITE;
            if (humanColor === targetColor) return;
            humanColor = targetColor;
            DOM.btnPlayerBlack.classList.toggle("active", humanColor === BLACK);
            DOM.btnPlayerWhite.classList.toggle("active", humanColor === WHITE);
            startGame();
        });
    });
}

const fullscreenBtn = document.getElementById("fullscreenBtn");
const fsIcon = document.getElementById("fsIcon"), fsText = document.getElementById("fsText");

function updateFullscreenUI() {
    const isFS = !!(document.fullscreenElement || document.webkitFullscreenElement);
    if (fsIcon) fsIcon.textContent = isFS ? "🗗" : "⛶";
    if (fsText) fsText.textContent = isFS ? "標準" : "全画面";
}

if (fullscreenBtn) {
    fullscreenBtn.addEventListener("click", () => {
        if (!document.fullscreenElement && !document.webkitFullscreenElement) {
            const el = document.documentElement;
            if (el.requestFullscreen) el.requestFullscreen();
            else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
        } else {
            if (document.exitFullscreen) document.exitFullscreen();
            else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
        }
    });
}

document.addEventListener("fullscreenchange", updateFullscreenUI);
document.addEventListener("webkitfullscreenchange", updateFullscreenUI);

const soundToggleBtn = document.getElementById("soundToggleBtn");
const soundIcon = document.getElementById("soundIcon"), soundText = document.getElementById("soundText");

if (soundToggleBtn) {
    soundToggleBtn.addEventListener("click", () => {
        isMuted = !isMuted;
        if (isMuted) {
            if (bgm) bgm.pause();
            if (soundIcon) soundIcon.textContent = "🔇";
            if (soundText) soundText.textContent = "OFF";
        } else {
            if (bgm && !document.hidden) bgm.play().catch(() => {});
            if (soundIcon) soundIcon.textContent = "🔔";
            if (soundText) soundText.textContent = "ON";
        }
    });
}

if (DOM.hintMode) DOM.hintMode.addEventListener("change", updateHintModeUI);

if (DOM.archiveOpenBtn) DOM.archiveOpenBtn.addEventListener("click", openArchiveModal);
if (DOM.btnResultArchive) {
    DOM.btnResultArchive.addEventListener("click", () => {
        if (DOM.royalResultModal) DOM.royalResultModal.classList.remove("show");
        document.body.classList.remove("modal-open-lock");
        openArchiveModal();
    });
}
if (DOM.archiveCloseButton) DOM.archiveCloseButton.addEventListener("click", closeArchiveModal);
if (DOM.archiveOverlay) {
    DOM.archiveOverlay.addEventListener("click", (e) => {
        if (e.target === DOM.archiveOverlay) closeArchiveModal();
    });
}
if (DOM.archFilterOpponent) DOM.archFilterOpponent.addEventListener("change", renderArchiveView);
if (DOM.archFilterMode) DOM.archFilterMode.addEventListener("change", renderArchiveView);
if (DOM.archFilterResult) DOM.archFilterResult.addEventListener("change", renderArchiveView);
if (DOM.archSortOrder) DOM.archSortOrder.addEventListener("change", renderArchiveView);
if (DOM.btnArchiveClear) DOM.btnArchiveClear.addEventListener("click", clearArchiveLogs);

function setupModal(openBtnId, overlayId, closeBtnId) {
    const openBtn = document.getElementById(openBtnId);
    const overlay = document.getElementById(overlayId);
    const closeBtn = document.getElementById(closeBtnId);
    if (openBtn && overlay && closeBtn) {
        openBtn.addEventListener("click", () => {
            if (overlayId === "guideOverlay") renderGuideModalContents();
            overlay.classList.add("show");
            document.body.classList.add("modal-open-lock");
        });
        closeBtn.addEventListener("click", () => {
            overlay.classList.remove("show");
            document.body.classList.remove("modal-open-lock");
        });
        overlay.addEventListener("click", (e) => {
            if (e.target === overlay) {
                overlay.classList.remove("show");
                document.body.classList.remove("modal-open-lock");
            }
        });
    }
}

setupModal("guideButton", "guideOverlay", "guideCloseButton");
setupModal("versionBadge", "versionOverlay", "versionCloseButton");

const manualTabBtns = document.querySelectorAll(".manual-tab-btn");
const manualTabContents = document.querySelectorAll(".manual-tab-content");
manualTabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
        manualTabBtns.forEach(b => b.classList.remove("active"));
        manualTabContents.forEach(c => c.classList.remove("active"));
        btn.classList.add("active");
        const target = document.getElementById(btn.dataset.tab);
        if (target) target.classList.add("active");
    });
});

document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        document.querySelectorAll(".dynasty-overlay.show, .royal-result-modal.show")
            .forEach(m => m.classList.remove("show"));
        document.body.classList.remove("modal-open-lock");
        closeTermPopup();
        if (isDrillMode) exitDrillMode();
        if (isLectureMode) exitLectureMode();
    }
});

/* 初期化実行 */
renderSystemVersionInfo();
initCoordLabels();
if (DOM.characterSelect) {
    DOM.characterSelect.value = determineInitialCharacterLevel();
}
startGame();


