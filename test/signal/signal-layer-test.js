const {assert} = require('chai');
const {CommandRouter} = require('../../signal/CommandRouter');
const {CandleCache} = require('../../signal/CandleCache');
const {BacktestRunner} = require('../../signal/BacktestRunner');
const {Analysis} = require('../../signal/Analysis');
const fmt = require('../../signal/Formatter');
const tf = require('../../signal/Timeframe');
const registry = require('../../signal/Strategies');

const FIXTURE = require('../resources/ohlcv.json').data;
const NOW = FIXTURE[FIXTURE.length - 1][0] + 5 * 60000 + 1;   // fixture is 5m; last candle closed

/** Router wired to the offline fixture — no network, ever. */
function router(opts = {}) {
    let loads = {count: 0};
    let cache = CandleCache.create({
        loader: async () => { loads.count++; return FIXTURE.map(c => [...c]); }
    });
    let r = CommandRouter.create({cache, ...opts});
    r._loads = loads;
    return r;
}

describe('Signalling layer (GHBF-47)', function () {
    this.timeout(20000);

    describe('Timeframe', function () {
        it('converts supported timeframes to milliseconds', () => {
            assert.equal(tf.toMillis('15m'), 900000);
            assert.equal(tf.toMillis('4h'), 14400000);
            assert.equal(tf.toMillis('1d'), 86400000);
            assert.isNull(tf.toMillis('banana'));
        });

        it('drops a candle that has not closed yet', () => {
            const c = [[0, 1, 1, 1, 1, 1], [900000, 1, 1, 1, 1, 1]];
            // at t=1_000_000 the second candle covers [900000, 1800000) and is still forming
            assert.equal(tf.dropUnclosed(c, '15m', 1000000).length, 1);
            // at t=1_800_000 it has closed
            assert.equal(tf.dropUnclosed(c, '15m', 1800000).length, 2);
        });
    });

    describe('command parsing and validation', function () {
        it('ignores non-command text', async () => {
            assert.isNull(await router().handle(1, 'hello there'));
        });

        it('tolerates the @botname suffix used in groups', () => {
            assert.deepEqual(router().parse('/trend@MyBot ADAUSDT 15m'),
                {command: 'trend', args: ['ADAUSDT', '15m']});
        });

        it('returns usage rather than a stack trace on missing arguments', async () => {
            const reply = await router().handle(1, '/trend');
            assert.include(reply, 'Usage:');
            assert.notInclude(reply, 'at ');
        });

        it('rejects an unsupported timeframe with the supported list', async () => {
            const reply = await router().handle(1, '/trend ADAUSDT 7s');
            assert.include(reply, 'Unsupported timeframe');
            assert.include(reply, '15m');
        });

        it('rejects an unknown command', async () => {
            assert.include(await router().handle(1, '/moon ADAUSDT 15m'), 'Unknown command');
        });

        it('names the available strategies when /backtest omits one', async () => {
            const reply = await router().handle(1, '/backtest ADAUSDT 5m');
            assert.include(reply, 'Bollinger');
        });

        it('rejects an unknown strategy', async () => {
            const reply = await router().handle(1, '/backtest ADAUSDT 5m NotAStrategy', {now: NOW});
            assert.include(reply, 'Unknown strategy');
        });
    });

    describe('allowlist', function () {
        it('is open when no allowlist is configured', async () => {
            assert.isNotNull(await router().handle(999, '/help'));
        });

        it('refuses a chat outside the allowlist and reports its id', async () => {
            const r = router({allowedChatIds: ['111']});
            const reply = await r.handle(222, '/trend ADAUSDT 5m', {now: NOW});
            assert.include(reply, 'restricted');
            assert.include(reply, '222');
        });

        it('serves a chat inside the allowlist', async () => {
            const r = router({allowedChatIds: ['111']});
            assert.include(await r.handle(111, '/help'), '/trend');
        });
    });

    describe('rate limiting', function () {
        it('refuses once the per-chat budget is spent', async () => {
            const r = router({rateLimit: {max: 2, windowMs: 60000}});
            await r.handle(5, '/help');
            await r.handle(5, '/help');
            assert.include(await r.handle(5, '/help'), 'Rate limit reached');
        });

        it('budgets each chat separately', async () => {
            const r = router({rateLimit: {max: 1, windowMs: 60000}});
            await r.handle(5, '/help');
            assert.notInclude(await r.handle(6, '/help'), 'Rate limit');
        });
    });

    describe('candle cache', function () {
        it('does not refetch inside the timeframe TTL', async () => {
            const r = router();
            await r.handle(1, '/trend ADAUSDT 5m', {now: NOW});
            assert.equal(r._loads.count, 1);
            await r.handle(1, '/momentum ADAUSDT 5m', {now: NOW + 1000});
            assert.equal(r._loads.count, 1, 'second query inside the TTL performs no network call');
        });

        it('refetches once the TTL expires', async () => {
            const r = router();
            await r.handle(1, '/trend ADAUSDT 5m', {now: NOW});
            await r.handle(1, '/trend ADAUSDT 5m', {now: NOW + 5 * 60000 + 1});
            assert.equal(r._loads.count, 2);
        });
    });

    describe('analysis readings', function () {
        it('reads indicators off the latest closed candle', () => {
            const a = Analysis.from(FIXTURE);
            assert.equal(a.price(), FIXTURE[FIXTURE.length - 1][4]);
            const t = a.trend();
            assert.isNumber(t.ema[200]);
            assert.oneOf(t.stackOrder, ['20>50>100>200', '20<50<100<200', 'mixed']);
            assert.oneOf(t.superTrend.trend, ['long', 'short']);
        });

        it('reports ATR as a percentage of price', () => {
            const v = Analysis.from(FIXTURE).volatility();
            assert.isNumber(v.atrPct);
            assert.isAbove(v.atrPct, 0);
        });
    });

    describe('output is descriptive, never prescriptive', function () {
        it('emits no forbidden token in any rendered command output', async () => {
            const r = router();
            const outputs = [fmt.help()];
            for (const cmd of ['/trend ADAUSDT 5m', '/momentum ADAUSDT 5m', '/levels ADAUSDT 5m', '/vol ADAUSDT 5m']) {
                outputs.push(await r.handle(1, cmd, {now: NOW}));
            }
            outputs.push(fmt.backtest({
                symbol: 'ADAUSDT', timeframe: '5m', strategy: 'Bollinger', days: 3,
                trades: 40, pf: 0.8, winRate: 40, returnPct: -12, maxDD: 20,
                costs: {taker: 0.001, maker: 0.001, slippage: 0.0005}
            }));
            outputs.push(fmt.signal('ADAUSDT', '5m', NOW, 0.4,
                [{strategy: 'Bollinger', state: 'STATE_PENDING', pf: 0.8, trades: 40}]));

            for (const out of outputs) {
                assert.isString(out);
                const lower = out.toLowerCase();
                for (const token of fmt.FORBIDDEN_TOKENS) {
                    assert.notInclude(lower, token.toLowerCase(),
                        `rendered output must not contain "${token}" — it would imply a recommendation`);
                }
            }
        });

        it('warns explicitly when a backtested strategy lost money', () => {
            const losing = fmt.backtest({
                symbol: 'ADAUSDT', timeframe: '5m', strategy: 'SuperTrend', days: 30,
                trades: 100, pf: 0.9, winRate: 40, returnPct: -20, maxDD: 30,
                costs: {taker: 0.001, maker: 0.001, slippage: 0.0005}
            });
            assert.include(losing, 'lost money');
        });

        it('omits the warning when the strategy was profitable in the window', () => {
            const winning = fmt.backtest({
                symbol: 'ADAUSDT', timeframe: '5m', strategy: 'Bollinger', days: 30,
                trades: 100, pf: 1.3, winRate: 55, returnPct: 20, maxDD: 10,
                costs: {taker: 0.001, maker: 0.001, slippage: 0.0005}
            });
            assert.notInclude(winning, 'lost money');
        });

        it('warns on a small sample even when the profit factor looks excellent', () => {
            // the most misleading output this bot could produce: a spectacular PF on n=12
            const out = fmt.backtest({
                symbol: 'BTCUSDT', timeframe: '15m', strategy: 'Bollinger', days: 42,
                trades: 12, pf: 5.874, winRate: 83.3, returnPct: 21.7, maxDD: 3.9,
                costs: {taker: 0.001, maker: 0.001, slippage: 0.0005}
            });
            assert.include(out, 'too few to mean anything');
            assert.notInclude(out, 'lost money', 'a small sample is not the same complaint as a loss');
        });

        it('omits the small-sample warning once the sample is adequate', () => {
            const out = fmt.backtest({
                symbol: 'BTCUSDT', timeframe: '15m', strategy: 'Bollinger', days: 312,
                trades: 113, pf: 1.33, winRate: 53.1, returnPct: 29.6, maxDD: 15.4,
                costs: {taker: 0.001, maker: 0.001, slippage: 0.0005}
            });
            assert.notInclude(out, 'too few to mean anything');
        });

        it('flags a small sample in /signal track records too', () => {
            const out = fmt.signal('ADAUSDT', '5m', NOW, 0.4,
                [{strategy: 'Bollinger', state: 'STATE_PENDING', pf: 5.87, trades: 12}]);
            assert.include(out, 'sample too small');
        });

        it('always states the cost model alongside a profit factor', () => {
            const out = fmt.backtest({
                symbol: 'ADAUSDT', timeframe: '5m', strategy: 'Bollinger', days: 30,
                trades: 100, pf: 1.3, winRate: 55, returnPct: 20, maxDD: 10,
                costs: {taker: 0.001, maker: 0.001, slippage: 0.0005}
            });
            assert.include(out, 'Costs:');
        });

        it('shows a track record next to every strategy state', () => {
            const out = fmt.signal('ADAUSDT', '5m', NOW, 0.4, [
                {strategy: 'Bollinger', state: 'STATE_PENDING', pf: 0.8, trades: 40},
                {strategy: 'Phoenix', state: 'STATE_PENDING', pf: null, trades: null},
            ]);
            assert.include(out, 'PF 0.80');
            assert.include(out, 'lost money');
            assert.include(out, 'not benchmarked');
        });
    });

    describe('backtest runner', function () {
        it('reports measured metrics for a registered strategy', async () => {
            const runner = BacktestRunner.create();
            const r = await runner.run(FIXTURE, 'ADAUSDT', '5m', 'Bollinger', {now: NOW});
            assert.equal(r.strategy, 'Bollinger');
            assert.isNumber(r.trades);
            assert.isNumber(r.days);
        });

        it('resolves strategy names case-insensitively', () => {
            assert.equal(registry.resolve('bollinger').name, 'Bollinger');
            assert.isNull(registry.resolve('nope'));
        });

        it('caches a result rather than re-running the same cell', async () => {
            const runner = BacktestRunner.create();
            await runner.run(FIXTURE, 'ADAUSDT', '5m', 'Bollinger', {now: NOW});
            const before = runner.runs;
            await runner.run(FIXTURE, 'ADAUSDT', '5m', 'Bollinger', {now: NOW + 1000});
            assert.equal(runner.runs, before, 'a deterministic re-run is served from cache');
        });

        it('does not place orders — no exchange credentials are ever required', () => {
            // the whole layer is read-only by construction; assert the surface has no order path
            const source = require('fs').readFileSync(require.resolve('../../signal/CommandRouter.js'), 'utf8');
            for (const forbidden of ['createOrder', 'marketBuyOrder', 'marketSellOrder', 'limitBuyOrder', 'limitSellOrder']) {
                assert.notInclude(source, forbidden, `signalling layer must contain no ${forbidden} path`);
            }
        });
    });
});
