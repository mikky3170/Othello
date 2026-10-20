
/* ==========================================================================
  【オセロプログラム メインロジックモジュール】
  ファイル名: othello_ai_sensei_js.js
  バージョン: Ver 8.7.1 (2025/05/20)
  
  [Ver 8.7.1] 2025/05/20 更新内容:
  - 【最善手vs悪手 本質教育＆極端コントラスト局面完全同期エディション】
  - 講義「lec-3」の新局面（悪手F5で相手7箇所へ爆発 / 最善手C5で相手1箇所へ封殺）に完全同期。
  - 講義コマ送り時の解説自動スムーズスクロール処理を実装し、視線移動の迷いをゼロ化。
  - 検定不正解時に「もう一度やり直す ↺」ボタンをパルス強調し、学習意欲を途切れさせない導線を確立。
========================================================================== */

/* ==========================================================================
  【定数およびグローバル状態変数】
========================================================================== */
const STORAGE_KEY_ARCHIVES = "othello_dynasty_archives_v2";

let board = [];
let currentPlayer = BLACK;
let humanColor = BLACK;
let cpuColor = WHITE;
let gameOver = false;
let isBusy = false;

let moveHistory = [];
let gameStepLogs = [];
let playerMoveLogs = [];
let mainGameSnapshot = null;

let playerSeconds = 0;
let cpuSeconds = 0;
let timerInterval = null;

let currentHintCoord = null;
let currentHintExplanation = "";
let cachedMoveEvaluations = null;
let isPrefetching = false;
let isPrefetchAborted = false;
let usedHintInGame = false;
let minPlayerWinrateInGame = 50;

let tacticsWorstIndex = -1;
let tacticsWorstAlternative = null;
let tacticsTurningPointIndex = -1;
let reviewStepIndex = 0;

let isReviewMode = false;
let isDrillMode = false;
let isLectureMode = false;
let isSimulatingDrillMistake = false;

let currentLectureId = null;
let currentLectureStepIndex = 0;
let currentDrillQuestionIndex = 1;
const drillPassedMap = {};

let isMuted = false;
let audioCtx = null;
let bgm = null;
let typeWriterInterval = null;

/* ==========================================================================
  【DOM要素参照マップ】
========================================================================== */
const DOM = {
    board: document.getElementById("board"),
    boardChassis: document.getElementById("boardChassis"),
    status: document.getElementById("status"),
    speechText: document.getElementById("speechText"),
    opponentSpeech: document.getElementById("opponentSpeech"),
    opponentAvatarFrame: document.getElementById("opponentAvatarFrame"),
    opponentAvatarWrap: document.getElementById("opponentAvatarWrap"),
    avatarImgBox: document.getElementById("avatarImgBox"),
    opponentName: document.getElementById("opponentName"),
    opponentTitle: document.getElementById("opponentTitle"),
    opponentRankBadge: document.getElementById("opponentRankBadge"),
    opponentThinkingBadge: document.getElementById("opponentThinkingBadge"),
    badgeSalonName: document.getElementById("badgeSalonName"),
    badgeMaterial: document.getElementById("badgeMaterial"),
    playerScore: document.getElementById("playerScore"),
    opponentScore: document.getElementById("opponentScore"),
    playerTime: document.getElementById("playerTime"),
    opponentTime: document.getElementById("opponentTime"),
    playerPieceIcon: document.getElementById("playerPieceIcon"),
    opponentPieceIcon: document.getElementById("opponentPieceIcon"),
    characterSelect: document.getElementById("characterSelect"),
    hintMode: document.getElementById("hintMode"),
    btnPlayerBlack: document.getElementById("btnPlayerBlack"),
    btnPlayerWhite: document.getElementById("btnPlayerWhite"),
    undoButton: document.getElementById("undoButton"),
    restartButton: document.getElementById("restartButton"),
    hintButton: document.getElementById("hintButton"),
    guideButton: document.getElementById("guideButton"),
    btnOpenDrillMain: document.getElementById("btnOpenDrillMain"),
    hintFixedDisplay: document.getElementById("hintFixedDisplay"),
    hintBadgeTag: document.getElementById("hintBadgeTag"),
    hintCoordText: document.getElementById("hintCoordText"),
    hintBodyText: document.getElementById("hintBodyText"),
    battleGaugeContainer: document.getElementById("battleGaugeContainer"),
    battleStatPlayerText: document.getElementById("battleStatPlayerText"),
    battleStatOpponentText: document.getElementById("battleStatOpponentText"),
    battleSituationBadge: document.getElementById("battleSituationBadge"),
    battlePowerPlayer: document.getElementById("battlePowerPlayer"),
    battlePowerOpponent: document.getElementById("battlePowerOpponent"),
    battleClashSpark: document.getElementById("battleClashSpark"),
    battlePiecePlayer: document.getElementById("battlePiecePlayer"),
    battlePieceOpponent: document.getElementById("battlePieceOpponent"),
    moveToast: document.getElementById("moveToast"),
    stageCurtainBanner: document.getElementById("stageCurtainBanner"),
    curtainStageLabel: document.getElementById("curtainStageLabel"),
    curtainSalonTitle: document.getElementById("curtainSalonTitle"),
    curtainRelicSub: document.getElementById("curtainRelicSub"),

    /* モード共通固定カード群 */
    normalControlCard: document.getElementById("normalControlCard"),
    reviewModePanel: document.getElementById("reviewModePanel"),
    lectureControlCard: document.getElementById("lectureControlCard"),
    drillControlCard: document.getElementById("drillControlCard"),

    /* 検討モード用 */
    reviewTurnInfo: document.getElementById("reviewTurnInfo"),
    reviewContextBox: document.getElementById("reviewContextBox"),
    btnReviewPrev: document.getElementById("btnReviewPrev"),
    btnReviewNext: document.getElementById("btnReviewNext"),
    btnJumpGood: document.getElementById("btnJumpGood"),
    btnJumpBad: document.getElementById("btnJumpBad"),
    btnReviewExit: document.getElementById("btnReviewExit"),
    btnStartReview: document.getElementById("btnStartReview"),

    /* 講義モード用 */
    lectureTopicBadge: document.getElementById("lectureTopicBadge"),
    lectureStepIndicator: document.getElementById("lectureStepIndicator"),
    lectureTitleText: document.getElementById("lectureTitleText"),
    lectureDescText: document.getElementById("lectureDescText"),
    lectureExplainBox: document.getElementById("lectureExplainBox"),
    btnLecturePrev: document.getElementById("btnLecturePrev"),
    btnLectureNext: document.getElementById("btnLectureNext"),
    btnLectureReset: document.getElementById("btnLectureReset"),
    btnLectureToDrill: document.getElementById("btnLectureToDrill"),
    btnLectureExit: document.getElementById("btnLectureExit"),

    /* 検定モード用 */
    drillCourseModal: document.getElementById("drillCourseModal"),
    drillCourseList: document.getElementById("drillCourseList"),
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
    drillCertificateModal: document.getElementById("drillCertificateModal"),

    /* 会見モーダル */
    royalResultModal: document.getElementById("royalResultModal"),
    resultMainTitle: document.getElementById("resultMainTitle"),
    resultAvatarFrame: document.getElementById("resultAvatarFrame"),
    resultCharNameBadge: document.getElementById("resultCharNameBadge"),
    opponentStatusTag: document.getElementById("opponentStatusTag"),
    resultQuoteBox: document.getElementById("resultQuoteBox"),
    resultStonesDetail: document.getElementById("resultStonesDetail"),
    resultTimesDetail: document.getElementById("resultTimesDetail"),
    carteStoryTimeline: document.getElementById("carteStoryTimeline"),
    carteHintAdvice: document.getElementById("carteHintAdvice"),
    btnResultAdvance: document.getElementById("btnResultAdvance"),
    btnAdvanceIcon: document.getElementById("btnAdvanceIcon"),
    btnAdvanceText: document.getElementById("btnAdvanceText"),
    btnResultArchive: document.getElementById("btnResultArchive"),

    /* 豪傑人物伝 */
    charProfileModal: document.getElementById("charProfileModal"),
    profileCharNameHeader: document.getElementById("profileCharNameHeader"),
    profileAvatarBox: document.getElementById("profileAvatarBox"),
    profileTitleBadge: document.getElementById("profileTitleBadge"),
    profileSalonBadge: document.getElementById("profileSalonBadge"),
    profileMaterialBadge: document.getElementById("profileMaterialBadge"),
    profileBioText: document.getElementById("profileBioText"),
    profileTacticsText: document.getElementById("profileTacticsText"),

    /* 思案所モーダル */
    guideOverlay: document.getElementById("guideOverlay"),
    opsGuideContainer: document.getElementById("opsGuideContainer"),
    strategyPhasesContainer: document.getElementById("strategyPhasesContainer"),
    strategyRoadmapContainer: document.getElementById("strategyRoadmapContainer"),
    charGalleryList: document.getElementById("charGalleryList"),

    /* 用語ポップアップ */
    termPopup: document.getElementById("termPopup"),
    termPopupTitle: document.getElementById("termPopupTitle"),
    termPopupBody: document.getElementById("termPopupBody"),
    termPopupClose: document.getElementById("termPopupClose"),
    termPopupDrillBtn: document.getElementById("termPopupDrillBtn"),
    termPopupMore: document.getElementById("termPopupMore"),

    /* 戦績録 */
    archiveOverlay: document.getElementById("archiveOverlay"),
    archiveCloseButton: document.getElementById("archiveCloseButton"),
    archiveOpenBtn: document.getElementById("archiveOpenBtn"),
    archiveTableBody: document.getElementById("archiveTableBody"),
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

    /* 戴冠式 */
    endingModal: document.getElementById("endingModal"),
    btnRestartFromBeginning: document.getElementById("btnRestartFromBeginning"),

    /* 年代記 */
    chronicleTimeline: document.getElementById("chronicleTimeline"),
    versionBadge: document.getElementById("versionBadge")
};

/* ==========================================================================
  【音響エンジン】
========================================================================== */
function initAudio() {
    if (!audioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) audioCtx = new AudioContext();
    }
    if (audioCtx && audioCtx.state === "suspended") {
        audioCtx.resume();
    }
    if (!bgm) {
        bgm = document.getElementById("bgmAudio");
        if (bgm) bgm.volume = 0.22;
    }
    if (bgm && !isMuted && bgm.paused) {
        bgm.play().catch(() => {});
    }
}

function playTone(freq, type, duration, gainLevel = 0.1) {
    if (isMuted) return;
    initAudio();
    if (!audioCtx) return;
    try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gain.gain.setValueAtTime(gainLevel, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    } catch (e) {}
}

function playPlaceSound() { playTone(440, "sine", 0.08, 0.15); }
function playFanfareSound() {
    playTone(523.25, "triangle", 0.15, 0.2);
    setTimeout(() => playTone(659.25, "triangle", 0.18, 0.2), 120);
    setTimeout(() => playTone(783.99, "triangle", 0.35, 0.25), 260);
}
function playBuzzerSound() {
    playTone(180, "sawtooth", 0.2, 0.18);
    setTimeout(() => playTone(140, "sawtooth", 0.28, 0.2), 160);
}

/* ==========================================================================
  【ユーティリティ関数】
========================================================================== */
const sleep = ms => new Promise(res => setTimeout(res, ms));
const opposite = color => (color === BLACK ? WHITE : BLACK);
const cloneBoard = b => b.map(row => row.slice());

function toNotation(r, c) {
    const cols = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    return `${cols[c]}${r + 1}`;
}

function formatMinSec(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function getCurrentCharacter() {
    const charId = DOM.characterSelect ? Number(DOM.characterSelect.value) : 1;
    return (typeof CHARACTERS !== "undefined" && CHARACTERS[charId]) ? CHARACTERS[charId] : {
        id: 1, name: "ピエロ", rankLabel: "入門", salonName: "酒場",
        materialDesc: "木目", boardDesc: "木製", themeColor: "#e63946", themeGlow: "rgba(230,57,70,0.6)"
    };
}

function getBoardCell(r, c) {
    return DOM.board ? DOM.board.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`) : null;
}

/* ==========================================================================
  【盤面座標ラベル & バージョン年代記初期化】
========================================================================== */
function initCoordLabels() {
    if (!DOM.boardChassis) return;
    DOM.boardChassis.querySelectorAll(".coord-label").forEach(el => el.remove());

    const cols = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    for (let c = 0; c < 8; c++) {
        const topLbl = document.createElement("div");
        topLbl.className = "coord-label";
        topLbl.textContent = cols[c];
        topLbl.style.top = "2px";
        topLbl.style.left = `calc(var(--frame-pad) + (${c} + 0.5) * (100% - var(--frame-pad)*2) / 8)`;
        topLbl.style.transform = "translateX(-50%)";
        DOM.boardChassis.appendChild(topLbl);
    }
    for (let r = 0; r < 8; r++) {
        const leftLbl = document.createElement("div");
        leftLbl.className = "coord-label";
        leftLbl.textContent = `${r + 1}`;
        leftLbl.style.left = "2px";
        leftLbl.style.top = `calc(var(--frame-pad) + (${r} + 0.5) * (100% - var(--frame-pad)*2) / 8)`;
        leftLbl.style.transform = "translateY(-50%)";
        DOM.boardChassis.appendChild(leftLbl);
    }
}

function renderSystemVersionInfo() {
    if (typeof SYSTEM_VERSION_INFO === "undefined") return;
    if (DOM.versionBadge) DOM.versionBadge.textContent = SYSTEM_VERSION_INFO.version;
    if (DOM.chronicleTimeline) {
        DOM.chronicleTimeline.innerHTML = SYSTEM_VERSION_INFO.history.map(item => `
            <div class="chronicle-item">
                <div><span class="chronicle-version">${item.ver}</span><span class="chronicle-date">（${item.date}）</span></div>
                <div class="chronicle-desc">${item.desc}</div>
            </div>
        `).join("");
    }
}

/* ==========================================================================
  【オセロ基本ルール判定エンジン】
========================================================================== */
const DIRECTIONS = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],           [0, 1],
    [1, -1],  [1, 0],  [1, 1]
];

function canPlace(r, c, color, targetBoard = board) {
    if (targetBoard[r][c] !== 0) return false;
    const opp = opposite(color);

    for (const [dr, dc] of DIRECTIONS) {
        let nr = r + dr;
        let nc = c + dc;
        let foundOpp = false;

        while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && targetBoard[nr][nc] === opp) {
            foundOpp = true;
            nr += dr;
            nc += dc;
        }

        if (foundOpp && nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && targetBoard[nr][nc] === color) {
            return true;
        }
    }
    return false;
}

function getValidMoves(color, targetBoard = board) {
    const moves = [];
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (canPlace(r, c, color, targetBoard)) moves.push([r, c]);
        }
    }
    return moves;
}

function getFlipsForMove(r, c, color, targetBoard = board) {
    const flips = [];
    if (targetBoard[r][c] !== 0) return flips;
    const opp = opposite(color);

    for (const [dr, dc] of DIRECTIONS) {
        let nr = r + dr;
        let nc = c + dc;
        const potential = [];

        while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && targetBoard[nr][nc] === opp) {
            potential.push([nr, nc]);
            nr += dr;
            nc += dc;
        }

        if (potential.length > 0 && nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && targetBoard[nr][nc] === color) {
            flips.push(...potential);
        }
    }
    return flips;
}

function makeMove(targetBoard, r, c, color) {
    const flips = getFlipsForMove(r, c, color, targetBoard);
    if (flips.length === 0) return [];
    targetBoard[r][c] = color;
    for (const [fr, fc] of flips) {
        targetBoard[fr][fc] = color;
    }
    return flips;
}

function getBoardStats(targetBoard = board) {
    let black = 0, white = 0, empty = 0;
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (targetBoard[r][c] === BLACK) black++;
            else if (targetBoard[r][c] === WHITE) white++;
            else empty++;
        }
    }
    return { black, white, empty };
}

/* 開放度（返した石の周囲の空きマス数）の計算 */
function countFrontierOpenness(flips, targetBoard) {
    let openness = 0;
    const visited = new Set();
    for (const [r, c] of flips) {
        for (const [dr, dc] of DIRECTIONS) {
            const nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && targetBoard[nr][nc] === 0) {
                const k = `${nr},${nc}`;
                if (!visited.has(k)) {
                    visited.add(k);
                    openness++;
                }
            }
        }
    }
    return openness;
}

/* 厳密な中割り判定（めくった石がすべて既存石に囲まれているか） */
function isStrictNakawari(flips, targetBoard) {
    if (!flips || flips.length === 0) return false;
    for (const [fr, fc] of flips) {
        for (const [dr, dc] of DIRECTIONS) {
            const nr = fr + dr, nc = fc + dc;
            if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && targetBoard[nr][nc] === 0) {
                return false;
            }
        }
    }
    return true;
}

/* ==========================================================================
  【盤面描画・立体反転アニメーションエンジン】
========================================================================== */
function drawBoard() {
    if (!DOM.board) return;
    DOM.board.querySelectorAll(".cell").forEach(c => c.remove());

    const isHumanTurn = (currentPlayer === humanColor && !gameOver && !isBusy && !isDrillMode && !isLectureMode && !isReviewMode);
    const validMoves = (isDrillMode || isLectureMode || isReviewMode) ? [] : getValidMoves(currentPlayer, board);
    const lastMove = (moveHistory.length > 0) ? moveHistory[moveHistory.length - 1] : null;

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const cell = document.createElement("div");
            cell.className = "cell";
            cell.dataset.row = r;
            cell.dataset.col = c;

            const isCanPlace = validMoves.some(([vr, vc]) => vr === r && vc === c);
            if (isCanPlace && isHumanTurn) {
                cell.classList.add("can-place");
                cell.classList.add(humanColor === BLACK ? "preview-black" : "preview-white");
            }

            if (lastMove && lastMove.r === r && lastMove.c === c) {
                cell.classList.add("last-move-cell");
            }

            if (currentHintCoord && currentHintCoord[0] === r && currentHintCoord[1] === c && isHumanTurn) {
                cell.classList.add("hint-cell");
            }

            const val = board[r][c];
            if (val !== 0) {
                const stoneWrap = document.createElement("div");
                stoneWrap.className = "stone-wrapper";
                const stone = document.createElement("div");
                stone.className = `stone ${val === BLACK ? "black-stone" : "white-stone"}`;
                stoneWrap.appendChild(stone);
                cell.appendChild(stoneWrap);
            }

            cell.addEventListener("click", () => handleCellClick(r, c));
            DOM.board.appendChild(cell);
        }
    }

    updateUndoButtonState();
}

function animateMoveExecution(r, c, color, flips) {
    const placedCell = getBoardCell(r, c);
    if (placedCell) {
        placedCell.innerHTML = "";
        const stoneWrap = document.createElement("div");
        stoneWrap.className = "stone-wrapper stone-new";
        const stone = document.createElement("div");
        stone.className = `stone ${color === BLACK ? "black-stone" : "white-stone"}`;
        stoneWrap.appendChild(stone);
        placedCell.appendChild(stoneWrap);
    }

    const isPlayer = (color === humanColor);
    const flipClass = isPlayer ? "flip-player" : "flip-cpu";
    const frontClass = (color === BLACK) ? "white-stone" : "black-stone";
    const backClass = (color === BLACK) ? "black-stone" : "white-stone";

    flips.forEach(([fr, fc]) => {
        const cell = getBoardCell(fr, fc);
        if (!cell) return;
        cell.innerHTML = `
            <div class="stone-flip-wrapper">
                <div class="stone-flip-cylinder ${flipClass}">
                    <div class="stone-face stone-face-front stone ${frontClass}"></div>
                    <div class="stone-edge-rim"></div>
                    <div class="stone-face stone-face-back stone ${backClass}"></div>
                </div>
            </div>
        `;
    });
}

function showMoveToast(type, text) {
    if (!DOM.moveToast) return;
    DOM.moveToast.className = `move-toast toast-${type} show`;
    DOM.moveToast.textContent = text;
    setTimeout(() => {
        if (DOM.moveToast) DOM.moveToast.classList.remove("show");
    }, 1100);
}

/* ==========================================================================
  【UI・ステータス・天秤ゲージ更新】
========================================================================== */
function setStatus(type, text) {
    if (!DOM.status) return;
    DOM.status.className = `status-${type}`;
    DOM.status.textContent = text;
}

function updateScore(targetBoard = board) {
    const stats = getBoardStats(targetBoard);
    const pScore = (humanColor === BLACK) ? stats.black : stats.white;
    const oppScore = (humanColor === BLACK) ? stats.white : stats.black;

    if (DOM.playerScore) DOM.playerScore.textContent = pScore;
    if (DOM.opponentScore) DOM.opponentScore.textContent = oppScore;
}

function updateBalanceGauge(targetBoard = board) {
    if (!DOM.battleGaugeContainer) return;

    const stats = getBoardStats(targetBoard);
    const totalStones = stats.black + stats.white;
    const pStones = (humanColor === BLACK) ? stats.black : stats.white;
    const oppStones = (humanColor === BLACK) ? stats.white : stats.black;

    let pPercent = (totalStones > 0) ? Math.round((pStones / totalStones) * 100) : 50;
    pPercent = Math.max(10, Math.min(90, pPercent));
    const oppPercent = 100 - pPercent;

    if (DOM.battlePowerPlayer) DOM.battlePowerPlayer.style.width = `${pPercent}%`;
    if (DOM.battleClashSpark) DOM.battleClashSpark.style.left = `${pPercent}%`;

    const char = getCurrentCharacter();
    const charName = char.name ? char.name.split(" ")[0] : "相手";

    if (DOM.battleStatPlayerText) DOM.battleStatPlayerText.textContent = `あなた ${pPercent}%`;
    if (DOM.battleStatOpponentText) DOM.battleStatOpponentText.textContent = `${oppPercent}% ${charName}`;

    let badgeText = "⚖️ 運命の天秤：互角";
    if (pPercent >= 68) badgeText = "👑 運命の天秤：圧倒的優勢！";
    else if (pPercent >= 56) badgeText = "⚜️ 運命の天秤：リード！";
    else if (pPercent <= 32) badgeText = "🥀 運命の天秤：危機的劣勢…";
    else if (pPercent <= 44) badgeText = "⚠️ 運命の天秤：追う展開";

    if (DOM.battleSituationBadge) DOM.battleSituationBadge.textContent = badgeText;
}

function updateOpponentStageUI(showBanner = false) {
    const char = getCurrentCharacter();
    const charId = char.id || 1;

    document.body.className = `stage-theme-${charId}`;

    if (DOM.opponentName) DOM.opponentName.textContent = char.name;
    if (DOM.opponentTitle) DOM.opponentTitle.textContent = char.rankLabel;
    if (DOM.opponentRankBadge) DOM.opponentRankBadge.textContent = `Lv.${charId}`;
    if (DOM.badgeSalonName) DOM.badgeSalonName.textContent = char.salonName;
    if (DOM.badgeMaterial) DOM.badgeMaterial.textContent = char.materialDesc;

    if (DOM.avatarImgBox) {
        DOM.avatarImgBox.innerHTML = "";
        const img = new Image();
        img.src = char.image;
        img.alt = char.name;
        img.style.objectPosition = char.imgFocus || "center 20%";
        img.onload = () => {
            if (DOM.avatarImgBox) {
                DOM.avatarImgBox.innerHTML = "";
                DOM.avatarImgBox.appendChild(img);
            }
        };
        img.onerror = () => {
            if (DOM.avatarImgBox) DOM.avatarImgBox.innerHTML = `<span class="avatar-fallback-icon">${char.icon}</span>`;
        };
    }

    if (DOM.battleGaugeContainer) {
        DOM.battleGaugeContainer.className = (humanColor === BLACK)
            ? "battle-gauge-container gauge-player-black"
            : "battle-gauge-container gauge-player-white";
    }

    if (DOM.playerPieceIcon) DOM.playerPieceIcon.className = `mini-piece-stone piece-${humanColor === BLACK ? 'black' : 'white'}`;
    if (DOM.opponentPieceIcon) DOM.opponentPieceIcon.className = `mini-piece-stone piece-${cpuColor === BLACK ? 'black' : 'white'}`;
    if (DOM.battlePiecePlayer) DOM.battlePiecePlayer.className = `mini-piece-stone piece-${humanColor === BLACK ? 'black' : 'white'}`;
    if (DOM.battlePieceOpponent) DOM.battlePieceOpponent.className = `mini-piece-stone piece-${cpuColor === BLACK ? 'black' : 'white'}`;

    if (showBanner && DOM.stageCurtainBanner) {
        if (DOM.curtainStageLabel) DOM.curtainStageLabel.textContent = `STAGE ${charId}`;
        if (DOM.curtainSalonTitle) DOM.curtainSalonTitle.textContent = `${char.salonName}（${char.name}）`;
        if (DOM.curtainRelicSub) DOM.curtainRelicSub.textContent = `盤面：${char.boardDesc} / 石：${char.materialDesc}`;
        DOM.stageCurtainBanner.classList.add("show");
        setTimeout(() => {
            if (DOM.stageCurtainBanner) DOM.stageCurtainBanner.classList.remove("show");
        }, 1800);
    }
}

function setOpponentQuote(quoteType) {
    const char = getCurrentCharacter();
    if (!char.quotes || !char.quotes[quoteType]) return;

    const list = char.quotes[quoteType];
    const text = Array.isArray(list) ? list[Math.floor(Math.random() * list.length)] : list;

    if (DOM.speechText) {
        if (typeWriterInterval) clearInterval(typeWriterInterval);
        DOM.speechText.textContent = "";
        let i = 0;
        typeWriterInterval = setInterval(() => {
            if (i < text.length) {
                DOM.speechText.textContent += text.charAt(i);
                i++;
            } else {
                clearInterval(typeWriterInterval);
            }
        }, 25);
    }

    if (DOM.opponentSpeech) {
        DOM.opponentSpeech.classList.remove("is-speaking");
        void DOM.opponentSpeech.offsetWidth;
        DOM.opponentSpeech.classList.add("is-speaking");
    }
}

function updateHintModeUI() {
    if (!DOM.hintMode || !DOM.hintFixedDisplay) return;
    const mode = DOM.hintMode.value;

    if (mode === "off") {
        DOM.hintFixedDisplay.classList.add("hint-mode-sealed");
        if (DOM.hintBadgeTag) DOM.hintBadgeTag.textContent = "⚔️【完全自力・真剣勝負】";
        if (DOM.hintCoordText) DOM.hintCoordText.textContent = "封印中";
        if (DOM.hintBodyText) DOM.hintBodyText.innerHTML = `<span style="color:#d4a748;">指南は封印されています。己の知謀のみで勝利を掴み取ってください。</span>`;
        if (DOM.hintButton) DOM.hintButton.disabled = true;
    } else {
        DOM.hintFixedDisplay.classList.remove("hint-mode-sealed");
        if (DOM.hintBadgeTag) DOM.hintBadgeTag.textContent = "💡【宮廷AI指南・最善手】";
        if (DOM.hintCoordText) DOM.hintCoordText.textContent = "--";
        if (DOM.hintBodyText) DOM.hintBodyText.innerHTML = `<div class="hint-placeholder-text">「ヒント」ボタンを押すと最善手と思案理由が表示されます</div>`;
        if (DOM.hintButton) DOM.hintButton.disabled = false;
    }
}

function clearHint() {
    currentHintCoord = null;
    currentHintExplanation = "";
    if (DOM.board) DOM.board.querySelectorAll(".hint-cell").forEach(c => c.classList.remove("hint-cell"));
    if (DOM.hintCoordText && DOM.hintMode && DOM.hintMode.value !== "off") DOM.hintCoordText.textContent = "--";
    if (DOM.hintBodyText && DOM.hintMode && DOM.hintMode.value !== "off") {
        DOM.hintBodyText.innerHTML = `<div class="hint-placeholder-text">「ヒント」ボタンを押すと最善手と思案理由が表示されます</div>`;
    }
}

/* ==========================================================================
  【オセロ思考エンジン ＆ 評価関数】
========================================================================== */
const POSITIONAL_WEIGHTS = [
    [ 120, -25,  20,   5,   5,  20, -25, 120],
    [ -25, -50,  -5,  -5,  -5,  -5, -50, -25],
    [  20,  -5,  15,   3,   3,  15,  -5,  20],
    [   5,  -5,   3,   3,   3,   3,  -5,   5],
    [   5,  -5,   3,   3,   3,   3,  -5,   5],
    [  20,  -5,  15,   3,   3,  15,  -5,  20],
    [ -25, -50,  -5,  -5,  -5,  -5, -50, -25],
    [ 120, -25,  20,   5,   5,  20, -25, 120]
];

function evaluateBoard(targetBoard, color) {
    const opp = opposite(color);
    let myPos = 0, oppPos = 0;
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (targetBoard[r][c] === color) myPos += POSITIONAL_WEIGHTS[r][c];
            else if (targetBoard[r][c] === opp) oppPos += POSITIONAL_WEIGHTS[r][c];
        }
    }

    const myMoves = getValidMoves(color, targetBoard).length;
    const oppMoves = getValidMoves(opp, targetBoard).length;
    let mobility = 0;
    if (myMoves + oppMoves > 0) {
        mobility = Math.round(100 * (myMoves - oppMoves) / (myMoves + oppMoves));
    }

    return (myPos - oppPos) + (mobility * 10);
}

function solveExactEndgame(targetBoard, color, alpha, beta) {
    const opp = opposite(color);
    const myMoves = getValidMoves(color, targetBoard);

    if (myMoves.length === 0) {
        const oppMoves = getValidMoves(opp, targetBoard);
        if (oppMoves.length === 0) {
            const stats = getBoardStats(targetBoard);
            const myStones = (color === BLACK) ? stats.black : stats.white;
            const oppStones = (color === BLACK) ? stats.white : stats.black;
            return myStones - oppStones;
        }
        return -solveExactEndgame(targetBoard, opp, -beta, -alpha);
    }

    let maxScore = -999;
    for (const [r, c] of myMoves) {
        const nextBoard = cloneBoard(targetBoard);
        makeMove(nextBoard, r, c, color);
        const score = -solveExactEndgame(nextBoard, opp, -beta, -alpha);
        if (score > maxScore) maxScore = score;
        if (maxScore > alpha) alpha = maxScore;
        if (alpha >= beta) break;
    }
    return maxScore;
}

function minimaxAlphaBeta(targetBoard, depth, color, alpha, beta) {
    const opp = opposite(color);
    const moves = getValidMoves(color, targetBoard);

    if (moves.length === 0) {
        const oppMoves = getValidMoves(opp, targetBoard);
        if (oppMoves.length === 0) {
            const stats = getBoardStats(targetBoard);
            const myStones = (color === BLACK) ? stats.black : stats.white;
            const oppStones = (color === BLACK) ? stats.white : stats.black;
            return (myStones - oppStones) * 1000;
        }
        return -minimaxAlphaBeta(targetBoard, depth - 1, opp, -beta, -alpha);
    }

    if (depth <= 0) return evaluateBoard(targetBoard, color);

    let bestVal = -999999;
    for (const [r, c] of moves) {
        const nextBoard = cloneBoard(targetBoard);
        makeMove(nextBoard, r, c, color);
        const val = -minimaxAlphaBeta(nextBoard, depth - 1, opp, -beta, -alpha);
        if (val > bestVal) bestVal = val;
        if (bestVal > alpha) alpha = bestVal;
        if (alpha >= beta) break;
    }
    return bestVal;
}

function findBookMove(history, color) {
    if (typeof OPENING_BOOK === "undefined") return null;
    const key = history.map(m => toNotation(m.r, m.c)).join("-");
    const bookEntries = OPENING_BOOK[key];
    if (bookEntries && bookEntries.length > 0) {
        const valid = bookEntries.filter(e => canPlace(e.move[0], e.move[1], color, board));
        if (valid.length > 0) {
            return valid[Math.floor(Math.random() * valid.length)];
        }
    }
    return null;
}

/* ==========================================================================
  【ヒント・思案理由生成エンジン】
========================================================================== */
function evaluatePlayerCandidateMoves() {
    const validMoves = getValidMoves(humanColor, board);
    if (validMoves.length === 0) return [];

    const stats = getBoardStats(board);
    const opp = opposite(humanColor);
    const oppMovesBefore = getValidMoves(opp, board).length;
    const historyNotation = moveHistory.map(m => toNotation(m.r, m.c)).join("-");
    const bookOptions = (typeof OPENING_BOOK !== "undefined") ? OPENING_BOOK[historyNotation] : null;

    const evaluated = validMoves.map(([r, c]) => {
        const simBoard = cloneBoard(board);
        const flips = makeMove(simBoard, r, c, humanColor);
        const oppMovesAfter = getValidMoves(opp, simBoard).length;
        const myNextMoves = getValidMoves(humanColor, simBoard).length;
        const openness = countFrontierOpenness(flips, board);
        const isNakawari = isStrictNakawari(flips, board);

        const isCorner = (r === 0 || r === 7) && (c === 0 || c === 7);
        const isX = (r === 1 || r === 6) && (c === 1 || c === 6) &&
                    ((r === 1 && c === 1 && board[0][0] === 0) ||
                     (r === 1 && c === 6 && board[0][7] === 0) ||
                     (r === 6 && c === 1 && board[7][0] === 0) ||
                     (r === 6 && c === 6 && board[7][7] === 0));

        let score = minimaxAlphaBeta(simBoard, 3, humanColor, -99999, 99999);
        if (isCorner) score += 4000;
        if (isX) score -= 5000;
        if (isNakawari) score += 1200;
        score -= (openness * 120);

        let bookMatch = null;
        if (bookOptions) {
            bookMatch = bookOptions.find(b => b.move[0] === r && b.move[1] === c);
        }

        return {
            r, c,
            coord: toNotation(r, c),
            flipsCount: flips.length,
            score,
            oppMovesBefore,
            oppMovesAfter,
            mobilityDelta: (oppMovesAfter - oppMovesBefore),
            myNextMoves,
            openness,
            isNakawari,
            isCorner,
            isX,
            bookMatch
        };
    });

    evaluated.sort((a, b) => b.score - a.score);
    return evaluated;
}

function constructExplanation(candidate) {
    if (candidate.bookMatch) {
        return `📖 定石【${candidate.bookMatch.name}】：序盤の基本形に沿い、相手に無駄な足場を与えず美しい中割りへ移行する最善手です。`;
    }
    if (candidate.isCorner) {
        return `👑 四隅奪取：絶対に裏返らない【確定石】を確保し、盤面の主導権を完全に手中に収める決定打です。`;
    }
    if (candidate.isNakawari) {
        return `🌱 至高の中割り：内側だけを抜き、相手の打てる場所を増やさずに自分の逃げ道（次手${candidate.myNextMoves}箇所）を広々確保します。`;
    }
    if (candidate.mobilityDelta <= 0) {
        return `📉 手数制限：相手の打てる場所を抑え込み（${candidate.oppMovesAfter}箇所）、相手を窮屈なマスへ自滅誘導します。`;
    }
    return `⚜️ 陣形保持：外周への露出を抑えつつ、中央の主導権を安全に維持する落ち着いた一手です。`;
}

function computeHint() {
    if (gameOver || isBusy || currentPlayer !== humanColor || isDrillMode || isLectureMode || isReviewMode) return;
    if (DOM.hintMode && DOM.hintMode.value === "off") return;

    playTone(587.33, "triangle", 0.12, 0.2);
    usedHintInGame = true;

    const candidates = evaluatePlayerCandidateMoves();
    if (candidates.length === 0) return;

    const best = candidates[0];
    currentHintCoord = [best.r, best.c];
    currentHintExplanation = constructExplanation(best);

    if (DOM.hintCoordText) DOM.hintCoordText.textContent = best.coord;
    if (DOM.hintBodyText) DOM.hintBodyText.textContent = currentHintExplanation;

    drawBoard();
}

/* ==========================================================================
  【対局進行・手番管理エンジン】
========================================================================== */
function recordBoardStepLog(r, c, color, contextNote = "") {
    gameStepLogs.push({
        stepIndex: gameStepLogs.length,
        move: (r !== null) ? [r, c] : null,
        player: color,
        board: cloneBoard(board),
        contextNote
    });
}

async function handleCellClick(r, c) {
    if (isDrillMode) {
        await handleDrillCellClick(r, c);
        return;
    }
    if (isLectureMode || isReviewMode || isBusy || gameOver) return;
    if (currentPlayer !== humanColor) return;
    if (!canPlace(r, c, humanColor, board)) return;

    initAudio();
    isBusy = true;

    const candidates = evaluatePlayerCandidateMoves();
    const bestMove = (candidates.length > 0) ? candidates[0] : null;
    const isObjectiveBest = bestMove && (bestMove.r === r && bestMove.c === c);
    const isCorner = (r === 0 || r === 7) && (c === 0 || c === 7);

    const chosenEval = candidates.find(m => m.r === r && m.c === c);
    let rating = "GOOD";
    if (isObjectiveBest) rating = "BEST";
    else if (chosenEval && chosenEval.mobilityDelta >= 3 && chosenEval.openness >= 3) rating = "BAD";

    const stats = getBoardStats(board);
    playerMoveLogs.push({
        stepIndex: gameStepLogs.length,
        coord: toNotation(r, c),
        r, c,
        flips: getFlipsForMove(r, c, humanColor, board).length,
        rating,
        isObjectiveBest,
        isCornerMove: isCorner,
        objectiveBest: bestMove ? [bestMove.r, bestMove.c] : null,
        oppMovesBefore: chosenEval ? chosenEval.oppMovesBefore : 0,
        oppMovesAfter: chosenEval ? chosenEval.oppMovesAfter : 0,
        mobilityDelta: chosenEval ? chosenEval.mobilityDelta : 0,
        emptyCount: stats.empty
    });

    playPlaceSound();
    const flips = makeMove(board, r, c, humanColor);
    moveHistory.push({ r, c, color: humanColor });
    animateMoveExecution(r, c, humanColor, flips);
    clearHint();

    const note = `あなた【${toNotation(r, c)}】に着手（${flips.length}枚反転）。評価：${rating}`;
    recordBoardStepLog(r, c, humanColor, note);

    updateScore();
    updateBalanceGauge();
    drawBoard();

    if (rating === "BEST") showMoveToast("best", "🌟 最善手（PERFECT）");
    else if (rating === "BAD") showMoveToast("bad", "⚠️ 悪手・壁形成");

    await sleep(480);
    isBusy = false;

    proceedNextTurn(opposite(humanColor));
}

async function proceedNextTurn(nextColor) {
    if (gameOver) return;
    const moves = getValidMoves(nextColor, board);

    if (moves.length > 0) {
        currentPlayer = nextColor;
        if (currentPlayer === humanColor) {
            setStatus("human-turn", `👑 あなたの番です（${humanColor === BLACK ? "黒" : "白"}）`);
            if (DOM.opponentAvatarFrame) DOM.opponentAvatarFrame.classList.remove("thinking-aura");
            if (DOM.opponentThinkingBadge) DOM.opponentThinkingBadge.classList.remove("show");

            if (DOM.hintMode && DOM.hintMode.value === "always") computeHint();
            drawBoard();
        } else {
            setStatus("cpu-turn", `⏱️ 相手が思案中...`);
            if (DOM.opponentAvatarFrame) DOM.opponentAvatarFrame.classList.add("thinking-aura");
            if (DOM.opponentThinkingBadge) DOM.opponentThinkingBadge.classList.add("show");
            drawBoard();
            await executeCpuTurn();
        }
    } else {
        const oppMoves = getValidMoves(opposite(nextColor), board);
        if (oppMoves.length === 0) {
            endGame();
            return;
        }

        const passColorName = (nextColor === humanColor) ? "あなた" : "相手";
        showMoveToast("pass", `💨 ${passColorName}はパス`);
        playTone(330, "sine", 0.25, 0.2);

        if (nextColor === humanColor) {
            setStatus("cpu-turn", "💨 あなたは打てる場所がないためパスです");
            setOpponentQuote("playerPass");
            recordBoardStepLog(null, null, humanColor, "あなたは置く場所がなくパスしました。");
            await sleep(900);
            proceedNextTurn(cpuColor);
        } else {
            setStatus("human-turn", "💨 相手は打てる場所がないためパスしました");
            setOpponentQuote("cpuPass");
            recordBoardStepLog(null, null, cpuColor, "相手は置く場所がなくパスしました。");
            await sleep(900);
            proceedNextTurn(humanColor);
        }
    }
}

/* ==========================================================================
  【AI思考着手エンジン】
========================================================================== */
async function executeCpuTurn() {
    isBusy = true;
    const char = getCurrentCharacter();
    const stats = getBoardStats(board);
    const validMoves = getValidMoves(cpuColor, board);

    if (validMoves.length === 0) {
        isBusy = false;
        proceedNextTurn(humanColor);
        return;
    }

    let chosenMove = null;
    if (moveHistory.length <= char.bookMaxPly) {
        const bookEntry = findBookMove(moveHistory, cpuColor);
        if (bookEntry) chosenMove = bookEntry.move;
    }

    if (!chosenMove && stats.empty <= char.exact && char.exact > 0) {
        let bestScore = -9999;
        for (const [r, c] of validMoves) {
            const nextB = cloneBoard(board);
            makeMove(nextB, r, c, cpuColor);
            const score = -solveExactEndgame(nextB, opposite(cpuColor), -9999, 9999);
            if (score > bestScore) {
                bestScore = score;
                chosenMove = [r, c];
            }
        }
    }

    if (!chosenMove) {
        let scoredMoves = validMoves.map(([r, c]) => {
            const nextB = cloneBoard(board);
            makeMove(nextB, r, c, cpuColor);
            const val = -minimaxAlphaBeta(nextB, char.depth, opposite(cpuColor), -99999, 99999);
            return { r, c, val };
        });

        scoredMoves.sort((a, b) => b.val - a.val);

        if (char.id <= 2 && Math.random() < 0.35) {
            chosenMove = validMoves[Math.floor(Math.random() * validMoves.length)];
        } else if (char.id <= 4 && Math.random() < 0.20 && scoredMoves.length > 1) {
            chosenMove = [scoredMoves[1].r, scoredMoves[1].c];
        } else {
            chosenMove = [scoredMoves[0].r, scoredMoves[0].c];
        }
    }

    const waitMs = char.thinkingBaseMs + Math.floor(Math.random() * 300);
    await sleep(waitMs);

    if (gameOver || currentPlayer !== cpuColor) {
        isBusy = false;
        return;
    }

    const [cr, cc] = chosenMove;
    playPlaceSound();
    const flips = makeMove(board, cr, cc, cpuColor);
    moveHistory.push({ r: cr, c: cc, color: cpuColor });
    animateMoveExecution(cr, cc, cpuColor, flips);

    const charLastName = char.name.split(" ")[0];
    const isCorner = (cr === 0 || cr === 7) && (cc === 0 || cc === 7);
    if (isCorner) setOpponentQuote("cpuCorner");

    const note = `相手（${charLastName}）【${toNotation(cr, cc)}】に着手（${flips.length}枚反転）。`;
    recordBoardStepLog(cr, cc, cpuColor, note);

    updateScore();
    updateBalanceGauge();
    drawBoard();

    await sleep(450);
    isBusy = false;

    proceedNextTurn(humanColor);
}

/* ==========================================================================
  【時を戻す「待った」（Undo）機能】
========================================================================== */
function updateUndoButtonState() {
    if (!DOM.undoButton) return;
    const canUndo = (moveHistory.length > 0 && !gameOver && !isBusy && !isDrillMode && !isLectureMode && !isReviewMode);
    DOM.undoButton.disabled = !canUndo;
    DOM.undoButton.style.opacity = canUndo ? "1" : "0.4";
}

function undoMove() {
    if (isBusy || gameOver || isDrillMode || isLectureMode || isReviewMode) return;
    if (moveHistory.length === 0) return;

    playPlaceSound();

    let stepsToRevert = 0;
    for (let i = moveHistory.length - 1; i >= 0; i--) {
        stepsToRevert++;
        if (moveHistory[i].color === humanColor) break;
    }

    moveHistory.splice(moveHistory.length - stepsToRevert, stepsToRevert);
    gameStepLogs.splice(gameStepLogs.length - stepsToRevert, stepsToRevert);
    if (playerMoveLogs.length > 0) playerMoveLogs.pop();

    board = Array.from({ length: 8 }, () => Array(8).fill(0));
    board[3][3] = WHITE; board[3][4] = BLACK;
    board[4][3] = BLACK; board[4][4] = WHITE;

    for (const m of moveHistory) {
        makeMove(board, m.r, m.c, m.color);
    }

    currentPlayer = humanColor;
    clearHint();
    updateScore();
    updateBalanceGauge();
    drawBoard();

    setStatus("human-turn", `⚜️ 待ったを実行しました。あなたの手番です（${humanColor === BLACK ? "黒" : "白"}）`);
    if (DOM.speechText) DOM.speechText.textContent = "ふむ、一手戻したな！ 別の変化をじっくり試してみるがよい！";
}

/* ==========================================================================
  【ゲーム開始・初期化】
========================================================================== */
function startGame() {
    board = Array.from({ length: 8 }, () => Array(8).fill(0));
    board[3][3] = WHITE; board[3][4] = BLACK;
    board[4][3] = BLACK; board[4][4] = WHITE;

    currentPlayer = BLACK;
    cpuColor = opposite(humanColor);
    gameOver = false;
    isBusy = false;

    moveHistory = [];
    gameStepLogs = [];
    playerMoveLogs = [];
    mainGameSnapshot = null;

    playerSeconds = 0;
    cpuSeconds = 0;
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(updateTimers, 1000);

    usedHintInGame = false;
    minPlayerWinrateInGame = 50;
    tacticsWorstIndex = -1;
    tacticsWorstAlternative = null;
    tacticsTurningPointIndex = -1;

    isReviewMode = false;
    isDrillMode = false;
    isLectureMode = false;

    recordBoardStepLog(null, null, BLACK, "【対局開始】盤面中央に初期配置の石が置かれました。");

    updateOpponentStageUI(true);
    updateHintModeUI();
    clearHint();
    clearMobilityMarkers();
    clearDrillBadges();

    updateScore();
    updateBalanceGauge();
    drawBoard();

    setOpponentQuote("start");

    if (currentPlayer === humanColor) {
        setStatus("human-turn", `👑 対局開始！ あなたの先手番です（黒）`);
    } else {
        setStatus("cpu-turn", `👑 対局開始！ 相手の先手番です（黒）`);
        setTimeout(() => executeCpuTurn(), 600);
    }
}

function updateTimers() {
    if (gameOver || isReviewMode || isDrillMode || isLectureMode) return;
    if (currentPlayer === humanColor) {
        playerSeconds++;
        if (DOM.playerTime) DOM.playerTime.textContent = `⏱️ ${formatMinSec(playerSeconds)}`;
    } else {
        cpuSeconds++;
        if (DOM.opponentTime) DOM.opponentTime.textContent = `⏱️ ${formatMinSec(cpuSeconds)}`;
    }
}

/* ==========================================================================
  【スナップショット＆メインゲーム対局復帰エンジン】
========================================================================== */
function saveMainGameSnapshotIfNotSaved() {
    if (mainGameSnapshot) return;
    mainGameSnapshot = {
        board: cloneBoard(board),
        currentPlayer,
        gameOver,
        isBusy: false,
        playerSeconds,
        cpuSeconds,
        statusType: (currentPlayer === humanColor) ? "human-turn" : "cpu-turn",
        statusText: DOM.status ? DOM.status.textContent : "",
        speechText: DOM.speechText ? DOM.speechText.textContent : ""
    };
}

function restoreMainGameState() {
    isReviewMode = false;
    isDrillMode = false;
    isLectureMode = false;
    isSimulatingDrillMistake = false;

    clearDrillBadges();
    clearMobilityMarkers();

    if (DOM.reviewModePanel) DOM.reviewModePanel.classList.remove("show");
    if (DOM.drillControlCard) DOM.drillControlCard.classList.remove("show");
    if (DOM.lectureControlCard) DOM.lectureControlCard.classList.remove("show");
    if (DOM.normalControlCard) DOM.normalControlCard.style.display = "flex";

    if (mainGameSnapshot) {
        board = cloneBoard(mainGameSnapshot.board);
        currentPlayer = mainGameSnapshot.currentPlayer;
        gameOver = mainGameSnapshot.gameOver;
        isBusy = mainGameSnapshot.isBusy;
        playerSeconds = mainGameSnapshot.playerSeconds;
        cpuSeconds = mainGameSnapshot.cpuSeconds;

        setStatus(mainGameSnapshot.statusType, mainGameSnapshot.statusText);
        if (DOM.speechText) DOM.speechText.textContent = mainGameSnapshot.speechText;
        mainGameSnapshot = null;
    }

    updateScore();
    updateBalanceGauge();
    drawBoard();
    updateUndoButtonState();
}

/* ==========================================================================
  【豪傑人物伝モーダル】
========================================================================== */
function openCharProfileModal() {
    const char = getCurrentCharacter();
    if (DOM.profileCharNameHeader) DOM.profileCharNameHeader.textContent = `${char.name} 人物伝`;
    if (DOM.profileTitleBadge) DOM.profileTitleBadge.textContent = `${char.rankLabel} ${char.title}`;
    if (DOM.profileSalonBadge) DOM.profileSalonBadge.textContent = `🏛️ ${char.salonName}`;
    if (DOM.profileMaterialBadge) DOM.profileMaterialBadge.textContent = `石：${char.materialDesc}`;
    if (DOM.profileBioText) DOM.profileBioText.textContent = char.profile;
    if (DOM.profileTacticsText) DOM.profileTacticsText.textContent = char.tacticsInfo;

    if (DOM.profileAvatarBox) {
        DOM.profileAvatarBox.innerHTML = "";
        const img = new Image();
        img.src = char.image;
        img.alt = char.name;
        img.onload = () => { DOM.profileAvatarBox.innerHTML = ""; DOM.profileAvatarBox.appendChild(img); };
        img.onerror = () => { DOM.profileAvatarBox.innerHTML = `<span style="font-size:36px;color:#ffd700;">${char.icon}</span>`; };
    }

    if (DOM.charProfileModal) {
        DOM.charProfileModal.classList.add("show");
        document.body.classList.add("modal-open-lock");
    }
}
window.openCharProfileModal = openCharProfileModal;

function closeCharProfileModal() {
    if (DOM.charProfileModal) {
        DOM.charProfileModal.classList.remove("show");
        document.body.classList.remove("modal-open-lock");
    }
}
window.closeCharProfileModal = closeCharProfileModal;

/* ==========================================================================
  【🌟 マーカー中央配置エンジン（単独ならド真ん中、重複時は中央横並び）】
========================================================================== */
function clearMobilityMarkers() {
    if (!DOM.board) return;
    DOM.board.querySelectorAll(".mobility-marker-wrap").forEach(el => el.remove());
}

function showDoubleMobilityMarkers(oppMarkerType = "before") {
    clearMobilityMarkers();

    const getOrCreateWrap = (r, c) => {
        const cell = getBoardCell(r, c);
        if (!cell) return null;
        let wrap = cell.querySelector(".mobility-marker-wrap");
        if (!wrap) {
            wrap = document.createElement("div");
            wrap.className = "mobility-marker-wrap";
            cell.appendChild(wrap);
        }
        return wrap;
    };

    // ① あなた（黒）の選択肢：黒金丸数字 ❶❷❸
    const playerMoves = getValidMoves(BLACK, board);
    playerMoves.forEach(([r, c], idx) => {
        const wrap = getOrCreateWrap(r, c);
        if (!wrap) return;
        const marker = document.createElement("div");
        marker.className = "mobility-marker marker-player";
        const symbol = ['❶','❷','❸','❹','❺','❻','❼','❽','❾','❿'][idx] || `${idx+1}`;
        marker.textContent = symbol;
        wrap.appendChild(marker);
    });

    // ② 相手（白）の選択肢：丸数字 ①②③（青/赤/緑）
    const oppMoves = getValidMoves(WHITE, board);
    oppMoves.forEach(([r, c], idx) => {
        const wrap = getOrCreateWrap(r, c);
        if (!wrap) return;
        const marker = document.createElement("div");
        marker.className = `mobility-marker marker-opponent marker-${oppMarkerType}`;
        const symbol = ['①','②','③','④','⑤','⑥','⑦','⑧','⑨','⑩'][idx] || `${idx+1}`;
        marker.textContent = symbol;
        wrap.appendChild(marker);
    });

    return { playerCount: playerMoves.length, oppCount: oppMoves.length };
}

/* ==========================================================================
  【📖 盤面動的ビジュアル講義エンジン（完全コマ送り＆動的数値連動）】
========================================================================== */
function startLectureMode(lectureId) {
    if (typeof LESSON_LECTURES === "undefined" || !LESSON_LECTURES[lectureId]) return;

    saveMainGameSnapshotIfNotSaved();

    isReviewMode = false;
    isDrillMode = false;
    isLectureMode = true;
    currentLectureId = lectureId;
    currentLectureStepIndex = 1;

    closeDrillCourseModal();
    closeTermPopup();
    if (DOM.guideOverlay) DOM.guideOverlay.classList.remove("show");
    document.body.classList.remove("modal-open-lock");

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

    applyLectureStep(1);
}

function applyLectureStep(targetStepIdx) {
    const lecture = LESSON_LECTURES[currentLectureId];
    if (!lecture) return;

    currentLectureStepIndex = Math.max(1, Math.min(lecture.steps.length, targetStepIdx));
    if (DOM.lectureStepIndicator) {
        DOM.lectureStepIndicator.textContent = `ステップ ${currentLectureStepIndex} / ${lecture.steps.length}`;
    }

    // 1. 初期盤面の復元
    board = Array.from({ length: 8 }, () => Array(8).fill(0));
    lecture.setup(board);

    let explainHtml = "";
    let lastStepApplied = null;

    // 2. 指定ステップまでの着手を順次盤面に反映し、各ステップの合法手数を動的に取得・置換
    for (let i = 0; i < currentLectureStepIndex; i++) {
        const step = lecture.steps[i];
        lastStepApplied = step;

        if (step.resetAndPlayNakawari) {
            board = Array.from({ length: 8 }, () => Array(8).fill(0));
            lecture.setup(board);
        }
        if (step.move) {
            const [r, c] = step.move;
            makeMove(board, r, c, step.player);
        }

        // 🌟 その時点での盤面における合法手数を計算し、テキスト内のプレースホルダーを置換
        const currentPCount = getValidMoves(BLACK, board).length;
        const currentOCount = getValidMoves(WHITE, board).length;
        let formattedExplain = step.explain
            .replace(/\{playerCount\}/g, currentPCount)
            .replace(/\{oppCount\}/g, currentOCount);

        explainHtml += `
            <div class="lecture-step-log">
                <b>${step.desc}</b><br>
                <span>${formattedExplain}</span>
            </div>
        `;
    }

    // 3. 最終ステップ到達時のまとめ解説
    if (currentLectureStepIndex === lecture.steps.length && lecture.solutionNote) {
        explainHtml += `
            <div class="lecture-solution-card">
                ${lecture.solutionNote}
            </div>
        `;
    }

    if (DOM.lectureExplainBox) {
        DOM.lectureExplainBox.style.display = (explainHtml.trim() !== "") ? "block" : "none";
        DOM.lectureExplainBox.innerHTML = explainHtml;
        // 🌟 最新ステップの解説文へスムーズスクロール追従
        setTimeout(() => {
            if (DOM.lectureExplainBox) {
                DOM.lectureExplainBox.scrollTo({ top: DOM.lectureExplainBox.scrollHeight, behavior: 'smooth' });
            }
        }, 50);
    }

    // 盤面描画
    drawBoard();
    clearDrillBadges();
    clearMobilityMarkers();

    // マーカーとバッジの付与
    if (lastStepApplied) {
        if (lastStepApplied.move) {
            const [r, c] = lastStepApplied.move;
            const badgeType = (lastStepApplied.player === BLACK) ? "player" : "cpu";
            const badgeText = (lastStepApplied.resetAndPlayNakawari) ? "🌱 中割り" : ((lastStepApplied.player === BLACK) ? "⚫ 着手" : "💀 猛反撃！");
            addDrillBadge(r, c, badgeType, badgeText);
        }

        if (lastStepApplied.showBeforeMobility) {
            showDoubleMobilityMarkers("before");
        } else if (lastStepApplied.showAfterMobility) {
            const markerType = (lastStepApplied.resetAndPlayNakawari) ? "good" : "bad";
            showDoubleMobilityMarkers(markerType);
        }
    }

    // ボタンの制御
    if (DOM.btnLecturePrev) DOM.btnLecturePrev.disabled = (currentLectureStepIndex === 1);
    if (DOM.btnLectureNext) DOM.btnLectureNext.disabled = (currentLectureStepIndex === lecture.steps.length);
    if (DOM.btnLectureToDrill) {
        DOM.btnLectureToDrill.style.display = (currentLectureStepIndex === lecture.steps.length) ? "inline-block" : "none";
    }
}

function nextLectureStep() {
    const lecture = LESSON_LECTURES[currentLectureId];
    if (!lecture || currentLectureStepIndex >= lecture.steps.length) return;
    playPlaceSound();
    applyLectureStep(currentLectureStepIndex + 1);
}
window.nextLectureStep = nextLectureStep;

function prevLectureStep() {
    if (currentLectureStepIndex <= 1) return;
    playPlaceSound();
    applyLectureStep(currentLectureStepIndex - 1);
}
window.prevLectureStep = prevLectureStep;

function resetCurrentLecture() {
    playPlaceSound();
    applyLectureStep(1);
}
window.resetCurrentLecture = resetCurrentLecture;

function proceedToDrillFromLecture() {
    const lecture = LESSON_LECTURES[currentLectureId];
    clearMobilityMarkers();
    const firstQId = (lecture && lecture.themeId) ? (lecture.themeId - 1) * 3 + 1 : 1;
    startDrillQuestion(firstQId);
}
window.proceedToDrillFromLecture = proceedToDrillFromLecture;

function returnToLectureFromDrill() {
    if (typeof DRILL_QUESTIONS === "undefined") return;
    const qData = DRILL_QUESTIONS[currentDrillQuestionIndex - 1];
    const lecId = `lec-${qData.themeId}`;
    isDrillMode = false;
    startLectureMode(lecId);
}
window.returnToLectureFromDrill = returnToLectureFromDrill;

function exitLectureMode() {
    if (!isLectureMode) return;
    clearMobilityMarkers();
    playPlaceSound();
    restoreMainGameState();
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
            <div>序盤、第${openingBad.stepIndex}手【${openingBad.coord}】で外側の石を取りすぎ、相手の打てる場所を増やしてしまう隙が生じました。</div>
            <div class="story-deep-link-wrap">
                <span class="story-deep-btn" onclick="jumpToReviewStep(${openingBad.stepIndex})">🔍 なぜ危険だったのか？ 盤面で深掘り検証 ▶</span>
            </div>
        `;
    } else {
        openingHtml = `
            <div>序盤は定石と<span class="term-link" data-term="中割り">中割り</span>を遵守し、相手に余計な足場を与えない落ち着いた立ち上がりでした。</div>
        `;
    }

    let turningMove = playerMoveLogs.find(l => l.isCornerMove);
    if (!turningMove) {
        turningMove = playerMoveLogs.find(l => l.isObjectiveBest) || playerMoveLogs[Math.floor(playerMoveLogs.length / 2)];
    }

    tacticsTurningPointIndex = turningMove ? turningMove.stepIndex : -1;
    let turningHtml = "";

    if (isWin) {
        if (turningMove && turningMove.isCornerMove) {
            turningHtml = `
                <div>第${turningMove.stepIndex}手、相手が空けた隙を見逃さず要衝【${turningMove.coord}（角）】を奪取！ これにより絶対に裏返らない<span class="term-link" data-term="確定石">確定石</span>の拠点を築き、本局の主導権を完全に掌握しました。</div>
                <div class="story-deep-link-wrap">
                    <span class="story-deep-btn" onclick="jumpToReviewStep(${turningMove.stepIndex})">🎯 勝負を決めた分岐点の盤面を見る ▶</span>
                </div>
            `;
        } else if (turningMove) {
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
  【🎯 宮廷次の一手検定（ダブル選択肢結果マーカー連動）】
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

function renderDrillCourseList() {
    if (!DOM.drillCourseList || typeof DRILL_THEMES === "undefined" || typeof DRILL_QUESTIONS === "undefined") return;
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
    if (typeof DRILL_QUESTIONS === "undefined") return;
    saveMainGameSnapshotIfNotSaved();

    isReviewMode = false;
    isLectureMode = false;
    isDrillMode = true;
    isSimulatingDrillMistake = false;
    currentDrillQuestionIndex = Math.max(1, Math.min(15, qIndex));

    closeDrillCourseModal();
    closeTermPopup();
    if (DOM.guideOverlay) DOM.guideOverlay.classList.remove("show");
    document.body.classList.remove("modal-open-lock");

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

    if (DOM.btnDrillRetry) {
        DOM.btnDrillRetry.style.display = "none";
        DOM.btnDrillRetry.classList.remove("btn-retry-pulse");
    }
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
    clearMobilityMarkers();
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
    clearMobilityMarkers();

    const [cr, cc] = qData.correctMove;
    const isCorrect = (r === cr && c === cc);
    const key = `${r},${c}`;
    const isMobilityFocusedQuestion = (qData.id >= 4 && qData.id <= 9);

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

        if (isMobilityFocusedQuestion) {
            showDoubleMobilityMarkers("good");
        }

        const pCount = getValidMoves(qData.turn, board).length;
        const oCount = getValidMoves(opposite(qData.turn), board).length;
        let formattedReason = qData.correctReason
            .replace(/\{playerCount\}/g, pCount)
            .replace(/\{oppCount\}/g, oCount);

        if (DOM.drillFeedbackBox) {
            DOM.drillFeedbackBox.className = "drill-feedback-box correct";
            DOM.drillFeedbackTitle.textContent = "正解！🎉 完璧な着手理由です！";
            DOM.drillFeedbackReason.innerHTML = formattedReason;
            setTimeout(() => {
                if (DOM.drillFeedbackBox) {
                    DOM.drillFeedbackBox.scrollTo({ top: 0, behavior: 'smooth' });
                }
            }, 50);
        }

        if (DOM.btnDrillRetry) {
            DOM.btnDrillRetry.style.display = "none";
            DOM.btnDrillRetry.classList.remove("btn-retry-pulse");
        }
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

        if (isMobilityFocusedQuestion) {
            showDoubleMobilityMarkers("bad");
        }

        const mistakeInfo = (qData.mistakes && qData.mistakes[key]) || null;
        let reasonText = mistakeInfo ? mistakeInfo.reason : qData.defaultMistakeReason;

        const pCount = getValidMoves(qData.turn, board).length;
        const oCount = getValidMoves(opposite(qData.turn), board).length;
        let formattedReason = reasonText
            .replace(/\{playerCount\}/g, pCount)
            .replace(/\{oppCount\}/g, oCount);

        if (DOM.drillFeedbackBox) {
            DOM.drillFeedbackBox.className = "drill-feedback-box wrong";
            DOM.drillFeedbackTitle.textContent = "惜しい！❌ なぜ悪手なのか確認しましょう";
            DOM.drillFeedbackReason.innerHTML = formattedReason;
            setTimeout(() => {
                if (DOM.drillFeedbackBox) {
                    DOM.drillFeedbackBox.scrollTo({ top: 0, behavior: 'smooth' });
                }
            }, 50);
        }

        if (DOM.btnDrillRetry) {
            DOM.btnDrillRetry.style.display = "inline-block";
            DOM.btnDrillRetry.classList.add("btn-retry-pulse");
        }
        if (DOM.btnDrillNextQuestion) DOM.btnDrillNextQuestion.style.display = "none";

        if (mistakeInfo && mistakeInfo.cpuResponse) {
            await sleep(750);
            if (!isDrillMode) return;
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
        if (DOM.drillControlCard) DOM.drillControlCard.classList.remove("show");
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
    restoreMainGameState();
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

function exitDrillMode() {
    if (!isDrillMode) return;
    clearMobilityMarkers();
    playPlaceSound();
    restoreMainGameState();
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

    if (DOM.strategyPhasesContainer && typeof STRATEGY_GUIDE_DATA !== "undefined" && Array.isArray(STRATEGY_GUIDE_DATA.pyramidSteps)) {
        DOM.strategyPhasesContainer.innerHTML = STRATEGY_GUIDE_DATA.pyramidSteps.map(step => `
            <div class="manual-card pyramid-step-card">
                <div class="pyramid-card-header">
                    <span class="pyramid-step-tag">${step.stepBadge}</span>
                    <span class="pyramid-step-title">${step.title}</span>
                </div>
                <div class="pyramid-badges-row">
                    <span class="pyramid-rank-badge">${step.targetRank}</span>
                    <span class="pyramid-enemy-badge">${step.targetEnemies}</span>
                </div>
                <div class="pyramid-summary-text">${step.summary}</div>
                <div class="pyramid-rules-list">
                    ${step.rules.map(r => `<div class="pyramid-rule-item">${r}</div>`).join("")}
                </div>
                <div class="pyramid-effect-box">${step.effectDesc}</div>
            </div>
        `).join("");
    }

    if (DOM.strategyRoadmapContainer) {
        if (DOM.strategyRoadmapContainer.parentElement) {
            DOM.strategyRoadmapContainer.parentElement.style.display = "none";
        }
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

        manualTabBtns.forEach(b => b.classList.remove("active"));
        manualTabContents.forEach(c => c.classList.remove("active"));

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

/* ==========================================================================
  【王宮戦績録 データ管理】
========================================================================== */
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

        let formattedTitle = r.dramaTitle || "";
        if (formattedTitle.includes("（")) {
            const parts = formattedTitle.split("（");
            formattedTitle = `<span>${parts[0]}</span><span style="font-size:8.5px; opacity:0.9;">（${parts[1]}</span>`;
        }

        let resBadge = "";
        if (r.isWin) resBadge = `<div class="badge-win-gold">${formattedTitle}</div>`;
        else if (r.isDraw) resBadge = `<div class="badge-draw-dim">${formattedTitle}</div>`;
        else resBadge = `<div class="badge-lose-dim">${formattedTitle}</div>`;

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
            <td style="font-size:9.5px; text-align:center; vertical-align:middle;">${pColorIcon}</td>
            <td style="vertical-align:middle;">${resBadge}</td>
            <td style="font-family:'Cinzel',serif; font-weight:800;">
                <div style="font-size:11.5px; color:#fff4bd;">${scoreLine1}</div>
                <div style="font-size:9px; color:#ecd08c;">${scoreLine2}</div>
            </td>
            <td style="vertical-align:middle; text-align:center;">${modeBadge}</td>
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

/* ==========================================================================
  【棋譜検証（検討）モード管理】
========================================================================== */
function enterReviewMode() {
    if (gameStepLogs.length === 0 || isDrillMode || isLectureMode) return;

    saveMainGameSnapshotIfNotSaved();

    isReviewMode = true;
    if (DOM.royalResultModal) DOM.royalResultModal.classList.remove("show");
    document.body.classList.remove("modal-open-lock");

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

function exitReviewMode(openResultModal = false) {
    if (!isReviewMode) return;
    isReviewMode = false;

    restoreMainGameState();

    if (openResultModal && DOM.royalResultModal) {
        DOM.royalResultModal.classList.add("show");
        document.body.classList.add("modal-open-lock");
    }
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
if (DOM.restartButton) DOM.restartButton.addEventListener("click", startGame);
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
        exitReviewMode(true);
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
        if (isDrillMode || isLectureMode || isReviewMode) {
            restoreMainGameState();
        }
    }
});

/* ==========================================================================
  【初期化実行】
========================================================================== */
renderSystemVersionInfo();
initCoordLabels();
if (DOM.characterSelect) {
    DOM.characterSelect.value = determineInitialCharacterLevel();
}
startGame();


