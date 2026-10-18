// منطق وقواعد لعبة الرومي المغربي (السامبل والطالّاج)

import { Card } from './cards.js';

export const GAME_MODES = {
    SAMBEL: 'sambel',
    TALLAJ: 'tallaj'
};

export class RummyRules {
    /**
     * فحص ما إذا كانت مجموعة الكروت تشكل تشكيلة متسلسلة صالحة (Sequence / Run)
     * من نفس اللون ومرتبة تصاعدياً (مع إمكانية وجود جوكر)
     * @param {Card[]} cards
     * @returns {{ valid: boolean, type: string, error?: string, points: number }}
     */
    static isValidSequence(cards) {
        if (!cards || cards.length < 3) {
            return { valid: false, error: 'التسلسل يتطلب 3 أوراق على الأقل', points: 0 };
        }

        const jokers = cards.filter(c => c.isJoker);
        const nonJokers = cards.filter(c => !c.isJoker);

        if (nonJokers.length === 0) {
            return { valid: false, error: 'لا يمكن أن يتكون التسلسل من جواكر فقط', points: 0 };
        }

        // يجب أن تكون جميع الأوراق غير الجوكر من نفس النوع (الرمز/النقشة)
        const targetSuit = nonJokers[0].suit;
        if (!nonJokers.every(c => c.suit === targetSuit)) {
            return { valid: false, error: 'يجب أن تكون جميع أوراق التسلسل من نفس اللون/النقشة', points: 0 };
        }

        // التحقق من إمكانية ترتيبها كـ Ace-Low (A=1) أو Ace-High (A=14)
        const checkArrangement = (aceHigh) => {
            // استخراج القيم
            const values = nonJokers.map(c => c.getOrderValue(aceHigh));
            // التحقق من عدم وجود تكرار لنفس القيمة
            const uniqueValues = new Set(values);
            if (uniqueValues.size !== values.length) {
                return { valid: false };
            }

            values.sort((a, b) => a - b);
            const min = values[0];
            const max = values[values.length - 1];
            const span = max - min + 1;

            // عدد الأوراق المطلوبة لتغطية المجال من min إلى max
            const missingInSpan = span - values.length;
            const remainingJokers = jokers.length - missingInSpan;

            if (remainingJokers < 0) {
                return { valid: false };
            }

            // التأكد من أن الترتيب يقع ضمن الحدود (1 إلى 13 في حالة Ace Low، أو 2 إلى 14 في حالة Ace High)
            const minBound = aceHigh ? 2 : 1;
            const maxBound = aceHigh ? 14 : 13;

            // إذا توفرت جواكر إضافية، يمكن وضعها قبل البداية أو بعد النهاية بشرط عدم تجاوز الحدود
            const slotsBefore = min - minBound;
            const slotsAfter = maxBound - max;

            if (remainingJokers <= (slotsBefore + slotsAfter)) {
                return { valid: true, aceHigh };
            }

            return { valid: false };
        };

        const tryLow = checkArrangement(false);
        const tryHigh = checkArrangement(true);

        if (!tryLow.valid && !tryHigh.valid) {
            return { valid: false, error: 'الأوراق لا تشكل تسلسلاً متتابعاً صالحاً', points: 0 };
        }

        // اختيار Ace High إذا كان صالحاً لتحقيق نقاط أعلى
        const isHigh = tryHigh.valid;
        const points = this.calculateSequencePoints(cards, isHigh);

        return { valid: true, type: 'sequence', aceHigh: isHigh, suit: targetSuit, points };
    }

    /**
     * فحص ما إذا كانت المجموعة تشكل تجميعة متشابهة صالحة (Set / Group)
     * 3 أو 4 أوراق من نفس الرقم وبألوان/رموز مختلفة
     * @param {Card[]} cards
     * @returns {{ valid: boolean, type: string, error?: string, points: number }}
     */
    static isValidSet(cards) {
        if (!cards || cards.length < 3 || cards.length > 4) {
            return { valid: false, error: 'المجموعة المتشابهة تتكون من 3 أو 4 أوراق فقط', points: 0 };
        }

        const nonJokers = cards.filter(c => !c.isJoker);
        if (nonJokers.length === 0) {
            return { valid: false, error: 'لا يمكن أن تتكون المجموعة من جواكر فقط', points: 0 };
        }

        const targetRank = nonJokers[0].rank;
        if (!nonJokers.every(c => c.rank === targetRank)) {
            return { valid: false, error: 'يجب أن تحمل جميع أوراق المجموعة نفس الرقم/القيمة', points: 0 };
        }

        // فحص الألوان/الرموز: في الرومي ممنوع تكرار نفس الرمز في نفس المجموعة المتشابهة
        const suitsUsed = new Set();
        for (const c of nonJokers) {
            if (suitsUsed.has(c.suit)) {
                return { valid: false, error: 'ممنوع تكرار نفس النقشة في المجموعة المتشابهة', points: 0 };
            }
            suitsUsed.add(c.suit);
        }

        // حساب النقاط
        let cardPoint = 0;
        if (targetRank === 'A') {
            cardPoint = 11; // الآس في المجموعة المتشابهة يُحسب 11 نقطة
        } else if (['J', 'Q', 'K', '10'].includes(targetRank)) {
            cardPoint = 10;
        } else {
            cardPoint = parseInt(targetRank, 10);
        }

        // في أوراق الفرانك لا يوجد جوكر، لكن إذا كان هناك جوكر يأخذ قيمة الورقة التي يمثلها
        const points = cards.length * cardPoint;

        return { valid: true, type: 'set', rank: targetRank, points };
    }

    /**
     * فحص هل الكروت تمثل تشكيلة صالحة (سلسلة أو مجموعة)
     */
    static isValidMeld(cards) {
        const seq = this.isValidSequence(cards);
        if (seq.valid) return seq;

        const set = this.isValidSet(cards);
        if (set.valid) return set;

        return { valid: false, error: 'التشكيلة غير صحيحة (ليست تسلسلاً ولا مجموعة متشابهة)', points: 0 };
    }

    /**
     * حساب نقاط التسلسل
     */
    static calculateSequencePoints(cards, aceHigh) {
        let total = 0;
        for (const card of cards) {
            if (card.isJoker) {
                // الجوكر في الطالّاج غير مسموح في أول نزول، لكن لحساب المجموع العام:
                total += 10;
            } else {
                total += card.getRummyPoints(aceHigh);
            }
        }
        return total;
    }

    /**
     * فحص هل مجموعة من التشكيلات تلبي شرط النزول الأول (الطرح الأول)
     * @param {Card[][]} meldGroups - مصفوفة من مجموعات الأوراق المقترح طرحها
     * @param {string} mode - 'sambel' أو 'tallaj'
     */
    static validateInitialMeld(meldGroups, mode) {
        if (!meldGroups || meldGroups.length === 0) {
            return { valid: false, error: 'يجب اختيار تشكيلة واحدة على الأقل للطرح' };
        }

        let totalPoints = 0;
        const validatedMelds = [];

        for (let i = 0; i < meldGroups.length; i++) {
            const group = meldGroups[i];
            const check = this.isValidMeld(group);
            if (!check.valid) {
                return { valid: false, error: `المجموعة رقم ${i + 1} غير صالحة: ${check.error}` };
            }
            validatedMelds.push({ ...check, cards: group });
            totalPoints += check.points;
        }

        // في وضع السامبل: لا يوجد شرط للحد الأدنى من النقاط
        if (mode === GAME_MODES.SAMBEL) {
            return {
                valid: true,
                totalPoints,
                melds: validatedMelds,
                message: `طرح صالح في وضع السامبل (${totalPoints} نقطة)`
            };
        }

        // في وضع الطالّاج:
        // 1. لا يُسمح بأي جوكر في النزول الأول (أوراق فرانك)
        const hasAnyJoker = meldGroups.some(group => group.some(c => c.isJoker));
        if (hasAnyJoker) {
            return {
                valid: false,
                totalPoints,
                error: 'قانون الطالّاج: أوراق النزول الأول يجب أن تكون "أوراق فرانك" تماماً بدون أي جوكر!'
            };
        }

        // 2. شرط مجموع النقاط لا يقل عن 71 نقطة
        if (totalPoints < 71) {
            return {
                valid: false,
                totalPoints,
                error: `قانون الطالّاج: مجموع أوراق النزول الأول هو ${totalPoints} نقطة. يجب أن يصل إلى 71 نقطة على الأقل!`
            };
        }

        return {
            valid: true,
            totalPoints,
            melds: validatedMelds,
            message: `طرح ناجح وفق قانون الطالّاج بـ ${totalPoints} نقطة فرانك!`
        };
    }

    /**
     * فحص إمكانية تركيب ورقة على تشكيلة موجودة على الطاولة (Layoff)
     */
    static canLayoffCard(card, meldCards) {
        const testWithCard = [...meldCards, card];
        const validWithNew = this.isValidMeld(testWithCard);
        return validWithNew.valid;
    }

    /**
     * فحص شرط الخروج الكامل (ممنوع الطرح على الطاولة قبل إكمال جميع أوراق اليد بالكامل)
     */
    static validateCompleteHandDeclaration(meldGroups, remainingHandCardsCount, mode) {
        if (!meldGroups || meldGroups.length === 0) {
            return { valid: false, error: 'لم تقم بتجهيز تشكيلات لطرحها!' };
        }

        // ممنوع الطرح إذا كانت هناك أكثر من ورقة واحدة غير مشكلة في اليد
        if (remainingHandCardsCount > 1) {
            return { 
                valid: false, 
                error: `قانون اللعبة: ممنوع وضع الكروت على الطاولة قبل إكمال جميع أوراق يدك! (لديك ${remainingHandCardsCount} أوراق غير مكتملة).` 
            };
        }

        let totalPoints = 0;
        let francPoints = 0;
        const validatedMelds = [];

        for (let i = 0; i < meldGroups.length; i++) {
            const group = meldGroups[i];
            const check = this.isValidMeld(group);
            if (!check.valid) {
                return { valid: false, error: `المجموعة رقم ${i + 1} غير صالحة: ${check.error}` };
            }
            validatedMelds.push({ ...check, cards: group });
            totalPoints += check.points;

            const hasJoker = group.some(c => c.isJoker);
            if (!hasJoker) {
                francPoints += check.points;
            }
        }

        // في وضع الطالّاج: يجب أن تحتوي التشكيلات على أوراق فرانك تبلغ 71 نقطة على الأقل
        if (mode === GAME_MODES.TALLAJ) {
            if (francPoints < 71) {
                return {
                    valid: false,
                    error: `قانون الطالّاج: مجموع أوراق الفرانك النقية هو ${francPoints} نقطة. يجب أن يصل إلى 71 نقطة فرانك على الأقل في أول طرح!`
                };
            }
        }

        return {
            valid: true,
            totalPoints,
            francPoints,
            melds: validatedMelds,
            message: `خروج كامل ممتاز بـ ${totalPoints} نقطة! مبروك الفوز بالجولة!`
        };
    }
}
