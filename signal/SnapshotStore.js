const fs = require("fs");
const os = require("os");
const path = require("path");

/**
 * Persistence for generated snapshots.
 *
 * This is the hook between BitFox's two surfaces: a snapshot captured from Telegram on a
 * phone is retrievable by id from an AI client later (GHBF-51). Both write here; neither
 * owns it.
 */
class SnapshotStore {

    static create(opts = {}) { return new SnapshotStore(opts); }

    constructor(opts = {}) {
        this.dir = opts.dir || path.join(os.homedir(), 'bitfox', 'snapshots');
        // Snapshots are cheap to generate from BOTH surfaces (Telegram and MCP), so the
        // directory grows without bound unless something prunes it. 0 disables pruning.
        this.maxSnapshots = opts.maxSnapshots ?? 200;
    }

    ensureDir() {
        if (!fs.existsSync(this.dir)) fs.mkdirSync(this.dir, {recursive: true});
    }

    /**
     * Filesystem-safe, collision-free id. Seconds are included because two snapshots of
     * the same symbol inside one minute are entirely plausible from a chat client.
     *
     * @param symbol {String}
     * @param ts {Number} epoch ms
     * @return {String}
     */
    id(symbol, ts = Date.now()) {
        let safe = String(symbol).toUpperCase().replace(/[^A-Z0-9]/g, '');
        let d = new Date(ts).toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
        return `${safe}-${d}`;
    }

    /**
     * @param id {String}
     * @param markdown {String}
     * @return {String} the absolute path written
     */
    write(id, markdown) {
        this.ensureDir();
        let file = path.join(this.dir, `${id}.md`);
        fs.writeFileSync(file, markdown, 'utf8');
        this.prune();
        return file;
    }

    /**
     * Drop the oldest snapshots beyond `maxSnapshots`.
     * @return {Array<String>} ids removed
     */
    prune() {
        if (!this.maxSnapshots || this.maxSnapshots <= 0) return [];
        // list() is already newest-first by mtime — reuse that rather than a second rule
        let all = this.list(Number.MAX_SAFE_INTEGER);
        let removed = [];
        for (const entry of all.slice(this.maxSnapshots)) {
            try { fs.unlinkSync(entry.path); removed.push(entry.id); } catch (e) { /* already gone */ }
        }
        return removed;
    }

    /** @return {String|null} */
    read(id) {
        let file = path.join(this.dir, `${path.basename(String(id))}.md`);
        return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
    }

    /**
     * @param limit {Number}
     * @return {Array<Object>} {id, symbol, createdAt, path}, newest first
     */
    list(limit = 25) {
        if (!fs.existsSync(this.dir)) return [];
        return fs.readdirSync(this.dir)
            .filter(f => f.endsWith('.md'))
            .map(f => {
                let id = f.replace(/\.md$/, '');
                let stat = fs.statSync(path.join(this.dir, f));
                return {id, symbol: id.split('-')[0], createdAt: stat.mtimeMs, path: path.join(this.dir, f)};
            })
            .sort((a, b) => b.createdAt - a.createdAt)
            .slice(0, limit);
    }

    path(id) { return path.join(this.dir, `${path.basename(String(id))}.md`); }
}

module.exports = {SnapshotStore};
