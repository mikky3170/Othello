
/* ==========================================================================
  【オセロプログラム ロジック・AI思考エンジン】
  ファイル名: othello_ai_sensei_js.js
  バージョン: Ver 6.1.0 (2026/10/18)
  
  [Ver 6.1.0] 2026/10/18 更新内容:
  - プレイヤー着手時の即時反応化（タップ前の重い先読み同期計算を廃止・即座に石配置と反転が開始する超快速レスポンス）
  - 常時ヒント時の「💡 宮廷AIが最善手を思案中…」先行描画により、相手番との誤認を完全根絶
  - 完全OFF（真剣勝負）選択時の合法手点滅ガイド非表示＆指南封印黒金プレートUIへの切り替え
  - パス（PASS）発生時の特大トースト演出と直感的な手番スキップ演出の導入
  - 決着時の「👑 決着（FINISH）」カットインおよび余韻時間拡大（1.4秒）
========================================================================== */

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
    btnRestartFromBeginning: document.getElementById("btnRestartFromBeginning")
};

const cornerSquares = [[0, 0], [0, 7], [7, 0], [7, 7]];
const directions = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];

const staticWeights = [
    [ 140, -25,  25,   5,   5,  25, -25, 140],
    [-25, -50,  -5,  -5,  -5,  -5, -50, -25],
    [  25,  -5,  15,   3,   3,  15,  -5,  25],
    [   5,  -5,   3,   3,   3,   3,  -5,   5],
    [   5,  -5,   3,   3,   3,   3,  -5,   5],
    [  25,  -5,  15,   3,   3,  15,  -5,  25],
    [-25, -50,  -5,  -5,  -5,  -5, -50, -25],
    [ 140, -25,  25,   5,   5,  25, -25, 140]
];

const CHARACTERS = {
    1: {
        id: 1, name: "道化師 ピエロ", rankLabel: "【入門・アマ10級】", title: "（宮廷道化師）", icon: "🃏", image: "images/char1.png",
        imgFocus: "center 26%", themeColor: "#e63946", themeGlow: "rgba(230, 57, 70, 0.65)", depth: 0, exact: 0,
        salonName: "旅の一座の酒場", materialDesc: "年輪黒檀 × 白木メイプル", boardDesc: "オリーブ木目卓",
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
        imgFocus: "center 20%", themeColor: "#2a9d8f", themeGlow: "rgba(42, 157, 143, 0.65)", depth: 1, exact: 0,
        salonName: "見習い侍女のサロン", materialDesc: "釉薬黒磁器 × 高級白磁", boardDesc: "ペールミント磁器調盤",
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
        imgFocus: "center 22%", themeColor: "#2b6cb0", themeGlow: "rgba(43, 108, 176, 0.65)", depth: 3, exact: 0,
        salonName: "近衛騎士の鍛錬の間", materialDesc: "玄武岩 × 白雲母", boardDesc: "アイアンネイビー鋼鉄盤",
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
        imgFocus: "center 22%", themeColor: "#9b111e", themeGlow: "rgba(155, 17, 30, 0.65)", depth: 4, exact: 0,
        salonName: "薔薇の舞踏会サロン", materialDesc: "黒瑪瑙 × オーロラ白蝶貝", boardDesc: "深紅ベルベット盤",
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
        imgFocus: "center 24%", themeColor: "#4a154b", themeGlow: "rgba(74, 21, 75, 0.7)", depth: 5, exact: 10,
        salonName: "宮廷宰相の深謀の間", materialDesc: "黒曜石 × カルカッタ大理石", boardDesc: "黒大理石グリッド盤",
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
        imgFocus: "center 20%", themeColor: "#ffd700", themeGlow: "rgba(255, 215, 0, 0.8)", depth: 6, exact: 12,
        salonName: "至高の金箔玉座の間", materialDesc: "漆黒隕鉄 × 自発光白玉翡翠", boardDesc: "金箔象嵌エメラルド盤",
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

/* WebAudio 音響合成エンジン */
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

function playPlaceSound() { createSynthesizedHit(0.04, 0.14, 1400, 1.8, 220, 45, 0.95); }
function playFlipSingleSound(pitch = 1.0, isLast = false) {
    createSynthesizedHit(0.038, 0.26, (isLast ? 2400 : 1800) * pitch, 2.0, 260 * pitch, 90 * pitch, isLast ? 0.65 : 0.48);
}

function playFlipSequence(count) {
    if (isMuted || document.hidden) return;
    for (let i = 0; i < count; i++) {
        setTimeout(() => playFlipSingleSound(0.92 + i * 0.055, i === count - 1), i * 70 + 80);
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
    DOM.opponentPieceIcon.textContent = (cpuColor === BLACK) ? "⚫" : "⚪";
    DOM.playerPieceIcon.textContent = (humanColor === BLACK) ? "⚫" : "⚪";
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
    const evalScore = evaluateBoard(targetBoard, humanColor, emptyCount, currentPlayer);
    const winratePlayer = Math.max(5, Math.min(95, Math.round((1 / (1 + Math.exp(-evalScore / 220))) * 100)));
    const winrateOpponent = 100 - winratePlayer;

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
        playerMoveLogs = targetState.playerMoveLogs || [];
        gameStepLogs = gameStepLogs.slice(0, targetState.gameStepLogsLength || 0);
        pendingAnimation = null;

        setStatus("human-turn", "👑 あなたの番です…（時を戻しました）");
        triggerTurnPulse();
        setOpponentQuote("thinking");
        updateTimerDisplay();
        drawBoard();
        updateBalanceGauge();
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

function startGame() {
    tryPlayBgm();
    exitReviewMode();
    currentGameSessionId++;

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
    pendingAnimation = null;
    historyStack = [];
    playerMoveLogs = [];
    gameStepLogs = [];
    clearHint();

    recordGameStep(null, null, "対局開始時の初期配置です。");
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
        setStatus("human-turn", "👑 あなたの番です…");
        triggerTurnPulse();
        DOM.opponentAvatarFrame.classList.remove("thinking-aura");
        maybeAutoHint();
    } else {
        setStatus("cpu-turn", "相手（黒）が先手です。思考中...");
        DOM.opponentAvatarFrame.classList.add("thinking-aura");
        setTimeout(computerMove, 300);
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

/* 高速判定用：1つでも反転できるか（Early Break） */
function canPlaceFast(row, col, player, targetBoard) {
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

const canPlace = (r, c, p = currentPlayer, b = board) => canPlaceFast(r, c, p, b);

function getValidMoves(player, targetBoard) {
    const moves = [];
    for (let r = 0; r < boardSize; r++) {
        for (let c = 0; c < boardSize; c++) {
            if (canPlaceFast(r, c, player, targetBoard)) moves.push([r, c]);
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
    const dangerCornerMap = [
        { corner: [0, 0], dangers: [[0, 1], [1, 0], [1, 1]] },
        { corner: [0, 7], dangers: [[0, 6], [1, 6], [1, 7]] },
        { corner: [7, 0], dangers: [[6, 0], [6, 1], [7, 1]] },
        { corner: [7, 7], dangers: [[6, 6], [6, 7], [7, 6]] }
    ];
    for (const item of dangerCornerMap) {
        if (item.dangers.some(([dr, dc]) => dr === r && dc === c)) {
            return (targetBoard[item.corner[0]][item.corner[1]] === 0);
        }
    }
    return false;
}

/* 最適手の判定（ヒント・カルテ採点用） */
function calculateObjectiveBestMove(targetBoard, player) {
    const moves = getValidMoves(player, targetBoard);
    if (moves.length === 0) return null;
    const emptyCount = getEmptyCount(targetBoard);
    const depth = emptyCount <= 14 ? emptyCount : (emptyCount > 40 ? 5 : 6);
    let bestScore = -Infinity, bestMoves = [];

    for (const move of orderMoves(moves, targetBoard)) {
        const next = cloneBoard(targetBoard);
        makeMove(next, move[0], move[1], player);
        const score = minimax(next, opposite(player), depth - 1, -Infinity, Infinity, player, emptyCount - 1);
        if (score > bestScore) {
            bestScore = score; bestMoves = [move];
        } else if (score === bestScore) {
            bestMoves.push(move);
        }
    }
    return bestMoves[0] || moves[0];
}

/* 着手・対面3D反転・共通パイプライン */
async function executeTurnAction(row, col, player, isHuman, onPreFinish) {
    const session = currentGameSessionId;
    const opponent = opposite(player);
    const flipped = sortFlippedByDistance(row, col, getFlippableStones(row, col, player, board));

    makeMove(board, row, col, player);
    lastMove = [row, col];

    if (onPreFinish) onPreFinish(flipped);

    pendingAnimation = {
        placedRow: row, placedCol: col, flipped,
        newColor: player, oldColor: opponent, isHuman
    };

    playPlaceSound();
    if (flipped.length > 0) playFlipSequence(flipped.length);

    drawBoard();
    updateBalanceGauge();

    await sleep((flipped.length * 70) + 540);
    if (session !== currentGameSessionId) return false;

    hideMoveToast();
    clearHintForOpponentTurn();
    drawBoard();
    return true;
}

/* Ver 6.1.0 プレイヤー着手：即時反転開始（重い先読み同期計算を廃止して超快速化） */
async function putStone(row, col) {
    if (gameOver || isBusy || isAiThinkingHint || currentPlayer !== humanColor || isReviewMode) return;
    if (!canPlace(row, col, humanColor, board)) return;

    saveHistory();
    isBusy = true;
    if (getHintMode() === "always") usedHintInGame = true;

    // 着手前の盤面スナップショット
    const boardBefore = cloneBoard(board);
    const emptyCount = getEmptyCount(board);
    const myAvailableMovesBefore = getValidMoves(humanColor, board);
    const oppMovesBefore = getValidMoves(cpuColor, board).length;
    const preScore = evaluateBoard(board, humanColor, emptyCount, humanColor);

    const isMatchedWithHint = (hintMove && hintMove[0] === row && hintMove[1] === col);
    const isForcedMove = (myAvailableMovesBefore.length === 1);
    const isCornerMove = isCorner(row, col);
    const isDangerMove = isRealDanger(row, col, board);

    // 即座に石配置・反転アニメーション開始
    const success = await executeTurnAction(row, col, humanColor, true, (flipped) => {
        // 反転アニメ開始と同時に非同期評価
        const oppMovesAfter = getValidMoves(cpuColor, board).length;
        const postScore = evaluateBoard(board, humanColor, emptyCount - 1, cpuColor);
        const scoreDiff = postScore - preScore;

        let objectiveBest = null;
        if (isMatchedWithHint) {
            objectiveBest = hintMove;
        } else {
            objectiveBest = calculateObjectiveBestMove(boardBefore, humanColor);
        }
        const isMatchedWithObjectiveBest = (objectiveBest && objectiveBest[0] === row && objectiveBest[1] === col);

        let moveRating = "NORMAL";
        if (isMatchedWithHint || isMatchedWithObjectiveBest) {
            moveRating = "BEST";
            if (getHintMode() !== "off") {
                showMoveToast("best", "🎯 最善手 (BEST)");
            }
            setOpponentQuote("playerGood");
        } else if (isCornerMove) {
            moveRating = isMatchedWithObjectiveBest ? "BEST" : "GOOD";
            if (getHintMode() !== "off") {
                showMoveToast(moveRating === "BEST" ? "best" : "good", moveRating === "BEST" ? "🎯 最善手 (BEST)" : "⚜️ 好手 (GOOD)");
            }
            setOpponentQuote("playerCorner");
        } else if (isForcedMove) {
            moveRating = "NORMAL";
        } else if (emptyCount >= 14 && (isDangerMove || scoreDiff < -140)) {
            moveRating = "BAD";
            if (getHintMode() !== "off") {
                showMoveToast("bad", "⚠️ 悪手 (BAD)");
            }
            setOpponentQuote("playerBad");
        } else if (flipped.length >= 5 && emptyCount >= 16) {
            moveRating = "REVERSAL";
            if (getHintMode() !== "off") {
                showMoveToast("reversal", "⚡ 逆転手 (REVERSAL)");
            }
            setOpponentQuote("bigReversal");
        } else if (scoreDiff > 120) {
            moveRating = "GOOD";
            if (getHintMode() !== "off") {
                showMoveToast("good", "⚜️ 好手 (GOOD)");
            }
            setOpponentQuote("playerGood");
        } else if (emptyCount <= 12) {
            setOpponentQuote("climax");
        }

        let contextNote = `あなたの着手（${toNotation(row, col)}）。`;
        if (moveRating === "BEST") contextNote += isCornerMove ? "【最善手】四隅の要衝（角）を制圧した完璧な決定打。" : "【最善手】指南通りの隙のない完璧な中割り進軍。";
        else if (moveRating === "GOOD") contextNote += isCornerMove ? "【好手】四隅の要衝を確保し、確定石の基盤を構築。" : "【好手】要所を抑え、主導権を握る鋭い一手。";
        else if (moveRating === "REVERSAL") contextNote += "【逆転手】一気の大量反転により盤面の天秤を揺さぶる劇的一打。";
        else if (moveRating === "BAD") {
            const alt = objectiveBest ? `（正解手は【${toNotation(objectiveBest[0], objectiveBest[1])}】）` : "";
            contextNote += isDangerMove ? `【悪手】空いている角の隣に打ってしまいました${alt}。` : `【悪手】相手に足場を与えてしまう危険な打点でした${alt}。`;
        } else contextNote += `石を ${flipped.length} 個反転させました。`;

        recordGameStep([row, col], humanColor, contextNote, objectiveBest, false);

        playerMoveLogs.push({
            row, col, coord: toNotation(row, col), scoreDiff, rating: moveRating,
            isCorner: isCornerMove, isDanger: isDangerMove,
            isObjectiveBest: isMatchedWithObjectiveBest || isMatchedWithHint,
            flippedCount: flipped.length, oppMovesReduction: oppMovesBefore - oppMovesAfter,
            emptyCountAtMove: emptyCount, stepIndex: gameStepLogs.length - 1, alternativeBest: objectiveBest
        });
    });

    if (!success) return;
    currentPlayer = cpuColor;
    isBusy = false;
    processTurn();
}

function clearHintForOpponentTurn() {
    hintMove = null;
    DOM.hintCoordText.textContent = "--";
    DOM.hintBodyText.innerHTML = '<div class="hint-placeholder-text">相手の手番です（思考中…）</div>';
}

/* Ver 6.1.0 ターン進行およびパス処理の強化 */
async function processTurn() {
    if (gameOver || isReviewMode) return;
    const currentMoves = getValidMoves(currentPlayer, board);

    if (currentMoves.length === 0) {
        const opp = opposite(currentPlayer);
        if (getValidMoves(opp, board).length === 0) { endGame(); return; }

        const passName = (currentPlayer === humanColor) ? "あなた" : getCurrentCharacter().name;
        recordGameStep(null, currentPlayer, `${passName}が置ける場所がないため【パス】しました。`, null, true);

        // 特大パストースト演出
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

        if (currentPlayer === humanColor) {
            setStatus("human-turn", "👑 あなたの番です…");
            triggerTurnPulse();
            DOM.opponentAvatarFrame.classList.remove("thinking-aura");
            maybeAutoHint();
        } else {
            setStatus("cpu-turn", "相手が思考を巡らせています…");
            DOM.opponentAvatarFrame.classList.add("thinking-aura");
            setTimeout(computerMove, 300);
        }
        updateUndoButtonState();
        return;
    }

    if (currentPlayer === humanColor) {
        setStatus("human-turn", "👑 あなたの番です…");
        triggerTurnPulse();
        DOM.opponentAvatarFrame.classList.remove("thinking-aura");
        drawBoard();
        updateBalanceGauge();
        maybeAutoHint();
        updateUndoButtonState();
    } else {
        setStatus("cpu-turn", "相手が思考を巡らせています…");
        DOM.opponentAvatarFrame.classList.add("thinking-aura");
        computerMove();
    }
}

function orderMoves(moves, targetBoard) {
    return moves.sort((a, b) => {
        const aCorner = isCorner(a[0], a[1]) ? 1 : 0, bCorner = isCorner(b[0], b[1]) ? 1 : 0;
        if (aCorner !== bCorner) return bCorner - aCorner;
        const aDanger = isRealDanger(a[0], a[1], targetBoard) ? 1 : 0, bDanger = isRealDanger(b[0], b[1], targetBoard) ? 1 : 0;
        if (aDanger !== bDanger) return aDanger - bDanger;
        return staticWeights[b[0]][b[1]] - staticWeights[a[0]][a[1]];
    });
}

function getComputerMove(targetBoard, player, charConfig) {
    const moves = getValidMoves(player, targetBoard);
    if (moves.length === 0) return null;
    if (charConfig.id === 1) return moves[Math.floor(Math.random() * moves.length)];

    if (charConfig.id === 2) {
        let best = moves[0], maxF = -1;
        for (const m of moves) {
            const flips = getFlippableStones(m[0], m[1], player, targetBoard).length;
            if (flips > maxF) { maxF = flips; best = m; }
        }
        return best;
    }

    const emptyCount = getEmptyCount(targetBoard);
    const depth = (charConfig.exact > 0 && emptyCount <= charConfig.exact) ? emptyCount : charConfig.depth;
    let bestScore = -Infinity;
    const scores = [];

    for (const move of orderMoves(moves, targetBoard)) {
        const next = cloneBoard(targetBoard);
        makeMove(next, move[0], move[1], player);
        const score = minimax(next, opposite(player), depth - 1, -Infinity, Infinity, player, emptyCount - 1);
        scores.push({ move, score });
        if (score > bestScore) bestScore = score;
    }

    const candidates = scores.filter(s => Math.abs(s.score - bestScore) < 0.1).map(s => s.move);
    return candidates[Math.floor(Math.random() * candidates.length)];
}

async function computerMove() {
    if (gameOver || isReviewMode) return;
    const session = currentGameSessionId;

    clearHintForOpponentTurn();
    isBusy = true;
    updateUndoButtonState();
    setStatus("cpu-turn", "相手が思考を巡らせています…");

    await sleep(220);
    if (session !== currentGameSessionId || gameOver || isReviewMode) return;

    const char = getCurrentCharacter();
    const move = getComputerMove(board, cpuColor, char);
    if (move) {
        const success = await executeTurnAction(move[0], move[1], cpuColor, false, () => {
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
        });
        if (!success) return;
    }

    isBusy = false;
    currentPlayer = humanColor;
    processTurn();
}

function minimax(targetBoard, player, depth, alpha, beta, computerPlayer, emptyCount) {
    if (emptyCount === 0 || depth <= 0) return evaluateBoard(targetBoard, computerPlayer, emptyCount, player);

    let moves = getValidMoves(player, targetBoard);
    if (moves.length === 0) {
        const opp = opposite(player);
        if (getValidMoves(opp, targetBoard).length === 0) return evaluateBoard(targetBoard, computerPlayer, 0, player);
        return minimax(targetBoard, opp, depth, alpha, beta, computerPlayer, emptyCount);
    }

    moves = orderMoves(moves, targetBoard);
    const maximizing = (player === computerPlayer);
    let value = maximizing ? -Infinity : Infinity;

    for (const move of moves) {
        const next = cloneBoard(targetBoard);
        makeMove(next, move[0], move[1], player);
        const score = minimax(next, opposite(player), depth - 1, alpha, beta, computerPlayer, emptyCount - 1);
        if (maximizing) {
            value = Math.max(value, score);
            alpha = Math.max(alpha, value);
            if (alpha >= beta) break;
        } else {
            value = Math.min(value, score);
            beta = Math.min(beta, value);
            if (alpha >= beta) break;
        }
    }
    return value;
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

/* 確定石判定（四隅からの連続探索 ＋ 完全確定辺の高速走査） */
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

/* 盤面評価関数 */
function evaluateBoard(targetBoard, player, emptyCount, turnPlayer = player) {
    const opponent = opposite(player);
    let myStones = 0, oppStones = 0, myPosScore = 0, oppPosScore = 0;

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = targetBoard[r][c];
            if (piece === player) { myStones++; myPosScore += staticWeights[r][c]; }
            else if (piece === opponent) { oppStones++; oppPosScore += staticWeights[r][c]; }
        }
    }

    if (emptyCount === 0) return (myStones - oppStones) * 10000;

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
    if (emptyCount > 40) {
        score = (mobilityScore * 28) + (frontierScore * 22) + (myPosScore - oppPosScore) - (myStones - oppStones) * 8;
    } else if (emptyCount > 14) {
        score = (mobilityScore * 20) + (frontierScore * 18) + (stableDiff * 55) + (myPosScore - oppPosScore) * 1.6;
    } else {
        score = (myStones - oppStones) * 25 + (stableDiff * 60) + (mobilityScore * 12);
        if (emptyCount % 2 !== 0) {
            score += (turnPlayer === player) ? 40 : -40;
        }
    }
    return score;
}

function clearHint() {
    hintMove = null;
    DOM.hintCoordText.textContent = "--";
    DOM.hintBodyText.innerHTML = '<div class="hint-placeholder-text">「ヒント」ボタンを押すと最善手と思案理由が表示されます</div>';
}

const getHintMode = () => DOM.hintMode ? DOM.hintMode.value : "manual";

/* Ver 6.1.0 常時ヒント：思案中先行表示 */
async function maybeAutoHint() {
    if (getHintMode() === "always" && !isReviewMode && currentPlayer === humanColor) {
        setStatus("hint-thinking", "💡 宮廷AIが最善手を思案中…");
        await sleep(20);
        computeHint();
        if (currentPlayer === humanColor && !gameOver) {
            setStatus("human-turn", "👑 あなたの番です…");
        }
    }
}

/* Ver 6.1.0 完全OFF真剣勝負モード表示への調律 */
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

function buildHintReasons(chosen, allMoves) {
    const reasons = [], [r, c] = chosen.move;
    if (chosen.score > 5000) reasons.push("🏆 勝利確定の決定打です（完全読み）。");
    else if (chosen.score < -5000) reasons.push("⚠️ 最善の粘りとなる一手です。");

    if (isCorner(r, c)) reasons.push("👑 角（四隅）を確保する安全確実な一手です。");
    if (!isRealDanger(r, c, board) && allMoves.some(([mr, mc]) => isRealDanger(mr, mc, board))) {
        reasons.push("🛡️ 危険マス（角の隣）を避けた冷静な中割りです。");
    }

    const oppBefore = getValidMoves(cpuColor, board).length;
    const oppAfter = getValidMoves(cpuColor, chosen.nextBoard).length;
    if (oppAfter < oppBefore) reasons.push(`📉 相手の選択肢を ${oppBefore} → ${oppAfter} 箇所に激減させます。`);

    const stableBefore = countStableStones(board, humanColor);
    const stableAfter = countStableStones(chosen.nextBoard, humanColor);
    if (stableAfter > stableBefore) reasons.push(`🔒 確定石を ${stableBefore} → ${stableAfter} 個に増やします。`);

    if (reasons.length === 0) reasons.push("🎯 盤面全体をコントロールする最善手です。");
    return reasons;
}

function computeHint() {
    if (gameOver || isBusy || currentPlayer !== humanColor || isReviewMode) return;
    usedHintInGame = true;

    const moves = getValidMoves(humanColor, board);
    if (moves.length === 0) return;

    const emptyCount = getEmptyCount(board);
    const depth = emptyCount <= 14 ? emptyCount : (emptyCount > 40 ? 5 : 6);
    let bestScore = -Infinity, bestMoves = [];

    for (const move of orderMoves(moves, board)) {
        const next = cloneBoard(board);
        makeMove(next, move[0], move[1], humanColor);
        const score = minimax(next, cpuColor, depth - 1, -Infinity, Infinity, humanColor, emptyCount - 1);
        const info = { move, score, nextBoard: next };

        if (score > bestScore) { bestScore = score; bestMoves = [info]; }
        else if (score === bestScore) { bestMoves.push(info); }
    }

    const chosen = bestMoves[0];
    hintMove = chosen.move;
    DOM.hintCoordText.textContent = toNotation(chosen.move[0], chosen.move[1]);
    DOM.hintBodyText.innerHTML = buildHintReasons(chosen, moves).map(r => `<div>${r}</div>`).join("");
    drawBoard();
}

/* Ver 6.1.0 盤面描画：完全OFF時は合法手ガイド（can-place）を非表示 */
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
                        const delayStr = `${fIdx * 70}ms`;
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
    let bestScore = -Infinity;

    for (const log of playerMoveLogs) {
        let score = log.scoreDiff;
        if (log.isCorner) score += 300;
        if (log.isObjectiveBest) score += 200;
        if (log.oppMovesReduction >= 3) score += 120;
        if (score > bestScore) {
            bestScore = score;
            best = log;
        }
    }

    let goodDesc = "中盤の均衡を崩し、優位を確立した素晴らしい一手でした。";
    if (best.isCorner) {
        goodDesc = "四隅の要衝（角）を制圧し、絶対に反転しない強固な確定石を築いた決定打でした。";
    } else if (best.isObjectiveBest) {
        goodDesc = "宮廷AIの完全推奨筋と一致した、隙のない見事な知謀の進軍（中割り）でした。";
    } else if (best.oppMovesReduction >= 2) {
        goodDesc = `相手の打てるマスを ${best.oppMovesReduction} 箇所も奪い、相手の選択肢を力強く封殺しました。`;
    } else if (best.flippedCount >= 4) {
        goodDesc = "豪快な大量反転によって一気に盤上の勢力図を塗り替えました。";
    }

    const badMoves = playerMoveLogs.filter(log => log.rating === "BAD" && !log.isCorner && !log.isObjectiveBest);
    let worst = null;
    if (badMoves.length > 0) {
        let worstPenalty = Infinity;
        for (const log of badMoves) {
            let penalty = log.scoreDiff;
            if (log.isDanger) penalty -= 200;
            if (penalty < worstPenalty) {
                worstPenalty = penalty;
                worst = log;
            }
        }
    }

    let badCoord = "--", badDesc = "致命的な悪手はなく、終始安定感のある落ち着いた完璧な打ち回しでした。", badStep = -1, alternative = null;

    if (worst) {
        badCoord = worst.coord;
        badStep = worst.stepIndex;
        alternative = worst.alternativeBest;
        const altNotation = alternative ? `【${toNotation(alternative[0], alternative[1])}】` : "内側の安全なマス";
        if (worst.isDanger) {
            badDesc = `空いている角の隣（危険マス）に打ちました。ここは${altNotation}へ中割りしていれば角を献上せずに済みました。`;
        } else {
            badDesc = `外側の石を反転させすぎました。ここは${altNotation}に打つことで自分の足場を守ることができました。`;
        }
    } else {
        badCoord = "なし (NONE)";
        badDesc = "全編にわたり隙のない完璧な知謀でした。的確に要所を押さえ切っています。";
    }

    tacticsBestIndex = best.stepIndex;
    tacticsWorstIndex = badStep;
    tacticsWorstAlternative = alternative;

    let diagnosis = "【総合診断】全体としてバランスの取れた堅実な試合運びでした。";
    const dangerCount = playerMoveLogs.filter(l => l.isDanger && !l.isCorner).length;
    const earlyBigFlips = playerMoveLogs.filter(l => l.emptyCountAtMove > 35 && l.flippedCount >= 4).length;

    if (worst === null) {
        diagnosis = "【総合診断】宮廷の歴史に残る完全無欠の知謀です！失着が一切見当たりません。";
    } else if (dangerCount >= 2) {
        diagnosis = "【総合診断】空いている角の隣（危険マス）へ飛び込む傾向が見られます。角の周辺は相手に打たせる意識を持ちましょう。";
    } else if (earlyBigFlips >= 2) {
        diagnosis = "【総合診断】序盤から石を取りすぎる傾向が見られます。序盤は少なく取る「中割り」を徹底すると勝率が劇的に上がります。";
    } else {
        diagnosis = "【総合診断】中盤の要所での一手が勝敗の分岐点となりました。「悪手へ」ボタンから正解手筋を復習できます。";
    }

    return {
        diagnosis,
        goodCoord: best.coord, goodDesc, goodStep: best.stepIndex,
        badCoord, badDesc, badStep, alternative
    };
}

/* Ver 6.1.0 終局処理：決着カットインと余韻の調律（1.4秒） */
function endGame() {
    gameOver = true;
    isBusy = false;
    clearHint();
    if (timerInterval) clearInterval(timerInterval);
    if (typeWriterInterval) clearInterval(typeWriterInterval);

    DOM.opponentAvatarFrame.classList.remove("thinking-aura");
    drawBoard();
    updateBalanceGauge();
    updateUndoButtonState();

    // 決着トーストカットイン
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
            quoteText = `見事な勝利でゴザイマス…が！ AIの指南（ヒント）を借りての勝利でしたネ！ 次回はぜひ【ヒントなし（真剣勝負）】でボクに挑んでみてくだサイ！`;
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

    if (isWin) {
        if (usedHintInGame) {
            DOM.btnAdvanceIcon.textContent = "👑";
            DOM.btnAdvanceText.textContent = `ヒントなし（真剣勝負）で ${char.name.split(" ")[0]} と再戦`;
            DOM.btnResultAdvance.onclick = () => {
                DOM.hintMode.value = "off";
                updateHintModeUI();
                DOM.royalResultModal.classList.remove("show");
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
            startGame();
        };
    }

    // 余韻を味わうための表示遅延（1.4秒）
    setTimeout(() => DOM.royalResultModal.classList.add("show"), 1400);
}

function enterReviewMode() {
    if (gameStepLogs.length === 0) return;
    isReviewMode = true;
    DOM.royalResultModal.classList.remove("show");
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

/* イベントリスナー設定 */
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
});

DOM.btnRestartFromBeginning.addEventListener("click", () => {
    DOM.endingModal.classList.remove("show");
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

function setupModal(openBtnId, overlayId, closeBtnId) {
    const openBtn = document.getElementById(openBtnId);
    const overlay = document.getElementById(overlayId);
    const closeBtn = document.getElementById(closeBtnId);
    if (openBtn && overlay && closeBtn) {
        openBtn.addEventListener("click", () => overlay.classList.add("show"));
        closeBtn.addEventListener("click", () => overlay.classList.remove("show"));
        overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.classList.remove("show"); });
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
    }
});

// 初期化実行
initCoordLabels();
startGame();

