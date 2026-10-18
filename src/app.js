// تطبيق الواجهة وإدارة الأحداث للعبة الرومي المغربي والبلاك جاك (فردي وجماعي بالأكواد)

import { Card } from './cards.js';
import { GAME_MODES } from './rummy-rules.js';
import { RummyEngine } from './rummy-engine.js';
import { BlackjackEngine } from './blackjack-engine.js';
import { sounds } from './audio.js';
import { network } from './multiplayer-net.js';

class App {
    constructor() {
        this.currentMode = GAME_MODES.SAMBEL; // 'sambel' | 'tallaj' | 'blackjack'
        this.rummy = null;
        this.blackjack = null;
        this.isMultiplayer = false;

        this.initDomElements();
        this.initEventListeners();
        this.initMultiplayerEvents();
        this.switchMode(GAME_MODES.SAMBEL);
    }

    initDomElements() {
        // الأزرار الرئيسية وعناصر التبويب
        this.tabSambel = document.getElementById('tab-sambel');
        this.tabTallaj = document.getElementById('tab-tallaj');
        this.tabBlackjack = document.getElementById('tab-blackjack');
        this.tabParty = document.getElementById('tab-party');
        this.btnRules = document.getElementById('btn-rules');
        this.btnSound = document.getElementById('btn-sound');

        // الحاويات والنوافذ المنبثقة
        this.rummyView = document.getElementById('rummy-view');
        this.blackjackView = document.getElementById('blackjack-view');
        this.rulesModal = document.getElementById('rules-modal');
        this.btnCloseRules = document.getElementById('btn-close-rules');
        this.partyModal = document.getElementById('party-modal');
        this.btnCloseParty = document.getElementById('btn-close-party');

        // عناصر نافذة اللعب الجماعي
        this.btnTabCreateRoom = document.getElementById('btn-tab-create-room');
        this.btnTabJoinRoom = document.getElementById('btn-tab-join-room');
        this.panelCreateRoom = document.getElementById('panel-create-room');
        this.panelJoinRoom = document.getElementById('panel-join-room');
        this.inputHostName = document.getElementById('input-host-name');
        this.selectPartyMode = document.getElementById('select-party-mode');
        this.selectPartyPlayers = document.getElementById('select-party-players');
        this.btnGenerateParty = document.getElementById('btn-generate-party');
        this.partyLobbyArea = document.getElementById('party-lobby-area');
        this.partyGeneratedCode = document.getElementById('party-generated-code');
        this.btnCopyCode = document.getElementById('btn-copy-code');
        this.partySlotsContainer = document.getElementById('party-slots-container');
        this.btnStartPartyMatch = document.getElementById('btn-start-party-match');
        this.btnFillPartyBots = document.getElementById('btn-fill-party-bots');
        this.inputJoinName = document.getElementById('input-join-name');
        this.inputJoinCode = document.getElementById('input-join-code');
        this.btnSubmitJoin = document.getElementById('btn-submit-join');
        this.roomCodeBadge = document.getElementById('room-code-badge');
        this.roomCodeDisplay = document.getElementById('room-code-display');

        // عناصر الطاولة الرباعية
        this.scoreboardList = document.getElementById('scoreboard-list');
        this.seatTop = document.getElementById('seat-top');
        this.seatLeft = document.getElementById('seat-left');
        this.seatRight = document.getElementById('seat-right');

        // عناصر الرومي
        this.statusText = document.getElementById('status-text');
        this.modeBadge = document.getElementById('mode-badge');
        this.stockPile = document.getElementById('stock-pile');
        this.stockCount = document.getElementById('stock-count');
        this.discardPile = document.getElementById('discard-pile');
        this.meldsGrid = document.getElementById('melds-grid');
        this.stagingArea = document.getElementById('staging-area');
        this.stagingGroups = document.getElementById('staging-groups');
        this.stagingScoreBadge = document.getElementById('staging-score-badge');
        this.stagingTitle = document.getElementById('staging-title');
        this.stagingProgressFill = document.getElementById('staging-progress-fill');
        this.stagingStatusLabel = document.getElementById('staging-status-label');
        this.playerCardsRow = document.getElementById('player-cards-row');
        this.btnStageMeld = document.getElementById('btn-stage-meld');
        this.btnCommitMelds = document.getElementById('btn-commit-melds');
        this.btnCancelStaged = document.getElementById('btn-cancel-staged');
        this.btnDiscard = document.getElementById('btn-discard');
        this.btnDrawStock = document.getElementById('btn-draw-stock');
        this.btnDrawDiscard = document.getElementById('btn-draw-discard');
        this.btnSortSuit = document.getElementById('btn-sort-suit');
        this.btnSortRank = document.getElementById('btn-sort-rank');
        this.btnMoveLeft = document.getElementById('btn-move-left');
        this.btnMoveRight = document.getElementById('btn-move-right');
        this.btnNewRummyGame = document.getElementById('btn-new-rummy');
        this.btnSideNewGame = document.getElementById('btn-side-new-game');
        this.btnSideRules = document.getElementById('btn-side-rules');
        this.gameLogs = document.getElementById('game-logs');

        // عناصر البلاك جاك
        this.bjDealerCards = document.getElementById('bj-dealer-cards');
        this.bjDealerScore = document.getElementById('bj-dealer-score');
        this.bjPlayerCards = document.getElementById('bj-player-cards');
        this.bjPlayerScore = document.getElementById('bj-player-score');
        this.bjWalletBalance = document.getElementById('bj-wallet-balance');
        this.bjCurrentBet = document.getElementById('bj-current-bet');
        this.bjStatusMessage = document.getElementById('bj-status-message');
        this.btnBjDeal = document.getElementById('btn-bj-deal');
        this.btnBjHit = document.getElementById('btn-bj-hit');
        this.btnBjStand = document.getElementById('btn-bj-stand');
        this.btnBjDouble = document.getElementById('btn-bj-double');
        this.btnBjClear = document.getElementById('btn-bj-clear');
        this.btnBjResetWallet = document.getElementById('btn-bj-reset-wallet');
    }

    initEventListeners() {
        // التبديل بين الأنماط
        this.tabSambel.addEventListener('click', () => {
            this.isMultiplayer = false;
            this.roomCodeBadge.style.display = 'none';
            this.switchMode(GAME_MODES.SAMBEL);
        });

        this.tabTallaj.addEventListener('click', () => {
            this.isMultiplayer = false;
            this.roomCodeBadge.style.display = 'none';
            this.switchMode(GAME_MODES.TALLAJ);
        });

        this.tabBlackjack.addEventListener('click', () => {
            this.isMultiplayer = false;
            this.roomCodeBadge.style.display = 'none';
            this.switchMode('blackjack');
        });

        // زر فتح نافذة الغرفة الجماعية
        this.tabParty.addEventListener('click', () => {
            this.partyModal.classList.add('active');
        });

        this.btnCloseParty.addEventListener('click', () => {
            this.partyModal.classList.remove('active');
        });

        // تبديل لوحات الغرفة (إنشاء / انضمام)
        this.btnTabCreateRoom.addEventListener('click', () => {
            this.btnTabCreateRoom.classList.add('active');
            this.btnTabJoinRoom.classList.remove('active');
            this.panelCreateRoom.classList.add('active');
            this.panelJoinRoom.classList.remove('active');
        });

        this.btnTabJoinRoom.addEventListener('click', () => {
            this.btnTabJoinRoom.classList.add('active');
            this.btnTabCreateRoom.classList.remove('active');
            this.panelJoinRoom.classList.add('active');
            this.panelCreateRoom.classList.remove('active');
        });

        // إنشاء كود الغرفة
        this.btnGenerateParty.addEventListener('click', async () => {
            const hostName = this.inputHostName.value.trim() || 'المحترف';
            const maxPlayers = parseInt(this.selectPartyPlayers.value, 10);
            const code = await network.createRoom(hostName, '🂡', maxPlayers);

            this.partyGeneratedCode.textContent = code;
            this.partyLobbyArea.style.display = 'block';
            this.renderPartySlots(network.connectedPlayers, maxPlayers);
            sounds.playWin();
        });

        // نسخ كود الغرفة
        this.btnCopyCode.addEventListener('click', () => {
            const code = this.partyGeneratedCode.textContent;
            navigator.clipboard.writeText(code).then(() => {
                alert(`تم نسخ كود الغرفة (${code}) بنجاح! شاركه مع أصدقائك.`);
            });
        });

        // انضمام إلى غرفة بواسطة الكود
        this.btnSubmitJoin.addEventListener('click', async () => {
            const name = this.inputJoinName.value.trim() || 'صديق';
            const code = this.inputJoinCode.value.trim().toUpperCase();

            if (!code) {
                alert('يرجى إدخال كود الغرفة أولاً!');
                return;
            }

            await network.joinRoom(code, name, '👤');
            this.partyModal.classList.remove('active');
            this.roomCodeBadge.style.display = 'flex';
            this.roomCodeDisplay.textContent = `غرفة: ${code}`;
            alert(`جاري الانضمام للغرفة ${code}... في انتظار بدء الجولة من المضيف.`);
        });

        // بدء الجولة من قبل المضيف
        this.btnStartPartyMatch.addEventListener('click', () => {
            const mode = this.selectPartyMode.value;
            const maxPlayers = parseInt(this.selectPartyPlayers.value, 10);

            // إكمال المقاعد الشاغرة ببوتات إذا لزم الأمر
            const players = [...network.connectedPlayers];
            const botAvatars = ['👩', '🧑', '👱‍♀️'];
            const botNames = ['فاطمة (Bot)', 'كريم (Bot)', 'سناء (Bot)'];

            while (players.length < maxPlayers) {
                const idx = players.length;
                players.push({
                    id: `bot_${idx}`,
                    seat: idx,
                    name: botNames[idx - 1] || `بوت ${idx}`,
                    avatar: botAvatars[idx - 1] || '🤖',
                    isLocalHuman: false,
                    isBot: true,
                    isReady: true
                });
            }

            // إشعار جميع المتصلين ببدء المباراة
            network.broadcast('START_MATCH', { mode, players });

            // إغلاق النافذة وبدء اللعبة محلياً
            this.partyModal.classList.remove('active');
            this.startMultiplayerGame(mode, players, 0);
        });

        // زر إكمال المقاعد الشاغرة ببوتات
        this.btnFillPartyBots.addEventListener('click', () => {
            const maxPlayers = parseInt(this.selectPartyPlayers.value, 10);
            const botAvatars = ['👩', '🧑', '👱‍♀️'];
            const botNames = ['فاطمة (Bot)', 'كريم (Bot)', 'سناء (Bot)'];

            while (network.connectedPlayers.length < maxPlayers) {
                const idx = network.connectedPlayers.length;
                network.connectedPlayers.push({
                    id: `bot_${idx}`,
                    seat: idx,
                    name: botNames[idx - 1] || `بوت ${idx}`,
                    avatar: botAvatars[idx - 1] || '🤖',
                    isLocalHuman: false,
                    isBot: true,
                    isReady: true
                });
            }
            this.renderPartySlots(network.connectedPlayers, maxPlayers);
        });

        // دليل القواعد
        const openRules = () => this.rulesModal.classList.add('active');
        this.btnRules.addEventListener('click', openRules);
        if (this.btnSideRules) this.btnSideRules.addEventListener('click', openRules);

        this.btnCloseRules.addEventListener('click', () => {
            this.rulesModal.classList.remove('active');
        });
        this.rulesModal.addEventListener('click', (e) => {
            if (e.target === this.rulesModal) this.rulesModal.classList.remove('active');
        });

        // زر الصوت
        this.btnSound.addEventListener('click', () => {
            sounds.enabled = !sounds.enabled;
            this.btnSound.textContent = sounds.enabled ? '🔊' : '🔇';
        });

        // أزرار الرومي
        this.stockPile.addEventListener('click', () => this.handleDrawStock());
        this.btnDrawStock.addEventListener('click', () => this.handleDrawStock());
        this.discardPile.addEventListener('click', () => this.handleDrawDiscard());
        this.btnDrawDiscard.addEventListener('click', () => this.handleDrawDiscard());
        this.btnStageMeld.addEventListener('click', () => this.handleStageMeld());
        this.btnCommitMelds.addEventListener('click', () => this.handleCommitMelds());
        this.btnCancelStaged.addEventListener('click', () => this.handleCancelStaged());
        this.btnDiscard.addEventListener('click', () => this.handleDiscard());
        this.btnSortSuit.addEventListener('click', () => {
            if (this.rummy) this.rummy.sortPlayerHand(this.rummy.mySeat, true);
        });
        this.btnSortRank.addEventListener('click', () => {
            if (this.rummy) this.rummy.sortPlayerHand(this.rummy.mySeat, false);
        });
        if (this.btnMoveLeft) {
            this.btnMoveLeft.addEventListener('click', () => {
                if (this.rummy) this.rummy.shiftSelectedCard(this.rummy.mySeat, -1);
            });
        }
        if (this.btnMoveRight) {
            this.btnMoveRight.addEventListener('click', () => {
                if (this.rummy) this.rummy.shiftSelectedCard(this.rummy.mySeat, 1);
            });
        }
        this.btnNewRummyGame.addEventListener('click', () => {
            this.startRummyGame(this.currentMode);
        });
        if (this.btnSideNewGame) {
            this.btnSideNewGame.addEventListener('click', () => {
                if (this.currentMode === 'blackjack') {
                    this.initBlackjack();
                } else {
                    this.startRummyGame(this.currentMode);
                }
            });
        }

        // أزرار البلاك جاك
        this.btnBjDeal.addEventListener('click', () => {
            if (this.blackjack) this.blackjack.startRound();
        });
        this.btnBjHit.addEventListener('click', () => {
            if (this.blackjack) this.blackjack.hit();
        });
        this.btnBjStand.addEventListener('click', () => {
            if (this.blackjack) this.blackjack.stand();
        });
        this.btnBjDouble.addEventListener('click', () => {
            if (this.blackjack) this.blackjack.doubleDown();
        });
        this.btnBjClear.addEventListener('click', () => {
            if (this.blackjack) this.blackjack.clearBet();
        });
        this.btnBjResetWallet.addEventListener('click', () => {
            if (this.blackjack) this.blackjack.resetWallet();
        });

        // أزرار الفيشات
        document.querySelectorAll('.game-chip-btn, .chip-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const amount = parseInt(btn.dataset.amount, 10);
                if (this.blackjack) this.blackjack.addBet(amount);
            });
        });

        // منع أي ظهور لأيقونة المنع (🚫) نهائياً أثناء سحب الأوراق وإفلاتها في أي موضع بما في ذلك ما بعد آخر ورقة
        const onGlobalDragOver = (e) => {
            if (this.draggedCardIndex !== null && this.draggedCardIndex !== undefined) {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';

                const targetIdx = this.getHandDropIndex(e.clientX);
                const cardEls = this.playerCardsRow.querySelectorAll('.card-item');
                cardEls.forEach((el, i) => {
                    if (i === targetIdx) {
                        el.classList.add('drag-over');
                    } else {
                        el.classList.remove('drag-over');
                    }
                });
            }
        };

        const onGlobalDrop = (e) => {
            if (this.draggedCardIndex !== null && this.draggedCardIndex !== undefined) {
                e.preventDefault();
                this.justFinishedDrag = true;
                const fromIdx = this.draggedCardIndex;
                const toIdx = this.getHandDropIndex(e.clientX);

                this.draggedCardIndex = null;
                document.body.classList.remove('dragging-card-active');
                document.querySelectorAll('.card-item.drag-over').forEach(el => el.classList.remove('drag-over'));
                document.querySelectorAll('.card-item.dragging').forEach(el => el.classList.remove('dragging'));

                if (fromIdx !== toIdx) {
                    this.rummy.moveCardInHand(this.rummy.mySeat, fromIdx, toIdx);
                }
                setTimeout(() => {
                    this.justFinishedDrag = false;
                }, 100);
            }
        };

        this.playerCardsRow.addEventListener('dragover', onGlobalDragOver);
        this.playerCardsRow.addEventListener('drop', onGlobalDrop);

        const southZone = document.querySelector('.player-south-zone');
        if (southZone) {
            southZone.addEventListener('dragover', onGlobalDragOver);
            southZone.addEventListener('drop', onGlobalDrop);
        }

        window.addEventListener('dragover', onGlobalDragOver);
        window.addEventListener('drop', onGlobalDrop);
    }

    initMultiplayerEvents() {
        // تحديث قائمة اللاعبين في الغرفة
        network.on('players_updated', (data) => {
            const maxPlayers = parseInt(this.selectPartyPlayers.value, 10) || 4;
            this.renderPartySlots(data.players, maxPlayers);
            if (data.newPlayerName) {
                sounds.playCardSlide();
            }
        });

        // بدء المباراة للمنضمين عن بُعد
        network.on('match_started', (payload) => {
            const mySeat = network.getMySeat();
            const players = payload.players.map(p => ({
                ...p,
                isLocalHuman: p.seat === mySeat
            }));

            this.partyModal.classList.remove('active');
            this.startMultiplayerGame(payload.mode, players, mySeat);
        });

        // استقبال حركة لعب من لاعب آخر عبر الشبكة
        network.on('remote_game_action', (payload) => {
            if (!this.rummy) return;
            const { action, data, senderSeat } = payload;

            if (senderSeat === this.rummy.mySeat) return; // تم تنفيذها محلياً مسبقاً

            switch (action) {
                case 'DRAW_STOCK':
                    this.rummy.drawStock(senderSeat);
                    break;
                case 'DRAW_DISCARD':
                    this.rummy.drawDiscard(senderSeat);
                    break;
                case 'COMMIT_MELDS':
                    // إضافة التشكيلات المطروحة من اللاعب الآخر
                    if (data && data.melds) {
                        data.melds.forEach(m => {
                            this.rummy.tableMelds.push({
                                id: m.id || 'rem_' + Date.now(),
                                ownerSeat: senderSeat,
                                ownerName: this.rummy.players[senderSeat].name,
                                cards: m.cards,
                                type: m.type,
                                points: m.points
                            });
                        });
                        this.rummy.players[senderSeat].hasOpened = true;
                        sounds.playCardPlace();
                        this.renderRummy();
                    }
                    break;
                case 'LAYOFF_CARD':
                    if (data && data.meldId) {
                        const targetMeld = this.rummy.tableMelds.find(m => m.id === data.meldId);
                        if (targetMeld && data.card) {
                            targetMeld.cards.push(data.card);
                            sounds.playCardPlace();
                            this.renderRummy();
                        }
                    }
                    break;
                case 'DISCARD_CARD':
                    if (data && data.cardIndex !== undefined) {
                        this.rummy.discardCard(data.cardIndex, senderSeat);
                    }
                    break;
            }
        });
    }

    renderPartySlots(players, maxPlayers = 4) {
        this.partySlotsContainer.innerHTML = '';
        for (let i = 0; i < maxPlayers; i++) {
            const player = players[i];
            const slotEl = document.createElement('div');
            slotEl.className = `party-slot-card ${player ? 'occupied' : ''} ${player && player.isHost ? 'host-slot' : ''}`;

            if (player) {
                slotEl.innerHTML = `
                    <span class="slot-avatar">${player.avatar}</span>
                    <div class="slot-details">
                        <span class="slot-name">${player.name} ${player.isHost ? '👑' : ''}</span>
                        <span class="slot-status">جاهز في المقعد ${i + 1} ✓</span>
                    </div>
                `;
            } else {
                slotEl.innerHTML = `
                    <span class="slot-avatar" style="opacity: 0.4;">👤</span>
                    <div class="slot-details">
                        <span class="slot-name" style="color: #64748b;">المقعد ${i + 1} شاغر</span>
                        <span class="slot-status">في انتظار انضمام لاعب...</span>
                    </div>
                `;
            }
            this.partySlotsContainer.appendChild(slotEl);
        }
    }

    startMultiplayerGame(mode, players, mySeat) {
        this.isMultiplayer = true;
        this.currentMode = mode;

        this.tabSambel.classList.toggle('active', mode === GAME_MODES.SAMBEL);
        this.tabTallaj.classList.toggle('active', mode === GAME_MODES.TALLAJ);
        this.tabBlackjack.classList.remove('active');
        this.blackjackView.classList.remove('active');
        this.rummyView.classList.add('active');

        this.roomCodeBadge.style.display = 'flex';
        this.roomCodeDisplay.textContent = `غرفة: ${network.roomCode || 'RAMI'}`;

        this.rummy = new RummyEngine(mode);
        this.rummy.mySeat = mySeat;
        this.rummy.onStateChange(() => this.renderRummy());
        this.rummy.initGame(players);
        this.renderRummy();
    }

    switchMode(mode) {
        this.currentMode = mode;

        this.tabSambel.classList.toggle('active', mode === GAME_MODES.SAMBEL);
        this.tabTallaj.classList.toggle('active', mode === GAME_MODES.TALLAJ);
        this.tabBlackjack.classList.toggle('active', mode === 'blackjack');

        if (mode === 'blackjack') {
            this.rummyView.classList.remove('active');
            this.blackjackView.classList.add('active');
            if (!this.blackjack) {
                this.initBlackjack();
            } else {
                this.renderBlackjack();
            }
        } else {
            this.blackjackView.classList.remove('active');
            this.rummyView.classList.add('active');
            this.startRummyGame(mode);
        }
    }

    /* ---------------- الرومي المغربي (2 إلى 4 لاعبين) ---------------- */

    startRummyGame(mode) {
        this.rummy = new RummyEngine(mode);
        this.rummy.mySeat = 0;
        this.rummy.onStateChange(() => this.renderRummy());
        this.rummy.initGame();
        this.renderRummy();
    }

    handleDrawStock() {
        if (!this.rummy) return;
        const res = this.rummy.drawStock(this.rummy.mySeat);
        if (!res.success) {
            alert(res.message);
        } else if (this.isMultiplayer) {
            network.sendGameAction('DRAW_STOCK', {});
        }
    }

    handleDrawDiscard() {
        if (!this.rummy) return;
        const res = this.rummy.drawDiscard(this.rummy.mySeat);
        if (!res.success) {
            alert(res.message);
        } else if (this.isMultiplayer) {
            network.sendGameAction('DRAW_DISCARD', {});
        }
    }

    handleStageMeld() {
        if (!this.rummy) return;
        const res = this.rummy.stageSelectedCardsAsMeld();
        if (!res.success) alert(res.message);
    }

    handleCommitMelds() {
        if (!this.rummy) return;
        const res = this.rummy.commitStagedMelds();
        if (!res.success) {
            alert(res.message);
        } else if (this.isMultiplayer) {
            network.sendGameAction('COMMIT_MELDS', { melds: res.committed });
        }
    }

    handleCancelStaged() {
        if (!this.rummy) return;
        this.rummy.cancelAllStaged();
    }

    handleDiscard() {
        if (!this.rummy) return;
        const selected = Array.from(this.rummy.selectedHandIndices);
        if (selected.length !== 1) {
            alert('يرجى تحديد ورقة واحدة فقط لرميها!');
            return;
        }
        const cardIdx = selected[0];
        const res = this.rummy.discardCard(cardIdx, this.rummy.mySeat);
        if (!res.success) {
            alert(res.message);
        } else if (this.isMultiplayer) {
            network.sendGameAction('DISCARD_CARD', { cardIndex: cardIdx });
        }
    }

    renderRummy() {
        if (!this.rummy) return;

        // تحديث شارة النمط
        if (this.rummy.mode === GAME_MODES.TALLAJ) {
            this.modeBadge.innerHTML = '<span class="badge-dot">◆</span> وضع الطالّاج (71 نقطة فرانك)';
            this.stagingTitle.innerHTML = '✨ منصة تجهيز النزول (شرط 71 نقطة فرانك بدون جوكر)';
        } else {
            this.modeBadge.innerHTML = '<span class="badge-dot">◆</span> وضع السامبل (طرح حر)';
            this.stagingTitle.innerHTML = '✨ منصة تجهيز التشكيلات للطرح';
        }

        // تحديث رسالة حالة الدور
        const activePlayer = this.rummy.getCurrentPlayer();
        const isMyTurn = this.rummy.isMyTurn();

        if (this.rummy.phase === 'game_over') {
            this.statusText.textContent = this.rummy.winner.seat === this.rummy.mySeat ? '🎉 مبروك فزت بالجولة!' : `😞 فاز ${this.rummy.winner.name} بالجولة.`;
        } else if (isMyTurn) {
            if (this.rummy.phase === 'draw') {
                this.statusText.textContent = 'دورك الآن: اسحب ورقة من الرزمة أو المرميات.';
            } else if (this.rummy.phase === 'play') {
                this.statusText.textContent = 'يمكنك الآن تجهيز تشكيلات للطرح، أو تحديد ورقة لرميها.';
            }
        } else {
            this.statusText.textContent = `دور ${activePlayer.name}... في انتظار حركته.`;
        }

        // تحديث عدادات الرزمة والمرميات
        this.stockCount.textContent = this.rummy.deck.remaining;

        // رسم ورقة المرميات العلوية
        this.discardPile.innerHTML = '';
        if (this.rummy.discardPile.length > 0) {
            const topCard = this.rummy.discardPile[this.rummy.discardPile.length - 1];
            const cardEl = this.createCardElement(topCard);
            this.discardPile.appendChild(cardEl);
        } else {
            this.discardPile.innerHTML = '<div style="color: rgba(255,255,255,0.3); font-size: 0.75rem; text-align: center; padding-top: 30px;">فارغة</div>';
        }

        // تحديث مقاعد اللاعبين الأربعة ولوحة النتائج (كما في الصورة)
        this.renderFourPlayerSeats();

        // رسم التشكيلات على الطاولة
        this.renderTableMelds();

        // رسم منصة التجهيز (Staging Area)
        this.renderStagingArea();

        // رسم يد اللاعب الحالي
        this.renderPlayerHand();

        // تحديث حالة الأزرار
        const canDraw = isMyTurn && this.rummy.phase === 'draw';
        const canPlay = isMyTurn && this.rummy.phase === 'play';
        const hasSelection = this.rummy.selectedHandIndices.size > 0;
        const exactlyOneSelected = this.rummy.selectedHandIndices.size === 1;
        const hasStaged = this.rummy.stagingMelds.length > 0;
        const stats = this.rummy.getCurrentStagedStats();

        this.btnDrawStock.disabled = !canDraw;
        this.btnDrawDiscard.disabled = !canDraw || this.rummy.discardPile.length === 0;
        this.btnStageMeld.disabled = !canPlay || !hasSelection;
        this.btnDiscard.disabled = !canPlay || !exactlyOneSelected;
        this.btnCancelStaged.disabled = !hasStaged;
        if (this.btnMoveLeft) this.btnMoveLeft.disabled = !exactlyOneSelected;
        if (this.btnMoveRight) this.btnMoveRight.disabled = !exactlyOneSelected;

        // الطرح والخروج متاح فقط عند إكمال جميع أوراق اليد
        this.btnCommitMelds.disabled = !canPlay || !stats.readyToWin;

        // سجل الأحداث
        this.renderLogs();
    }

    renderFourPlayerSeats() {
        const players = this.rummy.players;
        const currentTurnIdx = this.rummy.currentTurnIndex;

        // 1. لوحة النتائج (Scoreboard) أعلى اليسار
        this.scoreboardList.innerHTML = '';
        players.forEach((p, idx) => {
            const row = document.createElement('div');
            row.className = `scoreboard-row ${idx === currentTurnIdx ? 'active-turn' : ''}`;
            row.innerHTML = `
                <span>${p.avatar} ${p.name}</span>
                <span>${p.hand.length} 🂠</span>
            `;
            this.scoreboardList.appendChild(row);
        });

        // 2. مقعد اللاعب العلوي (North) - يمثل اللاعب رقم 2 أو الخصم الرئيسي
        const pNorth = players[2] || players[1];
        if (pNorth) {
            this.seatTop.style.display = 'flex';
            this.seatTop.classList.toggle('active-turn', pNorth.seat === currentTurnIdx);
            this.seatTop.querySelector('.seat-player-name').textContent = pNorth.name;
            this.seatTop.querySelector('.seat-cards-badge').textContent = `${pNorth.hand.length} ورقة`;
            this.seatTop.querySelector('.seat-avatar-icon').textContent = pNorth.avatar;

            const fanContainer = this.seatTop.querySelector('.cards-fan-horizontal');
            fanContainer.innerHTML = '';
            for (let i = 0; i < pNorth.hand.length; i++) {
                const back = document.createElement('div');
                back.className = 'card-back';
                fanContainer.appendChild(back);
            }
        } else {
            this.seatTop.style.display = 'none';
        }

        // 3. مقعد اللاعب الأيسر (West) - يمثل اللاعب رقم 1
        const pWest = players.length >= 3 ? players[1] : null;
        if (pWest) {
            this.seatLeft.style.display = 'flex';
            this.seatLeft.classList.toggle('active-turn', pWest.seat === currentTurnIdx);
            this.seatLeft.querySelector('.seat-player-name').textContent = pWest.name;
            this.seatLeft.querySelector('.seat-cards-badge').textContent = `${pWest.hand.length} ورقة`;
            this.seatLeft.querySelector('.seat-avatar-icon').textContent = pWest.avatar;

            const fanContainer = this.seatLeft.querySelector('.cards-fan-vertical');
            fanContainer.innerHTML = '';
            for (let i = 0; i < Math.min(8, pWest.hand.length); i++) {
                const back = document.createElement('div');
                back.className = 'card-back';
                fanContainer.appendChild(back);
            }
        } else {
            this.seatLeft.style.display = 'none';
        }

        // 4. مقعد اللاعب الأيمن (East) - يمثل اللاعب رقم 3
        const pEast = players.length >= 4 ? players[3] : null;
        if (pEast) {
            this.seatRight.style.display = 'flex';
            this.seatRight.classList.toggle('active-turn', pEast.seat === currentTurnIdx);
            this.seatRight.querySelector('.seat-player-name').textContent = pEast.name;
            this.seatRight.querySelector('.seat-cards-badge').textContent = `${pEast.hand.length} ورقة`;
            this.seatRight.querySelector('.seat-avatar-icon').textContent = pEast.avatar;

            const fanContainer = this.seatRight.querySelector('.cards-fan-vertical');
            fanContainer.innerHTML = '';
            for (let i = 0; i < Math.min(8, pEast.hand.length); i++) {
                const back = document.createElement('div');
                back.className = 'card-back';
                fanContainer.appendChild(back);
            }
        } else {
            this.seatRight.style.display = 'none';
        }
    }

    renderTableMelds() {
        this.meldsGrid.innerHTML = '';
        if (this.rummy.tableMelds.length === 0) {
            this.meldsGrid.innerHTML = '<span style="color: rgba(255,255,255,0.4); font-size: 0.82rem; padding: 10px;">لم يتم طرح أي تشكيلات على الطاولة بعد</span>';
            return;
        }

        const localPlayer = this.rummy.getLocalPlayer();
        const canLayoff = localPlayer.hasOpened && this.rummy.isMyTurn() && this.rummy.phase === 'play' && this.rummy.selectedHandIndices.size === 1;

        this.rummy.tableMelds.forEach(meld => {
            const groupEl = document.createElement('div');
            groupEl.className = 'meld-group';

            const tagEl = document.createElement('span');
            tagEl.className = 'meld-tag';
            tagEl.textContent = meld.ownerSeat === this.rummy.mySeat ? 'أنت' : (meld.ownerName || 'خصم');
            groupEl.appendChild(tagEl);

            meld.cards.forEach((card, idx) => {
                const cardEl = this.createCardElement(card);
                cardEl.style.marginLeft = idx === 0 ? '0' : '-35px';
                groupEl.appendChild(cardEl);
            });

            if (canLayoff) {
                const layoffBtn = document.createElement('button');
                layoffBtn.className = 'meld-layoff-btn';
                layoffBtn.textContent = '+ تركيب';
                layoffBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const selectedIdx = Array.from(this.rummy.selectedHandIndices)[0];
                    const res = this.rummy.layoffCardOnMeld(selectedIdx, meld.id);
                    if (!res.success) {
                        alert(res.message);
                    } else if (this.isMultiplayer) {
                        network.sendGameAction('LAYOFF_CARD', { card: res.card, meldId: res.meldId });
                    }
                });
                groupEl.appendChild(layoffBtn);
            }

            this.meldsGrid.appendChild(groupEl);
        });
    }

    renderStagingArea() {
        this.stagingGroups.innerHTML = '';
        const stats = this.rummy.getCurrentStagedStats();
        const localPlayer = this.rummy.getLocalPlayer();

        if (stats.readyToWin) {
            this.stagingScoreBadge.style.color = '#86efac';
            this.stagingScoreBadge.textContent = `جاهز للفوز: ${stats.points} نقطة (${stats.francPoints} فرانك)`;

            if (this.stagingProgressFill) {
                this.stagingProgressFill.style.width = '100%';
                this.stagingProgressFill.style.background = '#22c55e';
            }

            if (this.stagingStatusLabel) {
                this.stagingStatusLabel.textContent = '🏆 اكتملت جميع أوراق اليد! اضغط على طرح الكل والخروج للفوز';
                this.stagingStatusLabel.style.color = '#86efac';
            }
        } else {
            const statusColor = (this.rummy.mode === GAME_MODES.TALLAJ && stats.francPoints >= 71) ? '#86efac' : '#fde047';
            this.stagingScoreBadge.style.color = statusColor;
            this.stagingScoreBadge.textContent = `المجهز: ${stats.points} نقطة • غير مشكل: ${stats.unmeldedCount} كروت`;

            if (this.stagingProgressFill) {
                const totalCards = (this.rummy.mode === GAME_MODES.TALLAJ) ? 14 : 13;
                const completedCount = totalCards - stats.unmeldedCount;
                const pct = Math.max(5, Math.min(95, Math.round((completedCount / totalCards) * 100)));
                this.stagingProgressFill.style.width = `${pct}%`;
                this.stagingProgressFill.style.background = stats.hasJoker && this.rummy.mode === GAME_MODES.TALLAJ && stats.francPoints < 71 ? '#f59e0b' : 'linear-gradient(90deg, #f59e0b 0%, #22c55e 100%)';
            }

            if (this.stagingStatusLabel) {
                if (stats.unmeldedCount > 1) {
                    this.stagingStatusLabel.textContent = `⚠️ ممنوع وضع الكروت على الطاولة! متبقي لديك (${stats.unmeldedCount}) أوراق يجب إكمالها أولاً`;
                    this.stagingStatusLabel.style.color = '#fca5a5';
                } else if (this.rummy.mode === GAME_MODES.TALLAJ && stats.francPoints < 71) {
                    this.stagingStatusLabel.textContent = `شرط الطالّاج: يجب أن تصل أوراق الفرانك إلى 71 نقطة (لديك ${stats.francPoints} فرانك)`;
                    this.stagingStatusLabel.style.color = '#fde047';
                } else {
                    this.stagingStatusLabel.textContent = 'قم بسحب ورقة وتنظيم مجموعاتك في يدك';
                    this.stagingStatusLabel.style.color = '#94a3b8';
                }
            }
        }

        if (this.rummy.stagingMelds.length === 0) {
            this.stagingGroups.innerHTML = '<span style="color: rgba(255,255,255,0.4); font-size: 0.85rem; padding: 10px;">حدد 3 كروت أو أكثر واضغط "تجهيز التشكيلة" لتجميع سلاسلك ومجموعاتك حتى تكتمل يدك بالكامل</span>';
            return;
        }

        this.rummy.stagingMelds.forEach(stage => {
            const itemEl = document.createElement('div');
            itemEl.className = 'staged-group-item';

            const unstageBtn = document.createElement('button');
            unstageBtn.className = 'unstage-btn';
            unstageBtn.textContent = '✕';
            unstageBtn.title = 'إلغاء وإعادة لليد';
            unstageBtn.addEventListener('click', () => this.rummy.unstageMeld(stage.id));
            itemEl.appendChild(unstageBtn);

            stage.cards.forEach((card, idx) => {
                const cardEl = this.createCardElement(card);
                cardEl.style.marginLeft = idx === 0 ? '0' : '-35px';
                itemEl.appendChild(cardEl);
            });

            this.stagingGroups.appendChild(itemEl);
        });
    }

    getHandDropIndex(clientX) {
        const localPlayer = this.rummy ? this.rummy.getLocalPlayer() : null;
        if (!localPlayer || !localPlayer.hand || localPlayer.hand.length <= 1) {
            return 0;
        }

        const cardElements = Array.from(this.playerCardsRow.querySelectorAll('.card-item'));
        if (!cardElements.length) return localPlayer.hand.length - 1;

        const firstRect = cardElements[0].getBoundingClientRect();
        const lastRect = cardElements[cardElements.length - 1].getBoundingClientRect();

        // في الواجهة العربية (RTL): البطاقة 0 في اليمين، والبطاقة الأخيرة في أقصى اليسار
        const isRtl = firstRect.left > lastRect.left;

        if (isRtl) {
            // سحب نحو اليسار متجاوزاً آخر ورقة، حتى لو سحب بعيداً جداً (au dernier carte trop)
            if (clientX <= lastRect.left + (lastRect.width * 0.6)) {
                return cardElements.length - 1;
            }
            // سحب نحو اليمين متجاوزاً أول ورقة
            if (clientX >= firstRect.right - (firstRect.width * 0.6)) {
                return 0;
            }
        } else {
            // الواجهة LTR
            if (clientX >= lastRect.right - (lastRect.width * 0.6)) {
                return cardElements.length - 1;
            }
            if (clientX <= firstRect.left + (firstRect.width * 0.6)) {
                return 0;
            }
        }

        // داخل نطاق الأوراق: إيجاد أقرب بطاقة للمؤشر
        let closestIdx = 0;
        let minDistance = Infinity;

        cardElements.forEach((el, i) => {
            const rect = el.getBoundingClientRect();
            const center = rect.left + (rect.width / 2);
            const dist = Math.abs(clientX - center);
            if (dist < minDistance) {
                minDistance = dist;
                closestIdx = i;
            }
        });

        return closestIdx;
    }

    renderPlayerHand() {
        this.playerCardsRow.innerHTML = '';
        const localPlayer = this.rummy.getLocalPlayer();
        if (!localPlayer) return;

        localPlayer.hand.forEach((card, idx) => {
            const cardEl = this.createCardElement(card);
            cardEl.draggable = true;

            // دعم السحب والإفلات لتغيير موقع الورقة في اليد
            cardEl.addEventListener('dragstart', (e) => {
                this.draggedCardIndex = idx;
                cardEl.classList.add('dragging');
                document.body.classList.add('dragging-card-active');
                e.dataTransfer.effectAllowed = 'move';
                try {
                    e.dataTransfer.setData('text/plain', String(idx));
                } catch (_) {}
            });

            cardEl.addEventListener('dragend', () => {
                cardEl.classList.remove('dragging');
                document.body.classList.remove('dragging-card-active');
                document.querySelectorAll('.card-item.drag-over').forEach(el => el.classList.remove('drag-over'));
                this.draggedCardIndex = null;
                setTimeout(() => {
                    this.justFinishedDrag = false;
                }, 100);
            });

            cardEl.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
            });

            // دعم السحب باللمس للهواتف والأجهزة اللوحية
            let touchStartX = 0;
            let isTouchDragging = false;

            cardEl.addEventListener('touchstart', (e) => {
                if (e.touches.length !== 1) return;
                this.touchDragIndex = idx;
                touchStartX = e.touches[0].clientX;
                isTouchDragging = false;
            }, { passive: true });

            cardEl.addEventListener('touchmove', (e) => {
                if (this.touchDragIndex === null || this.touchDragIndex === undefined) return;
                const touch = e.touches[0];
                const dx = Math.abs(touch.clientX - touchStartX);

                if (dx > 8) {
                    isTouchDragging = true;
                    cardEl.classList.add('dragging');
                    if (e.cancelable) e.preventDefault();

                    const targetIdx = this.getHandDropIndex(touch.clientX);
                    const cardEls = this.playerCardsRow.querySelectorAll('.card-item');
                    cardEls.forEach((el, i) => {
                        if (i === targetIdx) {
                            el.classList.add('drag-over');
                        } else {
                            el.classList.remove('drag-over');
                        }
                    });
                }
            }, { passive: false });

            cardEl.addEventListener('touchend', (e) => {
                if (isTouchDragging && this.touchDragIndex !== null && this.touchDragIndex !== undefined) {
                    this.justFinishedDrag = true;
                    const touch = e.changedTouches[0];
                    const targetIdx = this.getHandDropIndex(touch.clientX);
                    const fromIdx = this.touchDragIndex;

                    document.querySelectorAll('.card-item.drag-over').forEach(el => el.classList.remove('drag-over'));
                    document.querySelectorAll('.card-item.dragging').forEach(el => el.classList.remove('dragging'));

                    if (fromIdx !== targetIdx) {
                        this.rummy.moveCardInHand(this.rummy.mySeat, fromIdx, targetIdx);
                    }
                    setTimeout(() => {
                        this.justFinishedDrag = false;
                    }, 100);
                }
                this.touchDragIndex = null;
                isTouchDragging = false;
            });

            if (this.rummy.selectedHandIndices.has(idx)) {
                cardEl.classList.add('selected');
            }
            if (idx > 0) {
                cardEl.style.marginLeft = '-30px';
            }
            cardEl.addEventListener('click', () => {
                if (this.justFinishedDrag) {
                    this.justFinishedDrag = false;
                    return;
                }
                this.rummy.toggleCardSelection(idx);
            });
            this.playerCardsRow.appendChild(cardEl);
        });
    }

    createCardElement(card) {
        const el = document.createElement('div');
        const suitDetails = card.getSuitDetails();

        el.className = `card-item ${suitDetails.color}`;
        if (card.isJoker) el.classList.add('joker');

        el.innerHTML = `
            <div class="card-corner top">
                <span class="card-rank">${card.isJoker ? '★' : card.rank}</span>
                <span class="card-suit">${suitDetails.symbol}</span>
            </div>
            <div class="card-center">
                ${card.isJoker ? '🃏' : suitDetails.symbol}
            </div>
            <div class="card-corner bottom" style="transform: rotate(180deg);">
                <span class="card-rank">${card.isJoker ? '★' : card.rank}</span>
                <span class="card-suit">${suitDetails.symbol}</span>
            </div>
        `;
        return el;
    }

    renderLogs() {
        this.gameLogs.innerHTML = '';
        this.rummy.logs.forEach(log => {
            const item = document.createElement('div');
            item.style.fontSize = '0.75rem';
            item.style.padding = '2px 0';
            item.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
            item.style.color = log.type === 'player' ? '#93c5fd' : log.type === 'ai' ? '#fcd34d' : log.type === 'success' ? '#86efac' : '#cbd5e1';
            item.textContent = `[${log.time}] ${log.msg}`;
            this.gameLogs.appendChild(item);
        });
    }

    /* ---------------- البلاك جاك ---------------- */

    initBlackjack() {
        this.blackjack = new BlackjackEngine();
        this.blackjack.onStateChange(() => this.renderBlackjack());
        this.blackjack.initGame();
        this.renderBlackjack();
    }

    renderBlackjack() {
        if (!this.blackjack) return;

        this.bjWalletBalance.textContent = `${this.blackjack.wallet} فيشة`;
        this.bjCurrentBet.textContent = `${this.blackjack.currentBet} فيشة`;
        this.bjStatusMessage.textContent = this.blackjack.resultMessage;

        this.bjDealerCards.innerHTML = '';
        const isPlaying = this.blackjack.gameState === 'playing';

        this.blackjack.dealerHand.forEach((card, idx) => {
            if (isPlaying && idx === 1) {
                const back = document.createElement('div');
                back.className = 'card-back';
                this.bjDealerCards.appendChild(back);
            } else {
                const cardEl = this.createCardElement(card);
                this.bjDealerCards.appendChild(cardEl);
            }
        });

        if (isPlaying && this.blackjack.dealerHand.length >= 2) {
            const visibleCardVal = this.blackjack.dealerHand[0].getBlackjackValues()[0];
            this.bjDealerScore.textContent = `المجموع الظاهر: ${visibleCardVal}`;
        } else {
            const dealerVal = this.blackjack.getHandValue(this.blackjack.dealerHand);
            this.bjDealerScore.textContent = `المجموع: ${dealerVal.best}`;
        }

        this.bjPlayerCards.innerHTML = '';
        this.blackjack.playerHand.forEach(card => {
            const cardEl = this.createCardElement(card);
            this.bjPlayerCards.appendChild(cardEl);
        });

        const playerVal = this.blackjack.getHandValue(this.blackjack.playerHand);
        this.bjPlayerScore.textContent = `المجموع: ${playerVal.best}`;

        const isBetting = this.blackjack.gameState === 'betting' || this.blackjack.gameState === 'round_over';
        this.btnBjDeal.disabled = !isBetting || this.blackjack.currentBet <= 0;
        this.btnBjClear.disabled = !isBetting || this.blackjack.currentBet <= 0;

        this.btnBjHit.disabled = !isPlaying;
        this.btnBjStand.disabled = !isPlaying;
        this.btnBjDouble.disabled = !isPlaying || this.blackjack.playerHand.length !== 2 || this.blackjack.wallet < this.blackjack.currentBet;
    }
}

// تشغيل التطبيق عند تحميل المستند
window.addEventListener('DOMContentLoaded', () => {
    new App();
});
