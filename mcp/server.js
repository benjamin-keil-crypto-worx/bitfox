#!/usr/bin/env node
/**
 * BitFox MCP server — regime, readings, and honest backtests over stdio.
 *
 * ⚠ STDOUT IS THE PROTOCOL CHANNEL.
 *
 * MCP over stdio uses stdout for JSON-RPC frames. Every Log method in this repo writes to
 * console.log (lib/utility/Log.js), and BackTest logs every trade, so a single backtest
 * would interleave hundreds of lines into the protocol stream and corrupt every response.
 *
 * `redirectConsoleToStderr()` moves console output to stderr — where MCP clients surface
 * it as server logs — while leaving process.stdout.write untouched so the transport still
 * works. It is invoked from the entry-point guard at the bottom, NOT at module load:
 * mutating global console as an import side effect would leak into any process that
 * merely requires this file (it broke a console.log spy in the existing test suite).
 * Nothing required here logs at import time, so the entry point is early enough.
 *
 * Requires NO exchange credentials and NO model API keys: market data comes from public
 * endpoints, and the MCP client brings its own model.
 */

const CONSOLE_METHODS = ['log', 'info', 'warn', 'debug', 'trace'];

/** @return {Object} the original methods, so callers (and tests) can restore them */
const redirectConsoleToStderr = () => {
    let original = {};
    for (const method of CONSOLE_METHODS) {
        original[method] = console[method];
        console[method] = (...args) => process.stderr.write(args.map(String).join(' ') + '\n');
    }
    return original;
};

const {McpServer} = require("@modelcontextprotocol/sdk/server/mcp.js");
const {StdioServerTransport} = require("@modelcontextprotocol/sdk/server/stdio.js");
const {z} = require("zod");
const {Tools, DEFINITIONS} = require("./tools");

/**
 * Convert a plain param descriptor to the zod shape the SDK expects. Keeping tools.js
 * free of zod means the tool surface stays unit-testable without the SDK.
 */
function toZodShape(params) {
    let shape = {};
    for (const [name, spec] of Object.entries(params || {})) {
        let base = spec.type === 'number' ? z.number() : z.string();
        if (spec.description) base = base.describe(spec.description);
        shape[name] = spec.required ? base : base.optional();
    }
    return shape;
}

/**
 * @param opts {Object} passed through to Tools (router/store injectable for tests)
 * @return {McpServer}
 */
function buildServer(opts = {}) {
    let tools = opts.tools || Tools.create(opts);
    let server = new McpServer({name: 'bitfox', version: require('../package.json').version});

    for (const def of DEFINITIONS) {
        server.registerTool(
            def.name,
            {title: def.title, description: def.description, inputSchema: toZodShape(def.params)},
            async (args) => {
                let result = await def.handler(tools, args || {});
                // structured payload as text — MCP clients render it, models parse it
                return {content: [{type: 'text', text: JSON.stringify(result, null, 2)}]};
            }
        );
    }
    return server;
}

async function main() {
    let server = buildServer();
    await server.connect(new StdioServerTransport());
    console.error('[BitFox MCP] ready on stdio — read-only, no credentials required');
}

if (require.main === module) {
    // stdout is the protocol channel from here on
    redirectConsoleToStderr();
    main().catch(err => {
        console.error('[BitFox MCP] fatal:', err && err.message);
        process.exit(1);
    });
}

module.exports = {buildServer, toZodShape, redirectConsoleToStderr};
