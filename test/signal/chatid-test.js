const {assert} = require('chai');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {CommandRouter} = require('../../signal/CommandRouter');
const {CandleCache} = require('../../signal/CandleCache');
const {SnapshotStore} = require('../../signal/SnapshotStore');
const {SignalBot} = require('../../signal/SignalBot');
const fmt = require('../../signal/Formatter');

const FIXTURE = require('../resources/ohlcv.json').data;
const tmpDir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'bitfox-chatid-'));

function router(opts = {}) {
    let cache = CandleCache.create({loader: async () => FIXTURE.map(c => [...c])});
    return CommandRouter.create({cache, store: SnapshotStore.create({dir: tmpDir()}), ...opts});
}

describe('Chat id discovery (GHBF-56)', function () {

    describe('/whoami', function () {
        it('reports the chat id', async () => {
            let out = await router().handle(4242, '/whoami');
            assert.include(out, '4242');
        });

        it('explains how to configure the allowlist when none is set', async () => {
            let out = await router().handle(4242, '/whoami');
            assert.include(out, 'TELEGRAM_ALLOWED_CHAT_IDS=4242');
        });

        it('confirms membership when the chat is allowlisted', async () => {
            let out = await router({allowedChatIds: ['4242']}).handle(4242, '/whoami');
            assert.include(out, 'on the allowlist');
        });

        it('answers a chat that is NOT allowlisted — otherwise it cannot ask to be added', async () => {
            let out = await router({allowedChatIds: ['999']}).handle(4242, '/whoami');
            assert.include(out, '4242', 'a rejected chat must still learn its own id');
            assert.include(out, 'NOT on the allowlist');
        });

        it('answers even when the chat is rate limited — otherwise it is a deadlock', async () => {
            let r = router({rateLimit: {max: 1, windowMs: 60000}});
            await r.handle(7, '/help');
            let out = await r.handle(7, '/whoami');
            assert.include(out, '7');
            assert.notInclude(out, 'Rate limit');
        });
    });

    describe('/start', function () {
        it('reports the chat id and points at /help', async () => {
            let out = await router().handle(555, '/start');
            assert.include(out, '555');
            assert.include(out, '/help');
        });

        it('is no longer an alias for /help', async () => {
            let start = await router().handle(555, '/start');
            assert.notEqual(start, fmt.help(), '/start must report identity, /help lists commands');
        });

        it('works for a chat outside the allowlist', async () => {
            let out = await router({allowedChatIds: ['1']}).handle(555, '/start');
            assert.include(out, '555');
        });
    });

    describe('/help is unchanged and advertises /whoami', function () {
        it('still returns the command list', async () => {
            let out = await router().handle(1, '/help');
            assert.equal(out, fmt.help());
            assert.include(out, '/trend');
        });

        it('mentions /whoami so the id is discoverable', () => {
            assert.include(fmt.help(), '/whoami');
        });
    });

    describe('first-contact logging', function () {
        function bot(opts = {}) {
            let handlers = {}, sent = [];
            let Factory = function () {
                return {on: (e, fn) => { handlers[e] = fn; },
                        sendMessage: async (id, t) => { sent.push(t); },
                        sendDocument: async () => {}};
            };
            let b = SignalBot.create({token: 'x', router: router(opts), botFactory: Factory}).start();
            return {b, handlers, sent};
        }

        it('logs a chat id once, not on every message', async () => {
            let logged = [];
            let original = console.log;
            console.log = (...a) => logged.push(a.join(' '));
            try {
                let {handlers} = bot();
                await handlers.message({chat: {id: 31337}, text: '/help'});
                await handlers.message({chat: {id: 31337}, text: '/help'});
            } finally { console.log = original; }
            let hits = logged.filter(l => l.includes('31337'));
            assert.equal(hits.length, 1, 'first contact only — repeated logging would bury it');
            assert.include(hits[0], 'first contact');
        });

        it('records whether the chat passes the allowlist', async () => {
            let logged = [];
            let original = console.log;
            console.log = (...a) => logged.push(a.join(' '));
            try {
                let {handlers} = bot({allowedChatIds: ['1']});
                await handlers.message({chat: {id: 99}, text: '/help'});
            } finally { console.log = original; }
            assert.isTrue(logged.some(l => l.includes('99') && l.includes('NOT on allowlist')));
        });
    });

    describe('output stays descriptive', function () {
        it('emits no forbidden token', async () => {
            let outs = [
                await router().handle(1, '/whoami'),
                await router().handle(1, '/start'),
                await router({allowedChatIds: ['2']}).handle(1, '/whoami'),
                fmt.help(),
            ];
            for (const out of outs) {
                let lower = out.toLowerCase();
                for (const token of fmt.FORBIDDEN_TOKENS) {
                    assert.notInclude(lower, token.toLowerCase(), `must not contain "${token}"`);
                }
            }
        });
    });
});
