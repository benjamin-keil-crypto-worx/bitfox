/**
 * Rendering for the signalling layer.
 *
 * DESIGN RULE — descriptive, never prescriptive.
 *
 * Under the honest engine 13 of 14 strategies lose money and buy-and-hold beats all of
 * them (see .claude/context/STRATEGY-LEDGER.md). A green arrow or a "BUY" line would
 * assert an edge the evidence does not support, so this module states what the
 * indicators READ and never what the user should DO.
 *
 * FORBIDDEN_TOKENS is exported so the test suite asserts against the same list the
 * implementation claims to honour. Adding a token here is cheap; removing one should
 * require a very good reason.
 *
 * Note on "long"/"short": these appear only as SuperTrend's own state labels — that is
 * the indicator naming its direction, not advice to take a position. They are therefore
 * not forbidden, while verdict and action words are.
 */

const FORBIDDEN_TOKENS = [
    'buy', 'sell', 'bullish', 'bearish', 'oversold', 'overbought',
    'recommend', 'should', 'confidence', 'target price', 'entry price',
    'strong', 'weak signal', 'opportunity',
    '🟢', '🔴', '🚀', '📈', '📉', '⬆', '⬇',
];

/** Below this, a profit factor carries no information — matches the ledger's ship bar. */
const MIN_MEANINGFUL_TRADES = 50;

const n = (v, dp = 2) => (v == null || Number.isNaN(v)) ? 'n/a' : Number(v).toFixed(dp);
const pct = (v, dp = 2) => (v == null || Number.isNaN(v)) ? 'n/a' : `${Number(v).toFixed(dp)}%`;

/** @param ts {Number} epoch ms @return {String} */
function stamp(ts) {
    return new Date(ts).toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
}

function header(symbol, timeframe, ts, price) {
    return `${symbol} ${timeframe} · ${stamp(ts)}\nPrice      ${price}`;
}

function trend(symbol, timeframe, ts, a) {
    let lines = [header(symbol, timeframe, ts, a.price)];
    for (let p of [20, 50, 100, 200]) {
        let v = a.ema[p];
        let rel = (v != null) ? ` (price ${a.price >= v ? '+' : ''}${pct((a.price - v) / v * 100)})` : '';
        lines.push(`EMA${String(p).padEnd(4)}   ${n(v, 6)}${rel}`);
    }
    lines.push(`Ribbon     ${a.stackOrder ?? 'n/a'}`);
    if (a.superTrend) {
        let flip = a.superTrend.barsSinceFlip;
        lines.push(`SuperTrend ${a.superTrend.trend} @ ${n(a.superTrend.value, 6)}` +
            (flip == null ? ' (no flip in window)' : ` (flipped ${flip} ${flip === 1 ? 'bar' : 'bars'} ago)`));
    }
    if (a.adx) lines.push(`ADX        ${n(a.adx.adx)} (+DI ${n(a.adx.pdi)} / −DI ${n(a.adx.mdi)})`);
    return lines.join('\n');
}

function momentum(symbol, timeframe, ts, a) {
    let lines = [header(symbol, timeframe, ts, a.price)];
    lines.push(`RSI(14)    ${n(a.rsi)}`);
    if (a.macd) lines.push(`MACD       ${n(a.macd.MACD, 6)} · signal ${n(a.macd.signal, 6)} · hist ${n(a.macd.histogram, 6)}`);
    lines.push(`MFI        ${n(a.mfi)}`);
    if (a.stochastic) lines.push(`Stoch      %K ${n(a.stochastic.k)} · %D ${n(a.stochastic.d)}`);
    return lines.join('\n');
}

function levels(symbol, timeframe, ts, a) {
    let lines = [header(symbol, timeframe, ts, a.price)];
    if (a.donchian) lines.push(`Donchian   high ${n(a.donchian.upper, 6)} · mid ${n(a.donchian.middle, 6)} · low ${n(a.donchian.lower, 6)}`);
    if (a.bollinger) {
        lines.push(`Bollinger  upper ${n(a.bollinger.upper, 6)} · mid ${n(a.bollinger.middle, 6)} · lower ${n(a.bollinger.lower, 6)}`);
        lines.push(`%B         ${n(a.bollinger.pb, 4)}`);
    }
    return lines.join('\n');
}

function volatility(symbol, timeframe, ts, a) {
    let lines = [header(symbol, timeframe, ts, a.price)];
    lines.push(`ATR(14)    ${n(a.atr, 6)} (${pct(a.atrPct)} of price)`);
    lines.push(`BB width   ${pct(a.bbWidthPct)}`);
    lines.push(`ATR pctile ${a.atrPercentile == null ? 'n/a' : pct(a.atrPercentile, 0) + ' of its own history'}`);
    return lines.join('\n');
}

/**
 * @param r {Object} {symbol,timeframe,strategy,trades,pf,winRate,returnPct,maxDD,days,costs}
 * @return {String} historical performance, with the loss warning when PF < 1
 */
function backtest(r) {
    let lines = [
        `${r.symbol} ${r.timeframe} · ${r.strategy}`,
        `Window     ${r.days} days · ${r.trades} trades`,
    ];
    if (r.trades === 0) {
        lines.push(`No trades were generated in this window — nothing to report.`);
        return lines.join('\n');
    }
    lines.push(`Profit factor ${n(r.pf, 3)}`);
    lines.push(`Win rate   ${pct(r.winRate, 1)}`);
    lines.push(`Return     ${pct(r.returnPct, 1)}`);
    lines.push(`Max DD     ${pct(r.maxDD, 1)}`);
    if (r.pf < 1.0) {
        // mandatory: reporting the negative IS the product
        lines.push(`\n⚠ This strategy lost money over the tested window.`);
    }
    // A high profit factor on a tiny sample is the most misleading thing this bot can
    // print — more so than a loss. The ledger is full of them: Bollinger 1d PF 1.20 on
    // n=14, Crocodile 1d PF 3.65 on n=14 that collapsed to 1.07 once pooled to n=177.
    if (r.trades < MIN_MEANINGFUL_TRADES) {
        lines.push(`\n⚠ Only ${r.trades} trades — too few to mean anything. ` +
            `Under ${MIN_MEANINGFUL_TRADES} trades this number is noise, however good it looks.`);
    }
    lines.push(`\nCosts: ${pct(r.costs.taker * 100, 3)} taker both legs + ${pct(r.costs.slippage * 100, 3)} slippage.`);
    lines.push(`Past results are a measurement of this window only.`);
    return lines.join('\n');
}

/**
 * @param rows {Array<Object>} [{strategy, state, pf, trades}]
 * @return {String} what each strategy reads right now, next to its measured track record
 */
function signal(symbol, timeframe, ts, price, rows) {
    let lines = [`${symbol} ${timeframe} · ${stamp(ts)}`, `Price      ${price}`, ``];
    lines.push(`Strategy state on the latest closed candle, with its measured profit factor:`);
    for (let r of rows) {
        let record = (r.pf == null) ? 'not benchmarked' :
            `PF ${n(r.pf, 2)} over ${r.trades} trades` +
            (r.pf < 1.0 ? ' — lost money' : '') +
            (r.trades < MIN_MEANINGFUL_TRADES ? ' — sample too small' : '');
        lines.push(`  ${r.strategy.padEnd(16)} ${String(r.state).padEnd(26)} ${record}`);
    }
    lines.push(``);
    lines.push(`A state is what the rule emitted, not evidence it works. Check the profit factor.`);
    return lines.join('\n');
}

/**
 * @param symbol {String}
 * @param horizons {Object} {short:{...}, medium:{...}, long:{...}} from Regime.classify
 * @return {String} regime across horizons — buckets and numbers, no composite score
 */
function regime(symbol, horizons, generatedAt) {
    let lines = [`${symbol} · ${stamp(generatedAt)}`, ''];
    for (const [label, r] of Object.entries(horizons)) {
        if (!r) { lines.push(`${label.padEnd(7)}(unavailable)`); continue; }
        lines.push(`${label.padEnd(7)}(${r.timeframe.padEnd(3)}) ADX ${n(r.adx, 1).padEnd(6)} ${r.trend.padEnd(13)}` +
            `vol ${r.volatility} (${n(r.volPercentile, 0)} pctile)`);
        lines.push(`${''.padEnd(14)}${r.stackOrder ?? 'n/a'} · price ${r.aboveEma200 == null ? 'n/a' : (r.aboveEma200 ? 'above' : 'below')} EMA200`);
    }
    lines.push('');
    lines.push(`Direction is reported, not weighted — measured at -0.39%/trade both with`);
    lines.push(`and against the EMA200 trend over 15,073 trades.`);
    return lines.join('\n');
}

/**
 * @param id {String}
 * @param symbol {String}
 * @param stats {Object} {strategies, reliableBuckets, bucketsExamined}
 * @return {String} short chat summary; the full document goes out as a file attachment
 */
function snapshotSummary(id, symbol, horizons, counts) {
    let lines = [`${symbol} snapshot · ${id}`, ''];
    for (const [label, r] of Object.entries(horizons)) {
        if (!r) continue;
        lines.push(`${label.padEnd(7)}${r.timeframe.padEnd(4)} ${r.trend} · vol ${r.volatility}`);
    }
    lines.push('');
    lines.push(`Full document attached: regime across horizons, per-strategy performance`);
    lines.push(`bucketed by regime, sample sizes, and the cost model.`);
    if (counts) {
        lines.push('');
        lines.push(`${counts.examined} regime buckets examined, ${counts.reliable} with n >= ${MIN_MEANINGFUL_TRADES}.`);
        if (counts.reliable === 0) {
            lines.push(`⚠ No bucket reached ${MIN_MEANINGFUL_TRADES} trades — treat every bucketed number as noise.`);
        }
    }
    return lines.join('\n');
}

function help() {
    return [
        `BitFox signalling — read-only market analysis.`,
        ``,
        `/trend <SYMBOL> <TF>      EMA stack, SuperTrend, ADX`,
        `/momentum <SYMBOL> <TF>   RSI, MACD, MFI, Stochastic`,
        `/levels <SYMBOL> <TF>     Donchian channel, Bollinger bands`,
        `/vol <SYMBOL> <TF>        ATR, ATR%, BB width, ATR percentile`,
        `/signal <SYMBOL> <TF>     what each strategy reads now + its track record`,
        `/backtest <SYMBOL> <TF> <STRATEGY>   measured historical performance`,
        `/regime <SYMBOL>          regime across short/medium/long horizons`,
        `/snapshot <SYMBOL>        full markdown snapshot, attached as a file`,
        ``,
        `Example: /trend ADAUSDT 15m`,
        ``,
        `This bot reports indicator readings. It does not place orders and does not`,
        `tell you what to do. Most strategies in this repo lose money after costs —`,
        `use /backtest before trusting any of them.`,
    ].join('\n');
}

module.exports = {FORBIDDEN_TOKENS, MIN_MEANINGFUL_TRADES, trend, momentum, levels, volatility, backtest, signal, regime, snapshotSummary, help, stamp};
