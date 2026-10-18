// محرك إدارة جولة الرومي المغربي لـ 2 أو 3 أو 4 لاعبين (السامبل والطالّاج)

import { Deck, Card } from './cards.js';
import { RummyRules, GAME_MODES } from './rummy-rules.js';
import { RummyAI } from './rummy-ai.js';
import { sounds } from './audio.js';

export class RummyEngine {
    constructor(mode = GAME_MODES.SAMBEL) {
        this.mode = mode;
        this.deck = null;
        this.discardPile = [];
        this.players = []; // مصفوفة اللاعبين (2 إلى 4 لاعبين)
        this.mySeat = 0; // المقعد الخاص باللاعب المحلي (0 = South/Bottom)
        this.currentTurnIndex = 0; // مؤشر دور اللاعب الحالي في المصفوفة
        this.phase = 'draw'; // 'draw' | 'play' | 'discard' | 'game_over'
        this.tableMelds = []; // مصفوفة التشكيلات المطروحة على الطاولة
        this.stagingMelds = []; // المجموعات المجهزة للطرح في الطالّاج
        this.selectedHandIndices = new Set();
        this.winner = null;
        this.listeners = [];
        this.logs = [];
    }

    onStateChange(cb) {
        this.listeners.push(cb);
    }

    notify(event, data = {}) {
        this.listeners.forEach(cb => cb(this, event, data));
    }

    addLog(msg, type = 'info') {
        const time = new Date().toLocaleTimeString('ar-MA', { hour: '2-digit', minute: '2-digit' });
        this.logs.unshift({ time, msg, type });
        if (this.logs.length > 50) this.logs.pop();
    }

    /**
     * إعداد الجولة لـ 2 أو 3 أو 4 لاعبين
     * @param {Array} customPlayers - إعدادات اللاعبين المخصصة من الغرفة الجماعية
     */
    initGame(customPlayers = null) {
        // رزمتين مع 4 جواكر (108 أوراق)
        this.deck = new Deck(2, true, 2);
        this.deck.shuffle();

        this.tableMelds = [];
        this.stagingMelds = [];
        this.selectedHandIndices.clear();
        this.winner = null;
        this.logs = [];

        // عدد الكروت حسب الوضع: 13 في السامبل أو 14 في الطالّاج
        const cardsCount = (this.mode === GAME_MODES.TALLAJ) ? 14 : 13;

        if (customPlayers && customPlayers.length >= 2) {
            this.players = customPlayers.map((p, idx) => ({
                id: p.id || `p_${idx}`,
                seat: idx,
                name: p.name || `لاعب ${idx + 1}`,
                avatar: p.avatar || '👤',
                isLocalHuman: p.isLocalHuman !== undefined ? p.isLocalHuman : (idx === 0),
                isBot: p.isBot || false,
                hand: this.deck.drawMultiple(cardsCount),
                hasOpened: false,
                score: 0
            }));
        } else {
            // اللعب الفردي التلقائي (اللاعب ضد 3 كمبيوتر أو 1 كمبيوتر)
            this.players = [
                { id: 'player_0', seat: 0, name: 'أنت', avatar: '🂡', isLocalHuman: true, isBot: false, hand: this.deck.drawMultiple(cardsCount), hasOpened: false, score: 0 },
                { id: 'bot_1', seat: 1, name: 'فاطمة (Bot)', avatar: '👩', isLocalHuman: false, isBot: true, hand: this.deck.drawMultiple(cardsCount), hasOpened: false, score: 0 },
                { id: 'bot_2', seat: 2, name: 'كريم (Bot)', avatar: '🧑', isLocalHuman: false, isBot: true, hand: this.deck.drawMultiple(cardsCount), hasOpened: false, score: 0 },
                { id: 'bot_3', seat: 3, name: 'سناء (Bot)', avatar: '👱‍♀️', isLocalHuman: false, isBot: true, hand: this.deck.drawMultiple(cardsCount), hasOpened: false, score: 0 }
            ];
        }

        // فرز يد اللاعب المحلي لتسهيل اللعب
        this.sortPlayerHand(0);

        // وضع أول ورقة في رزمة المرميات (تجنب الجوكر كورقة أولى)
        let firstDiscard = this.deck.draw();
        while (firstDiscard && firstDiscard.isJoker) {
            this.deck.cards.unshift(firstDiscard);
            this.deck.shuffle();
            firstDiscard = this.deck.draw();
        }
        this.discardPile = [firstDiscard];

        this.currentTurnIndex = 0;
        this.phase = 'draw';

        const modeArabic = this.mode === GAME_MODES.TALLAJ ? 'الطالّاج (71 نقطة فرانك)' : 'السامبل';
        this.addLog(`بدأت الجولة لـ ${this.players.length} لاعبين في وضع ${modeArabic}. دور ${this.getCurrentPlayer().name}.`, 'system');
        sounds.playCardSlide();
        this.notify('game_init');
    }

    getCurrentPlayer() {
        return this.players[this.currentTurnIndex] || this.players[0];
    }

    getLocalPlayer() {
        return this.players.find(p => p.seat === this.mySeat) || this.players[0];
    }

    isMyTurn() {
        return this.getCurrentPlayer().seat === this.mySeat;
    }

    sortPlayerHand(seatIndex = 0, bySuit = true) {
        const player = this.players[seatIndex];
        if (!player) return;

        player.hand.sort((a, b) => {
            if (a.isJoker) return 1;
            if (b.isJoker) return -1;
            if (bySuit) {
                if (a.suit !== b.suit) return a.suit.localeCompare(b.suit);
                return a.getOrderValue() - b.getOrderValue();
            } else {
                if (a.rank !== b.rank) return a.getOrderValue() - b.getOrderValue();
                return a.suit.localeCompare(b.suit);
            }
        });
        this.notify('hand_sorted');
    }

    /**
     * تغيير موقع ورقة في يد اللاعب (سحب وإفلات أو تحريك حر)
     */
    moveCardInHand(seat, fromIndex, toIndex) {
        const player = this.players[seat];
        if (!player || fromIndex < 0 || fromIndex >= player.hand.length || toIndex < 0 || toIndex >= player.hand.length) {
            return false;
        }
        if (fromIndex === toIndex) return false;

        const [card] = player.hand.splice(fromIndex, 1);
        player.hand.splice(toIndex, 0, card);
        this.selectedHandIndices.clear();
        sounds.playCardSlide();
        this.notify('hand_reordered', { seat, fromIndex, toIndex });
        return true;
    }

    /**
     * تحريك الورقة المحددة خطوة لليسار أو لليمين
     */
    shiftSelectedCard(seat, direction) { // direction: -1 (left) or +1 (right)
        if (this.selectedHandIndices.size !== 1) return false;
        const currentIdx = Array.from(this.selectedHandIndices)[0];
        const targetIdx = currentIdx + direction;
        const player = this.players[seat];
        if (targetIdx < 0 || targetIdx >= player.hand.length) return false;

        const res = this.moveCardInHand(seat, currentIdx, targetIdx);
        if (res) {
            this.selectedHandIndices.add(targetIdx);
            this.notify('selection_changed');
        }
        return res;
    }

    /**
     * سحب ورقة من رزمة السحب
     */
    drawStock(seat = null) {
        const actingSeat = seat !== null ? seat : this.mySeat;
        const player = this.players[actingSeat];

        if (this.currentTurnIndex !== actingSeat || this.phase !== 'draw') {
            return { success: false, message: 'ليس دورك لسحب ورقة الآن' };
        }

        if (this.deck.remaining === 0) {
            this.recycleDiscardPile();
        }

        const card = this.deck.draw();
        if (!card) return { success: false, message: 'انتهت الرزمة!' };

        player.hand.push(card);
        this.phase = 'play';
        sounds.playCardSlide();

        this.addLog(`${player.name} سحب ورقة من الرزمة.`, player.isLocalHuman ? 'player' : 'ai');
        this.notify('card_drawn', { seat: actingSeat, source: 'stock', card: player.isLocalHuman ? card : null });

        return { success: true, card };
    }

    /**
     * سحب ورقة من رزمة المرميات
     */
    drawDiscard(seat = null) {
        const actingSeat = seat !== null ? seat : this.mySeat;
        const player = this.players[actingSeat];

        if (this.currentTurnIndex !== actingSeat || this.phase !== 'draw') {
            return { success: false, message: 'ليس دورك لسحب ورقة الآن' };
        }

        if (this.discardPile.length === 0) {
            return { success: false, message: 'رزمة المرميات فارغة!' };
        }

        const card = this.discardPile.pop();
        player.hand.push(card);
        this.phase = 'play';
        sounds.playCardSlide();

        this.addLog(`${player.name} سحب ${card.getRankArabic()} ${card.getSuitDetails().symbol} من المرميات.`, player.isLocalHuman ? 'player' : 'ai');
        this.notify('card_drawn', { seat: actingSeat, source: 'discard', card });

        return { success: true, card };
    }

    recycleDiscardPile() {
        if (this.discardPile.length <= 1) return;
        const topCard = this.discardPile.pop();
        const recycled = [...this.discardPile];
        this.discardPile = [topCard];
        this.deck.cards = recycled;
        this.deck.shuffle();
        this.addLog('تمت إعادة خلط أوراق المرميات داخل الرزمة.', 'system');
    }

    toggleCardSelection(index) {
        if (this.selectedHandIndices.has(index)) {
            this.selectedHandIndices.delete(index);
        } else {
            this.selectedHandIndices.add(index);
        }
        sounds.playCardPlace();
        this.notify('selection_changed');
    }

    clearSelection() {
        this.selectedHandIndices.clear();
        this.notify('selection_changed');
    }

    getSelectedCards() {
        const localPlayer = this.getLocalPlayer();
        return Array.from(this.selectedHandIndices)
            .sort((a, b) => a - b)
            .map(idx => localPlayer.hand[idx]);
    }

    stageSelectedCardsAsMeld() {
        const localPlayer = this.getLocalPlayer();
        const cards = this.getSelectedCards();

        if (cards.length < 3) {
            sounds.playError();
            return { success: false, message: 'أي تشكيلة تتطلب 3 أوراق على الأقل!' };
        }

        const check = RummyRules.isValidMeld(cards);
        if (!check.valid) {
            sounds.playError();
            return { success: false, message: check.error };
        }

        // في الطالّاج: النزول الأول يجب أن يكون فرانك نقي بدون أي جوكر
        if (this.mode === GAME_MODES.TALLAJ && !localPlayer.hasOpened) {
            if (cards.some(c => c.isJoker)) {
                sounds.playError();
                return { success: false, message: 'في الطالّاج: النزول الأول يجب أن يكون بأوراق فرانك نقية (بدون جوكر)!' };
            }
        }

        this.stagingMelds.push({
            id: 'stage_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            cards: [...cards],
            type: check.type,
            points: check.points
        });

        const cardIds = new Set(cards.map(c => c.id));
        localPlayer.hand = localPlayer.hand.filter(c => !cardIds.has(c.id));
        this.clearSelection();

        sounds.playCardPlace();
        this.notify('meld_staged');
        return { success: true, points: check.points };
    }

    unstageMeld(stageId) {
        const index = this.stagingMelds.findIndex(m => m.id === stageId);
        if (index === -1) return;

        const [removed] = this.stagingMelds.splice(index, 1);
        const localPlayer = this.getLocalPlayer();
        localPlayer.hand.push(...removed.cards);
        this.sortPlayerHand(localPlayer.seat);
        sounds.playCardSlide();
        this.notify('meld_unstaged');
    }

    cancelAllStaged() {
        const localPlayer = this.getLocalPlayer();
        for (const stage of this.stagingMelds) {
            localPlayer.hand.push(...stage.cards);
        }
        this.stagingMelds = [];
        this.sortPlayerHand(localPlayer.seat);
        sounds.playCardSlide();
        this.notify('all_unstaged');
    }

    commitStagedMelds() {
        const localPlayer = this.getLocalPlayer();
        if (this.currentTurnIndex !== localPlayer.seat || this.phase !== 'play') {
            return { success: false, message: 'لا يمكنك الطرح الآن' };
        }

        if (this.stagingMelds.length === 0) {
            return { success: false, message: 'لم تقم بتجهيز تشكيلات لطرحها!' };
        }

        const meldGroups = this.stagingMelds.map(s => s.cards);

        // قانون اللعبة الصارم: ممنوع طرح الكروت على الطاولة قبل إكمال جميع أوراق اليد بالكامل
        const validation = RummyRules.validateCompleteHandDeclaration(meldGroups, localPlayer.hand.length, this.mode);
        if (!validation.valid) {
            sounds.playError();
            return { success: false, message: validation.error };
        }

        localPlayer.hasOpened = true;
        this.addLog(validation.message, 'success');

        // طرح جميع التشكيلات دفعة واحدة على الطاولة
        for (const stage of this.stagingMelds) {
            this.tableMelds.push({
                id: 'table_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
                ownerSeat: localPlayer.seat,
                ownerName: localPlayer.name,
                cards: stage.cards,
                type: stage.type,
                points: stage.points
            });
        }

        const committed = [...this.stagingMelds];
        this.stagingMelds = [];

        // إذا كانت هناك ورقة متبقية للرمي (الورقة الأخيرة لإنهاء الجولة)
        if (localPlayer.hand.length === 1) {
            const [finalCard] = localPlayer.hand.splice(0, 1);
            this.discardPile.push(finalCard);
            this.addLog(`${localPlayer.name} رمى ورقة الفوز الأخيرة: ${finalCard.getRankArabic()} ${finalCard.getSuitDetails().symbol}!`, 'success');
        }

        sounds.playWin();
        this.endGame(localPlayer, 'فوز أسطوري بإكمال وطرح جميع أوراق اليد!');
        this.notify('melds_committed', { melds: committed, seat: localPlayer.seat });

        return { success: true, committed };
    }

    layoffCardOnMeld(cardIndex, tableMeldId) {
        const localPlayer = this.getLocalPlayer();
        if (this.currentTurnIndex !== localPlayer.seat || this.phase !== 'play') {
            return { success: false, message: 'لا يمكنك التركيب الآن' };
        }

        if (!localPlayer.hasOpened) {
            return { success: false, message: 'ممنوع وضع الكروت على الطاولة قبل إكمال جميع الأوراق والخروج!' };
        }

        const card = localPlayer.hand[cardIndex];
        const meld = this.tableMelds.find(m => m.id === tableMeldId);
        if (!card || !meld) return { success: false, message: 'الورقة أو التشكيلة غير موجودة' };

        if (!RummyRules.canLayoffCard(card, meld.cards)) {
            sounds.playError();
            return { success: false, message: 'الورقة لا تتطابق مع هذه التشكيلة!' };
        }

        meld.cards.push(card);
        localPlayer.hand.splice(cardIndex, 1);
        this.clearSelection();

        sounds.playCardPlace();
        this.addLog(`${localPlayer.name} قام بتركيب ${card.getRankArabic()} ${card.getSuitDetails().symbol} على الطاولة.`, 'player');
        this.notify('card_laid_off', { seat: localPlayer.seat, card, meldId: tableMeldId });

        if (localPlayer.hand.length === 0) {
            this.endGame(localPlayer, 'فوز بتركيب جميع الأوراق!');
        }

        return { success: true, card, meldId: tableMeldId };
    }

    discardCard(cardIndex, seat = null) {
        const actingSeat = seat !== null ? seat : this.mySeat;
        const player = this.players[actingSeat];

        if (this.currentTurnIndex !== actingSeat || this.phase !== 'play') {
            return { success: false, message: 'ليس وقت رمي ورقة' };
        }

        if (cardIndex < 0 || cardIndex >= player.hand.length) {
            return { success: false, message: 'حدد ورقة صالحة للرمي' };
        }

        const [discarded] = player.hand.splice(cardIndex, 1);
        this.discardPile.push(discarded);
        if (player.isLocalHuman) this.clearSelection();
        sounds.playCardPlace();

        this.addLog(`${player.name} رمى ${discarded.getRankArabic()} ${discarded.getSuitDetails().symbol}.`, player.isLocalHuman ? 'player' : 'ai');
        this.notify('card_discarded', { seat: actingSeat, card: discarded });

        if (player.hand.length === 0) {
            this.endGame(player, 'أنهى جميع أوراقه بنجاح!');
            return { success: true, discarded };
        }

        // انتقال الدور للاعب التالي في اتجاه عقارب الساعة
        this.nextTurn();
        return { success: true, discarded };
    }

    nextTurn() {
        this.currentTurnIndex = (this.currentTurnIndex + 1) % this.players.length;
        this.phase = 'draw';
        const nextPlayer = this.getCurrentPlayer();

        this.notify('turn_changed', { currentTurnIndex: this.currentTurnIndex, player: nextPlayer });

        // إذا كان الدور التالي لبوت ذكاء اصطناعي، يتم تشغيله
        if (nextPlayer.isBot) {
            setTimeout(() => this.executeBotTurn(nextPlayer), 1000);
        }
    }

    executeBotTurn(bot) {
        if (this.phase === 'game_over') return;

        // 1. السحب
        const topDiscard = this.discardPile[this.discardPile.length - 1];
        const wantsDiscard = RummyAI.shouldDrawFromDiscard(bot.hand, topDiscard, bot.hasOpened, this.mode);

        if (wantsDiscard && this.discardPile.length > 0) {
            this.drawDiscard(bot.seat);
        } else {
            this.drawStock(bot.seat);
        }

        // 2. الطرح: البوت لا يطرح الكروت جزئياً، بل فقط عندما تكتمل جميع أوراقه في تشكيلات صالحة للفوز
        setTimeout(() => {
            const meldsToPlay = RummyAI.decideMeldsToPlay(bot.hand, true, this.mode);
            let canWin = false;

            if (meldsToPlay && meldsToPlay.length > 0) {
                const meldedCardsCount = meldsToPlay.reduce((sum, m) => sum + m.length, 0);
                if (bot.hand.length - meldedCardsCount <= 1) {
                    canWin = true;
                }
            }

            if (canWin) {
                this.addLog(`قام ${bot.name} بإكمال جميع أوراقه وطرحها للفوز!`, 'ai');
                meldsToPlay.forEach(cardsGroup => {
                    this.tableMelds.push({
                        id: 'table_bot_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
                        ownerSeat: bot.seat,
                        ownerName: bot.name,
                        cards: cardsGroup,
                        type: 'bot_meld',
                        points: 0
                    });

                    const ids = new Set(cardsGroup.map(c => c.id));
                    bot.hand = bot.hand.filter(c => !ids.has(c.id));
                });

                if (bot.hand.length === 1) {
                    const [finalDiscard] = bot.hand.splice(0, 1);
                    this.discardPile.push(finalDiscard);
                }

                sounds.playCardPlace();
                this.notify('melds_committed', { melds: meldsToPlay, seat: bot.seat });
                this.endGame(bot, 'فاز بإكمال وطرح كافة أوراقه!');
                return;
            }

            // 3. الرمي
            setTimeout(() => {
                const cardToDiscard = RummyAI.chooseDiscardCard(bot.hand, this.tableMelds);
                if (cardToDiscard) {
                    const idx = bot.hand.findIndex(c => c.id === cardToDiscard.id);
                    if (idx !== -1) {
                        this.discardCard(idx, bot.seat);
                    }
                }
            }, 700);

        }, 700);
    }

    endGame(winnerPlayer, reason) {
        this.winner = winnerPlayer;
        this.phase = 'game_over';

        if (winnerPlayer.seat === this.mySeat) {
            sounds.playWin();
            this.addLog(`🎉 مبروك! فزت بالجولة: ${reason}`, 'success');
        } else {
            sounds.playLose();
            this.addLog(`😞 فاز ${winnerPlayer.name} بالجولة: ${reason}`, 'error');
        }

        this.notify('game_over', { winner: winnerPlayer, reason });
    }

    getCurrentStagedStats() {
        let points = 0;
        let francPoints = 0;
        let hasJoker = false;
        this.stagingMelds.forEach(m => {
            points += m.points;
            if (m.cards.some(c => c.isJoker)) {
                hasJoker = true;
            } else {
                francPoints += m.points;
            }
        });

        const localPlayer = this.getLocalPlayer();
        const unmeldedCount = localPlayer ? localPlayer.hand.length : 0;
        const allCardsCompleted = unmeldedCount <= 1 && this.stagingMelds.length > 0;

        let readyToWin = false;
        if (this.mode === GAME_MODES.TALLAJ) {
            readyToWin = allCardsCompleted && francPoints >= 71;
        } else {
            readyToWin = allCardsCompleted;
        }

        return {
            points,
            francPoints,
            hasJoker,
            unmeldedCount,
            allCardsCompleted,
            readyToWin,
            targetPoints: 71
        };
    }
}
