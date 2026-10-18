// سكريبت التحقق والاختبار البرمجي لقواعد الرومي والبلاك جاك

import { Card, Deck } from '../src/cards.js';
import { RummyRules, GAME_MODES } from '../src/rummy-rules.js';
import { BlackjackEngine } from '../src/blackjack-engine.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
    if (condition) {
        console.log(`✓ نجح: ${message}`);
        passed++;
    } else {
        console.error(`✗ فشل: ${message}`);
        failed++;
    }
}

console.log('--- بدء اختبار قواعد الرومي المغربي والبلاك جاك ---\n');

// 1. اختبار وضع السامبل (13 ورقة)
{
    const deck = new Deck(2, true, 2);
    assert(deck.cards.length === 108, 'رزمة الرومي تحتوي على 108 بطاقة (52x2 + 4 جواكر)');

    const p1 = deck.drawMultiple(13);
    assert(p1.length === 13, 'وضع السامبل: توزيع 13 ورقة للاعب');
}

// 2. اختبار وضع الطالّاج (14 ورقة)
{
    const deck = new Deck(2, true, 2);
    const p1 = deck.drawMultiple(14);
    assert(p1.length === 14, 'وضع الطالّاج: توزيع 14 ورقة للاعب');
}

// 3. اختبار التشكيلات الصالحة (Runs and Sets)
{
    // تسلسل صالح: 7♠ 8♠ 9♠
    const seqCards = [
        new Card('spades', '7'),
        new Card('spades', '8'),
        new Card('spades', '9')
    ];
    const seqCheck = RummyRules.isValidSequence(seqCards);
    assert(seqCheck.valid === true, 'تشكيلة تسلسل صحيح (7-8-9 بستوني)');
    assert(seqCheck.points === 24, `نقاط التسلسل 7+8+9 = 24 (المحسوب: ${seqCheck.points})`);

    // تسلسل برمز مختلف (غير صالح)
    const badSeq = [
        new Card('spades', '7'),
        new Card('hearts', '8'),
        new Card('spades', '9')
    ];
    assert(RummyRules.isValidSequence(badSeq).valid === false, 'رفض تسلسل يحتوي على رموز مختلفة');

    // مجموعة متشابهة صالحة (Brelan): 10♠ 10♥ 10♦
    const setCards = [
        new Card('spades', '10'),
        new Card('hearts', '10'),
        new Card('diamonds', '10')
    ];
    const setCheck = RummyRules.isValidSet(setCards);
    assert(setCheck.valid === true, 'تشكيلة مجموعة متشابهة صالحة (ثلاث عشرات برموز مختلفة)');
    assert(setCheck.points === 30, `نقاط 3 عشرات = 30 (المحسوب: ${setCheck.points})`);

    // مجموعة متشابهة بنفس الرمز مكرر (غير صالحة)
    const badSet = [
        new Card('spades', '10', 0),
        new Card('spades', '10', 1),
        new Card('hearts', '10', 0)
    ];
    assert(RummyRules.isValidSet(badSet).valid === false, 'رفض مجموعة متشابهة تكرر فيها نفس الرمز');
}

// 4. اختبار شروط الطالّاج (71 نقطة + أوراق فرانك بدون جوكر)
{
    // أ. مجموع تشكيلات أقل من 71 نقطة (مثال: 24 + 30 = 54)
    const meld1 = [
        new Card('spades', '7'),
        new Card('spades', '8'),
        new Card('spades', '9')
    ]; // 24 نقطة
    const meld2 = [
        new Card('spades', '10'),
        new Card('hearts', '10'),
        new Card('diamonds', '10')
    ]; // 30 نقطة

    const tallajCheckLow = RummyRules.validateInitialMeld([meld1, meld2], GAME_MODES.TALLAJ);
    assert(tallajCheckLow.valid === false, 'الطالّاج: رفض النزول إذا كان المجموع أقل من 71 نقطة (54 نقطة)');

    // ب. إضافة تشكيلة أخرى لتتجاوز 71 نقطة (مثال: Q-K-A = 10+10+11 = 31 نقطة -> 54 + 31 = 85 نقطة)
    const meld3 = [
        new Card('hearts', 'Q'),
        new Card('hearts', 'K'),
        new Card('hearts', 'A')
    ]; // 31 نقطة
    const tallajCheckValid = RummyRules.validateInitialMeld([meld1, meld2, meld3], GAME_MODES.TALLAJ);
    assert(tallajCheckValid.valid === true, `الطالّاج: قبول النزول بأوراق فرانك نقية بمجموع 85 >= 71 (${tallajCheckValid.message})`);

    // ج. شرط أوراق الفرانك: رفض النزول حتى لو كان المجموع >= 71 إذا تضمن جوكر!
    const meldWithJoker = [
        new Card('spades', '7'),
        new Card('joker', 'JOKER'),
        new Card('spades', '9')
    ];
    const tallajCheckJoker = RummyRules.validateInitialMeld([meldWithJoker, meld2, meld3], GAME_MODES.TALLAJ);
    assert(tallajCheckJoker.valid === false, 'الطالّاج: رفض النزول لوجود جوكر (شرط أوراق فرانك نقية)');

    // د. نفس التشكيلة التي تحتوي على جوكر مقبولة في وضع السامبل
    const sambelCheck = RummyRules.validateInitialMeld([meldWithJoker], GAME_MODES.SAMBEL);
    assert(sambelCheck.valid === true, 'السامبل: قبول الطرح المباشر مع الجوكر دون قيود الـ 71');
}

// 5. اختبار البلاك جاك (Blackjack)
{
    const bj = new BlackjackEngine();

    // فحص حساب اليد العادية
    const hand1 = [new Card('spades', '10'), new Card('hearts', '8')];
    assert(bj.getHandValue(hand1).best === 18, 'بلاك جاك: 10 + 8 = 18');

    // فحص حساب الآس المرن (Soft Ace)
    const softHand = [new Card('spades', 'A'), new Card('hearts', '6')];
    assert(bj.getHandValue(softHand).best === 17, 'بلاك جاك: A + 6 = 17 (Soft)');

    // فحص الآس عند السحب بعد ذلك لعدم الاحتراق
    softHand.push(new Card('diamonds', '8')); // A + 6 + 8 = 15
    assert(bj.getHandValue(softHand).best === 15, 'بلاك جاك: تحول الآس إلى 1 عند إضافة 8 (A + 6 + 8 = 15)');

    // بلاك جاك طبيعي (A + K)
    const naturalBJ = [new Card('spades', 'A'), new Card('clubs', 'K')];
    assert(bj.getHandValue(naturalBJ).isBlackjack === true, 'بلاك جاك طبيعي 21 بنجاح');
}

// 6. اختبار محرك الرومي لـ 4 لاعبين ودوران الأدوار
{
    import('../src/rummy-engine.js').then(({ RummyEngine }) => {
        const engine = new RummyEngine(GAME_MODES.SAMBEL);
        engine.initGame([
            { id: 'p0', name: 'لاعب 1', isLocalHuman: true },
            { id: 'p1', name: 'لاعب 2', isLocalHuman: false },
            { id: 'p2', name: 'لاعب 3', isLocalHuman: false },
            { id: 'p3', name: 'لاعب 4', isLocalHuman: false }
        ]);

        assert(engine.players.length === 4, 'تهيئة 4 مقاعد لاعبين بنجاح');
        assert(engine.players[0].hand.length === 13, 'السامبل: كل لاعب لديه 13 ورقة (اللاعب 1: 13 ورقة)');
        assert(engine.players[3].hand.length === 13, 'السامبل: اللاعب 4 لديه 13 ورقة');

        // سحب ورقة ورمي ورقة ينتقل للدور التالي (0 -> 1)
        engine.drawStock(0);
        assert(engine.players[0].hand.length === 14, 'بعد السحب: أصبح لدى اللاعب 0 14 ورقة');

        // اختبار تغيير موقع ورقة في اليد
        const firstCardId = engine.players[0].hand[0].id;
        engine.moveCardInHand(0, 0, 3);
        assert(engine.players[0].hand[3].id === firstCardId, 'تغيير موقع الورقة في اليد من الفهرس 0 إلى 3 بنجاح');

        engine.discardCard(0, 0);
        assert(engine.currentTurnIndex === 1, 'دوران الدور في اتجاه عقارب الساعة: انتقل الدور للاعب 1');

        // 7. اختبار قاعدة منع طرح الكروت قبل إكمال جميع أوراق اليد
        const testMeld = [new Card('spades', '7'), new Card('spades', '8'), new Card('spades', '9')];
        const partialCheck = RummyRules.validateCompleteHandDeclaration([testMeld], 10, GAME_MODES.SAMBEL);
        assert(partialCheck.valid === false, 'منع طرح الكروت على الطاولة طالما لم تكتمل اليد بالكامل (10 كروت متبقية)');

        const completeCheck = RummyRules.validateCompleteHandDeclaration([testMeld], 1, GAME_MODES.SAMBEL);
        assert(completeCheck.valid === true, 'السماح بالطرح والخروج عند إكمال جميع أوراق اليد مع ورقة واحدة للرمي');

        console.log(`\n================================`);
        console.log(`النتائج النهائية: نجح ${passed} | فشل ${failed}`);
        console.log(`================================`);
        if (failed > 0) process.exit(1);
    });
}

console.log(`\n================================`);
console.log(`النتائج النهائية: نجح ${passed} | فشل ${failed}`);
console.log(`================================`);

if (failed > 0) process.exit(1);
