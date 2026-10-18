// نظام الشبكة واللعب الجماعي المباشر عبر الأكواد (Multiplayer Network System)
// يدعم PeerJS للاتصال عبر الإنترنت و BroadcastChannel للتجربة الفورية عبر المتصفح/الشبكة

export class MultiplayerNet {
    constructor() {
        this.isHost = false;
        this.roomCode = null;
        this.playerName = 'اللاعب';
        this.playerId = 'player_' + Math.random().toString(36).substr(2, 6);
        this.peers = new Map(); // peerId -> connection
        this.peer = null;
        this.broadcastChannel = null;
        this.eventListeners = {};
        this.connectedPlayers = []; // [{ id, name, avatar, isHost, isReady }]

        this.initBroadcastChannel();
    }

    on(event, callback) {
        if (!this.eventListeners[event]) {
            this.eventListeners[event] = [];
        }
        this.eventListeners[event].push(callback);
    }

    emit(event, data) {
        if (this.eventListeners[event]) {
            this.eventListeners[event].forEach(cb => cb(data));
        }
    }

    /**
     * قناة الاتصال المحلي الفوري (للتجربة بين عدة تبويبات أو نوافذ في نفس الجهاز بدون إنترنت)
     */
    initBroadcastChannel() {
        if (typeof BroadcastChannel !== 'undefined') {
            this.broadcastChannel = new BroadcastChannel('moroccan_rummy_lan');
            this.broadcastChannel.onmessage = (event) => {
                const { type, roomCode, senderId, payload } = event.data;
                if (roomCode && this.roomCode && roomCode.toUpperCase() === this.roomCode.toUpperCase()) {
                    if (senderId !== this.playerId) {
                        this.handleIncomingMessage(type, payload, senderId);
                    }
                }
            };
        }
    }

    /**
     * تهيئة PeerJS للاتصال عبر الإنترنت
     */
    async initPeerJS(customPeerId = null) {
        return new Promise((resolve) => {
            if (typeof window.Peer === 'undefined') {
                // في حال عدم تحميل المكتبة الخارجية نعتمد على BroadcastChannel
                console.warn('PeerJS library not loaded, using Local BroadcastChannel');
                resolve(false);
                return;
            }

            try {
                this.peer = new window.Peer(customPeerId, {
                    debug: 1,
                    config: {
                        iceServers: [
                            { urls: 'stun:stun.l.google.com:19302' },
                            { urls: 'stun:global.stun.twilio.com:3478' }
                        ]
                    }
                });

                this.peer.on('open', (id) => {
                    console.log('PeerJS Connected with ID:', id);
                    resolve(true);
                });

                this.peer.on('connection', (conn) => {
                    this.setupPeerConnection(conn);
                });

                this.peer.on('error', (err) => {
                    console.warn('PeerJS Notice:', err.type, err.message);
                    resolve(false);
                });
            } catch (e) {
                console.warn('PeerJS init failed:', e);
                resolve(false);
            }
        });
    }

    setupPeerConnection(conn) {
        conn.on('open', () => {
            this.peers.set(conn.peer, conn);
            console.log('Peer connection open with:', conn.peer);
        });

        conn.on('data', (data) => {
            const { type, payload, senderId } = data;
            this.handleIncomingMessage(type, payload, senderId || conn.peer);
        });

        conn.on('close', () => {
            this.peers.delete(conn.peer);
            this.emit('player_disconnected', { peerId: conn.peer });
        });
    }

    /**
     * إنشاء غرفة جديدة وتوليد كود الحفلة (Party Code)
     */
    async createRoom(playerName, avatar = '🂡', maxPlayers = 4) {
        this.isHost = true;
        this.playerName = playerName;
        // كود الغرفة مكون من 4 أرقام
        const randomNum = Math.floor(1000 + Math.random() * 9000);
        this.roomCode = `RAMI-${randomNum}`;

        this.connectedPlayers = [{
            id: this.playerId,
            name: this.playerName,
            avatar: avatar,
            isHost: true,
            isReady: true,
            seat: 0 // المقعد السفلي
        }];

        // محاولة ربط كود الغرفة في PeerJS
        const peerId = `moroccan_rummy_${this.roomCode.toLowerCase()}`;
        await this.initPeerJS(peerId);

        this.emit('room_created', {
            roomCode: this.roomCode,
            players: this.connectedPlayers,
            maxPlayers
        });

        return this.roomCode;
    }

    /**
     * الانضمام إلى غرفة بواسطة الكود
     */
    async joinRoom(roomCode, playerName, avatar = '🂡') {
        this.isHost = false;
        this.playerName = playerName;
        this.roomCode = roomCode.trim().toUpperCase();

        await this.initPeerJS();

        // إرسال طلب الانضمام عبر BroadcastChannel
        this.sendBroadcast('REQUEST_JOIN', {
            id: this.playerId,
            name: this.playerName,
            avatar: avatar
        });

        // محاولة الاتصال عبر PeerJS إن كان متوفراً
        if (this.peer) {
            const hostPeerId = `moroccan_rummy_${this.roomCode.toLowerCase()}`;
            try {
                const conn = this.peer.connect(hostPeerId, { reliable: true });
                this.setupPeerConnection(conn);
                conn.on('open', () => {
                    conn.send({
                        type: 'REQUEST_JOIN',
                        roomCode: this.roomCode,
                        senderId: this.playerId,
                        payload: {
                            id: this.playerId,
                            name: this.playerName,
                            avatar: avatar
                        }
                    });
                });
            } catch (e) {
                console.warn('Peer connect error:', e);
            }
        }

        this.emit('joining_room', { roomCode: this.roomCode });
    }

    /**
     * إرسال رسالة لجميع المتصلين في الغرفة
     */
    broadcast(type, payload) {
        // إرسال عبر BroadcastChannel
        this.sendBroadcast(type, payload);

        // إرسال عبر اتصالات PeerJS
        this.peers.forEach((conn) => {
            if (conn.open) {
                conn.send({
                    type,
                    roomCode: this.roomCode,
                    senderId: this.playerId,
                    payload
                });
            }
        });
    }

    sendBroadcast(type, payload) {
        if (this.broadcastChannel) {
            this.broadcastChannel.postMessage({
                type,
                roomCode: this.roomCode,
                senderId: this.playerId,
                payload
            });
        }
    }

    handleIncomingMessage(type, payload, senderId) {
        switch (type) {
            case 'REQUEST_JOIN':
                if (this.isHost) {
                    // المضيف يضيف اللاعب إذا توفر مقعد
                    const existing = this.connectedPlayers.find(p => p.id === payload.id);
                    if (!existing && this.connectedPlayers.length < 4) {
                        const newPlayer = {
                            id: payload.id,
                            name: payload.name,
                            avatar: payload.avatar,
                            isHost: false,
                            isReady: true,
                            seat: this.connectedPlayers.length
                        };
                        this.connectedPlayers.push(newPlayer);

                        // إرسال قائمة اللاعبين المحدثة للجميع
                        this.broadcast('PLAYERS_UPDATE', {
                            players: this.connectedPlayers,
                            newPlayerName: newPlayer.name
                        });

                        this.emit('players_updated', { players: this.connectedPlayers });
                    }
                }
                break;

            case 'PLAYERS_UPDATE':
                this.connectedPlayers = payload.players;
                this.emit('players_updated', {
                    players: this.connectedPlayers,
                    newPlayerName: payload.newPlayerName
                });
                break;

            case 'START_MATCH':
                this.emit('match_started', payload);
                break;

            case 'GAME_ACTION':
                this.emit('remote_game_action', payload);
                break;

            case 'CHAT_MESSAGE':
                this.emit('chat_received', payload);
                break;
        }
    }

    /**
     * إرسال حركة لعب من دور أحد اللاعبين
     */
    sendGameAction(actionType, actionData) {
        this.broadcast('GAME_ACTION', {
            action: actionType,
            data: actionData,
            senderSeat: this.getMySeat()
        });
    }

    getMySeat() {
        const me = this.connectedPlayers.find(p => p.id === this.playerId);
        return me ? me.seat : 0;
    }

    leaveRoom() {
        if (this.peer) {
            this.peer.destroy();
            this.peer = null;
        }
        this.peers.clear();
        this.roomCode = null;
        this.isHost = false;
        this.connectedPlayers = [];
        this.emit('room_left');
    }
}

export const network = new MultiplayerNet();
