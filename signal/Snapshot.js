const regime = require("./Regime");
const {MIN_MEANINGFUL_TRADES} = require("./Formatter");

/**
 * Builds the markdown snapshot: regime across horizons, readings, per-strategy
 * conditional statistics, and a standing caveats block.
 *
 * The caveats block is a FUNCTIONAL REQUIREMENT, not boilerplate. This document is
 * designed to be fed to an LLM, and a model handed bare indicator values will produce
 * "STRONG BUY" every time. Handed the track record, the sample sizes and the cost model,
 * it has what it needs to be honest instead. Putting a model in front of the data does
 * not launder the claim — the context has to carry it.
 */

const n = (v, dp = 2) => (v == null || Number.isNaN(v)) ? 'n/a' : Number(v).toFixed(dp);
const pf = (v) => (v == null) ? 'n/a' : (v === Infinity ? 'inf' : Number(v).toFixed(2));

function regimeTable(horizons) {
    let rows = ['| Horizon | TF | ADX | Trend | Vol %ile | Volatility | EMA order | vs EMA200 |',
                '|---|---|---|---|---|---|---|---|'];
    for (const [label, r] of Object.entries(horizons)) {
        if (!r) { rows.push(`| ${label} | — | unavailable | | | | | |`); continue; }
        rows.push(`| ${label} | ${r.timeframe} | ${n(r.adx, 1)} | ${r.trend} | ` +
            `${n(r.volPercentile, 0)} | ${r.volatility} | ${r.stackOrder ?? 'n/a'} | ` +
            `${r.aboveEma200 == null ? 'n/a' : (r.aboveEma200 ? 'above' : 'below')} |`);
    }
    return rows.join('\n');
}

function conditionalSection(stats) {
    if (!stats || !stats.pooled) return '_No completed trades to analyse._';
    let out = [];
    out.push(`Pooled baseline (all conditions): **PF ${pf(stats.pooled.pf)}** over **${stats.pooled.n}** trades, ` +
        `avg ${n(stats.pooled.avg, 3)}%/trade, win rate ${n(stats.pooled.winRate, 1)}%.`);
    out.push('');
    out.push(`Buckets examined: **${stats.bucketsExamined}** (${stats.reliableBuckets} with n ≥ ${stats.minTrades}).`);
    out.push('');
    out.push('| Regime bucket | n | PF | avg %/trade | win % | reliable |');
    out.push('|---|---|---|---|---|---|');
    for (const b of stats.buckets) {
        if (b.n === 0) continue;
        out.push(`| ${b.key} | ${b.n} | ${pf(b.pf)} | ${n(b.avg, 3)} | ${n(b.winRate, 1)} | ${b.reliable ? 'yes' : '**NO**'} |`);
    }
    return out.join('\n');
}

/**
 * @param opts {Object} {symbol, horizons, strategies, generatedAt}
 * @return {String} the full markdown document
 */
function build(opts) {
    let {symbol, horizons, strategies, generatedAt} = opts;
    let when = new Date(generatedAt).toISOString().replace('T', ' ').slice(0, 16) + ' UTC';

    let doc = [];
    doc.push(`# ${symbol} — market regime snapshot`);
    doc.push('');
    // NB: wording deliberately avoids the FORBIDDEN_TOKENS list even in negated form —
    // the assertion is a plain substring check, and an exemption for "not a recommendation"
    // is exactly the loophole that erodes the rule.
    doc.push(`Generated ${when} by BitFox. **Measurements only. Not advice.**`);
    doc.push('');
    doc.push('## Regime across horizons');
    doc.push('');
    doc.push(regimeTable(horizons));
    doc.push('');
    doc.push('Direction (`vs EMA200`, `EMA order`) is reported but **not weighted as favourable**. ');
    doc.push('A measurement across 15,073 trades found −0.39%/trade both with and against the EMA200 trend, ');
    doc.push('so trend alignment carries no measured edge in this repo.');
    doc.push('');

    doc.push('## Strategy performance by regime');
    doc.push('');
    if (!strategies || strategies.length === 0) {
        doc.push('_Not computed._');
    } else {
        for (const s of strategies) {
            doc.push(`### ${s.name} — ${s.timeframe}`);
            doc.push('');
            doc.push(conditionalSection(s.stats));
            doc.push('');
        }
    }

    doc.push('## How to read this');
    doc.push('');
    doc.push(`- **Buckets below ${MIN_MEANINGFUL_TRADES} trades are noise.** They are marked \`reliable: NO\`. A high profit factor on a small bucket is the single most misleading number here — it looks like good news.`);
    doc.push('- **Bucketing invites false positives.** Slicing trades by regime is a multiple-comparisons problem: with enough buckets, one will look excellent by chance. The bucket count is stated above so you can discount for selection.');
    doc.push('- **Buckets are listed in a fixed order**, never sorted by performance. There is no "best bucket" highlighted, on purpose.');
    doc.push('- **Compare every bucket to the pooled baseline** it was carved from.');
    doc.push('');
    doc.push('## Standing caveats');
    doc.push('');
    doc.push('- Costs applied: 0.1% taker per leg + 0.05% slippage (0.25% round trip).');
    // "buy-and-hold" is the usual term but trips the FORBIDDEN_TOKENS substring check.
    // Rewording beats adding an exemption — carving exceptions is how the rule erodes.
    doc.push('- Under this cost model **13 of 14 bundled strategies lose money**, and simply holding the asset beat all of them. Only `DonchianTrend` has survived walk-forward validation, at 5 of 6 ship-bar criteria.');
    doc.push('- Past measurement over one window is not a forecast. Results are window-dependent and move as the data window slides.');
    doc.push('- Nothing here is advice to trade. BitFox does not place orders and holds no exchange credentials.');
    doc.push('');
    return doc.join('\n');
}

module.exports = {build, regimeTable, conditionalSection};
