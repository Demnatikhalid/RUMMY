// محرك لعبة البلاك جاك (Blackjack 21)

import { Deck, Card } from './cards.js';
import { sounds } from './audio.js';

export class BlackjackEngine {
    constructor() {
        this.deck = null;
        this.playerHand = [];
        this.dealerHand = [];
        this.wallet = 1000;
        this.currentBet = 0;
        this.gameState = 'betting'; // 'betting' | 'playing' | 'dealer_turn' | 'round_over'
        this.result = null; // 'win' | 'lose' | 'push' | 'blackjack' | 'bust'
        this.resultMessage = '';
        this.listeners = [];
    }

    onStateChange(cb) {
        this.listeners.push(cb);
    }

    notify(event, data = {}) {
        this.listeners.forEach(cb => cb(this, event, data));
    }

    initGame() {
        // رزمة كازينو 6 رزم لضمان واقعية البلاك جاك
        this.deck = new Deck(6, false);
        this.deck.shuffle();
        this.playerHand = [];
        this.dealerHand = [];
        this.currentBet = 0;
        this.gameState = 'betting';
        this.result = null;
        this.resultMessage = 'حدد رهانك واضغط على "توزيع" لبدء الجولة';
        this.notify('init');
    }

    addBet(amount) {
        if (this.gameState !== 'betting') return false;
        if (this.wallet >= amount) {
            this.wallet -= amount;
            this.currentBet += amount;
            sounds.playChipSound();
            this.notify('bet_changed');
            return true;
        }
        sounds.playError();
        return false;
    }

    clearBet() {
        if (this.gameState !== 'betting') return false;
        this.wallet += this.currentBet;
        this.currentBet = 0;
        sounds.playChipSound();
        this.notify('bet_changed');
        return true;
    }

    startRound() {
        if (this.gameState !== 'betting') return false;
        if (this.currentBet <= 0) {
            sounds.playError();
            this.resultMessage = 'يرجى وضع رهان أولاً للبدء!';
            this.notify('error');
            return false;
        }

        // إذا كانت أوراق الرزمة قليلة، إعادة خلط 6 رزم
        if (this.deck.remaining < 50) {
            this.deck = new Deck(6, false);
            this.deck.shuffle();
        }

        this.playerHand = [];
        this.dealerHand = [];
        this.result = null;

        // توزيع ورقتين لكل من اللاعب والموزع
        this.playerHand.push(this.deck.draw());
        this.dealerHand.push(this.deck.draw());
        this.playerHand.push(this.deck.draw());
        this.dealerHand.push(this.deck.draw());

        sounds.playCardSlide();
        this.gameState = 'playing';

        // فحص البلاك جاك الأولي
        const playerVal = this.getHandValue(this.playerHand);
        const dealerVal = this.getHandValue(this.dealerHand);

        if (playerVal.best === 21 && this.playerHand.length === 2) {
            if (dealerVal.best === 21 && this.dealerHand.length === 2) {
                // تعادل بلاك جاك
                this.wallet += this.currentBet;
                this.endRound('push', 'تعادل بلاك جاك! استرددت رهانك.');
            } else {
                // فوز بلاك جاك 3:2
                const winAmount = this.currentBet + Math.floor(this.currentBet * 1.5);
                this.wallet += winAmount;
                this.endRound('blackjack', `🎉 بلاك جاك طبيعي 21! ربحت ${winAmount} فيشة!`);
            }
            return true;
        }

        this.resultMessage = 'اختر: سحب ورقة (Hit) أو وقوف (Stand) أو مضاعفة الرهان (Double)';
        this.notify('round_started');
        return true;
    }

    /**
     * حساب قيمة اليد مع الحساب الذكي للآس (1 أو 11)
     */
    getHandValue(hand) {
        let minTotal = 0;
        let acesCount = 0;

        for (const card of hand) {
            if (card.rank === 'A') {
                acesCount++;
                minTotal += 1;
            } else if (['10', 'J', 'Q', 'K'].includes(card.rank)) {
                minTotal += 10;
            } else {
                minTotal += parseInt(card.rank, 10);
            }
        }

        let bestTotal = minTotal;
        // هل يمكن جعل أحد الآسات بقيمة 11 دون تجاوز 21؟
        if (acesCount > 0 && minTotal + 10 <= 21) {
            bestTotal = minTotal + 10;
        }

        return {
            min: minTotal,
            best: bestTotal,
            isBust: minTotal > 21,
            isBlackjack: hand.length === 2 && bestTotal === 21,
            isSoft: bestTotal !== minTotal
        };
    }

    /**
     * سحب ورقة إضافية (Hit)
     */
    hit() {
        if (this.gameState !== 'playing') return false;

        const card = this.deck.draw();
        this.playerHand.push(card);
        sounds.playCardSlide();

        const val = this.getHandValue(this.playerHand);
        if (val.best > 21) {
            this.endRound('bust', `تجاوزت 21 (${val.best} نقطة)! خسرت الرهان.`);
        } else if (val.best === 21) {
            // وصول تلقائي للـ 21، تحويل الدور للموزع
            this.stand();
        } else {
            this.notify('player_hit');
        }
        return true;
    }

    /**
     * مضاعفة الرهان (Double Down)
     */
    doubleDown() {
        if (this.gameState !== 'playing' || this.playerHand.length !== 2) return false;
        if (this.wallet < this.currentBet) {
            sounds.playError();
            this.resultMessage = 'رصيدك لا يكفي لمضاعفة الرهان!';
            this.notify('error');
            return false;
        }

        this.wallet -= this.currentBet;
        this.currentBet *= 2;
        sounds.playChipSound();

        const card = this.deck.draw();
        this.playerHand.push(card);
        sounds.playCardSlide();

        const val = this.getHandValue(this.playerHand);
        if (val.best > 21) {
            this.endRound('bust', `تجاوزت 21 بالمضاعفة (${val.best} نقطة)! خسرت الرهان.`);
        } else {
            this.stand();
        }
        return true;
    }

    /**
     * وقوف اللاعب وبدء دور الموزع (Stand)
     */
    stand() {
        if (this.gameState !== 'playing') return false;

        this.gameState = 'dealer_turn';
        this.notify('dealer_turn_start');

        // كشف ورقة الموزع المخفية وتشغيل دوره
        this.runDealerTurn();
        return true;
    }

    runDealerTurn() {
        const step = () => {
            const dealerVal = this.getHandValue(this.dealerHand);

            // الموزع يقف على 17 فما فوق
            if (dealerVal.best < 17) {
                const card = this.deck.draw();
                this.dealerHand.push(card);
                sounds.playCardSlide();
                this.notify('dealer_card_drawn');
                setTimeout(step, 800);
            } else {
                this.resolveOutcome();
            }
        };

        setTimeout(step, 800);
    }

    resolveOutcome() {
        const playerVal = this.getHandValue(this.playerHand).best;
        const dealerVal = this.getHandValue(this.dealerHand).best;

        if (dealerVal > 21) {
            // الموزع احترق
            const winAmount = this.currentBet * 2;
            this.wallet += winAmount;
            this.endRound('win', `الموزع تجاوز 21 (${dealerVal})! مبروك، ربحت ${winAmount} فيشة.`);
        } else if (playerVal > dealerVal) {
            const winAmount = this.currentBet * 2;
            this.wallet += winAmount;
            this.endRound('win', `يدك (${playerVal}) أعلى من الموزع (${dealerVal})! ربحت ${winAmount} فيشة.`);
        } else if (playerVal < dealerVal) {
            this.endRound('lose', `يد الموزع (${dealerVal}) أعلى من يدك (${playerVal}). خسرت الرهان.`);
        } else {
            // تعادل Push
            this.wallet += this.currentBet;
            this.endRound('push', `تعادل بـ ${playerVal} نقطة! تم استرجاع رهانك.`);
        }
    }

    endRound(result, message) {
        this.gameState = 'round_over';
        this.result = result;
        this.resultMessage = message;

        if (result === 'win' || result === 'blackjack') {
            sounds.playWin();
        } else if (result === 'lose' || result === 'bust') {
            sounds.playLose();
        } else {
            sounds.playCardPlace();
        }

        this.currentBet = 0;
        this.notify('round_ended', { result, message });
    }

    resetWallet() {
        this.wallet = 1000;
        this.currentBet = 0;
        this.gameState = 'betting';
        this.resultMessage = 'تمت إعادة شحن رصيدك إلى 1000 فيشة مجاناً!';
        sounds.playChipSound();
        this.notify('wallet_reset');
    }
}
