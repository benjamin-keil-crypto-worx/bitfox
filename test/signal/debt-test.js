const {assert} = require('chai');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {SnapshotStore} = require('../../signal/SnapshotStore');
const {SignalBot} = require('../../signal/SignalBot');
const {CommandRouter} = require('../../signal/CommandRouter');
const {CandleCache} = require('../../signal/CandleCache');
const {BackTestEngine} = require('../../engine/BackTest');
const {Strategy} = require('../../strategies/Strategy');
const {State} = require('../../lib/states/States');
const registry = require('../../signal/Strategies');
const snapshot = require('../../signal/Snapshot');
const {Tools} = require('../../mcp/tools');

const FIXTURE = require('../resources/ohlcv.json').data;
const tmpDir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'bitfox-debt-'));

/** Minimal scripted strategy, as in backtest-fills-test.js */
class ScriptedStrategy extends Strategy {
    static init(args) { return new ScriptedStrategy(args); }
    constructor(args) { super(args); this.setContext('DebtTest'); this.script = args.script || {}; }
    async setup(k) { this.indicator = k.map(() => 0); return this; }
    getIndicator() { return this.indicator; }
    setState(s) { this.state = s; }
    getState() { return this.state; }
    async run(i) { if (this.script[i] !== undefined) this.state = this.script[i]; return this.getStrategyResult(this.state, {}); }
}
const HOUR = 3600000;
const candle = (i, o, h, l, c) => [1700000000000 + i * HOUR, o, h, l, c, 1000];

describe('Deferred review findings (GHBF-54)', function () {
    this.timeout(30000);

    describe('1. snapshot retention', function () {
        it('prunes oldest snapshots beyond the limit', () => {
            let store = SnapshotStore.create({dir: tmpDir(), maxSnapshots: 3});
            for (let i = 0; i < 6; i++) {
                store.write(store.id('BTCUSDT', Date.UTC(2026, 0, 1, 0, 0, i)), `snapshot ${i}`);
            }
            assert.equal(store.list(100).length, 3, 'only the newest 3 survive');
        });

        it('keeps everything when the limit is 0', () => {
            let store = SnapshotStore.create({dir: tmpDir(), maxSnapshots: 0});
            for (let i = 0; i < 5; i++) {
                store.write(store.id('BTCUSDT', Date.UTC(2026, 0, 1, 0, 0, i)), `s${i}`);
            }
            assert.equal(store.list(100).length, 5, '0 disables pruning');
        });

        it('defaults to a bounded store', () => {
            assert.equal(SnapshotStore.create({dir: tmpDir()}).maxSnapshots, 200);
        });

        it('keeps the most recent snapshot readable after pruning', () => {
            let store = SnapshotStore.create({dir: tmpDir(), maxSnapshots: 2});
            let last;
            for (let i = 0; i < 5; i++) {
                last = store.id('ETHUSDT', Date.UTC(2026, 0, 1, 0, 0, i));
                store.write(last, `body ${i}`);
            }
            assert.equal(store.read(last), 'body 4');
        });
    });

    describe('2. ledger drift guard', function () {
        it('has a verdict for every registered strategy and no orphans', () => {
            let registered = registry.names().sort();
            let recorded = Object.keys(registry.LEDGER_STATUS).sort();
            assert.deepEqual(recorded, registered,
                'REGISTRY and LEDGER_STATUS must cover exactly the same strategies — ' +
                'a strategy with no verdict reads as viable');
        });

        it('reports a fallback rather than undefined for an unknown name', () => {
            assert.include(registry.status('NotAStrategy'), 'not recorded');
        });
    });

    describe('3. SignalBot transport', function () {
        function fakeBot() {
            let sent = [], docs = [], handlers = {};
            let Factory = function () {
                return {
                    on: (ev, fn) => { handlers[ev] = fn; },
                    sendMessage: async (id, text) => { sent.push({id, text}); },
                    sendDocument: async (id, file) => { docs.push({id, file}); },
                };
            };
            return {Factory, sent, docs, handlers};
        }
        function bot(routerOverrides = {}) {
            let f = fakeBot();
            let cache = CandleCache.create({loader: async () => FIXTURE.map(c => [...c])});
            let router = CommandRouter.create({cache, horizons: {short: '5m', medium: '5m', long: '5m'},
                                               store: SnapshotStore.create({dir: tmpDir()}), ...routerOverrides});
            let b = SignalBot.create({token: 'x', router, botFactory: f.Factory}).start();
            return {b, f, router};
        }

        it('replies with text for a normal command', async () => {
            let {f} = bot();
            await f.handlers.message({chat: {id: 1}, text: '/help'});
            assert.isTrue(f.sent.some(m => m.text.includes('/trend')));
        });

        it('sends the document for /snapshot', async () => {
            let {f} = bot();
            await f.handlers.message({chat: {id: 1}, text: '/snapshot ADAUSDT'});
            assert.equal(f.docs.length, 1, 'the .md must be attached');
            assert.isTrue(f.sent.some(m => m.text.includes('snapshot')));
        });

        it('stays silent for non-commands', async () => {
            let {f} = bot();
            await f.handlers.message({chat: {id: 1}, text: 'good morning'});
            assert.equal(f.sent.length, 0);
        });

        it('ignores messages with no text', async () => {
            let {f} = bot();
            await f.handlers.message({chat: {id: 1}});
            assert.equal(f.sent.length, 0);
        });
    });

    describe('4. acknowledgement before slow commands', function () {
        function fakeBot() {
            let sent = [], handlers = {};
            let Factory = function () {
                return {on: (e, fn) => { handlers[e] = fn; },
                        sendMessage: async (id, text) => { sent.push(text); },
                        sendDocument: async () => {}};
            };
            return {Factory, sent, handlers};
        }
        function make(opts = {}) {
            let f = fakeBot();
            let cache = CandleCache.create({loader: async () => FIXTURE.map(c => [...c])});
            let router = CommandRouter.create({cache, horizons: {short: '5m', medium: '5m', long: '5m'},
                                               store: SnapshotStore.create({dir: tmpDir()}), ...opts});
            SignalBot.create({token: 'x', router, botFactory: f.Factory}).start();
            return f;
        }

        it('acknowledges a slow command before doing the work', async () => {
            let f = make();
            await f.handlers.message({chat: {id: 1}, text: '/regime ADAUSDT'});
            assert.include(f.sent[0], 'Working on /regime');
        });

        it('does not acknowledge a fast command', async () => {
            let f = make();
            await f.handlers.message({chat: {id: 1}, text: '/help'});
            assert.notInclude(f.sent[0], 'Working on');
        });

        it('does not acknowledge an unauthorised chat', async () => {
            let f = make({allowedChatIds: ['999']});
            await f.handlers.message({chat: {id: 1}, text: '/regime ADAUSDT'});
            assert.notInclude(f.sent[0], 'Working on', 'a refusal must not be preceded by "working"');
            assert.include(f.sent[0], 'restricted');
        });
    });

    describe('5. engine verbosity', function () {
        function run(extra) {
            let args = {symbol: 'TESTUSDT', amount: 1000, profitPct: 1.03, stopLossPct: 0.98,
                        makerFee: 0, takerFee: 0, slippage: 0, public: true, ...extra};
            let s = ScriptedStrategy.init({...args, script: {0: State.STATE_ENTER_LONG}});
            let e = BackTestEngine.getBackTester(s, args);
            return e.backTest([candle(0, 99, 101, 98.5, 100), candle(1, 100, 108, 99.5, 104),
                               candle(2, 104, 105, 103, 104)].map(c => [...c])).then(() => e);
        }

        it('defaults to verbose so existing output is unchanged', async () => {
            let e = await run({});
            assert.isTrue(e.verbose);
        });

        it('writes nothing to the console when verbose is false', async () => {
            let captured = [];
            let original = console.log;
            console.log = (...a) => captured.push(a.join(' '));
            try { await run({verbose: false}); } finally { console.log = original; }
            assert.equal(captured.length, 0, 'a silent run must emit no console output at all');
        });

        it('still produces identical metrics when silenced', async () => {
            let loud = await run({});
            let quiet = await run({verbose: false});
            assert.equal(quiet.metrics.completedTrades, loud.metrics.completedTrades);
            // profit factor is Infinity when a run has no losses; closeTo cannot compare that
            if (Number.isFinite(loud.metrics.profitFactor)) {
                assert.closeTo(quiet.metrics.profitFactor, loud.metrics.profitFactor, 1e-12);
            } else {
                assert.equal(quiet.metrics.profitFactor, loud.metrics.profitFactor);
            }
            assert.closeTo(quiet.funds, loud.funds, 1e-12);
        });

        it('is used by the signalling layer', async () => {
            let captured = [];
            let original = console.log;
            let cache = CandleCache.create({loader: async () => FIXTURE.map(c => [...c])});
            let router = CommandRouter.create({cache});
            console.log = (...a) => captured.push(a.join(' '));
            try { await router.handle(1, '/backtest ADAUSDT 5m Bollinger', {now: Date.now()}); }
            finally { console.log = original; }
            assert.equal(captured.length, 0, 'bot-initiated backtests must not log');
        });
    });

    describe('6. snapshot states its analysis timeframe', function () {
        it('says which timeframe the conditional statistics used', () => {
            let doc = snapshot.build({
                symbol: 'ADAUSDT',
                horizons: {short: null},
                strategies: [{name: 'Bollinger', timeframe: '4h', stats: {pooled: {n: 10, pf: 1, avg: 0, winRate: 50}, buckets: [], bucketsExamined: 0, reliableBuckets: 0, minTrades: 50}}],
                generatedAt: Date.now(),
            });
            assert.include(doc, '**4h** timeframe only');
            assert.include(doc, 'these statistics do not');
        });
    });

    describe('7. query caps and cachedOnly', function () {
        it('caps strategies benchmarked per query', async () => {
            let cache = CandleCache.create({loader: async () => FIXTURE.map(c => [...c])});
            let router = CommandRouter.create({cache, maxStrategiesPerQuery: 2,
                                               horizons: {short: '5m', medium: '5m', long: '5m'},
                                               store: SnapshotStore.create({dir: tmpDir()})});
            let out = await router.handle(1, '/signal ADAUSDT 5m', {now: Date.now()});
            let listed = registry.names().filter(n => out.includes(n));
            assert.isAtMost(listed.length, 2);
        });

        it('get_regime cachedOnly returns immediately and names what is missing', async () => {
            let cache = CandleCache.create({loader: async () => FIXTURE.map(c => [...c])});
            let router = CommandRouter.create({cache, horizons: {short: '5m', medium: '5m', long: '5m'},
                                               store: SnapshotStore.create({dir: tmpDir()})});
            let t = Tools.create({router, store: router.store});

            let cold = await t.getRegime({symbol: 'ADAUSDT', cachedOnly: true});
            assert.include(cold.error, 'Nothing cached');

            await t.getRegime({symbol: 'ADAUSDT'});                 // warm the cache
            let warm = await t.getRegime({symbol: 'ADAUSDT', cachedOnly: true});
            assert.isObject(warm.horizons);
            assert.isNotOk(warm.error);
        });
    });
});
