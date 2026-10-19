/* ==========================================================================
  【オセロプログラム ロジック・AI思考エンジン】
  ファイル名: othello_ai_sensei_js.js
  バージョン: Ver 7.1.0 (2026/10/20)
  
  [Ver 7.1.0] 2026/10/20 更新内容:
  - 【セリフ発話文字パルス点滅】枠の金色パルスを廃止し、セリフ文字全体が喋っている間ゆっくり点滅し、発話完了で静止する演出へ刷新。
  - 【対話型盤面ビジュアル解説のプレイヤー目線改善】盤面直下に「局面・急所の理由・格言」が直感的に読める特製指南カードを新設。
  - 【盤面立体バッジ＆2コマシミュレーション】急所マスに「👑角」「⚠️Xマス危険」「🎯中割り」等の立体バッジを配置し、相手の応手を体験可能に。
  - 【全10大豪傑セリフ＆勝敗温度感の全面洗練】10名それぞれの身分・性格・世界観、および勝ち負け・ヒント使用時の台詞を完全個別調律。
========================================================================== */

const SYSTEM_VERSION_INFO = {
    version: "Ver 7.1.0",
    date: "2026/10/20",
    history: [
        {
            ver: "Ver 7.1.0", date: "2026/10/20",
            desc: "【セリフ発話文字パルス点滅・盤面ビジュアル解説特製指南カード＆全10豪傑台詞調律エディション】枠の金パルスを廃止しセリフ文字全体の呼吸点滅演出へ。盤面直下に状況・理由・格言が読める指南カードを新設。全10豪傑のセリフと勝敗温度感を全面洗練。"
        },
        {
            ver: "Ver 7.0.0", date: "2026/10/19",
            desc: "【全10大豪傑集結・宮廷サロン完全具現化＆対話型盤面ビジュアル解説エディション】ルカ、ニコラ、ジュリアン、フェルディナントが正式参戦し全10階位が完成。大盤面が直接パルス点滅する「盤面ビジュアル解説モード」を新設。ヒント深さ8手でLv.10に勝率95%以上を実証。"
        },
        {
            ver: "Ver 6.9.3", date: "2026/10/19",
            desc: "【ヒント深さ8手Lv.6超え・定石多様性確立＆オセロ用語・定石宝典エディション】ヒント探索を深さ8手に強化しLv.6に勝率95%達成。白番の定石分散とタイブレークで一本道棋譜を根絶。専門用語ミニ解説ポップアップと思案所「用語・定石の宝典」タブを新設。"
        }
    ]
};

const boardSize = 8;
const BLACK = 1, WHITE = 2;

let humanColor = BLACK, cpuColor = WHITE;
let board, currentPlayer, gameOver, isBusy = false, isMuted = false;
let pendingAnimation = null, hintMove = null;
let historyStack = [];

let lastMove = null, usedHintInGame = false;
let currentGameSessionId = 0;

let gameStepLogs = [], reviewStepIndex = 0, isReviewMode = false;
let tacticsBestIndex = -1, tacticsWorstIndex = -1, tacticsWorstAlternative = null;

let elapsedSeconds = 0, playerSeconds = 0, cpuSeconds = 0;
let isAiThinkingHint = false, timerInterval = null;
let talkingTimeout = null, toastTimeout = null, curtainTimeout = null, pulseTimeout = null;
let typeWriterInterval = null;

let playerMoveLogs = [];
let minPlayerWinrateInGame = 50;

// 事前計算（プリフェッチ）キャッシュ
let cachedMoveEvaluations = null;
let isPrefetching = false;

// 探索高速化用トランスポジションテーブル（置換表）
const transpositionTable = new Map();

// 👁️ 盤面ビジュアル解説（デモモード）管理変数
let isDemoMode = false;
let currentDemoType = null;
let currentDemoStep = 1;
let savedBoardStateForDemo = null;

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
    battleStatPlayer: document.getElementById("battleStatPlayer"),
    battleStatOpponent: document.getElementById("battleStatOpponent"),
    battleSituationBadge: document.getElementById("battleSituationBadge"),
    btnPlayerBlack: document.getElementById("btnPlayerBlack"),
    btnPlayerWhite: document.getElementById("btnPlayerWhite"),
    normalControlCard: document.getElementById("normalControlCard"),
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
    carteDiagnosis: document.getElementById("carteDiagnosis"),
    carteGoodCoord: document.getElementById("carteGoodCoord"),
    carteGoodDesc: document.getElementById("carteGoodDesc"),
    carteBadCoord: document.getElementById("carteBadCoord"),
    carteBadDesc: document.getElementById("carteBadDesc"),
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
    termPopupDemoBtn: document.getElementById("termPopupDemoBtn"),
    termPopupMore: document.getElementById("termPopupMore"),
    guideOverlay: document.getElementById("guideOverlay"),
    // 👁️ 特製ビジュアル解説カード（指南スクロール）
    demoGuideCard: document.getElementById("demoGuideCard"),
    demoGuideTitle: document.getElementById("demoGuideTitle"),
    demoGuideBadge: document.getElementById("demoGuideBadge"),
    demoSituationText: document.getElementById("demoSituationText"),
    demoGuideReason: document.getElementById("demoGuideReason"),
    demoMaximText: document.getElementById("demoMaximText"),
    btnDemoSimulate: document.getElementById("btnDemoSimulate"),
    btnExitDemoMain: document.getElementById("btnExitDemoMain")
};

/* ==========================================================================
  【オセロ専門用語・定石辞書データ（詳細解説・シミュレーション完全同期）】
========================================================================== */
const TERMS_DICTIONARY = {
    "Xマス": {
        title: "⚠️ Xマス（エックス）",
        desc: "角の斜め前（B2, G2, B7, G7）にある最危険マス。角が空いている時にここに打つと、相手に角を即座に取られてしまいます。",
        tabSec: "term-sec-board", demoType: "角・X・C",
        situation: "角が空いている状態で、黒が斜め前の【B2（Xマス）】に不用意に石を置いてしまった局面です。",
        reason: "Xマスに打つと、相手（白）に左上の角【A1】へ潜り込む足場を直接プレゼントしてしまいます。",
        maxim: "『角が空いているうちは、絶対にXマスに手を出すな』",
        simBtnText: "白が角(A1)を取る様子を見る ▶"
    },
    "Cマス": {
        title: "⚠️ Cマス（シー）",
        desc: "角に隣接するマス。不用意に打つと相手に角へ潜り込む足場を与えてしまいます。",
        tabSec: "term-sec-board", demoType: "角・X・C",
        situation: "角のすぐ隣にある8つのマス（A2, B1, G1, H2など）です。",
        reason: "Cマスに石を置くと、相手に外側から角へ侵入されるきっかけを作ってしまいます。",
        maxim: "『Cマスに打つ時は、角を取られない確実な裏付けを持て』",
        simBtnText: "角の攻防シミュレート ▶"
    },
    "中割り": {
        title: "🌱 中割り理論",
        desc: "外側の石を取らず、内側の石だけを返すオセロの基本奥義。外側に石が露出しないため、相手に打てるマスを与えません。",
        tabSec: "term-sec-tactics", demoType: "中割り",
        situation: "中央が混み合い、外側に石を返したくない中盤の局面です。",
        reason: "緑のバッジ【E4】に打つと、周囲を既に囲まれている内側の白石だけが返り、外側の境界線が一切広がりません。",
        maxim: "『外側を取るな、内側の石だけを静かにめくれ』",
        simBtnText: "中割りの着手をシミュレート ▶"
    },
    "壁": {
        title: "🧱 壁（かべ）",
        desc: "外側に自分の石が一直線に並んでしまう状態。相手に多くの足場を与えてしまうため、敗着の典型とされます。",
        tabSec: "term-sec-tactics", demoType: "壁",
        situation: "外側に白石が一直線に6個並んで「壁」を作ってしまった失敗局面です。",
        reason: "外側に石が並ぶと、相手（黒）はこの白石を足場にして四方八方あらゆるマスへ自由に打ち込めるようになります。",
        maxim: "『壁を作った者に勝利なし。石を多く取りすぎるな』",
        simBtnText: "相手に囲まれる様子を見る ▶"
    },
    "パリティ": {
        title: "⚖️ パリティ（偶数理論）",
        desc: "オセロ終盤の絶対法則。偶数空きエリアには相手に先に打たせ、自分が最後に打つことで最後の一手を独占できます。",
        tabSec: "term-sec-tactics", demoType: "パリティ",
        situation: "盤面が複数の空きエリアに分断された終盤の局面です。",
        reason: "左上の青マスは「2マス（偶数空き）」。相手に先に打たせれば、自分が2手目を打ってそのエリアの最後を独占できます。",
        maxim: "『偶数は相手から、奇数は自分から打て』",
        simBtnText: "最後の一手独占を見る ▶"
    },
    "確定石": {
        title: "💎 確定石（かくていせき）",
        desc: "終局まで絶対に裏返らない石（確保した角や、角から連続して並んだ石）。確定石を多く作った側が勝利します。",
        tabSec: "term-sec-tactics", demoType: "確定石",
        situation: "黒が左上の角【A1】を制圧し、そこから辺沿いに石が連なっている局面です。",
        reason: "角は絶対に挟まれないため、角に繋がる同じ色の石も終局まで永久にひっくり返りません。",
        maxim: "『角を取れば確定石が生まれる。盤上の領土を確約せよ』",
        simBtnText: "角からの確定石を見る ▶"
    },
    "開放度": {
        title: "📉 開放度（かいほうど）",
        desc: "打った石の周囲にある空きマスの数。開放度が低い（周りに空きマスが少ない）手ほど好手とされます。",
        tabSec: "term-sec-tactics", demoType: "中割り",
        situation: "周囲に空きマスが少ないマスを選ぶことで、相手に打てる場所を増やさないテクニックです。",
        reason: "開放度が低い手を打つと、相手の手番で打てる場所が激減し、やがてパスへと追い込むことができます。",
        maxim: "『開放度を最小に抑え、相手の選択肢を奪い尽くせ』",
        simBtnText: "着手を見る ▶"
    },
    "ウイング": {
        title: "🪽 ウイング",
        desc: "辺の片方の角が空いた状態で石が並ぶ危険な形。相手にストーナー等の手筋で角を奪われる原因になります。",
        tabSec: "term-sec-tactics", demoType: "壁",
        situation: "辺の角が空いたまま石が連なってしまっている不安定な陣形です。",
        reason: "相手に内側から手を伸ばされ、角を無理やり献上させられる手筋（ストーナー）の標的になります。",
        maxim: "『不完全なウイングは角献上の引き金となる』",
        simBtnText: "危険性を見る ▶"
    },
    "虎定石": {
        title: "🐯 虎定石（トラ）",
        desc: "初手F5に対し平行取りD6や縦取りから展開する王道定石。主導権を握りやすい基本形です。",
        tabSec: "term-sec-openings", demoType: "定石",
        situation: "白の平行取りD6から、黒がC5に打って主導権を争う王道定石の骨格です。",
        reason: "中央の石のバランスが崩れず、先手（黒）が自然に中割りを狙える堅牢な布石です。",
        maxim: "『初心者は虎を学べ。定石の基本がすべて詰まっている』",
        simBtnText: "定石の展開を見る ▶"
    },
    "牛定石": {
        title: "🐮 牛定石（ウシ）",
        desc: "縦取りF6からC4に打つ重厚な定石。内側をガッチリ固める堅実な棋風に向いています。",
        tabSec: "term-sec-openings", demoType: "定石",
        situation: "白の縦取りF6に対し、黒がC4に打って内側を固める重厚な定石です。",
        reason: "互いに相手の内側を狙い合うじっくりとした展開となり、中盤の読み合いが深まります。",
        maxim: "『牛のようにどっしりと、中央を固めて機を窺え』",
        simBtnText: "定石の展開を見る ▶"
    },
    "馬定石": {
        title: "🐴 馬定石（ウマ）",
        desc: "斜め取りF4からE3に展開する、後手（白）が高勝率を誇る柔軟で勝ちやすい名定石です。",
        tabSec: "term-sec-openings", demoType: "定石",
        situation: "初手F5に対し、白が斜め取りF4で応じる現代オセロの高勝率布石です。",
        reason: "白が柔軟に中割りを選択しやすく、黒の無理攻めを誘発しやすい実践的な定石です。",
        maxim: "『白番なら馬を走らせよ。柔軟な中割りで勝利を掴め』",
        simBtnText: "定石の展開を見る ▶"
    }
};

const cornerSquares = [[0, 0], [0, 7], [7, 0], [7, 7]];
const directions = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];

const FLIP_INTERVAL_MS = 115;
const FLIP_ANIMATION_DURATION_MS = 680;

/* ==========================================================================
  【公式プロ定石データベース（白番高勝率分散・完全同期版）】
========================================================================== */
const OPENING_BOOK = {
    "": [
        { move: [4, 5], name: "黒初手（F5）", weight: 100 }
    ],
    "F5": [
        { move: [3, 5], name: "斜め取り（F4・馬定石）", weight: 45 },
        { move: [5, 5], name: "縦取り（F6・牛定石）", weight: 35 },
        { move: [5, 3], name: "平行取り（D6・虎定石）", weight: 20 }
    ],
    "F5-F4": [
        { move: [2, 4], name: "馬定石（E3）", weight: 70 },
        { move: [2, 2], name: "飛行機定石（C3）", weight: 30 }
    ],
    "F5-F4-E3": [
        { move: [3, 5], name: "馬定石（F6）", weight: 80 }
    ],
    "F5-F4-E3-F6": [
        { move: [4, 2], name: "馬定石（C5）", weight: 75 },
        { move: [5, 4], name: "馬定石（E6）", weight: 25 }
    ],
    "F5-F6": [
        { move: [3, 2], name: "牛定石（C4）", weight: 65 },
        { move: [2, 3], name: "虎定石（D3）", weight: 35 }
    ],
    "F5-F6-C4": [
        { move: [2, 2], name: "牛定石（C3）", weight: 75 },
        { move: [2, 4], name: "牛定石変化（E3）", weight: 25 }
    ],
    "F5-F6-C4-C3": [
        { move: [3, 3], name: "牛定石（D3）", weight: 85 }
    ],
    "F5-F6-C4-C3-D3": [
        { move: [2, 3], name: "牛定石（D2）", weight: 80 },
        { move: [2, 4], name: "牛定石変化（E3）", weight: 20 }
    ],
    "F5-F6-C4-C3-D3-D2": [
        { move: [2, 4], name: "牛定石本線（E3）", weight: 90 }
    ],
    "F5-D6": [
        { move: [4, 2], name: "正統虎定石（C5）", weight: 85 },
        { move: [5, 4], name: "平行取り変化（E6）", weight: 15 }
    ],
    "F5-D6-C5": [
        { move: [3, 5], name: "虎定石本線（F4）", weight: 80 },
        { move: [5, 5], name: "虎定石変化（F6）", weight: 20 }
    ]
};

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
            for (const [crPos, ccPos] of def.c) {
                weights[crPos][ccPos] = -800;
            }
        } else if (cornerOwner === perspectivePlayer) {
            weights[def.x[0]][def.x[1]] = 120;
            for (const [crPos, ccPos] of def.c) {
                weights[crPos][ccPos] = 100;
            }
        } else if (cornerOwner === opp) {
            weights[def.x[0]][def.x[1]] = -40;
            for (const [crPos, ccPos] of def.c) {
                weights[crPos][ccPos] = -50;
            }
        }
    }
    return weights;
}

/* ==========================================================================
  【全10大豪傑キャラクター定義（セリフ・個性・勝敗温度感 全面洗練版）】
========================================================================== */
const CHARACTERS = {
    1: {
        id: 1, name: "道化師 ピエロ", rankLabel: "【入門・アマ12級】", title: "（宮廷道化師）", icon: "🃏", image: "images/char1.png",
        imgFocus: "center 26%", themeColor: "#e63946", themeGlow: "rgba(230, 57, 70, 0.65)",
        bookMaxPly: 0, depth: 0, exact: 0,
        salonName: "旅の一座の酒場", materialDesc: "年輪黒檀 × 白木メイプル", boardDesc: "オリーブ木目卓",
        thinkingBaseMs: 650,
        quotes: {
            start: ["ヒヒッ！王宮のオセロへようこそ！サイコロ転がすみたいに遊ぼうヨ！", "お手柔らかにネ！ボクだってたまには本気出しちゃうヨ！"],
            thinking: ["どこに置こうかニャ〜？ 適当にポンと置いちゃおっかナ！", "ぐるぐる回って目が回っちゃうデス〜！"],
            playerGood: ["ヒエ〜ッ！？ そこ置かれたらボクの逃げ道がなくなっちゃうデス〜！", "お見事！ …って、ボクが大ピンチじゃないデスか！？"],
            playerBad: ["おやおや〜？ そこ置いちゃってホントにいいの？ いただきまーす！", "ヒヒッ！ 隙だらけでゴザイマスよ〜！"],
            bigReversal: ["ぎゃ〜っ！？ 一気にひっくり返されちゃったデス〜！"],
            cpuCorner: ["やったネ！ 角っこいただき〜！ ラッキーでゴザイマス！"],
            playerCorner: ["あちゃー！ 大事な角っこを取られちゃったヨ〜！"],
            climax: ["もう盤面が埋まっちゃうヨ！ どっちが勝つのかニャ〜！？"],
            losing: ["ヒエ〜ッ！ ボクの石が数えるほどしかないヨ〜！"],
            cpuPass: ["おっとっと、置く場所がないからパスしちゃうネ！"],
            playerPass: ["ヒヒッ！ 置ける場所がないネ！ ボクの番だヨ！"],
            win: ["ヒヒッ！ボクの大・勝・利〜！たまには道化師だって王様を負かしちゃうでゴザイマス！"],
            lose: ["参った参った〜！さすが貴方様、コテンパンの完敗でゴザイマス！拍手喝采〜！"]
        }
    },
    2: {
        id: 2, name: "侍女 コレット", rankLabel: "【初級入門・アマ9級】", title: "（見習い侍女）", icon: "🎀", image: "images/char2.png",
        imgFocus: "center 20%", themeColor: "#2a9d8f", themeGlow: "rgba(42, 157, 143, 0.65)",
        bookMaxPly: 0, depth: 1, exact: 0,
        salonName: "見習い侍女のサロン", materialDesc: "釉薬黒磁器 × 高級白磁", boardDesc: "ペールミント磁器調盤",
        thinkingBaseMs: 700,
        quotes: {
            start: ["お茶の準備の合間に…一生懸命お相手いたします！よろしくお願いしますねっ！"],
            thinking: ["ええと…たくさんひっくり返せる場所はどこかな…？"],
            playerGood: ["きゃっ！？ そんな綺麗にひっくり返されちゃうなんて…すごいです…！"],
            playerBad: ["えっ…そこに置いちゃって大丈夫なんですか…？ 私、取っちゃいますよ…？"],
            bigReversal: ["わぁぁっ！？ こんなにたくさん取られちゃうなんて…！"],
            cpuCorner: ["わぁっ！ 角が取れちゃいました！ 嬉しいです！"],
            playerCorner: ["そんな…！ 私の大切な角が…うぅ…！"],
            climax: ["もうすぐおしまいですね…！ 心臓がドキドキしてきました…！"],
            losing: ["うぅ…！ どんどん私の石が減っちゃってます…！"],
            cpuPass: ["ごめんなさい、私、置ける場所がありません…パスです！"],
            playerPass: ["ふふっ、私の番ですね！ 頑張ってひっくり返します！"],
            win: ["勝てちゃいました…！えへへ、私でも勝てるなんて夢みたいです！また遊んでくださいねっ！"],
            lose: ["うぅ…！完敗です…！もっと本を読んで定石を勉強してきますっ…次こそは…！"]
        }
    },
    3: {
        id: 3, name: "庭園番 ルカ", rankLabel: "【初級・アマ7級】", title: "（少年庭師）", icon: "🌱", image: "images/char7.png",
        imgFocus: "center 22%", themeColor: "#52b788", themeGlow: "rgba(82, 183, 136, 0.65)",
        bookMaxPly: 0, depth: 2, exact: 0,
        salonName: "王宮の大温室", materialDesc: "翠緑碧玉 × 薄黄琥珀", boardDesc: "フォレスト苔調盤",
        thinkingBaseMs: 750,
        quotes: {
            start: ["王宮の大温室へようこそ！草花を育てるように、緑いっぱいの盤面にしようね！"],
            thinking: ["お花を育てるみたいに… 外側からじっくり囲んでいこうかな！"],
            playerGood: ["わっ、そこに来るんだ！？ 木陰に隠れたつもりだったのに…見事だなぁ！"],
            playerBad: ["えへへ、そこ空けちゃったの？ ぐんぐん枝を伸ばしちゃうよ！"],
            bigReversal: ["うわぁっ！ せっかく咲いたお花が一気に散っちゃった…！"],
            cpuCorner: ["やったぁ！ 大事な温室の角を確保しました！"],
            playerCorner: ["ああっ！ 僕の温室の角が取られちゃった…！"],
            climax: ["もうすぐ満開だね！ どっちがたくさん咲くかなぁ！"],
            losing: ["うぅ…僕の緑が全然足りないよぉ…！"],
            cpuPass: ["水やりはお休み…置ける場所がないのでパスです！"],
            playerPass: ["僕の番ですね！ 元気に石を置いちゃいます！"],
            win: ["僕の勝ちだぁ！盤面いっぱいに綺麗なお花畑が完成したよ！楽しかったね！"],
            lose: ["参りましたぁ…！貴方様のオセロは、嵐にもびくともしない立派な大樹のようです！"]
        }
    },
    4: {
        id: 4, name: "錬金術師 ニコラ", rankLabel: "【初中級・アマ4級】", title: "（宮廷学者見習い）", icon: "🔮", image: "images/char8.png",
        imgFocus: "center 20%", themeColor: "#9b5de5", themeGlow: "rgba(155, 93, 229, 0.65)",
        bookMaxPly: 0, depth: 3, exact: 0,
        salonName: "宮廷錬金実験室", materialDesc: "紫水晶 × 黄鉄鉱", boardDesc: "スレート鉱物盤",
        thinkingBaseMs: 800,
        quotes: {
            start: ["幾何学と論理の結晶…私の錬金術オセロ、理論通りの一手をお見せしましょう。"],
            thinking: ["角の座標エネルギーを計算中… Xマスを避けて展開する。"],
            playerGood: ["ほう…！理論的に急所を突く手を打たれるとは。実に興味深い反応だ。"],
            playerBad: ["不合理な一手ですね。私のフラスコの中に自ら飛び込んでいただきました。"],
            bigReversal: ["なっ…！？ 元素配列がこれほど一気に逆転するとは…！"],
            cpuCorner: ["角の幾何学的確保に成功。想定通りの展開です。"],
            playerCorner: ["しまっ…！ その角の引力を見誤ったというのか…！？"],
            climax: ["終盤の臨界点に達しました。最後の反応を見届けましょう。"],
            losing: ["計算が…！ 反応式が崩壊していく…！"],
            cpuPass: ["試薬が尽きました。パスとして貴殿の反応を待ちます。"],
            playerPass: ["貴殿の選択肢はゼロ。私のフラスコの中ですよ。"],
            win: ["私の計算通りです。すべての元素が完璧に結合した、論理的必然の勝利ですね。"],
            lose: ["素晴らしい知性です…私の導き出した勝利の方程式が、跡形もなく崩壊するとは…！"]
        }
    },
    5: {
        id: 5, name: "騎士 ローラン", rankLabel: "【中級・アマ2級】", title: "（近衛騎士）", icon: "⚔️", image: "images/char3.png",
        imgFocus: "center 22%", themeColor: "#2b6cb0", themeGlow: "rgba(43, 108, 176, 0.65)",
        bookMaxPly: 4, depth: 4, exact: 0,
        salonName: "近衛騎士の鍛錬の間", materialDesc: "玄武岩 × 白雲母", boardDesc: "アイアン鋼鉄盤",
        thinkingBaseMs: 850,
        quotes: {
            start: ["近衛の誇りにかけて、正々堂々とお手合わせ願おう！いざ、尋常に勝負！"],
            thinking: ["我が陣形を立て直す… 次の一手はここだ！"],
            playerGood: ["見事な太刀筋…！ 盤面の急所を寸分の狂いもなく突いてくるとは！"],
            playerBad: ["ふっ… 隙を見せたな！ 我が防陣の前に油断は禁物だぞ！"],
            bigReversal: ["なんと…！？ 我が前線が一気に崩壊しただと…！？"],
            cpuCorner: ["要衝を確保！ この角は我が騎士団の防衛線だ！"],
            playerCorner: ["不覚…！ 陣地の角を突破されるとは！"],
            climax: ["ここが関ヶ原… 雌雄を決する時が来たようだな！"],
            losing: ["ぬうう…！ 我が軍がここまで追い詰められるとは…！"],
            cpuPass: ["無念…！ 一時退却し、次の好機を待つ！"],
            playerPass: ["包囲網は完成した！ 我が軍の進軍は止まらんぞ！"],
            win: ["王国の勝利だ！我が騎士団の鉄壁の陣形、そう易々と崩せはせん！"],
            lose: ["見事な用兵…完敗だ！貴殿の鋭き知謀に、近衛騎士としての最大限の敬意を表する！"]
        }
    },
    6: {
        id: 6, name: "吟遊詩人 ジュリアン", rankLabel: "【中上級・アマ1級】", title: "（麗しの宮廷楽士）", icon: "🪕", image: "images/char9.png",
        imgFocus: "center 22%", themeColor: "#c94b63", themeGlow: "rgba(201, 75, 99, 0.65)",
        bookMaxPly: 6, depth: 5, exact: 0,
        salonName: "音楽と詩の回廊", materialDesc: "黒真珠 × 白蝶貝", boardDesc: "ローズウッド木目金盤",
        thinkingBaseMs: 950,
        quotes: {
            start: ["リュートの調べに乗せて、優雅なる盤上詩を奏でましょう。美しき一局を。"],
            thinking: ["内側の旋律を大切に… 中割りのリズムを崩しませんよ。"],
            playerGood: ["おや… 息を呑むほど美しい一節を奏でてくださいますね。胸に響きますよ。"],
            playerBad: ["ふふ、リズムが乱れましたよ？ 隙のある音色は聞き逃しません。"],
            bigReversal: ["なんと劇的な転調…！ 盤上の交響詩が一変しましたね！"],
            cpuCorner: ["この角の響きは、我がリュートが美しく奏で奪いましょう。"],
            playerCorner: ["ああ…！ 私の美しい角の調べが奪われるなんて…！"],
            climax: ["いよいよ最終楽章… 華麗なるコーダへと参りましょう。"],
            losing: ["不協和音が… 私の指先から旋律が零れていく…！"],
            cpuPass: ["ふむ、静寂の休符ですね。貴方の調べを聴かせてください。"],
            playerPass: ["休符ですね。私の独奏を存分にお楽しみください。"],
            win: ["勝利のロンド…貴方とのアンサンブル、実に甘美で優雅なひとときでございました。"],
            lose: ["ブラボー！…完璧な名曲を聴かせていただきました。私の指先、完全に沈黙いたしました。"]
        }
    },
    7: {
        id: 7, name: "伯爵夫人 エリザベート", rankLabel: "【上級・アマ初段】", title: "（薔薇の伯爵夫人）", icon: "🌹", image: "images/char4.png",
        imgFocus: "center 22%", themeColor: "#9b111e", themeGlow: "rgba(155, 17, 30, 0.65)",
        bookMaxPly: 6, depth: 5, exact: 0,
        salonName: "薔薇の舞踏会サロン", materialDesc: "黒瑪瑙 × 白蝶貝", boardDesc: "深紅ベルベット盤",
        thinkingBaseMs: 1050,
        quotes: {
            start: ["薔薇の舞踏会サロンへようこそ。手加減など野暮なことはいたしませんわ。"],
            thinking: ["ふふ… あなたの逃げ道を、少しずつ摘み取ってさしあげますわ。"],
            playerGood: ["あら…？ ずいぶんと小憎らしい手を打たれますこと。少し熱くなりましたわ。"],
            playerBad: ["うふふ… 甘いお方。わたくしの仕掛けた薔薇の棘に、自ら囚われましたわね。"],
            bigReversal: ["まあ！ わたくしの薔薇が一気に散らされるなんて…！"],
            cpuCorner: ["美しき角は、わたくしが優雅に頂戴いたしますわ。"],
            playerCorner: ["まあ！ わたくしの角を奪うなんて… 許せませんこと！"],
            climax: ["最後のワルツ… 存分に踊り明かしましょう。"],
            losing: ["まさか… わたくしが劣勢に立たされるなんて…！"],
            cpuPass: ["あら、打つ手がございませんの？ 待ってさしあげますわ。"],
            playerPass: ["あらあら、手詰まりですの？ 盤上はわたくしの意のままですわね。"],
            win: ["チェックメイト…美と知性の勝利ですわ。紅茶が冷めないうちに終わって良かったですこと。"],
            lose: ["お見事でございましたわ…！わたくしの薔薇をここまで散らす殿方に出会えるとは思いませんでしたわ。"]
        }
    },
    8: {
        id: 8, name: "近衛総督 フェルディナント", rankLabel: "【強豪有段・アマ三段】", title: "（歴戦の老将軍）", icon: "🛡️", image: "images/char10.png",
        imgFocus: "center 20%", themeColor: "#b56c36", themeGlow: "rgba(181, 108, 54, 0.7)",
        bookMaxPly: 8, depth: 6, exact: 8,
        salonName: "宮廷軍議作戦室", materialDesc: "赤銅石 × 白銀チタン", boardDesc: "ブロンズ盤",
        thinkingBaseMs: 1150,
        quotes: {
            start: ["盤上は戦場そのもの。我が重装軍団の鉄壁を破ってみせよ、若き将帥よ！"],
            thinking: ["敵の戦線を誘引し、包囲殲滅の機を窺う…緩着は許さん。"],
            playerGood: ["ほう… 前線の急所を突く見事な用兵！老躯を本気配備にさせるとはな！"],
            playerBad: ["愚かな突撃だな！ その一手で自らの退路を断ったと知れ！"],
            bigReversal: ["なにっ…！？ 我が防衛陣が一瞬で突破されただと…！？"],
            cpuCorner: ["要塞を制圧！ ここから反撃の鉄槌を下す！"],
            playerCorner: ["ぬうっ…！ 我が防衛ラインの要衝を奪われるとは…！"],
            climax: ["総力戦だ… 生死を賭けた決着をつけようぞ！"],
            losing: ["我が軍団が… ここまで押し返されるとは…！"],
            cpuPass: ["陣形を立て直す。貴殿の進軍を見届けよう。"],
            playerPass: ["包囲完了だ。退路を塞がれた敵に勝機はない。"],
            win: ["鉄壁の勝利だ！ 百戦錬磨の我が防衛線、付け焼き刃の策で破れるものか！"],
            lose: ["見事な統率力…！ 我が軍門に降ろう。貴殿こそ、王国全軍を率いるに相応しき名将だ！"]
        }
    },
    9: {
        id: 9, name: "宰相 ヴォルフガング", rankLabel: "【宮廷最強・アマ五段】", title: "（宮廷宰相）", icon: "📜", image: "images/char5.png",
        imgFocus: "center 24%", themeColor: "#4a154b", themeGlow: "rgba(74, 21, 75, 0.7)",
        bookMaxPly: 8, depth: 6, exact: 12,
        salonName: "宮廷宰相の深謀の間", materialDesc: "黒曜石 × 大理石", boardDesc: "黒大理石盤",
        thinkingBaseMs: 1200,
        quotes: {
            start: ["盤上の戦いは国家統治の縮図。冷徹な知略とパリティの前に、私情は無用だ。"],
            thinking: ["数手先の展開はすべて計算済みだ…パリティを維持する。"],
            playerGood: ["ほう… その急所を正確に見切っていたか。底知れぬ男だな。"],
            playerBad: ["愚策だな。その一手で自らの首を絞めたことに、まだ気づいておらんのか？"],
            bigReversal: ["なに…！？ 瞬時に盤面の均衡を崩しただと…！？"],
            cpuCorner: ["定石通り、この要所は我が手中に収めさせてもらった。"],
            playerCorner: ["我が計算の裏をかいて角を突いてくるとは…！"],
            climax: ["詰みだ… 貴公に逆転の筋は残されていない。"],
            losing: ["計算が… 狂ったというのか！？ この私が…！"],
            cpuPass: ["計算外だな… 一旦パスとして貴公の出方を窺おう。"],
            playerPass: ["置く場所がないか。貴公の戦略は完全に封殺されたのだ。"],
            win: ["偶数理論を制したのは私だ。数手前より貴公の敗北は決定していた。良き盤上遊戯であった。"],
            lose: ["この私が…読み負けたというのか！？…認めよう、貴公の知謀は国家の枠をも超越している。"]
        }
    },
    10: {
        id: 10, name: "老賢王 オルレアン", rankLabel: "【神域・全国名人】", title: "（至高の絶対君主）", icon: "👑", image: "images/char6.png",
        imgFocus: "center 20%", themeColor: "#ffd700", themeGlow: "rgba(255, 215, 0, 0.8)",
        bookMaxPly: 12, depth: 7, exact: 14,
        salonName: "至高の金箔玉座の間", materialDesc: "漆黒隕鉄 × 白玉翡翠", boardDesc: "金箔象嵌エメラルド盤",
        thinkingBaseMs: 1350,
        quotes: {
            start: ["我が玉座の盤上へよくぞ参った。そなたの知恵の深さ、余に余すところなく見せてみよ！"],
            thinking: ["盤上の森羅万象… 余の眼から逃れる手など存在せぬ。"],
            playerGood: ["見事…！ 実に見事な一手だ！ 久方ぶりに余の胸が高鳴っておるぞ！"],
            playerBad: ["迷いが出たな。王の威圧に呑まれては、盤上の真理は見えぬぞ。"],
            bigReversal: ["おお…！ 盤上が一変したか！ 実に豪快な一手よ！"],
            cpuCorner: ["天地の理に従い、余がこの角を統べようぞ！"],
            playerCorner: ["見事なり…！ 王の領域を奪う覚悟、しかと認めた！"],
            climax: ["神域の読み合い… 最後の決着をつけようぞ！"],
            losing: ["かっかっか！ よもや余が王手をかけられるとはな！ 痛快である！"],
            cpuPass: ["ふむ、風が凪いだか。静かに貴殿の次の一手を待とう。"],
            playerPass: ["道が閉ざされたか。焦るな、盤上の呼吸を整えるがよい。"],
            win: ["良き戦いであったぞ、若人よ！余の玉座は揺るがぬが、そなたの気概、しかと見届けたぞ！"],
            lose: ["天晴れだ…！王国の覇者たる資格、そなたへと託そうぞ！堂々の戴冠である！全臣民、勝者を讃えよ！"]
        }
    }
};

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
    if (DOM.versionBadge) {
        DOM.versionBadge.textContent = SYSTEM_VERSION_INFO.version;
    }
    if (DOM.chronicleTimeline && Array.isArray(SYSTEM_VERSION_INFO.history)) {
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

const getCurrentCharacter = () => CHARACTERS[Number(DOM.characterSelect.value) || 1] || CHARACTERS[1];

function renderCharacterAvatar() {
    const char = getCurrentCharacter();
    DOM.avatarImgBox.innerHTML = "";
    const img = new Image();
    img.src = char.image;
    img.alt = char.name;
    img.style.objectPosition = char.imgFocus || "center 20%";
    img.onload = () => { DOM.avatarImgBox.innerHTML = ""; DOM.avatarImgBox.appendChild(img); };
    img.onerror = () => { DOM.avatarImgBox.innerHTML = `<span class="avatar-fallback-icon">${char.icon}</span>`; };
}

/* ✨ セリフ発話演出（タイプライター中、文字全体がゆっくり点滅し喋り終わると静止） */
function typeWriterSpeech(fullText, isClimax) {
    if (typeWriterInterval) clearInterval(typeWriterInterval);
    DOM.speechText.textContent = "";
    DOM.opponentSpeech.classList.add("is-speaking");
    DOM.speechText.classList.add("is-typing-text");

    let index = 0;
    const total = fullText.length;
    typeWriterInterval = setInterval(() => {
        if (index < total) {
            DOM.speechText.textContent += fullText.charAt(index);
            index++;
        } else {
            clearInterval(typeWriterInterval);
            typeWriterInterval = null;
            DOM.opponentSpeech.classList.remove("is-speaking");
            DOM.speechText.classList.remove("is-typing-text"); // 発話完了で点滅を解除
        }
    }, 22);
}

function setOpponentQuote(category) {
    if (isReviewMode || isDemoMode) return;
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

    DOM.opponentSpeech.classList.toggle("is-climax", isClimax);
    DOM.opponentSpeech.style.animation = 'none';
    DOM.opponentSpeech.offsetHeight;
    DOM.opponentSpeech.style.animation = 'bubble-appear 0.28s ease-out';

    typeWriterSpeech(text, isClimax);

    const motionClass = `motion-char-${char.id}`;
    DOM.opponentAvatarFrame.classList.remove(motionClass);
    DOM.opponentAvatarFrame.offsetHeight;
    DOM.opponentAvatarFrame.classList.add(motionClass);

    DOM.opponentAvatarWrap.classList.remove("is-talking");
    DOM.opponentAvatarWrap.offsetHeight;
    DOM.opponentAvatarWrap.classList.add("is-talking");

    if (talkingTimeout) clearTimeout(talkingTimeout);
    talkingTimeout = setTimeout(() => {
        DOM.opponentAvatarWrap.classList.remove("is-talking");
        DOM.opponentAvatarFrame.classList.remove(motionClass);
    }, 850);
}

function updateOpponentStageUI(showBanner = true) {
    const char = getCurrentCharacter();
    document.documentElement.style.setProperty('--char-accent', char.themeColor);
    document.documentElement.style.setProperty('--char-glow', char.themeGlow);
    document.body.className = `stage-theme-${char.id}`;

    DOM.opponentRankBadge.textContent = `Lv.${char.id}`;
    DOM.opponentName.textContent = char.name;
    DOM.opponentTitle.textContent = `${char.rankLabel} ${char.title}`;

    DOM.opponentPieceIcon.className = `mini-piece-stone ${cpuColor === BLACK ? "piece-black" : "piece-white"}`;
    DOM.playerPieceIcon.className = `mini-piece-stone ${humanColor === BLACK ? "piece-black" : "piece-white"}`;

    DOM.badgeSalonName.textContent = char.salonName;
    DOM.badgeMaterial.textContent = char.materialDesc;

    renderCharacterAvatar();
    setOpponentQuote("start");

    if (showBanner && !isReviewMode && !isDemoMode) {
        if (curtainTimeout) clearTimeout(curtainTimeout);
        DOM.curtainStageLabel.textContent = `STAGE ${char.id}`;
        DOM.curtainSalonTitle.textContent = char.salonName;
        DOM.curtainRelicSub.textContent = `盤面：${char.boardDesc} / 石：${char.materialDesc}`;
        DOM.stageCurtainBanner.classList.add("show");
        curtainTimeout = setTimeout(() => DOM.stageCurtainBanner.classList.remove("show"), 1300);
    }
}

function updateBalanceGauge(targetBoard = board) {
    if (!targetBoard || isDemoMode) return;
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

    DOM.battlePowerPlayer.style.width = `${winratePlayer}%`;
    DOM.battleClashSpark.style.left = `${winratePlayer}%`;

    const char = getCurrentCharacter();
    const pIcon = (humanColor === BLACK) ? "⚫" : "⚪", cIcon = (cpuColor === BLACK) ? "⚫" : "⚪";
    DOM.battleStatPlayer.textContent = `${pIcon} あなた ${winratePlayer}%`;
    DOM.battleStatOpponent.textContent = `${winrateOpponent}% ${char.name.split(" ")[0]} ${cIcon}`;

    if (winratePlayer >= 75) DOM.battleSituationBadge.textContent = "⚖️ あなた 圧倒的優勢";
    else if (winratePlayer >= 58) DOM.battleSituationBadge.textContent = "⚖️ あなた 優勢";
    else if (winrateOpponent >= 75) DOM.battleSituationBadge.textContent = "⚖️ 相手 圧倒的優勢";
    else if (winrateOpponent >= 58) DOM.battleSituationBadge.textContent = "⚖️ 相手 優勢";
    else DOM.battleSituationBadge.textContent = "⚖️ 運命の天秤：互角";
}

function showMoveToast(type, text) {
    if (toastTimeout) clearTimeout(toastTimeout);
    DOM.moveToast.className = `move-toast toast-${type} show`;
    DOM.moveToast.textContent = text;
    const delay = (type === "finish") ? 1800 : (type === "pass" ? 1300 : 1200);
    toastTimeout = setTimeout(() => DOM.moveToast.classList.remove("show"), delay);
}
const hideMoveToast = () => { if (toastTimeout) clearTimeout(toastTimeout); DOM.moveToast.classList.remove("show"); };

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
    DOM.undoButton.disabled = (historyStack.length === 0) || isBusy || isAiThinkingHint || gameOver || isReviewMode || isDemoMode;
}

async function undoMove() {
    if (historyStack.length === 0 || isBusy || isAiThinkingHint || gameOver || isReviewMode || isDemoMode) return;
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

        DOM.opponentAvatarFrame.classList.remove("thinking-aura");

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
        if (step && step.move && !step.isPass) {
            seq.push(toNotation(step.move[0], step.move[1]));
        }
    }
    return seq.join("-");
}

function getBookMove(maxPly = 12) {
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
    exitBoardVisualDemo();
    currentGameSessionId++;
    cachedMoveEvaluations = null;
    isPrefetching = false;
    transpositionTable.clear();

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
    clearHint();

    recordGameStep(null, null, "対局開始時の初期配置です。右上(E4)と左下(D5)が黒、左上(D4)と右下(E5)が白です。");
    DOM.royalResultModal.classList.remove("show");
    DOM.endingModal.classList.remove("show");

    elapsedSeconds = playerSeconds = cpuSeconds = 0;
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        if (!gameOver && !isReviewMode && !isAiThinkingHint && !isDemoMode) {
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
        DOM.opponentAvatarFrame.classList.remove("thinking-aura");
        prefetchPlayerEvaluationsAsync();
    } else {
        setStatus("cpu-turn", "相手（黒）が先手です。思案中...");
        DOM.opponentAvatarFrame.classList.add("thinking-aura");
        setTimeout(computerMove, 600);
    }
}

const formatMinSec = (sec) => `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;
function updateTimerDisplay() {
    DOM.playerTime.textContent = `⏱️ ${formatMinSec(playerSeconds)}`;
    DOM.opponentTime.textContent = `⏱️ ${formatMinSec(cpuSeconds)}`;
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

    if (emptyCount === 0) {
        return (myStones - oppStones) * 10000;
    }

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

function negamax(targetBoard, player, depth, alpha, beta, emptyCount) {
    if (emptyCount === 0 || depth <= 0) {
        return evaluateBoard(targetBoard, player, emptyCount);
    }

    let boardKey = null;
    if (depth >= 4) {
        boardKey = `${player}:${targetBoard.map(r => r.join("")).join("")}:${depth}`;
        if (transpositionTable.has(boardKey)) {
            return transpositionTable.get(boardKey);
        }
    }

    const moves = getValidMoves(player, targetBoard);
    if (moves.length === 0) {
        const opp = opposite(player);
        const oppMoves = getValidMoves(opp, targetBoard);
        if (oppMoves.length === 0) {
            return evaluateBoard(targetBoard, player, 0);
        }
        return -negamax(targetBoard, opp, depth - 1, -beta, -alpha, emptyCount);
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

    if (boardKey && transpositionTable.size < 50000) {
        transpositionTable.set(boardKey, maxScore);
    }

    return maxScore;
}

/* ==========================================================================
  【ヒント探索：深さ8手（Lv.10超え）＋終盤14手読み】
========================================================================== */
async function prefetchPlayerEvaluationsAsync() {
    if (gameOver || isReviewMode || isDemoMode || currentPlayer !== humanColor || isPrefetching) return;
    const session = currentGameSessionId;
    isPrefetching = true;

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

        if (getHintMode() === "always" && currentPlayer === humanColor) {
            applyHintFromCache();
        }
        return;
    }

    const emptyCount = getEmptyCount(board);
    const depth = (emptyCount <= 14) ? emptyCount : 8;
    const scored = [];
    const sortedMoves = orderMoves(moves, board, humanColor);

    for (const move of sortedMoves) {
        if (session !== currentGameSessionId || currentPlayer !== humanColor) {
            isPrefetching = false;
            return;
        }
        await sleep(0);

        const next = cloneBoard(board);
        makeMove(next, move[0], move[1], humanColor);
        const score = -negamax(next, cpuColor, depth - 1, -Infinity, Infinity, emptyCount - 1);
        scored.push({ move, coord: toNotation(move[0], move[1]), score, isBook: false });
    }

    if (session !== currentGameSessionId || currentPlayer !== humanColor) {
        isPrefetching = false;
        return;
    }

    scored.sort((a, b) => b.score - a.score);
    const topScore = scored[0].score;

    const topCandidates = scored.filter(s => (topScore - s.score) <= 5);
    const chosen = topCandidates[Math.floor(Math.random() * topCandidates.length)];

    cachedMoveEvaluations = {
        moves,
        best: chosen.move,
        scoredMoves: scored,
        isBook: false
    };
    isPrefetching = false;

    if (getHintMode() === "always" && currentPlayer === humanColor) {
        applyHintFromCache();
    }
}

function applyHintFromCache() {
    if (!cachedMoveEvaluations || !cachedMoveEvaluations.best) return;
    const chosenMove = cachedMoveEvaluations.best;
    hintMove = chosenMove;
    const coordStr = toNotation(chosenMove[0], chosenMove[1]);
    DOM.hintCoordText.textContent = coordStr;

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

        if (reasons.length === 0) reasons.push("🎯 宮廷AIの深層読み（深さ8手）が導き出した最善手です。");
    }

    DOM.hintBodyText.innerHTML = reasons.map(r => `<div>${r}</div>`).join("");
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

async function putStone(row, col) {
    if (gameOver || isBusy || isAiThinkingHint || currentPlayer !== humanColor || isReviewMode || isDemoMode) return;
    if (!canPlace(row, col, humanColor, board)) return;

    saveHistory();
    isBusy = true;
    if (getHintMode() === "always") usedHintInGame = true;

    const boardBefore = cloneBoard(board);
    const emptyCount = getEmptyCount(board);
    const myAvailableMovesBefore = getValidMoves(humanColor, board);

    let objectiveBest = cachedMoveEvaluations ? cachedMoveEvaluations.best : null;
    let scoredList = cachedMoveEvaluations ? cachedMoveEvaluations.scoredMoves : [];

    if (!objectiveBest) {
        const bookEntry = getBestCounterBookMove();
        if (bookEntry) objectiveBest = bookEntry.move;
        else objectiveBest = myAvailableMovesBefore[0];
    }

    const chosenScoreObj = scoredList.find(s => s.move[0] === row && s.move[1] === col);
    const chosenScore = chosenScoreObj ? chosenScoreObj.score : 0;
    const topScore = scoredList[0] ? scoredList[0].score : 0;

    const actionPromise = executeTurnAction(row, col, humanColor, true);

    const isMatchedWithObjectiveBest = (objectiveBest && objectiveBest[0] === row && objectiveBest[1] === col);
    const isCornerMove = isCorner(row, col);
    const isX = isXSquare(row, col);
    const isC = isCSquare(row, col);
    const danger = isRealDanger(row, col, boardBefore);
    const flips = getFlippableStones(row, col, humanColor, boardBefore).length;

    let moveRating = "NORMAL";
    const scoreDiffFromBest = topScore - chosenScore;

    if (isMatchedWithObjectiveBest) {
        moveRating = "BEST";
        if (getHintMode() !== "off") showMoveToast("best", "🎯 最善手 (BEST)");
        setOpponentQuote("playerGood");
    } else if (isCornerMove) {
        moveRating = "GOOD";
        if (getHintMode() !== "off") showMoveToast("good", "⚜️ 好手 (GOOD)");
        setOpponentQuote("playerCorner");
    } else if (myAvailableMovesBefore.length > 1 && (danger || scoreDiffFromBest >= 500)) {
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
        const alt = objectiveBest ? `（正解手は【${toNotation(objectiveBest[0], objectiveBest[1])}】）` : "";
        if (danger && isX) contextNote += `【悪手】空いた角の斜め前（<span class="term-link" data-term="Xマス">Xマス</span>）に打ち、角を献上してしまいました${alt}。`;
        else if (danger && isC) contextNote += `【悪手】角の隣（<span class="term-link" data-term="Cマス">Cマス</span>）に打ち、相手に足場を与えてしまいました${alt}。`;
        else contextNote += `【悪手】相手に好機を与える危険な打点でした${alt}。`;
    }

    recordGameStep([row, col], humanColor, contextNote, objectiveBest, false);

    playerMoveLogs.push({
        row, col, coord,
        isCornerMove, isX, isC, danger, flips,
        rating: moveRating,
        isObjectiveBest: isMatchedWithObjectiveBest,
        scoreDiff: -scoreDiffFromBest,
        emptyCount,
        objectiveBest,
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
    DOM.hintCoordText.textContent = "--";
    DOM.hintBodyText.innerHTML = '<div class="hint-placeholder-text">相手の手番です（思案中…）</div>';
}

async function processTurn() {
    if (gameOver || isReviewMode || isDemoMode) return;
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
            DOM.opponentAvatarFrame.classList.remove("thinking-aura");

            if (getHintMode() === "always") {
                setStatus("hint-thinking", "💡 宮廷AIが最善手を思案中…");
            } else {
                setStatus("human-turn", `👑 あなたの番です（${pColorName}）…`);
            }
            triggerTurnPulse();
            prefetchPlayerEvaluationsAsync();
        } else {
            setStatus("cpu-turn", "相手が思考を巡らせています…");
            DOM.opponentAvatarFrame.classList.add("thinking-aura");
            setTimeout(computerMove, 500);
        }
        updateUndoButtonState();
        return;
    }

    const pColorName = (humanColor === BLACK) ? "黒" : "白";
    if (currentPlayer === humanColor) {
        DOM.opponentAvatarFrame.classList.remove("thinking-aura");

        if (getHintMode() === "always") {
            setStatus("hint-thinking", "💡 宮廷AIが最善手を思案中…");
        } else {
            setStatus("human-turn", `👑 あなたの番です（${pColorName}）…`);
        }
        triggerTurnPulse();
        drawBoard();
        updateBalanceGauge();
        prefetchPlayerEvaluationsAsync();
        updateUndoButtonState();
    } else {
        setStatus("cpu-turn", "相手が思考を巡らせています…");
        DOM.opponentAvatarFrame.classList.add("thinking-aura");
        computerMove();
    }
}

/* ==========================================================================
  【全10レベル思考エンジン（美麗難易度ピラミッド）】
========================================================================== */
function getComputerMove(targetBoard, player, charConfig) {
    const moves = getValidMoves(player, targetBoard);
    if (moves.length === 0) return null;
    if (moves.length === 1) return moves[0];

    // Lv.1 ピエロ（アマ12級）：約40%でX・Cマスに無邪気に飛びつく
    if (charConfig.id === 1) {
        const dangerMoves = moves.filter(([r, c]) => isRealDanger(r, c, targetBoard));
        if (dangerMoves.length > 0 && Math.random() < 0.40) {
            return dangerMoves[Math.floor(Math.random() * dangerMoves.length)];
        }
        return moves[Math.floor(Math.random() * moves.length)];
    }

    // Lv.2 コレット（アマ9級）：最多反転のみを選ぶ初級者
    if (charConfig.id === 2) {
        const corners = moves.filter(([r, c]) => isCorner(r, c));
        if (corners.length > 0) return corners[0];

        const scored = moves.map(m => ({ move: m, flips: getFlippableStones(m[0], m[1], player, targetBoard).length }));
        scored.sort((a, b) => b.flips - a.flips);
        const topFlips = scored[0].flips;
        const candidates = scored.filter(s => s.flips === topFlips);
        return candidates[Math.floor(Math.random() * candidates.length)].move;
    }

    // Lv.3 ルカ（アマ7級）：外側を囲いたがる（Xマス飛びつき20%）
    if (charConfig.id === 3) {
        const dangerMoves = moves.filter(([r, c]) => isRealDanger(r, c, targetBoard));
        if (dangerMoves.length > 0 && Math.random() < 0.20) {
            return dangerMoves[Math.floor(Math.random() * dangerMoves.length)];
        }
    }

    // Lv.5以上：定石データベース参照
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
    if (gameOver || isReviewMode || isDemoMode) return;
    const session = currentGameSessionId;

    clearHintForOpponentTurn();
    isBusy = true;
    updateUndoButtonState();
    setStatus("cpu-turn", "相手が思考を巡らせています…");
    DOM.opponentAvatarFrame.classList.add("thinking-aura");

    const char = getCurrentCharacter();
    const jitter = Math.floor((Math.random() * 200) - 100);
    const thinkingWaitMs = Math.max(400, (char.thinkingBaseMs || 850) + jitter);

    await sleep(thinkingWaitMs);
    if (session !== currentGameSessionId || gameOver || isReviewMode || isDemoMode) return;

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

    DOM.opponentAvatarFrame.classList.remove("thinking-aura");

    isBusy = false;
    currentPlayer = humanColor;
    processTurn();
}

function clearHint() {
    hintMove = null;
    DOM.hintCoordText.textContent = "--";
    DOM.hintBodyText.innerHTML = '<div class="hint-placeholder-text">「ヒント」ボタンを押すと最善手と思案理由が表示されます</div>';
}

const getHintMode = () => DOM.hintMode ? DOM.hintMode.value : "manual";

function updateHintModeUI() {
    const mode = getHintMode();
    DOM.hintButton.style.display = (mode === "manual") ? "" : "none";

    if (mode === "off") {
        DOM.hintFixedDisplay.classList.add("hint-mode-sealed");
        DOM.hintBadgeTag.textContent = "⚔️【真剣勝負モード】";
        DOM.hintCoordText.textContent = "--";
        DOM.hintBodyText.innerHTML = '<div class="hint-placeholder-text" style="color:#d4a748; font-weight:700;">己の知謀のみで挑む格式高き真剣勝負（指南封印中）</div>';
    } else {
        DOM.hintFixedDisplay.classList.remove("hint-mode-sealed");
        DOM.hintBadgeTag.textContent = "💡【宮廷AI指南・最善手】";
        if (mode === "always") {
            usedHintInGame = true;
            if (cachedMoveEvaluations && cachedMoveEvaluations.best) {
                applyHintFromCache();
            } else {
                prefetchPlayerEvaluationsAsync();
            }
        } else {
            clearHint();
        }
    }
    drawBoard();
}

async function computeHint() {
    if (gameOver || isBusy || currentPlayer !== humanColor || isReviewMode || isDemoMode) return;
    usedHintInGame = true;

    if (!cachedMoveEvaluations || !cachedMoveEvaluations.best) {
        setStatus("hint-thinking", "💡 宮廷AIが最善手を思案中…");
        await prefetchPlayerEvaluationsAsync();
    }

    applyHintFromCache();
}

function drawBoard() {
    DOM.board.querySelectorAll(".cell").forEach(cell => cell.remove());
    const previewClass = (humanColor === BLACK) ? "preview-black" : "preview-white";
    const isHintOff = (getHintMode() === "off");

    for (let r = 0; r < boardSize; r++) {
        for (let c = 0; c < boardSize; c++) {
            const cell = document.createElement("div");
            cell.className = "cell";

            if (!isDemoMode) {
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

                const isFlipping = !isDemoMode && !isReviewMode && pendingAnimation && pendingAnimation.flipped.some(([fr, fc]) => fr === r && fc === c);
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
                    if (!isDemoMode && !isReviewMode && pendingAnimation && pendingAnimation.placedRow === r && pendingAnimation.placedCol === c) {
                        stone.classList.add("stone-new");
                    }
                    wrapper.appendChild(stone);
                }
                cell.appendChild(wrapper);
            }

            if (!isReviewMode && !isDemoMode) {
                cell.addEventListener("click", () => putStone(r, c));
            }
            DOM.board.appendChild(cell);
        }
    }

    pendingAnimation = null;
    updateScore();
    DOM.hintButton.disabled = gameOver || isBusy || isAiThinkingHint || currentPlayer !== humanColor || isReviewMode || isHintOff || isDemoMode;
}

function updateScore(targetBoard = board) {
    const stats = getBoardStats(targetBoard);
    DOM.opponentScore.textContent = (cpuColor === BLACK) ? stats.black : stats.white;
    DOM.playerScore.textContent = (humanColor === BLACK) ? stats.black : stats.white;
}

function generateTacticsReport() {
    if (playerMoveLogs.length === 0) {
        return {
            diagnosis: "対局記録が不足しているため診断できません。",
            goodCoord: "--", goodDesc: "記録された着手データがありません。",
            badCoord: "--", badDesc: "記録された着手データがありません。",
            goodStep: -1, badStep: -1, alternative: null
        };
    }

    let best = playerMoveLogs[0];
    for (const log of playerMoveLogs) {
        if (log.isObjectiveBest) { best = log; break; }
    }

    let goodDesc = `【最善手】定石および深層読み（深さ8手）に合致した隙のない完璧な一打でした。`;
    if (best.isCornerMove) {
        goodDesc = `【四隅の角を制圧】絶対に裏返らない<span class="term-link" data-term="確定石">確定石</span>の拠点を確保し、戦局の主導権を完全に掌握しました。`;
    }

    const badMoves = playerMoveLogs.filter(log => log.rating === "BAD" && !log.isCornerMove && !log.isObjectiveBest);
    let worst = badMoves.length > 0 ? badMoves[0] : null;

    let badCoord = "--", badDesc = "", badStep = -1, alternative = null;

    if (worst) {
        badCoord = worst.coord;
        badStep = worst.stepIndex;
        alternative = worst.objectiveBest;
        const altNotation = alternative ? `【${toNotation(alternative[0], alternative[1])}】` : "内側の安全なマス";

        if (worst.danger && worst.isX) {
            badDesc = `【角を献上する危険手】空いた角の斜め前（<span class="term-link" data-term="Xマス">Xマス</span>）に打ったため、相手に角を奪われる致命的な足場を与えてしまいました。正解手は${altNotation}でした。`;
        } else if (worst.danger && worst.isC) {
            badDesc = `【角を取られやすくなる悪手】角の隣（<span class="term-link" data-term="Cマス">Cマス</span>）に打ったため、相手に角を突く好機を与えてしまいました。正解手は${altNotation}でした。`;
        } else {
            badDesc = `【陣形を崩した悪手】相手に好機を与えてしまいました。ここは${altNotation}へ<span class="term-link" data-term="中割り">中割り</span>するのが最善でした。`;
        }
    } else {
        badCoord = "なし (NONE)";
        badDesc = "致命的な悪手はなく、終始安定感のある落ち着いた完璧な打ち回しでした。";
    }

    tacticsBestIndex = best.stepIndex;
    tacticsWorstIndex = badStep;
    tacticsWorstAlternative = alternative;

    let diagnosis = worst === null
        ? "【総合診断】宮廷の歴史に残る完全無欠の知謀です！失着が一切見当たりません。"
        : "【総合診断】中盤の要所での一手が勝敗の分岐点となりました。「悪手へ」ボタンから正解手筋を復習できます。";

    return {
        diagnosis,
        goodCoord: best.coord, goodDesc, goodStep: best.stepIndex,
        badCoord, badDesc, badStep, alternative
    };
}

/* ==========================================================================
  【👁️ 盤面ビジュアル解説モード（プレイヤー目線改善＆2コマシミュレーション）】
========================================================================== */
function attachDemoBadge(r, c, text, className) {
    const cell = DOM.board.children[r * 8 + c];
    if (!cell) return;
    const badge = document.createElement("div");
    badge.className = className;
    badge.textContent = text;
    cell.appendChild(badge);
}

function triggerBoardVisualDemo(demoType) {
    if (isDemoMode) exitBoardVisualDemo();

    savedBoardStateForDemo = {
        board: cloneBoard(board),
        currentPlayer, lastMove,
        statusType: DOM.status.className,
        statusText: DOM.status.textContent
    };

    isDemoMode = true;
    currentDemoType = demoType;
    currentDemoStep = 1;
    closeTermPopup();
    DOM.guideOverlay.classList.remove("show");
    document.body.classList.remove("modal-open-lock");

    DOM.normalControlCard.style.display = "none";
    DOM.demoGuideCard.classList.add("show");

    const dict = TERMS_DICTIONARY[demoType] || {
        title: `👁️ ${demoType}の解説`,
        situation: "オセロの基本局面です。",
        reason: "盤面の要所を理解することで勝率が劇的に上がります。",
        maxim: "『基本を制する者がオセロを制す』",
        simBtnText: "変化を見る ▶"
    };

    DOM.demoGuideTitle.textContent = dict.title;
    DOM.demoSituationText.textContent = dict.situation;
    DOM.demoGuideReason.textContent = dict.reason;
    DOM.demoMaximText.textContent = dict.maxim;
    DOM.btnDemoSimulate.textContent = dict.simBtnText || "相手の番をシミュレート ▶";

    setStatus("hint-thinking", `👁️ 盤面ビジュアル解説中：【${demoType}】（下のボタンで対局に復帰できます）`);

    renderDemoBoardStep(demoType, 1);
}

function renderDemoBoardStep(demoType, step) {
    currentDemoStep = step;
    board = Array.from({ length: 8 }, () => Array(8).fill(0));

    if (demoType === "角・X・C") {
        if (step === 1) {
            // 初期状態：黒がB2（Xマス）に打ってしまった
            board[2][2] = BLACK; board[3][3] = WHITE; board[3][4] = BLACK;
            board[4][3] = BLACK; board[4][4] = WHITE;
            board[1][1] = BLACK; // Xマス
            drawBoard();

            cornerSquares.forEach(([cr, cc]) => attachDemoBadge(cr, cc, "👑 角", "demo-badge-corner"));
            [[1,1]].forEach(([xr, xc]) => attachDemoBadge(xr, xc, "⚠️ Xマス(打点)", "demo-badge-x"));
            [[0,1],[1,0]].forEach(([cr, cc]) => attachDemoBadge(cr, cc, "⚠️ Cマス", "demo-badge-c"));
        } else {
            // シミュレーション：白にA1角を取られて黒が挟まれる
            board[0][0] = WHITE; // 角確保
            board[1][1] = WHITE; board[2][2] = WHITE;
            board[3][3] = WHITE; board[3][4] = BLACK;
            board[4][3] = BLACK; board[4][4] = WHITE;
            drawBoard();

            attachDemoBadge(0, 0, "👑 角奪取！", "demo-badge-corner");
            attachDemoBadge(1, 1, "💀 取られたX", "demo-badge-x");
            DOM.demoSituationText.textContent = "白にA1の角を取られ、斜めの石がすべて白に裏返ってしまいました！";
            DOM.demoGuideReason.textContent = "角を取られると相手の確定石となり、二度と取り返すことができません。";
        }
    } else if (demoType === "中割り") {
        if (step === 1) {
            board[2][3] = BLACK; board[2][4] = WHITE;
            board[3][2] = BLACK; board[3][3] = WHITE; board[3][4] = WHITE; board[3][5] = BLACK;
            board[4][2] = BLACK; board[4][3] = WHITE; board[4][4] = BLACK; board[4][5] = BLACK;
            board[5][3] = BLACK; board[5][4] = BLACK;
            drawBoard();

            attachDemoBadge(3, 4, "🎯 ここ！(E4)", "demo-badge-cut");
        } else {
            // E4に打って内側の石だけを返した状態
            board[2][3] = BLACK; board[2][4] = WHITE;
            board[3][2] = BLACK; board[3][3] = BLACK; board[3][4] = BLACK; board[3][5] = BLACK;
            board[4][2] = BLACK; board[4][3] = BLACK; board[4][4] = BLACK; board[4][5] = BLACK;
            board[5][3] = BLACK; board[5][4] = BLACK;
            drawBoard();

            attachDemoBadge(3, 3, "🌱 内側だけ反転", "demo-badge-cut");
            DOM.demoSituationText.textContent = "内側の白石だけが黒になり、外側の境界線は一切広がっていません！";
            DOM.demoGuideReason.textContent = "外側に黒石が露出しないため、白（相手）は次に打てるマスがありません。";
        }
    } else if (demoType === "壁") {
        if (step === 1) {
            for (let c = 1; c <= 6; c++) board[1][c] = WHITE;
            board[2][2] = WHITE; board[2][3] = BLACK; board[2][4] = BLACK;
            drawBoard();

            for (let c = 1; c <= 6; c++) attachDemoBadge(1, c, "🧱 壁", "demo-badge-wall");
        } else {
            // 黒に外側から囲まれる
            for (let c = 1; c <= 6; c++) board[1][c] = WHITE;
            board[0][2] = BLACK; board[0][3] = BLACK; board[0][4] = BLACK;
            board[2][2] = WHITE; board[2][3] = BLACK; board[2][4] = BLACK;
            drawBoard();

            attachDemoBadge(0, 3, "🎯 相手の足場", "demo-badge-cut");
            DOM.demoSituationText.textContent = "壁の外側を黒に囲まれ、白の打てる場所が完全に消滅しました。";
            DOM.demoGuideReason.textContent = "外側に一直線に石を並べると、相手に無数の打点を与える最悪の敗着となります。";
        }
    } else if (demoType === "パリティ") {
        board[3][3] = WHITE; board[3][4] = BLACK;
        board[4][3] = BLACK; board[4][4] = WHITE;
        drawBoard();

        attachDemoBadge(0, 1, "偶数(2空き)", "demo-badge-even");
        attachDemoBadge(0, 2, "偶数(2空き)", "demo-badge-even");
        attachDemoBadge(0, 5, "奇数(1空き)", "demo-badge-odd");
    } else if (demoType === "定石") {
        board[3][3] = BLACK; board[3][4] = BLACK;
        board[4][3] = BLACK; board[4][4] = WHITE;
        board[4][5] = BLACK; board[5][5] = WHITE;
        board[3][2] = BLACK;
        drawBoard();

        attachDemoBadge(3, 2, "🐮 牛定石C4", "demo-badge-cut");
    } else {
        board[0][0] = BLACK; board[0][1] = BLACK; board[0][2] = BLACK;
        board[1][0] = BLACK; board[2][0] = BLACK;
        drawBoard();

        attachDemoBadge(0, 0, "👑 角(絶対安全)", "demo-badge-corner");
        attachDemoBadge(0, 1, "💎 確定石", "demo-badge-corner");
        attachDemoBadge(1, 0, "💎 確定石", "demo-badge-corner");
    }
}

function exitBoardVisualDemo() {
    if (!isDemoMode || !savedBoardStateForDemo) return;
    board = cloneBoard(savedBoardStateForDemo.board);
    currentPlayer = savedBoardStateForDemo.currentPlayer;
    lastMove = savedBoardStateForDemo.lastMove;

    DOM.status.className = savedBoardStateForDemo.statusType;
    DOM.status.textContent = savedBoardStateForDemo.statusText;

    isDemoMode = false;
    currentDemoType = null;
    currentDemoStep = 1;
    savedBoardStateForDemo = null;

    DOM.demoGuideCard.classList.remove("show");
    DOM.normalControlCard.style.display = "";

    drawBoard();
    updateBalanceGauge();
    updateUndoButtonState();
}

if (DOM.btnExitDemoMain) DOM.btnExitDemoMain.addEventListener("click", exitBoardVisualDemo);
if (DOM.btnDemoSimulate) {
    DOM.btnDemoSimulate.addEventListener("click", () => {
        if (!isDemoMode || !currentDemoType) return;
        const nextStep = (currentDemoStep === 1) ? 2 : 1;
        renderDemoBoardStep(currentDemoType, nextStep);
        DOM.btnDemoSimulate.textContent = (nextStep === 2) ? "◀ 最初の局面に戻す" : (TERMS_DICTIONARY[currentDemoType]?.simBtnText || "相手の番をシミュレート ▶");
    });
}

window.triggerBoardVisualDemo = triggerBoardVisualDemo;

/* ==========================================================================
  【ミニ解説ポップアップ＆思案所宝典連動】
========================================================================== */
let activePopupTerm = null;

function showTermPopup(termKey, event) {
    if (!TERMS_DICTIONARY[termKey]) return;
    const termData = TERMS_DICTIONARY[termKey];
    activePopupTerm = termKey;

    DOM.termPopupTitle.textContent = termData.title;
    DOM.termPopupBody.textContent = termData.desc;

    const popup = DOM.termPopup;
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
    DOM.termPopup.style.display = "none";
    activePopupTerm = null;
}

if (DOM.termPopupClose) {
    DOM.termPopupClose.addEventListener("click", (e) => {
        e.stopPropagation();
        closeTermPopup();
    });
}

if (DOM.termPopupDemoBtn) {
    DOM.termPopupDemoBtn.addEventListener("click", () => {
        if (!activePopupTerm || !TERMS_DICTIONARY[activePopupTerm]) return;
        const demoType = TERMS_DICTIONARY[activePopupTerm].demoType;
        triggerBoardVisualDemo(demoType);
    });
}

if (DOM.termPopupMore) {
    DOM.termPopupMore.addEventListener("click", () => {
        if (!activePopupTerm || !TERMS_DICTIONARY[activePopupTerm]) return;
        const targetSecId = TERMS_DICTIONARY[activePopupTerm].tabSec;
        closeTermPopup();

        DOM.guideOverlay.classList.add("show");
        document.body.classList.add("modal-open-lock");

        manualTabBtns.forEach(b => b.classList.toggle("active", b.dataset.tab === "tab-terms"));
        manualTabContents.forEach(c => c.classList.toggle("active", c.id === "tab-terms"));

        const secEl = document.getElementById(targetSecId);
        if (secEl) {
            setTimeout(() => secEl.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
        }
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

    DOM.archStatWinrate.textContent = `${totalGenuineGames}戦 ${winrate}%`;
    DOM.archStatWld.textContent = `${wins}勝-${loses}敗-${draws}分`;
    DOM.archStatStreak.textContent = `${currentStreak} / ${maxStreak}連勝`;
    DOM.archStatBestRate.textContent = `${avgBestRate}%`;

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
    DOM.archiveOverlay.classList.add("show");
    document.body.classList.add("modal-open-lock");
}

function closeArchiveModal() {
    DOM.archiveOverlay.classList.remove("show");
    document.body.classList.remove("modal-open-lock");
}

/* 終局処理（ヒント使用時の自力勝負を促す熱いセリフ分岐を反映） */
function endGame() {
    gameOver = true;
    isBusy = false;
    clearHint();
    cachedMoveEvaluations = null;
    isPrefetching = false;
    if (timerInterval) clearInterval(timerInterval);
    if (typeWriterInterval) clearInterval(typeWriterInterval);

    DOM.opponentAvatarFrame.classList.remove("thinking-aura");
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

    DOM.resultAvatarFrame.innerHTML = "";
    const bigImg = new Image();
    bigImg.src = char.image;
    bigImg.alt = char.name;
    bigImg.style.objectPosition = char.imgFocus || "center 20%";
    bigImg.onload = () => { DOM.resultAvatarFrame.innerHTML = ""; DOM.resultAvatarFrame.appendChild(bigImg); };
    bigImg.onerror = () => { DOM.resultAvatarFrame.innerHTML = `<span style="font-size: 56px; color:#ffd700;">${char.icon}</span>`; };

    DOM.resultCharNameBadge.textContent = `${char.name} ${char.rankLabel}（${char.salonName}）`;
    DOM.resultStonesDetail.textContent = `⚫ ${stats.black} vs ${stats.white} ⚪`;
    DOM.resultTimesDetail.textContent = `あなた ${formatMinSec(playerSeconds)} / 相手 ${formatMinSec(cpuSeconds)}`;

    let quoteText = "";

    if (isWin) {
        DOM.resultMainTitle.className = "result-main-title result-title-win";
        DOM.resultMainTitle.textContent = "👑 完全勝利 (VICTORY)";
        setStatus("win", "👑 栄光の勝利！ あなたの勝ちです！");
        setOpponentQuote("lose");

        DOM.opponentStatusTag.className = "opponent-status-tag tag-opponent-surrendered";
        DOM.opponentStatusTag.textContent = `【対戦相手】${char.name}（降参・完敗）`;
        DOM.resultAvatarFrame.classList.add("opponent-lost-filter");

        if (usedHintInGame) {
            if (char.id === 1) {
                quoteText = `見事な勝利でゴザイマス…が！ AIの指南（ヒント）を借りての勝利でしたネ！ 次回はぜひ【ヒントなし（自力真剣勝負）】でボクに挑んでみてくだサイ！`;
            } else if (char.id === 2) {
                quoteText = `私の負けですっ…でも、AI先生のヒントを借りていましたよね？ 次はぜひ、自力勝負で私とお手合わせしてくださいねっ！`;
            } else if (char.id === 3) {
                quoteText = `見事な大樹の完成…だけど、AIの肥料（ヒント）があったみたいだね！ 今度はぜひ、貴方様自身の知恵だけで咲かせてみせて！`;
            } else if (char.id === 4) {
                quoteText = `ふむ…AIの計算式をトレースしての勝利ですね。貴殿本来の知性を証明するためにも、次は完全自力で方程式を解いてみせてください。`;
            } else if (char.id === 5) {
                quoteText = `見事な太刀筋だが…AI指南役の助力を得ていたようだな！ 貴殿の真の武勇を示すならば、次は己の太刀のみで我と立ち合われよ！`;
            } else if (char.id === 6) {
                quoteText = `素晴らしい調べでした…ですが、AIの楽譜（ヒント）をチラリとご覧になられたようですね？ 次はぜひ、貴方の完全即興曲を聴かせてください！`;
            } else if (char.id === 7) {
                quoteText = `お見事でしたわ…ですが、AIの知恵を借りての薔薇摘みでしたのね。次はぜひ、殿方お一人のお力でわたくしを跪かせてごらんなさい。`;
            } else if (char.id === 8) {
                quoteText = `見事な用兵だが、軍師（AI）の助言あっての勝利だな！ 歴戦の老将を心服させたいならば、次は己の武謀のみで我が防衛陣を破ってみせよ！`;
            } else if (char.id === 9) {
                quoteText = `この私が敗れたか…だが、宮廷AIの計算力を借りていたようだな。真に国家の深謀を制したいならば、次は一切の指南を排して私に挑まれよ。`;
            } else {
                quoteText = `ふむ…宮廷AIの知恵を借りて余を破ったか。真の覇王として戴冠するには、己の知謀のみで余に勝たねばならん。ヒントなしの真剣勝負で余を打ち破ってみせよ！`;
            }
        } else {
            quoteText = Array.isArray(char.quotes.lose) ? char.quotes.lose[Math.floor(Math.random() * char.quotes.lose.length)] : char.quotes.lose;
        }
    } else if (isDraw) {
        DOM.resultMainTitle.className = "result-main-title result-title-draw";
        DOM.resultMainTitle.textContent = "⚖️ 格式高き引き分け (DRAW)";
        setStatus("draw", "⚖️ ゲーム終了！ 格式高き引き分けです。");

        DOM.opponentStatusTag.className = "opponent-status-tag tag-opponent-surrendered";
        DOM.opponentStatusTag.textContent = `【対戦相手】${char.name}（互角の勝負）`;
        DOM.resultAvatarFrame.classList.remove("opponent-lost-filter");
        quoteText = "見事な勝負… まさに互角の知略であったな。";
    } else {
        DOM.resultMainTitle.className = "result-main-title result-title-lose";
        DOM.resultMainTitle.textContent = "🥀 惜敗… 無念の敗北 (DEFEAT)";
        setStatus("lose", "🥀 惜敗… 相手の勝利です。");
        setOpponentQuote("win");

        DOM.opponentStatusTag.className = "opponent-status-tag tag-opponent-triumphant";
        DOM.opponentStatusTag.textContent = `【対戦相手】${char.name}（会心の勝利）`;
        DOM.resultAvatarFrame.classList.remove("opponent-lost-filter");
        quoteText = Array.isArray(char.quotes.win) ? char.quotes.win[Math.floor(Math.random() * char.quotes.win.length)] : char.quotes.win;
    }

    DOM.resultQuoteBox.textContent = `「${quoteText}」`;

    const report = generateTacticsReport();
    DOM.carteDiagnosis.textContent = report.diagnosis;
    DOM.carteGoodCoord.textContent = report.goodCoord;
    DOM.carteGoodDesc.innerHTML = report.goodDesc;
    DOM.carteBadCoord.textContent = report.badCoord;
    DOM.carteBadDesc.innerHTML = report.badDesc;

    if (usedHintInGame && !isWin) {
        if (DOM.carteHintAdvice) {
            DOM.carteHintAdvice.style.display = "block";
            DOM.carteHintAdvice.innerHTML = `
                <div class="carte-hint-advice-title">💡【宮廷AI指南役からの伝言】</div>
                <div>有段・名人の域では、極限の読み合いにより先後差やわずかな展開で結果が分かれることがございます。本指南AIの勝率は<b>95%以上</b>を誇り、貴方様の着手は決して間違っておりません。白番では「斜め取り（馬定石）」や「平行取り（虎定石）」などの変化も有効です。次は必ずや勝利へとお導きいたしますので、ぜひもう一度お挑みください！</div>
            `;
        }
    } else {
        if (DOM.carteHintAdvice) {
            DOM.carteHintAdvice.style.display = "none";
        }
    }

    recordGameResultToArchive(isWin, isDraw, hStones, cStones, char);

    if (isWin) {
        if (usedHintInGame) {
            DOM.btnAdvanceIcon.textContent = "👑";
            DOM.btnAdvanceText.textContent = `ヒントなし（自力勝負）で ${char.name.split(" ")[0]} と再戦`;
            DOM.btnResultAdvance.onclick = () => {
                DOM.hintMode.value = "off";
                updateHintModeUI();
                DOM.royalResultModal.classList.remove("show");
                document.body.classList.remove("modal-open-lock");
                startGame();
            };
        } else {
            if (char.id < 10) {
                const nextChar = CHARACTERS[char.id + 1];
                DOM.btnAdvanceIcon.textContent = "⚔️";
                DOM.btnAdvanceText.textContent = `次の強敵へ挑む（Lv.${nextChar.id} ${nextChar.name} ${nextChar.rankLabel}）`;
                DOM.btnResultAdvance.onclick = () => {
                    DOM.characterSelect.value = char.id + 1;
                    DOM.royalResultModal.classList.remove("show");
                    document.body.classList.remove("modal-open-lock");
                    startGame();
                };
            } else {
                DOM.btnAdvanceIcon.textContent = "🏆";
                DOM.btnAdvanceText.textContent = "全10豪傑完全制覇！ 栄光の戴冠式へ";
                DOM.btnResultAdvance.onclick = () => {
                    DOM.royalResultModal.classList.remove("show");
                    DOM.endingModal.classList.add("show");
                };
            }
        }
    } else {
        DOM.btnAdvanceIcon.textContent = "⚜️";
        DOM.btnAdvanceText.textContent = "雪辱を期す（再戦を挑む）";
        DOM.btnResultAdvance.onclick = () => {
            DOM.royalResultModal.classList.remove("show");
            document.body.classList.remove("modal-open-lock");
            startGame();
        };
    }

    setTimeout(() => {
        DOM.royalResultModal.classList.add("show");
        document.body.classList.add("modal-open-lock");
    }, 1400);
}

function enterReviewMode() {
    if (gameStepLogs.length === 0 || isDemoMode) return;
    isReviewMode = true;
    DOM.royalResultModal.classList.remove("show");
    document.body.classList.remove("modal-open-lock");
    DOM.normalControlCard.style.display = "none";
    DOM.reviewModePanel.classList.add("show");

    DOM.btnJumpGood.disabled = (tacticsBestIndex < 0);
    DOM.btnJumpBad.disabled = (tacticsWorstIndex < 0);

    reviewStepIndex = gameStepLogs.length - 1;
    applyReviewStep(reviewStepIndex);
    setStatus("human-turn", "🔍 棋譜検証モード：対局の全手筋を検証中");
}

function exitReviewMode() {
    isReviewMode = false;
    DOM.reviewModePanel.classList.remove("show");
    DOM.normalControlCard.style.display = "";
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
    DOM.reviewTurnInfo.textContent = `第 ${index} 手 / 全 ${totalSteps} 手`;

    DOM.btnReviewPrev.disabled = (index === 0);
    DOM.btnReviewNext.disabled = (index === totalSteps);

    let contextText = step.contextNote || "棋譜の一手です。";
    if (index === tacticsBestIndex && index > 0) {
        contextText = `🎯【最善手】${contextText}（ここでの的確な着手が戦局を決定づけました）`;
    } else if (index === tacticsWorstIndex && index > 0) {
        const altMsg = tacticsWorstAlternative ? `（💡正解手【${toNotation(tacticsWorstAlternative[0], tacticsWorstAlternative[1])}】を金枠で表示中）` : "";
        contextText = `⚠️【悪手】${contextText} ${altMsg}`;
    }
    DOM.reviewContextBox.innerHTML = contextText;

    const char = getCurrentCharacter();
    if (index === 0) {
        DOM.speechText.textContent = "【初期配置】対局開始時の盤面です。";
    } else if (step.isPass) {
        DOM.speechText.textContent = `【第 ${index} 手】${step.contextNote}`;
    } else if (step.move) {
        const coord = toNotation(step.move[0], step.move[1]);
        if (step.playerColor === humanColor) {
            if (index === tacticsWorstIndex) {
                DOM.speechText.textContent = `【第 ${index} 手・検証】あなたの打点（❌${coord}）と推奨された正解手（💡金枠）を対比しています。`;
            } else {
                DOM.speechText.textContent = `【第 ${index} 手】あなたの着手（${coord}）を検証しています。`;
            }
        } else {
            DOM.speechText.textContent = `【第 ${index} 手】${char.name}の応手（${coord}）を検証しています。`;
        }
    }

    updateScore(board);
    updateBalanceGauge(board);
    drawBoard();
}

/* イベントリスナー */
document.getElementById("restartButton").addEventListener("click", startGame);
DOM.undoButton.addEventListener("click", undoMove);
DOM.hintButton.addEventListener("click", computeHint);
DOM.btnStartReview.addEventListener("click", enterReviewMode);

DOM.btnReviewPrev.addEventListener("click", () => {
    if (reviewStepIndex > 0) applyReviewStep(reviewStepIndex - 1);
});

DOM.btnReviewNext.addEventListener("click", () => {
    if (reviewStepIndex < gameStepLogs.length - 1) applyReviewStep(reviewStepIndex + 1);
});

DOM.btnJumpGood.addEventListener("click", () => {
    if (tacticsBestIndex >= 0) applyReviewStep(tacticsBestIndex);
});

DOM.btnJumpBad.addEventListener("click", () => {
    if (tacticsWorstIndex >= 0) applyReviewStep(tacticsWorstIndex);
});

DOM.btnReviewExit.addEventListener("click", () => {
    applyReviewStep(gameStepLogs.length - 1);
    DOM.royalResultModal.classList.add("show");
    document.body.classList.add("modal-open-lock");
});

DOM.btnRestartFromBeginning.addEventListener("click", () => {
    DOM.endingModal.classList.remove("show");
    document.body.classList.remove("modal-open-lock");
    DOM.characterSelect.value = "1";
    startGame();
});

DOM.characterSelect.addEventListener("change", () => {
    updateOpponentStageUI(true);
    startGame();
});

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

DOM.hintMode.addEventListener("change", updateHintModeUI);

if (DOM.archiveOpenBtn) DOM.archiveOpenBtn.addEventListener("click", openArchiveModal);
if (DOM.btnResultArchive) DOM.btnResultArchive.addEventListener("click", () => {
    DOM.royalResultModal.classList.remove("show");
    document.body.classList.remove("modal-open-lock");
    openArchiveModal();
});
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
        if (isDemoMode) exitBoardVisualDemo();
    }
});

/* 初期化実行 */
renderSystemVersionInfo();
initCoordLabels();
if (DOM.characterSelect) {
    DOM.characterSelect.value = determineInitialCharacterLevel();
}
startGame();
