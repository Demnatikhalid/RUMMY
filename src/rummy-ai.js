// الذكاء الاصطناعي للاعب الخصم في لعبة الرومي (سامبل وطالّاج)

import { RummyRules, GAME_MODES } from './rummy-rules.js';

export class RummyAI {
    /**
     * العثور على جميع التشكيلات المحتملة في يد اللاعب
     * @param {Card[]} hand
     * @param {boolean} allowJokers
     */
    static findPossibleMelds(hand, allowJokers = true) {
        const validMelds = [];
        const n = hand.length;

        // فحص المجموعات المتشابهة (Sets of 3 or 4)
        const rankGroups = {};
        hand.forEach(card => {
            if (card.isJoker) return;
            if (!rankGroups[card.rank]) rankGroups[card.rank] = [];
            // تجنب تكرار نفس الرمز في نفس المجموعة
            if (!rankGroups[card.rank].some(c => c.suit === card.suit)) {
                rankGroups[card.rank].push(card);
            }
        });

        Object.values(rankGroups).forEach(group => {
            if (group.length >= 3) {
                const check3 = RummyRules.isValidSet(group.slice(0, 3));
                if (check3.valid) validMelds.push(group.slice(0, 3));

                if (group.length === 4) {
                    const check4 = RummyRules.isValidSet(group.slice(0, 4));
                    if (check4.valid) validMelds.push(group.slice(0, 4));
                }
            }
        });

        // فحص السلاسل (Sequences of 3+)
        const suitGroups = { spades: [], hearts: [], diamonds: [], clubs: [] };
        hand.forEach(card => {
            if (!card.isJoker && suitGroups[card.suit]) {
                suitGroups[card.suit].push(card);
            }
        });

        Object.values(suitGroups).forEach(cards => {
            if (cards.length < 3) return;

            // إزالة الأوراق المتكررة بنفس القيمة للحساب
            const uniqueCards = [];
            const seenRanks = new Set();
            for (const c of cards) {
                if (!seenRanks.has(c.rank)) {
                    seenRanks.add(c.rank);
                    uniqueCards.push(c);
                }
            }

            // فحص التسلسلات الممكنة بطول 3 أو 4 أو 5
            for (let len = 3; len <= Math.min(5, uniqueCards.length); len++) {
                // توليد التباديل الممكنة
                const combinations = this.getCombinations(uniqueCards, len);
                combinations.forEach(comb => {
                    const check = RummyRules.isValidSequence(comb);
                    if (check.valid) {
                        validMelds.push(comb);
                    }
                });
            }
        });

        return validMelds;
    }

    static getCombinations(arr, k) {
        if (k === 0) return [[]];
        if (arr.length === 0) return [];
        const head = arr[0];
        const tail = arr.slice(1);
        const withHead = this.getCombinations(tail, k - 1).map(c => [head, ...c]);
        const withoutHead = this.getCombinations(tail, k);
        return [...withHead, ...withoutHead];
    }

    /**
     * البحث عن أفضل مجموعة من التشكيلات غير المتداخلة في الكروت
     */
    static findDisjointMelds(possibleMelds, hand) {
        let bestCombination = [];
        let maxPoints = 0;

        const search = (index, currentSelected, usedCardIds) => {
            if (index >= possibleMelds.length) {
                let points = 0;
                for (const meld of currentSelected) {
                    const check = RummyRules.isValidMeld(meld);
                    if (check.valid) points += check.points;
                }
                if (points > maxPoints) {
                    maxPoints = points;
                    bestCombination = [...currentSelected];
                }
                return;
            }

            const meld = possibleMelds[index];
            const hasOverlap = meld.some(c => usedCardIds.has(c.id));

            if (!hasOverlap) {
                const nextUsed = new Set(usedCardIds);
                meld.forEach(c => nextUsed.add(c.id));
                search(index + 1, [...currentSelected, meld], nextUsed);
            }

            // خيار عدم أخذ هذا الـ meld
            search(index + 1, currentSelected, usedCardIds);
        };

        // تقليص حجم البحث لأفضل النتائج
        const topMelds = possibleMelds.slice(0, 15);
        search(0, [], new Set());

        return { melds: bestCombination, totalPoints: maxPoints };
    }

    /**
     * قرار سحب ورقة من رزمة المرميات أم من رزمة السحب
     */
    static shouldDrawFromDiscard(hand, discardTop, hasOpened, mode) {
        if (!discardTop) return false;

        // اختبار إذا كانت الورقة المرمية تكمل تشكيلة صالحة
        const testHand = [...hand, discardTop];
        const meldsBefore = this.findPossibleMelds(hand, hasOpened);
        const meldsAfter = this.findPossibleMelds(testHand, hasOpened);

        if (meldsAfter.length > meldsBefore.length) {
            if (!hasOpened && mode === GAME_MODES.TALLAJ) {
                // إذا لم يكن قد طاح بعد في الطالّاج، لا يسحبها إلا إذا ساعدت في تشكيلة فرانك
                if (discardTop.isJoker) return false;
            }
            return true;
        }

        return false;
    }

    /**
     * قرار الطرح للذكاء الاصطناعي
     */
    static decideMeldsToPlay(hand, hasOpened, mode) {
        const allowJokers = hasOpened || mode === GAME_MODES.SAMBEL;
        const candidateCards = allowJokers ? hand : hand.filter(c => !c.isJoker);
        const possibleMelds = this.findPossibleMelds(candidateCards, allowJokers);

        if (possibleMelds.length === 0) return null;

        const best = this.findDisjointMelds(possibleMelds, candidateCards);

        if (!hasOpened) {
            const validation = RummyRules.validateInitialMeld(best.melds, mode);
            if (validation.valid) {
                return best.melds;
            }
            return null; // لا يلبي شرط الـ 71 في الطالّاج أو لا توجد تشكيلات صالحة
        }

        // إذا كان قد نزل بالفعل، يطرح أي تشكيلات جديدة لديه
        return best.melds.length > 0 ? best.melds : null;
    }

    /**
     * اختيار الورقة الأقل نفعاً للإلقاء في رزمة المرميات
     */
    static chooseDiscardCard(hand, tableMelds = []) {
        if (!hand || hand.length === 0) return null;

        // الاحتفاظ بالجوكر دائماً إن أمكن
        const nonJokers = hand.filter(c => !c.isJoker);
        const pool = nonJokers.length > 0 ? nonJokers : hand;

        // تقييم الأوراق واختيار الورقة الأبعد عن تكوين تشكيلة
        let worstCard = pool[0];
        let minSynergy = 999;

        for (const card of pool) {
            let synergy = 0;
            for (const other of pool) {
                if (other.id === card.id) continue;
                // نفس القيمة (إمكانية تكوين Brelan)
                if (other.rank === card.rank) synergy += 3;
                // نفس اللون وقريب بالقيمة (إمكانية تكوين تسلسل)
                if (other.suit === card.suit) {
                    const diff = Math.abs(card.getOrderValue() - other.getOrderValue());
                    if (diff === 1) synergy += 4;
                    else if (diff === 2) synergy += 2;
                }
            }

            // في حالة التساوي، التخلص من الأوراق ذات النقاط العالية لتقليل الخسارة
            const score = synergy * 10 - card.getRummyPoints(true);
            if (score < minSynergy) {
                minSynergy = score;
                worstCard = card;
            }
        }

        return worstCard;
    }
}
