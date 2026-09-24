/**
 * @class KuraiDB
 * @description Async game-save storage on IndexedDB, the big-world companion
 * to `Storage` (localStorage). Same versioned-envelope semantics (`{v,t,data}`
 * with a `.bak` backup and forward migration), but with no ~5MB quota and no
 * JSON round-trip: values are structured-cloned, so large nested world state
 * (tile grids, inventories, NPC state) saves fast and loads intact, including
 * Maps, Sets, Dates, and typed arrays.
 *
 * All methods are async. The database opens lazily on first use; call
 * `configure()` first if you want a custom database/store name.
 *
 * @example
 * // Save / load a world with schema migration:
 * await KuraiDB.save("world", world, { version: 3 });
 * const world = await KuraiDB.load("world", {
 *   version: 3,
 *   fallback: makeNewWorld(),
 *   migrate: (old, from) => upgradeWorld(old, from),
 * });
 *
 * // Plain key/value (no envelope):
 * await KuraiDB.set("settings", { volume: 0.8 });
 * const settings = await KuraiDB.get("settings", {});
 */
class KuraiDB {
  /**
   * @method isSupported
   * @description Whether IndexedDB exists in this environment.
   * @returns {boolean}
   */
  static isSupported() {
    return typeof indexedDB !== "undefined" && indexedDB !== null;
  }

  /**
   * @method configure
   * @description Sets the database and object-store names. Call before the
   * first read/write (once the database is open the names are fixed until
   * `close()`).
   * @param {Object} [options] - { name = "kurai2d-db", store = "kv" }
   * @returns {KuraiDB} - the class, for chaining
   */
  static configure(options = {}) {
    if (options.name) KuraiDB._name = options.name;
    if (options.store) KuraiDB._store = options.store;
    return KuraiDB;
  }

  /**
   * @method _open
   * @description Lazily opens (and creates) the database. Shared promise so
   * concurrent calls open once.
   * @private
   */
  static _open() {
    if (KuraiDB._db) return KuraiDB._db;
    if (!KuraiDB.isSupported()) {
      return Promise.reject(
        new Error("[KuraiDB] > IndexedDB is not available in this environment.")
      );
    }
    KuraiDB._db = new Promise((resolve, reject) => {
      const request = indexedDB.open(KuraiDB._name, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(KuraiDB._store)) {
          db.createObjectStore(KuraiDB._store);
        }
      };
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => {
          db.close();
          KuraiDB._db = null;
        };
        resolve(db);
      };
      request.onerror = () => {
        KuraiDB._db = null;
        reject(
          request.error || new Error("[KuraiDB] > Failed to open database.")
        );
      };
    });
    return KuraiDB._db;
  }

  /**
   * @method _tx
   * @description Runs `fn(store)` inside a transaction and resolves with its
   * request's result when the transaction completes.
   * @private
   */
  static async _tx(mode, fn) {
    const db = await KuraiDB._open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(KuraiDB._store, mode);
      const store = tx.objectStore(KuraiDB._store);
      let result;
      const request = fn(store);
      if (request) {
        request.onsuccess = () => {
          result = request.result;
        };
      }
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () =>
        reject(tx.error || new Error("[KuraiDB] > Transaction aborted."));
    });
  }

  /**
   * @method set
   * @description Stores a value under a key (structured clone: objects, Maps,
   * Sets, typed arrays all survive).
   * @param {string} key
   * @param {*} value
   * @returns {Promise<void>}
   */
  static async set(key, value) {
    await KuraiDB._tx("readwrite", (store) => store.put(value, key));
  }

  /**
   * @method get
   * @description Reads a value; resolves `fallback` when the key is missing.
   * @param {string} key
   * @param {*} [fallback=undefined]
   * @returns {Promise<*>}
   */
  static async get(key, fallback = undefined) {
    const value = await KuraiDB._tx("readonly", (store) => store.get(key));
    return value === undefined ? fallback : value;
  }

  /**
   * @method remove
   * @description Deletes a key.
   * @returns {Promise<void>}
   */
  static async remove(key) {
    await KuraiDB._tx("readwrite", (store) => store.delete(key));
  }

  /**
   * @method keys
   * @description Lists every key in the store.
   * @returns {Promise<string[]>}
   */
  static async keys() {
    const keys = await KuraiDB._tx("readonly", (store) => store.getAllKeys());
    return keys || [];
  }

  /**
   * @method clear
   * @description Deletes everything in the store.
   * @returns {Promise<void>}
   */
  static async clear() {
    await KuraiDB._tx("readwrite", (store) => store.clear());
  }

  /**
   * @method save
   * @description Writes a versioned save: the payload is wrapped in a
   * `{ v, t, data }` envelope and the previous value (if any) is mirrored to
   * `key + ".bak"` in the same transaction, so a torn write can always recover.
   * @param {string} key
   * @param {*} data - Any structured-cloneable value
   * @param {Object} [options] - { version = 1, backup = true }
   * @returns {Promise<void>}
   */
  static async save(key, data, options = {}) {
    const version = options.version ?? 1;
    const envelope = { v: version, t: Date.now(), data };
    const backup = options.backup !== false;
    const db = await KuraiDB._open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(KuraiDB._store, "readwrite");
      const store = tx.objectStore(KuraiDB._store);
      if (backup) {
        const read = store.get(key);
        read.onsuccess = () => {
          if (read.result !== undefined) store.put(read.result, key + ".bak");
          store.put(envelope, key);
        };
      } else {
        store.put(envelope, key);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () =>
        reject(tx.error || new Error("[KuraiDB] > Save aborted."));
    });
  }

  /**
   * @method load
   * @description Reads a versioned save. Falls back to the `.bak` mirror when
   * the primary is missing/invalid, migrates old versions forward via
   * `migrate(data, fromVersion)`, and (by default) rewrites migrated data in
   * the new format.
   * @param {string} key
   * @param {Object} [options] - { version = 1, fallback = null, migrate, rewrite = true }
   * @returns {Promise<*>}
   */
  static async load(key, options = {}) {
    let envelope = KuraiDB._asEnvelope(await KuraiDB.get(key));
    if (!envelope) {
      envelope = KuraiDB._asEnvelope(await KuraiDB.get(key + ".bak"));
    }
    const { data, migrated } = KuraiDB._resolveEnvelope(envelope, options);
    if (migrated && options.rewrite !== false) {
      await KuraiDB.save(key, data, { version: options.version ?? 1 });
    }
    return data;
  }

  /**
   * @method hasSave
   * @description Whether a versioned save (or its backup) exists.
   * @returns {Promise<boolean>}
   */
  static async hasSave(key) {
    if ((await KuraiDB.get(key)) !== undefined) return true;
    return (await KuraiDB.get(key + ".bak")) !== undefined;
  }

  /**
   * @method removeSave
   * @description Deletes a versioned save AND its backup.
   * @returns {Promise<void>}
   */
  static async removeSave(key) {
    await KuraiDB.remove(key);
    await KuraiDB.remove(key + ".bak");
  }

  /**
   * @method importFromStorage
   * @description Copies a save written by the localStorage `Storage` class
   * into KuraiDB (envelope preserved). Use once when upgrading an existing
   * game to IndexedDB saves.
   * @param {string} key
   * @returns {Promise<boolean>} - true if something was imported
   */
  static async importFromStorage(key) {
    if (typeof localStorage === "undefined") return false;
    const raw = localStorage.getItem(key);
    if (raw == null) return false;
    let value;
    try {
      value = JSON.parse(raw);
    } catch {
      return false;
    }
    await KuraiDB.set(key, value);
    const bak = localStorage.getItem(key + ".bak");
    if (bak != null) {
      try {
        await KuraiDB.set(key + ".bak", JSON.parse(bak));
      } catch {}
    }
    return true;
  }

  /**
   * @method close
   * @description Closes the database handle (reopens lazily on next use).
   */
  static async close() {
    if (!KuraiDB._db) return;
    try {
      const db = await KuraiDB._db;
      db.close();
    } catch {}
    KuraiDB._db = null;
  }

  /**
   * @method _asEnvelope
   * @description Returns the value if it looks like a save envelope, else null.
   * A plain (pre-versioning) object is wrapped as version 0 so it can migrate.
   * @private
   */
  static _asEnvelope(value) {
    if (value === undefined || value === null) return null;
    if (
      typeof value === "object" &&
      typeof value.v === "number" &&
      "data" in value
    ) {
      return value;
    }
    return { v: 0, t: 0, data: value };
  }

  /**
   * @method _resolveEnvelope
   * @description Pure envelope resolution shared by load(): applies fallback
   * and forward migration. Exposed for tests.
   * @private
   */
  static _resolveEnvelope(envelope, options = {}) {
    const version = options.version ?? 1;
    const fallback = options.fallback ?? null;
    if (!envelope) return { data: fallback, migrated: false };
    if (envelope.v === version) return { data: envelope.data, migrated: false };
    if (typeof options.migrate === "function") {
      return {
        data: options.migrate(envelope.data, envelope.v),
        migrated: true,
      };
    }
    return { data: fallback, migrated: false };
  }
}

KuraiDB._name = "kurai2d-db";
KuraiDB._store = "kv";
KuraiDB._db = null;

export default KuraiDB;
