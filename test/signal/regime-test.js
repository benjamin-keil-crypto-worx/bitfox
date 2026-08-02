const {assert} = require('chai');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {CommandRouter} = require('../../signal/CommandRouter');
const {CandleCache} = require('../../signal/CandleCache');
const {SnapshotStore} = require('../../signal/SnapshotStore');
const conditional = require('../../signal/ConditionalStats');
const regime = require('../../signal/Regime');
const snapshot = require('../../signal/Snapshot');
const fmt = require('../../signal/Formatter');

const FIXTURE = require('../resources/ohlcv.json').data;
const NOW = FIXTURE[FIXTURE.length - 1][0] + 5 * 60000 + 1;

function tmpStore() {
    let dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bitfox-snap-'));
    return {store: SnapshotStore.create({dir}), dir};
}

function router(opts = {}) {
    let cache = CandleCache.create({loader: async () => FIXTURE.map(c => [...c])});
    // one short horizon so tests stay fast; the fixture backs every timeframe
    return CommandRouter.create({cache, horizons: {short: '5m', medium: '5m', long: '5m'}, ...opts});
}

/** Synthesise trades landing on known candle indices. */
function fakeTrades(spec) {
    return spec.map(({i, side, retPct}) => {
        let entry = FIXTURE[i][4];
        let exit = side === 'buy' ? entry * (1 + retPct / 100) : entry * (1 - retPct / 100);
        return {
            entryTimestamp: new Date(FIXTURE[i][0]),
            entryOrder: {price: entry, side, amount: 1},
            exitOrder: {price: exit, side: side === 'buy' ? 'sell' : 'buy', amount: 1},
        };
    });
}

describe('Regime engine (GHBF-50)', function () {
    this.timeout(30000);

    describe('classification buckets', function () {
        it('buckets ADX by documented thresholds', () => {
            assert.equal(regime.trendBucket(10), 'ranging');
            assert.equal(regime.trendBucket(22), 'transitional');
            assert.equal(regime.trendBucket(40), 'trending');
            assert.equal(regime.trendBucket(null), 'unknown');
        });

        it('buckets volatility by percentile', () => {
            assert.equal(regime.volBucket(10), 'low');
            assert.equal(regime.volBucket(50), 'normal');
            assert.equal(regime.volBucket(90), 'elevated');
            assert.equal(regime.volBucket(null), 'unknown');
        });

        it('classifies a real cell into all three dimensions', () => {
            let r = regime.classify(FIXTURE, '5m');
            assert.oneOf(r.trend, ['ranging', 'transitional', 'trending', 'unknown']);
            assert.oneOf(r.volatility, ['low', 'normal', 'elevated', 'unknown']);
            assert.oneOf(r.stackOrder, ['20>50>100>200', '20<50<100<200', 'mixed', null]);
            assert.isNumber(r.price);
        });

        it('reports direction without scoring it', () => {
            let r = regime.classify(FIXTURE, '5m');
            assert.isBoolean(r.aboveEma200);
            // there must be no numeric "favourability" anywhere on the reading
            for (const k of Object.keys(r)) {
                assert.notMatch(k, /score|confidence|strength|rating/i);
            }
        });

        it('exposes every bucket key in a fixed order', () => {
            assert.equal(regime.ALL_KEYS.length, 9);
            assert.equal(regime.ALL_KEYS[0], 'ranging/low');
            assert.deepEqual(regime.ALL_KEYS, [...regime.ALL_KEYS], 'order is stable');
        });
    });

    describe('conditional statistics — the false-positive guards', function () {
        it('computes a trailing percentile without looking ahead', () => {
            let p = conditional.trailingPercentile([1, 2, 3, 100, 1]);
            // At index 2 the value 3 is the largest seen so far: 2 of 3 observations below.
            // Ranking against the WHOLE window would put it at 2/5 = 40% because of the
            // 100 that has not happened yet — that difference is the lookahead this guards.
            assert.closeTo(p[2], 200 / 3, 1e-9, 'ranked against history only');
            assert.isAbove(Math.abs(p[2] - 40), 1, 'must not rank against future values');
            assert.isBelow(p[4], p[2], 'the final 1 is near the bottom of its history');
        });

        it('marks buckets under the minimum sample as unreliable', () => {
            let trades = fakeTrades(Array.from({length: 5}, (_, k) => ({i: 400 + k, side: 'buy', retPct: 5})));
            let stats = conditional.bucketByRegime(trades, FIXTURE);
            let populated = stats.buckets.filter(b => b.n > 0);
            assert.isAbove(populated.length, 0);
            for (const b of populated) assert.isFalse(b.reliable, 'n=5 buckets cannot be reliable');
        });

        it('reports how many buckets were examined', () => {
            let trades = fakeTrades(Array.from({length: 30}, (_, k) => ({i: 300 + k * 10, side: 'buy', retPct: 2})));
            let stats = conditional.bucketByRegime(trades, FIXTURE);
            assert.isNumber(stats.bucketsExamined);
            assert.isAbove(stats.bucketsExamined, 0);
            assert.isNumber(stats.reliableBuckets);
            assert.equal(stats.minTrades, fmt.MIN_MEANINGFUL_TRADES);
        });

        it('emits buckets in fixed order, never sorted by performance', () => {
            let trades = fakeTrades(Array.from({length: 40}, (_, k) => ({i: 300 + k * 8, side: k % 2 ? 'buy' : 'sell', retPct: k % 3})));
            let stats = conditional.bucketByRegime(trades, FIXTURE);
            assert.deepEqual(stats.buckets.map(b => b.key), regime.ALL_KEYS,
                'bucket order must match the declared order exactly');
        });

        it('always returns the unconditional pooled baseline', () => {
            let trades = fakeTrades(Array.from({length: 20}, (_, k) => ({i: 400 + k * 5, side: 'buy', retPct: 3})));
            let stats = conditional.bucketByRegime(trades, FIXTURE);
            assert.isNotNull(stats.pooled);
            assert.equal(stats.pooled.n, 20);
            let bucketTotal = stats.buckets.reduce((a, b) => a + b.n, 0);
            assert.equal(bucketTotal, stats.pooled.n, 'buckets must partition the pooled set');
        });

        it('applies costs to every bucketed trade', () => {
            let trades = fakeTrades([{i: 500, side: 'buy', retPct: 0}]);
            let stats = conditional.bucketByRegime(trades, FIXTURE);
            assert.closeTo(stats.pooled.avg, -conditional.COST_PCT, 1e-6);
        });
    });

    describe('/regime command', function () {
        it('reports every configured horizon', async () => {
            let out = await router().handle(1, '/regime ADAUSDT', {now: NOW});
            assert.include(out, 'short');
            assert.include(out, 'medium');
            assert.include(out, 'long');
            assert.include(out, 'ADX');
        });

        it('states that direction is not weighted', async () => {
            let out = await router().handle(1, '/regime ADAUSDT', {now: NOW});
            assert.include(out.toLowerCase(), 'not weighted');
        });

        it('returns usage when the symbol is missing', async () => {
            assert.include(await router().handle(1, '/regime'), 'Usage:');
        });
    });

    describe('/snapshot command', function () {
        it('writes a markdown file and returns a chat summary', async () => {
            let {store, dir} = tmpStore();
            let out = await router({store}).handle(1, '/snapshot ADAUSDT', {now: NOW});
            assert.isObject(out);
            assert.isString(out.text);
            assert.isTrue(fs.existsSync(out.filePath), 'the .md must exist for Telegram to attach it');
            assert.include(out.filePath, dir);
            assert.include(out.markdown, '# ADAUSDT');
        });

        it('produces a retrievable id (the hook for the MCP server)', async () => {
            let {store} = tmpStore();
            let out = await router({store}).handle(1, '/snapshot ADAUSDT', {now: NOW});
            assert.equal(store.read(out.id), out.markdown, 'a Telegram-generated snapshot must be readable by id');
            assert.equal(store.list()[0].id, out.id);
        });
    });

    describe('snapshot document contents', function () {
        function doc() {
            let stats = conditional.bucketByRegime(
                fakeTrades(Array.from({length: 12}, (_, k) => ({i: 400 + k * 6, side: 'buy', retPct: 4}))),
                FIXTURE);
            return snapshot.build({
                symbol: 'ADAUSDT',
                horizons: {short: regime.classify(FIXTURE, '5m')},
                strategies: [{name: 'Bollinger', timeframe: '5m', stats}],
                generatedAt: NOW,
            });
        }

        it('carries the standing caveats an LLM needs to stay honest', () => {
            let d = doc();
            assert.include(d, '0.25% round trip');
            assert.include(d, '13 of 14');
            assert.include(d, 'does not place orders');
        });

        it('states the bucket count and the sample-size rule', () => {
            let d = doc();
            assert.include(d, 'Buckets examined');
            assert.include(d, `below ${fmt.MIN_MEANINGFUL_TRADES} trades are noise`);
            assert.include(d, 'multiple-comparisons');
        });

        it('shows the pooled baseline next to the buckets', () => {
            assert.include(doc(), 'Pooled baseline');
        });

        it('flags unreliable buckets explicitly', () => {
            assert.include(doc(), '**NO**');
        });

        it('says direction is not weighted', () => {
            assert.include(doc(), 'not weighted as favourable');
        });
    });

    describe('output remains descriptive', function () {
        it('emits no forbidden token in /regime, /snapshot or the document', async () => {
            let {store} = tmpStore();
            let r = router({store});
            let outputs = [await r.handle(1, '/regime ADAUSDT', {now: NOW}), fmt.help()];
            let snap = await r.handle(1, '/snapshot ADAUSDT', {now: NOW});
            outputs.push(snap.text, snap.markdown);

            for (const out of outputs) {
                assert.isString(out);
                let lower = out.toLowerCase();
                for (const token of fmt.FORBIDDEN_TOKENS) {
                    assert.notInclude(lower, token.toLowerCase(),
                        `output must not contain "${token}" — even negated, the rule is a substring check`);
                }
            }
        });
    });
});
