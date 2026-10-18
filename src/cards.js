// تعريف الكروت والرزم وإدارتها للرومي والبلاك جاك

export const SUITS = {
    SPADES: { id: 'spades', symbol: '♠', name: 'بستوني', color: 'black' },
    HEARTS: { id: 'hearts', symbol: '♥', name: 'كوبة', color: 'red' },
    DIAMONDS: { id: 'diamonds', symbol: '♦', name: 'كارو', color: 'red' },
    CLUBS: { id: 'clubs', symbol: '♣', name: 'سباتي', color: 'black' }
};

export const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

export class Card {
    /**
     * @param {string} suit - 'spades', 'hearts', 'diamonds', 'clubs', or 'joker'
     * @param {string} rank - '2'-'10', 'J', 'Q', 'K', 'A', or 'JOKER'
     * @param {number} deckIndex - index of deck in multi-deck games (0 or 1)
     * @param {string} id - unique ID
     */
    constructor(suit, rank, deckIndex = 0, id = null) {
        this.suit = suit;
        this.rank = rank;
        this.deckIndex = deckIndex;
        this.isJoker = suit === 'joker' || rank === 'JOKER';
        this.id = id || `${this.suit}_${this.rank}_${this.deckIndex}_${Math.random().toString(36).substr(2, 6)}`;
    }

    getSuitDetails() {
        if (this.isJoker) {
            return { id: 'joker', symbol: '★', name: 'جوكر', color: 'purple' };
        }
        return SUITS[this.suit.toUpperCase()] || { id: this.suit, symbol: '?', name: '', color: 'black' };
    }

    getRankArabic() {
        if (this.isJoker) return 'جوكر';
        if (this.rank === 'A') return 'آس (1)';
        if (this.rank === 'K') return 'الشيخ (K)';
        if (this.rank === 'Q') return 'الميمة (Q)';
        if (this.rank === 'J') return 'الغلام (J)';
        return this.rank;
    }

    /**
     * القيمة الترتيبية في السلسلة (Sequence rank)
     * Ace can be 1 (low) or 14 (high)
     */
    getOrderValue(aceHigh = false) {
        if (this.isJoker) return -1;
        if (this.rank === 'A') return aceHigh ? 14 : 1;
        if (this.rank === 'K') return 13;
        if (this.rank === 'Q') return 12;
        if (this.rank === 'J') return 11;
        return parseInt(this.rank, 10);
    }

    /**
     * قيمة النقاط في لعبة الرومي (لحساب شرط الـ 71 نقطة في الطالّاج وحساب الخسائر)
     * - الأرقام 2-10: نفس قيمتها
     * - الصور (J, Q, K): 10 نقاط
     * - الآس (A): 1 في السلسلة الصغرى، و10 أو 11 في الكبرى/المجموعات
     */
    getRummyPoints(inHighMeld = false) {
        if (this.isJoker) return 0; // في الطالّاج الجوكر ممنوع في أول طرح
        if (this.rank === 'A') return inHighMeld ? 11 : 1;
        if (['J', 'Q', 'K'].includes(this.rank)) return 10;
        return parseInt(this.rank, 10);
    }

    /**
     * قيمة الورقة في البلاك جاك
     */
    getBlackjackValues() {
        if (this.rank === 'A') return [1, 11];
        if (['10', 'J', 'Q', 'K'].includes(this.rank)) return [10];
        return [parseInt(this.rank, 10)];
    }
}

export class Deck {
    constructor(numDecks = 1, includeJokers = false, jokersPerDeck = 2) {
        this.numDecks = numDecks;
        this.includeJokers = includeJokers;
        this.jokersPerDeck = jokersPerDeck;
        this.cards = [];
        this.reset();
    }

    reset() {
        this.cards = [];
        const suitKeys = ['spades', 'hearts', 'diamonds', 'clubs'];
        for (let d = 0; d < this.numDecks; d++) {
            for (const suit of suitKeys) {
                for (const rank of RANKS) {
                    this.cards.push(new Card(suit, rank, d));
                }
            }
            if (this.includeJokers) {
                for (let j = 0; j < this.jokersPerDeck; j++) {
                    this.cards.push(new Card('joker', 'JOKER', d, `joker_${d}_${j}`));
                }
            }
        }
    }

    shuffle() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }

    draw() {
        if (this.cards.length === 0) return null;
        return this.cards.pop();
    }

    drawMultiple(count) {
        const drawn = [];
        for (let i = 0; i < count; i++) {
            const card = this.draw();
            if (card) drawn.push(card);
        }
        return drawn;
    }

    get remaining() {
        return this.cards.length;
    }
}
