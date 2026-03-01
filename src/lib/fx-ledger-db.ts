/**
 * IndexedDB initialization for fx_ledger_db.
 * Client-side only (use in useEffect or similar).
 */
export function initFxLedgerDb() {
  console.log("Testing DB open...");
  const req = indexedDB.open("fx_ledger_db", 3);

  req.onupgradeneeded = () => console.log("onupgradeneeded v3");

  req.onsuccess = () =>
    console.log("DB open OK v3, stores:", Array.from(req.result.objectStoreNames || []));

  req.onerror = () => {
    console.error("DB open error", req.error);
    indexedDB.deleteDatabase("fx_ledger_db");
  };
}
