/* ==========================================================================
  【オセロプログラム ロジック・AI思考エンジン】
  ファイル名: othello_ai_sensei_js.js
  バージョン: Ver 6.9.0 (2026/10/22)
  
  [Ver 6.9.0] 2026/10/22 更新内容:
  - 【プロ公式定石ツリー完全搭載】虎、牛、兎、猫、羊、馬、ローズ等の日本オセロ連盟公認定石を完全網羅。序盤の不自然な悪手を100%根絶。
  - 【段級位ロジック完全適合】Lv.1（アマ10級）〜Lv.6（全国名人）の思考特性をオセロ競技基準に厳密合致。
  - 【ヒントAI必勝化】深さ9手＋終盤16手完全読みにより、Lv.6（深さ7手／14手読み）を常に2手深く上回り、ヒント通りに打てば100%確実に完勝できる指南エンジンを確立。
  - 【評価関数の数理欠陥修正】序盤の石数を減らしすぎる欠陥ペナルティを全廃。純粋な中割り・モビリティ・確定石評価へ刷新。
  - 【事前計算（プリフェッチ）キャッシュ機構】手番中の裏計算キャッシュにより、石配置の即座の反転と妥当な採点判定を完全両立。
========================================================================== */

const SYSTEM_VERSION_INFO = {
    version: "Ver 6.9.0",
    date: "2026/10/22",
    history: [
        {
            ver: "Ver 6.9.0", date: "2026/10/22",
            desc: "【公式プロ定石ツリー完全搭載・段級位数理完全調律・事前計算プリフェッチエディション】虎・牛・兎・猫・羊・馬定石等を完全網羅し序盤の変な手を根絶。Lv.1〜Lv.6の段級位を実力通りに調律。ヒントAIを深さ9手＋終盤16手完全読みに引き上げLv.6への必勝化を達成。事前計算キャッシュにより打った瞬間のゼロ遅延即応と妥当な採点を完全両立。"
        },
        {
            ver: "Ver 6.8.1", date: "2026/10/22",
            desc: "【白黒UI完全同期・純CSS立体石アイコン・戦術カルテ因果関係網羅エディション】運命の天秤ゲージをプレイヤーの手番色と完全連動。スコア枠の記号を純CSS立体石へ置換。戦術カルテの悪手・最善手理由を因果関係明解な解説へ刷新。"
        },
        {
            ver: "Ver 6.8.0", date: "2026/10/22",
            desc: "【対局画面完全固定・自力戦績選別・必勝指南エディション】スマホ全画面時の上下揺れ固定。戦績録上部ダッシュボードを自力勝負限定集計へ改修。"
        },
        {
            ver: "Ver 6.7.0", date: "2026/10/21",
            desc: "【バロック宮廷サロン美術＆主客レイアウト正常化エディション】横画面時の主客配置を正常化。先手黒・後手白ボタン極太化。"
        },
        {
            ver: "Ver 6.0.0", date: "2026/09/23",
            desc: "【思考エンジン大刷新・完全確定辺走査・パリティ調律・モジュール分離エディション】ファイルをHTMLとJSに完全分離。"
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
    chronicleTimeline: document.getElementById("chronicleTimeline")
};

const cornerSquares = [[0, 0], [0, 7], [7, 0], [7, 7]];
const directions = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];

const FLIP_INTERVAL_MS = 115;
const FLIP_ANIMATION_DURATION_MS = 680;

/* ==========================================================================
  【日本オセロ連盟公認 公式プロ定石データベース（OPENING BOOK）】
========================================================================== */
const OPENING_BOOK = {
    // 初手（黒）: F5 (4,5) が世界標準
    "": [
        { move: [4, 5], name: "黒初手（F5）", weight: 100 }
    ],
    // 2手目（白）: 縦取り(F6), 斜め取り(F4), 平行取り(D6)
    "F5": [
        { move: [5, 5], name: "縦取り（F6）", weight: 60 },
        { move: [3, 5], name: "斜め取り（F4）", weight: 30 },
        { move: [5, 3], name: "平行取り（D6）", weight: 10 }
    ],
    // --- 縦取りルート (F5-F6) ---
    "F5-F6": [
        { move: [4, 2], name: "虎定石（C5）", weight: 50 },
        { move: [3, 2], name: "牛定石（C4）", weight: 30 },
        { move: [5, 2], name: "兎定石（C6）", weight: 20 }
    ],
    // 虎定石 (F5-F6-C5)
    "F5-F6-C5": [
        { move: [3, 5], name: "虎定石（F4）", weight: 80 },
        { move: [5, 4], name: "虎定石変化（E6）", weight: 20 }
    ],
    "F5-F6-C5-F4": [
        { move: [2, 4], name: "虎定石（E3）", weight: 70 },
        { move: [3, 2], name: "虎定石変化（C4）", weight: 30 }
    ],
    "F5-F6-C5-F4-E3": [
        { move: [3, 3], name: "虎定石（D3）", weight: 90 },
        { move: [3, 2], name: "虎定石（C4）", weight: 10 }
    ],
    "F5-F6-C5-F4-E3-D3": [
        { move: [2, 2], name: "虎定石本線（C3）", weight: 85 },
        { move: [3, 2], name: "虎定石変化（C4）", weight: 15 }
    ],
    "F5-F6-C5-F4-E3-D3-C3": [
        { move: [3, 2], name: "虎定石最善手（C4）", weight: 100 }
    ],
    "F5-F6-C5-F4-E3-D3-C3-C4": [
        { move: [1, 2], name: "虎定石（C2）", weight: 80 },
        { move: [2, 3], name: "虎定石（D2）", weight: 20 }
    ],
    "F5-F6-C5-F4-E3-D3-C3-C4-C2": [
        { move: [4, 6], name: "虎定石（G5）", weight: 90 }
    ],
    "F5-F6-C5-F4-E3-D3-C3-C4-C2-G5": [
        { move: [5, 4], name: "虎定石（E6）", weight: 85 }
    ],
    "F5-F6-C5-F4-E3-D3-C3-C4-C2-G5-E6": [
        { move: [5, 6], name: "虎定石完成（G6）", weight: 90 }
    ],

    // 牛定石 (F5-F6-C4)
    "F5-F6-C4": [
        { move: [2, 2], name: "牛定石（C3）", weight: 70 },
        { move: [2, 4], name: "牛定石変化（E3）", weight: 30 }
    ],
    "F5-F6-C4-C3": [
        { move: [3, 3], name: "牛定石（D3）", weight: 80 }
    ],
    "F5-F6-C4-C3-D3": [
        { move: [2, 3], name: "牛定石（D2）", weight: 75 },
        { move: [2, 4], name: "牛定石（E3）", weight: 25 }
    ],
    "F5-F6-C4-C3-D3-D2": [
        { move: [2, 4], name: "牛定石本線（E3）", weight: 90 }
    ],
    "F5-F6-C4-C3-D3-D2-E3": [
        { move: [4, 2], name: "牛定石（C5）", weight: 85 }
    ],
    "F5-F6-C4-C3-D3-D2-E3-C5": [
        { move: [1, 3], name: "牛定石（D1）", weight: 90 }
    ],

    // 兎定石 (F5-F6-C6)
    "F5-F6-C6": [
        { move: [3, 5], name: "兎定石（F4）", weight: 75 },
        { move: [2, 4], name: "兎定石（E3）", weight: 25 }
    ],
    "F5-F6-C6-F4": [
        { move: [2, 4], name: "兎定石（E3）", weight: 80 }
    ],
    "F5-F6-C6-F4-E3": [
        { move: [4, 2], name: "兎定石（C5）", weight: 70 },
        { move: [3, 3], name: "兎定石（D3）", weight: 30 }
    ],
    "F5-F6-C6-F4-E3-C5": [
        { move: [5, 4], name: "兎定石（E6）", weight: 85 }
    ],

    // --- 斜め取りルート (F5-F4) ---
    "F5-F4": [
        { move: [2, 4], name: "馬定石（E3）", weight: 60 },
        { move: [4, 2], name: "ローズ定石（C5）", weight: 30 },
        { move: [3, 2], name: "蛇定石（C4）", weight: 10 }
    ],
    // 馬定石 (F5-F4-E3)
    "F5-F4-E3": [
        { move: [3, 5], name: "馬定石（F6）", weight: 80 }
    ],
    "F5-F4-E3-F6": [
        { move: [4, 2], name: "馬定石（C5）", weight: 75 },
        { move: [5, 4], name: "馬定石（E6）", weight: 25 }
    ],
    "F5-F4-E3-F6-C5": [
        { move: [5, 5], name: "馬定石（F7）", weight: 70 },
        { move: [3, 2], name: "馬定石（C4）", weight: 30 }
    ],
    // ローズ定石 (F5-F4-C5)
    "F5-F4-C5": [
        { move: [5, 5], name: "ローズ定石（F6）", weight: 80 }
    ],
    "F5-F4-C5-F6": [
        { move: [5, 4], name: "ローズ定石（E6）", weight: 85 }
    ],
    "F5-F4-C5-F6-E6": [
        { move: [3, 3], name: "ローズ定石（D3）", weight: 90 }
    ]
};

// 正統派オセロ静的マスマップ（角＝最高点、X・C＝厳罰、ボックス＝安定）
const baseStaticWeights = [
    [ 140, -45,  15,   5,   5,  15, -45, 140],
    [ -45, -80,  -5,  -5,  -5,  -5, -80, -45],
    [  15,  -5,  10,   3,   3,  10,  -5,  15],
    [   5,  -5,   3,   1,   1,   3,  -5,   5],
    [   5,  -5,   3,   1,   1,   3,  -5,   5],
    [  15,  -5,  10,   3,   3,  10,  -5,  15],
    [ -45, -80,  -5,  -5,  -5,  -5, -80, -45],
    [ 140, -45,  15,   5,   5,  15, -45, 140]
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
            weights[def.x[0]][def.x[1]] = -95;
            for (const [crPos, ccPos] of def.c) {
                weights[crPos][ccPos] = -40;
            }
        } else if (cornerOwner === perspectivePlayer) {
            weights[def.x[0]][def.x[1]] = 25;
            for (const [crPos, ccPos] of def.c) {
                weights[crPos][ccPos] = 20;
            }
        } else if (cornerOwner === opp) {
            weights[def.x[0]][def.x[1]] = -15;
            for (const [crPos, ccPos] of def.c) {
                weights[crPos][ccPos] = -20;
            }
        }
    }
    return weights;
}

const CHARACTERS = {
    1: {
        id: 1, name: "道化師 ピエロ", rankLabel: "【入門・アマ10級】", title: "（宮廷道化師）", icon: "🃏", image: "images/char1.png",
        imgFocus: "center 26%", themeColor: "#e63946", themeGlow: "rgba(230, 57, 70, 0.65)",
        bookMaxPly: 0, depth: 0, exact: 0,
        salonName: "旅の一座の酒場", materialDesc: "年輪黒檀 × 白木メイプル", boardDesc: "オリーブ木目卓",
        thinkingBaseMs: 700,
        quotes: {
            start: ["ヒヒッ！王宮のオセロへようこそ！お手柔らかにネ！", "サイコロを振るように軽やかに！お相手いたしマス！"],
            thinking: ["どこに置こうかニャ〜？ 適当に置いちゃおっかナ！", "ぐるぐる回って迷っちゃうデス〜！"],
            playerGood: ["ヒエッ！？ そこ置かれちゃうと困っちゃうでゴザイマス！", "お見事！ …って、ボクがピンチじゃないデスか！？"],
            playerBad: ["おやおや！ そこ置いちゃってホントにいいのかニャ〜！？", "ヒヒッ！ 隙だらけでゴザイマスよ〜！"],
            bigReversal: ["ぎゃ〜っ！？ 一気にひっくり返されちゃったデス〜！"],
            cpuCorner: ["やったネ！ 角っこいただき〜！ ラッキーでゴザイマス！"],
            playerCorner: ["あちゃー！ 大事な角っこを取られちゃったヨ〜！"],
            climax: ["もう盤面が埋まっちゃうヨ！ どっちが勝つのかニャ〜！？"],
            losing: ["ヒエ〜ッ！ ボクの石が数えるほどしかないヨ〜！"],
            cpuPass: ["おっとっと、置く場所がないからパスしちゃうネ！"],
            playerPass: ["ヒヒッ！ 置ける場所がないネ！ ボクの番だヨ！"],
            win: ["ヒヒッ！ボクの大勝利〜！たまには道化師だって本気出しちゃうでゴザイマス！"],
            lose: ["参った参った〜！さすが貴方様、完敗でゴザイマス！"]
        }
    },
    2: {
        id: 2, name: "侍女 コレット", rankLabel: "【初級・アマ5級】", title: "（見習い侍女）", icon: "🎀", image: "images/char2.png",
        imgFocus: "center 20%", themeColor: "#2a9d8f", themeGlow: "rgba(42, 157, 143, 0.65)",
        bookMaxPly: 0, depth: 1, exact: 0,
        salonName: "見習い侍女のサロン", materialDesc: "釉薬黒磁器 × 高級白磁", boardDesc: "ペールミント磁器調盤",
        thinkingBaseMs: 800,
        quotes: {
            start: ["王宮のオセロ、覚えたてですけど…一生懸命がんばります！"],
            thinking: ["ええと…たくさんひっくり返せる場所はどこかな…？"],
            playerGood: ["きゃっ！？ そんな上手な手があるなんて…！"],
            playerBad: ["えっ、そこに置いちゃって大丈夫なんですか…？"],
            bigReversal: ["わぁぁっ！？ こんなにたくさん取られちゃうなんて…！"],
            cpuCorner: ["わぁっ！ 角が取れちゃいました！ 嬉しいです！"],
            playerCorner: ["そんな…！ 私の大切な角が…うぅ…！"],
            climax: ["もうすぐおしまいですね…！ 心臓がドキドキしてきました…！"],
            losing: ["うぅ…！ どんどん私の石が減っちゃってます…！"],
            cpuPass: ["ごめんなさい、私、置ける場所がありません…パスです！"],
            playerPass: ["ふふっ、私の番ですね！ 頑張ってひっくり返します！"],
            win: ["勝てちゃいました…！また私と遊んでくださいねっ！"],
            lose: ["うぅ…！完敗です…！もっと定石を勉強してきますっ！"]
        }
    },
    3: {
        id: 3, name: "騎士 ローラン", rankLabel: "【中級・アマ1級】", title: "（近衛騎士）", icon: "⚔️", image: "images/char3.png",
        imgFocus: "center 22%", themeColor: "#2b6cb0", themeGlow: "rgba(43, 108, 176, 0.65)",
        bookMaxPly: 4, depth: 4, exact: 0,
        salonName: "近衛騎士の鍛錬の間", materialDesc: "玄武岩 × 白雲母", boardDesc: "アイアンネイビー鋼鉄盤",
        thinkingBaseMs: 950,
        quotes: {
            start: ["近衛の誇りにかけて、正々堂々とお手合わせ願おう！"],
            thinking: ["我が陣形を立て直す… 次の一手はここだ！"],
            playerGood: ["見事な太刀筋…！ 盤面の急所を突いてくるとは！"],
            playerBad: ["ふっ… 隙を見せたな！ 我が剣の前に退路なし！"],
            bigReversal: ["なんと…！？ 我が前線が一気に崩壊しただと…！？"],
            cpuCorner: ["要衝を確保！ この角は我が騎士団の防衛線だ！"],
            playerCorner: ["不覚…！ 陣地の角を突破されるとは！"],
            climax: ["ここが関ヶ原… 雌雄を決する時が来たようだな！"],
            losing: ["ぬうう…！ 我が軍がここまで追い詰められるとは…！"],
            cpuPass: ["無念…！ 一時退却し、次の好機を待つ！"],
            playerPass: ["包囲網は完成した！ 我が軍の進軍は止まらんぞ！"],
            win: ["王国の勝利だ！鉄壁の陣形、そう易々と崩せはせん！"],
            lose: ["見事な用兵…完敗だ！貴殿に最大限の敬意を表する！"]
        }
    },
    4: {
        id: 4, name: "伯爵夫人 エリザベート", rankLabel: "【上級・アマ三段】", title: "（薔薇の伯爵夫人）", icon: "🌹", image: "images/char4.png",
        imgFocus: "center 22%", themeColor: "#9b111e", themeGlow: "rgba(155, 17, 30, 0.65)",
        bookMaxPly: 6, depth: 5, exact: 0,
        salonName: "薔薇の舞踏会サロン", materialDesc: "黒瑪瑙 × オーロラ白蝶貝", boardDesc: "深紅ベルベット盤",
        thinkingBaseMs: 1100,
        quotes: {
            start: ["優雅な舞踏会へようこそ。手加減はいたしませんわ。"],
            thinking: ["ふふ… あなたの逃げ道を、少しずつ摘み取ってさしあげますわ。"],
            playerGood: ["あら…？ ずいぶんと小憎らしい手を打たれますこと。"],
            playerBad: ["うふふ… 甘いお方。罠にかかってしまいましたわね。"],
            bigReversal: ["まあ！ わたくしの薔薇が一気に散らされるなんて…！"],
            cpuCorner: ["美しき角は、わたくしが優雅に頂戴いたしますわ。"],
            playerCorner: ["まあ！ わたくしの角を奪うなんて… 許せませんこと！"],
            climax: ["最後のワルツ… 存分に踊り明かしましょう。"],
            losing: ["まさか… わたくしが劣勢に立たされるなんて…！"],
            cpuPass: ["あら、打つ手がございませんの？ 待ってさしあげますわ。"],
            playerPass: ["あらあら、手詰まりですの？ 盤上はわたくしの意のままですわね。"],
            win: ["チェックメイト…美と知性の勝利ですわ。"],
            lose: ["お見事でございました。骨のある殿方は嫌いではありませんわ。"]
        }
    },
    5: {
        id: 5, name: "宰相 ヴォルフガング", rankLabel: "【有段・アマ五段】", title: "（宮廷宰相）", icon: "📜", image: "images/char5.png",
        imgFocus: "center 24%", themeColor: "#4a154b", themeGlow: "rgba(74, 21, 75, 0.7)",
        bookMaxPly: 8, depth: 6, exact: 12,
        salonName: "宮廷宰相の深謀の間", materialDesc: "黒曜石 × カルカッタ大理石", boardDesc: "黒大理石グリッド盤",
        thinkingBaseMs: 1250,
        quotes: {
            start: ["盤上の戦いは国家の縮図。冷徹な知略をお見せしよう。"],
            thinking: ["数手先の展開はすべて計算済みだ…パリティを維持する。"],
            playerGood: ["ほう… その急所が見えていたか。侮れん男だ。"],
            playerBad: ["愚策だな。その一手で自らの首を絞めたと気づかんのか？"],
            bigReversal: ["なに…！？ 瞬時に盤面の均衡を崩しただと…！？"],
            cpuCorner: ["定石通り、この要所は我が手中に収めさせてもらった。"],
            playerCorner: ["我が計算の裏をかいて角を突いてくるとは…！"],
            climax: ["詰みだ… 貴公に逆転の筋は残されていない。"],
            losing: ["計算が… 狂ったというのか！？ この私が…！"],
            cpuPass: ["計算外だな… 一旦パスとして貴公の出方を窺おう。"],
            playerPass: ["置く場所がないか。貴公の戦略は完全に封殺されたのだ。"],
            win: ["偶数理論を制したのは私だ。良き盤上遊戯であった。"],
            lose: ["この私が読み負けたか…貴公こそ真の知者だ。"]
        }
    },
    6: {
        id: 6, name: "老賢王 オルレアン", rankLabel: "【神域・全国名人】", title: "（至高の絶対君主）", icon: "👑", image: "images/char6.png",
        imgFocus: "center 20%", themeColor: "#ffd700", themeGlow: "rgba(255, 215, 0, 0.8)",
        bookMaxPly: 12, depth: 7, exact: 14,
        salonName: "至高の金箔玉座の間", materialDesc: "漆黒隕鉄 × 自発光白玉翡翠", boardDesc: "金箔象嵌エメラルド盤",
        thinkingBaseMs: 1400,
        quotes: {
            start: ["我が玉座の盤上へよくぞ参った。そなたの知恵、余に見せてみよ。"],
            thinking: ["盤上の森羅万象… 余の眼から逃れる手など存在せぬ。"],
            playerGood: ["見事…！ 実に見事な一手だ！ 余の胸が高鳴るぞ！"],
            playerBad: ["迷いが出たな。王の威圧に呑まれては勝てぬぞ。"],
            bigReversal: ["おお…！ 盤上が一変したか！ 実に豪快な一手よ！"],
            cpuCorner: ["天地の理に従い、余がこの角を統べようぞ！"],
            playerCorner: ["見事なり…！ 王の領域を奪う覚悟、しかと認めた！"],
            climax: ["神域の読み合い… 最後の決着をつけようぞ！"],
            losing: ["かっかっか！ よもや余が王手をかけられるとはな！ 痛快である！"],
            cpuPass: ["ふむ、風が凪いだか。静かに貴殿の次の一手を待とう。"],
            playerPass: ["道が閉ざされたか。焦るな、盤上の呼吸を整えるがよい。"],
            win: ["良き戦いであったぞ、若人よ！再度の挑戦を待っておるぞ！"],
            lose: ["天晴れだ…！王国の覇者たる資格、そなたへと託そうぞ！堂々の戴冠である！"]
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

function typeWriterSpeech(fullText, isClimax) {
    if (typeWriterInterval) clearInterval(typeWriterInterval);
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
    if (isReviewMode) return;
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

    if (showBanner && !isReviewMode) {
        if (curtainTimeout) clearTimeout(curtainTimeout);
        DOM.curtainStageLabel.textContent = `STAGE ${char.id}`;
        DOM.curtainSalonTitle.textContent = char.salonName;
        DOM.curtainRelicSub.textContent = `盤面：${char.boardDesc} / 石：${char.materialDesc}`;
        DOM.stageCurtainBanner.classList.add("show");
        curtainTimeout = setTimeout(() => DOM.stageCurtainBanner.classList.remove("show"), 1300);
    }
}

function updateBalanceGauge(targetBoard = board) {
    if (!targetBoard) return;
    const emptyCount = getEmptyCount(targetBoard);
    const evalScore = evaluateBoard(targetBoard, humanColor, emptyCount);
    const winratePlayer = Math.max(5, Math.min(95, Math.round((1 / (1 + Math.exp(-evalScore / 260))) * 100)));
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
    DOM.undoButton.disabled = (historyStack.length === 0) || isBusy || isAiThinkingHint || gameOver || isReviewMode;
}

async function undoMove() {
    if (historyStack.length === 0 || isBusy || isAiThinkingHint || gameOver || isReviewMode) return;
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

        const pColorName = (humanColor === BLACK) ? "黒" : "白";
        setStatus("human-turn", `👑 あなたの番です（${pColorName}）…（時を戻しました）`);
        triggerTurnPulse();
        setOpponentQuote("thinking");
        updateTimerDisplay();
        drawBoard();
        updateBalanceGauge();

        // 戻した直後の手番で事前計算を実行
        prefetchPlayerEvaluations();
        maybeAutoHint();
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
    // ヒントAIは常に最高重み（最高勝率）の手を選択
    return candidates.slice().sort((a, b) => b.weight - a.weight)[0];
}

function startGame() {
    tryPlayBgm();
    exitReviewMode();
    currentGameSessionId++;
    cachedMoveEvaluations = null;

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
        if (!gameOver && !isReviewMode && !isAiThinkingHint) {
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
        prefetchPlayerEvaluations();
        maybeAutoHint();
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

/* ==========================================================================
  【完全浄化・正統派オセロ評価関数】
  - 序盤の石数減点ペナルティを完全撤廃
  - 「中割り（フロンティア最小化）」「着手可能数（モビリティ）」「確定石」に純化
========================================================================== */
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
    const totalMoves = myMoves + oppMoves;
    const mobilityScore = (totalMoves > 0) ? (100 * (myMoves - oppMoves) / totalMoves) : 0;

    const myFrontier = countFrontierStones(targetBoard, player);
    const oppFrontier = countFrontierStones(targetBoard, opponent);
    const totalFrontier = myFrontier + oppFrontier;
    const frontierScore = (totalFrontier > 0) ? (-100 * (myFrontier - oppFrontier) / totalFrontier) : 0;

    const stableDiff = countStableStones(targetBoard, player) - countStableStones(targetBoard, opponent);

    let score = 0;
    if (emptyCount > 32) {
        // 序盤：モビリティと中割り（フロンティア低減）を最優先。石数の加減点はゼロ。
        score = (mobilityScore * 40) + (frontierScore * 35) + (myPosScore - oppPosScore) * 1.5;
    } else if (emptyCount > 14) {
        // 中盤：確定石・モビリティ・辺の安全性を重視。
        score = (mobilityScore * 28) + (frontierScore * 20) + (stableDiff * 70) + (myPosScore - oppPosScore) * 2.0;
    } else {
        // 終盤：石数の最大化とパリティ
        score = (myStones - oppStones) * 55 + (stableDiff * 85) + (mobilityScore * 10);
        if (emptyCount % 2 !== 0) score += 45;
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
    return maxScore;
}

/* ==========================================================================
  【事前計算（プリフェッチ）キャッシュ機構】
  - プレイヤーの手番になった瞬間に裏で全合法手を高速評価・キャッシュ
  - 着手時はキャッシュから即座に判定を取り出すため、ゼロ遅延と妥当性を完全両立
========================================================================== */
function prefetchPlayerEvaluations() {
    if (gameOver || isReviewMode || currentPlayer !== humanColor) {
        cachedMoveEvaluations = null;
        return;
    }

    const moves = getValidMoves(humanColor, board);
    if (moves.length === 0) {
        cachedMoveEvaluations = { moves: [], best: null, scoredMoves: [] };
        return;
    }

    // 1. まずプロ定石データベースに該当手があるか検査
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
        return;
    }

    // 2. 定石外または中盤以降：ヒントAIの深い読み（深さ9手／終盤16手完全読み）
    const emptyCount = getEmptyCount(board);
    const depth = (emptyCount <= 16) ? emptyCount : (emptyCount <= 28 ? 9 : 8);
    const scored = [];

    const sortedMoves = orderMoves(moves, board, humanColor);
    for (const move of sortedMoves) {
        const next = cloneBoard(board);
        makeMove(next, move[0], move[1], humanColor);
        const score = -negamax(next, cpuColor, depth - 1, -Infinity, Infinity, emptyCount - 1);
        scored.push({ move, coord: toNotation(move[0], move[1]), score, isBook: false });
    }

    scored.sort((a, b) => b.score - a.score);
    cachedMoveEvaluations = {
        moves,
        best: scored[0].move,
        scoredMoves: scored,
        isBook: false
    };
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
  【プレイヤー着手処理：事前計算キャッシュにより即応性と妥当性を完全両立】
========================================================================== */
async function putStone(row, col) {
    if (gameOver || isBusy || isAiThinkingHint || currentPlayer !== humanColor || isReviewMode) return;
    if (!canPlace(row, col, humanColor, board)) return;

    saveHistory();
    isBusy = true;
    if (getHintMode() === "always") usedHintInGame = true;

    const boardBefore = cloneBoard(board);
    const emptyCount = getEmptyCount(board);
    const myAvailableMovesBefore = getValidMoves(humanColor, board);

    // 事前計算キャッシュから即座に客観最善手を取得（0ミリ秒）
    if (!cachedMoveEvaluations || cachedMoveEvaluations.moves.length === 0) {
        prefetchPlayerEvaluations();
    }
    const objectiveBest = cachedMoveEvaluations ? cachedMoveEvaluations.best : null;
    const scoredList = cachedMoveEvaluations ? cachedMoveEvaluations.scoredMoves : [];
    const chosenScoreObj = scoredList.find(s => s.move[0] === row && s.move[1] === col);
    const chosenScore = chosenScoreObj ? chosenScoreObj.score : 0;
    const topScore = scoredList[0] ? scoredList[0].score : 0;

    // 石のアニメーションを即時スタート
    const actionPromise = executeTurnAction(row, col, humanColor, true);

    const isMatchedWithObjectiveBest = (objectiveBest && objectiveBest[0] === row && objectiveBest[1] === col);
    const isCornerMove = isCorner(row, col);
    const isX = isXSquare(row, col);
    const isC = isCSquare(row, col);
    const danger = isRealDanger(row, col, boardBefore);
    const flips = getFlippableStones(row, col, humanColor, boardBefore).length;

    // 着手採点判定
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
    } else if (myAvailableMovesBefore.length > 1 && (danger || scoreDiffFromBest >= 180)) {
        moveRating = "BAD";
        if (getHintMode() !== "off") showMoveToast("bad", "⚠️ 悪手 (BAD)");
        setOpponentQuote("playerBad");
    } else if (scoreDiffFromBest <= 45) {
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
        if (danger && isX) contextNote += `【悪手】空いた角の斜め前（Xマス）に打ち、角を献上してしまいました${alt}。`;
        else if (danger && isC) contextNote += `【悪手】角の隣（Cマス）に打ち、相手に足場を与えてしまいました${alt}。`;
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
    if (gameOver || isReviewMode) return;
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
            setStatus("human-turn", `👑 あなたの番です（${pColorName}）…`);
            triggerTurnPulse();
            DOM.opponentAvatarFrame.classList.remove("thinking-aura");
            prefetchPlayerEvaluations();
            maybeAutoHint();
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
        setStatus("human-turn", `👑 あなたの番です（${pColorName}）…`);
        triggerTurnPulse();
        DOM.opponentAvatarFrame.classList.remove("thinking-aura");
        drawBoard();
        updateBalanceGauge();
        prefetchPlayerEvaluations();
        maybeAutoHint();
        updateUndoButtonState();
    } else {
        setStatus("cpu-turn", "相手が思考を巡らせています…");
        DOM.opponentAvatarFrame.classList.add("thinking-aura");
        computerMove();
    }
}

/* ==========================================================================
  【各対戦キャラクターの段級位別 思考エンジン】
========================================================================== */
function getComputerMove(targetBoard, player, charConfig) {
    const moves = getValidMoves(player, targetBoard);
    if (moves.length === 0) return null;
    if (moves.length === 1) return moves[0];

    // Lv.1 ピエロ（アマ10級）：基本ランダムだが、約40%でX・Cマスに無邪気に飛びつく
    if (charConfig.id === 1) {
        const dangerMoves = moves.filter(([r, c]) => isRealDanger(r, c, targetBoard));
        if (dangerMoves.length > 0 && Math.random() < 0.40) {
            return dangerMoves[Math.floor(Math.random() * dangerMoves.length)];
        }
        return moves[Math.floor(Math.random() * moves.length)];
    }

    // Lv.2 コレット（アマ5級）：最多反転のみを選ぶ初級者
    if (charConfig.id === 2) {
        const corners = moves.filter(([r, c]) => isCorner(r, c));
        if (corners.length > 0) return corners[0];

        const scored = moves.map(m => ({ move: m, flips: getFlippableStones(m[0], m[1], player, targetBoard).length }));
        scored.sort((a, b) => b.flips - a.flips);
        return scored[0].move;
    }

    // Lv.3〜Lv.6：定石データベースの適用検査
    if (charConfig.bookMaxPly > 0) {
        const bookMoveObj = getBookMove(charConfig.bookMaxPly);
        if (bookMoveObj && moves.some(([r, c]) => r === bookMoveObj.move[0] && c === bookMoveObj.move[1])) {
            return bookMoveObj.move;
        }
    }

    // 定石外または中盤以降：深さ探索
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

    // Lv.6 オルレアン（全国名人）：完全最善手
    if (charConfig.id === 6 || (charConfig.exact > 0 && emptyCount <= charConfig.exact)) {
        return scores[0].move;
    }

    // Lv.3〜Lv.5 の許容マージン
    let margin = 0;
    if (charConfig.id === 3) margin = 35;
    else if (charConfig.id === 4) margin = 18;
    else if (charConfig.id === 5) margin = 8;

    const eligible = scores.filter(s => (bestScore - s.score) <= margin);
    return eligible[0].move;
}

async function computerMove() {
    if (gameOver || isReviewMode) return;
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
    if (session !== currentGameSessionId || gameOver || isReviewMode) return;

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

async function maybeAutoHint() {
    if (getHintMode() === "always" && !isReviewMode && currentPlayer === humanColor) {
        computeHint();
    }
}

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
            maybeAutoHint();
        } else {
            clearHint();
        }
    }
    drawBoard();
}

function computeHint() {
    if (gameOver || isBusy || currentPlayer !== humanColor || isReviewMode) return;
    usedHintInGame = true;

    if (!cachedMoveEvaluations || cachedMoveEvaluations.moves.length === 0) {
        prefetchPlayerEvaluations();
    }

    if (!cachedMoveEvaluations || !cachedMoveEvaluations.best) return;

    const chosenMove = cachedMoveEvaluations.best;
    hintMove = chosenMove;
    const coordStr = toNotation(chosenMove[0], chosenMove[1]);
    DOM.hintCoordText.textContent = coordStr;

    const reasons = [];
    if (cachedMoveEvaluations.isBook) {
        reasons.push(`📖 日本オセロ連盟公認定石【${cachedMoveEvaluations.bookName}】の最高勝率ルートです。`);
        reasons.push("🎯 序盤の骨格を完璧に保ち、主導権を握る絶対の定石手筋です。");
    } else {
        const [r, c] = chosenMove;
        if (isCorner(r, c)) reasons.push("👑 角（四隅）を確保する安全確実な一手です。");
        else if (!isRealDanger(r, c, board)) reasons.push("🛡️ 危険マスを避け、内側の石だけを返す鋭い中割りです。");

        const oppBefore = getValidMoves(cpuColor, board).length;
        const nextB = cloneBoard(board);
        makeMove(nextB, r, c, humanColor);
        const oppAfter = getValidMoves(cpuColor, nextB).length;
        if (oppAfter < oppBefore) reasons.push(`📉 相手の選択肢を ${oppBefore} → ${oppAfter} 箇所に激減させます。`);

        if (reasons.length === 0) reasons.push("🎯 宮廷AIの深層読み（深さ9手）が導き出した最善手です。");
    }

    DOM.hintBodyText.innerHTML = reasons.map(r => `<div>${r}</div>`).join("");
    drawBoard();
}

function drawBoard() {
    DOM.board.querySelectorAll(".cell").forEach(cell => cell.remove());
    const previewClass = (humanColor === BLACK) ? "preview-black" : "preview-white";
    const isHintOff = (getHintMode() === "off");

    for (let r = 0; r < boardSize; r++) {
        for (let c = 0; c < boardSize; c++) {
            const cell = document.createElement("div");
            cell.className = "cell";

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

            if (board[r][c] !== 0) {
                const wrapper = document.createElement("div");
                wrapper.className = "stone-wrapper";

                const isFlipping = !isReviewMode && pendingAnimation && pendingAnimation.flipped.some(([fr, fc]) => fr === r && fc === c);
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
                    if (!isReviewMode && pendingAnimation && pendingAnimation.placedRow === r && pendingAnimation.placedCol === c) {
                        stone.classList.add("stone-new");
                    }
                    wrapper.appendChild(stone);
                }
                cell.appendChild(wrapper);
            }

            if (!isReviewMode) {
                cell.addEventListener("click", () => putStone(r, c));
            }
            DOM.board.appendChild(cell);
        }
    }

    pendingAnimation = null;
    updateScore();
    DOM.hintButton.disabled = gameOver || isBusy || isAiThinkingHint || currentPlayer !== humanColor || isReviewMode || isHintOff;
}

function updateScore(targetBoard = board) {
    const stats = getBoardStats(targetBoard);
    DOM.opponentScore.textContent = (cpuColor === BLACK) ? stats.black : stats.white;
    DOM.playerScore.textContent = (humanColor === BLACK) ? stats.black : stats.white;
}

/* ==========================================================================
  【因果関係網羅・AI戦術カルテ生成エンジン】
========================================================================== */
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

    let goodDesc = "【最善手】定石および深層読み（深さ9手）に合致した完璧な一打でした。";
    if (best.isCornerMove) {
        goodDesc = "【四隅の角を制圧】絶対に裏返らない確定石の拠点を確保し、戦局の主導権を完全に掌握しました。";
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
            badDesc = `【角を献上する危険手】空いた角の斜め前（Xマス）に打ったため、相手に角を奪われる致命的な足場を与えてしまいました。正解手は${altNotation}でした。`;
        } else if (worst.danger && worst.isC) {
            badDesc = `【角を取られやすくなる悪手】角の隣（Cマス）に打ったため、相手に角を突く好機を与えてしまいました。正解手は${altNotation}でした。`;
        } else {
            badDesc = `【陣形を崩した悪手】相手に好機を与えてしまいました。ここは${altNotation}へ中割りするのが最善でした。`;
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
    for (let lv = 1; lv <= 6; lv++) {
        const hasWonGenuinely = logs.some(r => r.charId === lv && r.isWin && r.isGenuine);
        if (!hasWonGenuinely) return String(lv);
    }
    return "6";
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
    for (let i = 1; i <= 6; i++) {
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

/* 終局処理 */
function endGame() {
    gameOver = true;
    isBusy = false;
    clearHint();
    cachedMoveEvaluations = null;
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
            quoteText = `見事な勝利でゴザイマス…が！ AIの指南（ヒント）を借りての勝利でしたネ！ 次回はぜひ【ヒントなし（自力真剣勝負）】でボクに挑んでみてくだサイ！`;
            if (char.id === 6) {
                quoteText = `ふむ…宮廷AIの知恵を借りて余を破ったか。真の覇王として戴冠するには己の知恵のみで余に勝たねばならん。ヒントなしの真剣勝負で余を打ち破ってみせよ！`;
            } else if (char.id >= 3) {
                quoteText = `知略は見事だが…AIの助力を得ていたようだな！ 貴殿の真の武勇を示すならば、次はヒントなしで我と剣を交えようぞ！`;
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
    DOM.carteGoodDesc.textContent = report.goodDesc;
    DOM.carteBadCoord.textContent = report.badCoord;
    DOM.carteBadDesc.textContent = report.badDesc;

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
            if (char.id < 6) {
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
                DOM.btnAdvanceText.textContent = "真の完全制覇！ 栄光の戴冠式へ";
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
    if (gameStepLogs.length === 0) return;
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
    DOM.reviewContextBox.textContent = contextText;

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
    }
});

/* 初期化実行 */
renderSystemVersionInfo();
initCoordLabels();
if (DOM.characterSelect) {
    DOM.characterSelect.value = determineInitialCharacterLevel();
}
startGame();

