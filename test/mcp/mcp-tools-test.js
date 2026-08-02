const {assert} = require('chai');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {Tools, DEFINITIONS, STANDING_CAVEAT} = require('../../mcp/tools');
const {toZodShape} = require('../../mcp/server');
const {CommandRouter} = require('../../signal/CommandRouter');
const {CandleCache} = require('../../signal/CandleCache');
const {SnapshotStore} = require('../../signal/SnapshotStore');
const registry = require('../../signal/Strategies');
const fmt = require('../../signal/Formatter');

const FIXTURE = require('../resources/ohlcv.json').data;

function tmpStore() {
    return SnapshotStore.create({dir: fs.mkdtempSync(path.join(os.tmpdir(), 'bitfox-mcp-'))});
}

function tools(opts = {}) {
    let store = opts.store || tmpStore();
    let cache = CandleCache.create({loader: async () => FIXTURE.map(c => [...c])});
    let router = CommandRouter.create({cache, store, horizons: {short: '5m', medium: '5m', long: '5m'}});
    return {t: Tools.create({router, store}), store, router};
}

describe('MCP server (GHBF-51)', function () {
    this.timeout(30000);

    describe('tool surface', function () {
        it('defines all six tools', () => {
            assert.deepEqual(DEFINITIONS.map(d => d.name).sort(),
                ['get_backtest', 'get_readings', 'get_regime', 'get_snapshot', 'list_snapshots', 'list_strategies']);
        });

        it('gives every tool a description stating these are measurements, not advice', () => {
            for (const d of DEFINITIONS) {
                assert.isString(d.description);
                assert.isAbove(d.description.length, 60, `${d.name} needs a real description`);
            }
            let all = DEFINITIONS.map(d => d.description).join(' ').toLowerCase();
            assert.include(all, 'not advice');
            assert.include(all, 'noise');
            assert.include(all, 'no demonstrated edge');
        });

        it('builds a valid zod shape from plain descriptors', () => {
            let shape = toZodShape({symbol: {type: 'string', required: true}, limit: {type: 'number', required: false}});
            assert.isFunction(shape.symbol.parse);
            assert.equal(shape.symbol.parse('BTCUSDT'), 'BTCUSDT');
            assert.equal(shape.limit.parse(undefined), undefined, 'optional params accept undefined');
        });
    });

    describe('get_backtest carries the honesty payload', function () {
        it('always returns sample size and cost model', async () => {
            let {t} = tools();
            let r = await t.getBacktest({symbol: 'ADAUSDT', timeframe: '5m', strategy: 'Bollinger'});
            assert.isNumber(r.trades);
            assert.isObject(r.costs);
            assert.equal(r.caveat, STANDING_CAVEAT);
        });

        it('warns when the sample is below the meaningful threshold', async () => {
            let {t} = tools();
            let r = await t.getBacktest({symbol: 'ADAUSDT', timeframe: '5m', strategy: 'Bollinger'});
            if (r.trades < fmt.MIN_MEANINGFUL_TRADES) {
                assert.isTrue(r.warnings.some(w => w.includes('noise')), 'small samples must be flagged');
            }
        });

        it('includes the ledger verdict so a no-go cannot look viable', async () => {
            let {t} = tools();
            let r = await t.getBacktest({symbol: 'ADAUSDT', timeframe: '5m', strategy: 'SuperTrend'});
            assert.include(r.ledgerStatus, 'no-go');
        });

        it('returns a structured error for an unknown strategy, never a throw', async () => {
            let {t} = tools();
            let r = await t.getBacktest({symbol: 'ADAUSDT', timeframe: '5m', strategy: 'Nope'});
            assert.include(r.error, 'Unknown strategy');
        });

        it('returns a structured error for an unsupported timeframe', async () => {
            let {t} = tools();
            let r = await t.getBacktest({symbol: 'ADAUSDT', timeframe: '7s', strategy: 'Bollinger'});
            assert.include(r.error, 'Unsupported timeframe');
        });
    });

    describe('list_strategies', function () {
        it('reports a ledger verdict for every registered strategy', async () => {
            let {t} = tools();
            let r = await t.listStrategies();
            assert.equal(r.strategies.length, registry.names().length);
            for (const s of r.strategies) assert.isString(s.ledgerStatus);
        });

        it('states it is an inventory rather than a menu of viable options', async () => {
            let {t} = tools();
            let r = await t.listStrategies();
            assert.include(r.note, 'not a menu');
        });
    });

    describe('regime and readings', function () {
        it('returns classified horizons with the direction caveat', async () => {
            let {t} = tools();
            let r = await t.getRegime({symbol: 'ADAUSDT'});
            assert.isObject(r.horizons);
            assert.include(r.directionNote.toLowerCase(), 'not weighted');
        });

        it('returns readings for a supported timeframe', async () => {
            let {t} = tools();
            let r = await t.getReadings({symbol: 'ADAUSDT', timeframe: '5m'});
            assert.isObject(r.trend);
            assert.isObject(r.volatility);
            assert.equal(r.caveat, STANDING_CAVEAT);
        });

        it('errors cleanly on an unsupported timeframe', async () => {
            let {t} = tools();
            let r = await t.getReadings({symbol: 'ADAUSDT', timeframe: 'banana'});
            assert.include(r.error, 'Unsupported timeframe');
        });
    });

    describe('snapshot round-trip — the cross-surface hook', function () {
        it('retrieves a snapshot generated from Telegram, by id', async () => {
            let store = tmpStore();
            let {t, router} = tools({store});
            // simulate the Telegram path exactly
            let produced = await router.handle(1, '/snapshot ADAUSDT', {now: Date.now()});
            assert.isObject(produced, '/snapshot must produce a document');

            let listed = await t.listSnapshots({});
            assert.equal(listed.snapshots[0].id, produced.id);

            let fetched = await t.getSnapshot({id: produced.id});
            assert.equal(fetched.markdown, produced.markdown,
                'a snapshot captured in Telegram must be readable from the MCP surface');
        });

        it('errors clearly for an unknown id', async () => {
            let {t} = tools();
            let r = await t.getSnapshot({id: 'does-not-exist'});
            assert.include(r.error, 'No snapshot');
        });

        it('does not escape the snapshot directory via a traversing id', async () => {
            let {t} = tools();
            let r = await t.getSnapshot({id: '../../../../etc/passwd'});
            assert.include(r.error, 'No snapshot', 'path traversal must not resolve outside the store');
        });
    });

    describe('stdout protection', function () {
        it('redirects console output to stderr without touching process.stdout.write', () => {
            const {redirectConsoleToStderr} = require('../../mcp/server');
            let originalWrite = process.stdout.write;
            let captured = [];
            let stderrWrite = process.stderr.write;
            process.stderr.write = (chunk) => { captured.push(String(chunk)); return true; };
            let original;
            try {
                original = redirectConsoleToStderr();
                console.log('this must not reach stdout');
                assert.isTrue(captured.some(c => c.includes('must not reach stdout')),
                    'console.log has to land on stderr — stdout carries the MCP protocol');
                assert.equal(process.stdout.write, originalWrite,
                    'process.stdout.write must be untouched or the transport breaks');
            } finally {
                process.stderr.write = stderrWrite;
                // restore EVERY redirected method — leaking these breaks unrelated suites
                if (original) for (const [k, fn] of Object.entries(original)) console[k] = fn;
            }
        });

        it('does not mutate global console merely by being required', () => {
            // requiring the server must be side-effect free; the redirect belongs to the
            // entry point only. A console.log spy elsewhere in the suite depends on this.
            let before = console.log;
            delete require.cache[require.resolve('../../mcp/server')];
            require('../../mcp/server');
            assert.equal(console.log, before, 'importing the server must not redirect console');
        });
    });
});
