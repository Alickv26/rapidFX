"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.refreshNewsCalendarCallable = exports.refreshNewsCalendar = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const https_1 = require("firebase-functions/v2/https");
const v2_1 = require("firebase-functions/v2");
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const forexfactory_1 = require("./forexfactory");
(0, v2_1.setGlobalOptions)({ region: 'europe-west1' });
if (!(0, app_1.getApps)().length) {
    (0, app_1.initializeApp)();
}
const db = (0, firestore_1.getFirestore)();
async function refreshNews() {
    console.log('[news] Fetching Forex Factory calendar...');
    const events = await (0, forexfactory_1.fetchNewsEvents)();
    console.log(`[news] Fetched ${events.length} events`);
    const batch = db.batch();
    let count = 0;
    for (const event of events) {
        const ref = db.collection('newsEvents').doc(event.id);
        batch.set(ref, event, { merge: true });
        count++;
        if (count >= 500) {
            await batch.commit();
            count = 0;
        }
    }
    if (count > 0) {
        await batch.commit();
    }
    // cleanse events older than 7 days
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const oldSnap = await db
        .collection('newsEvents')
        .where('timestamp', '<', weekAgo)
        .limit(500)
        .get();
    if (!oldSnap.empty) {
        const delBatch = db.batch();
        oldSnap.docs.forEach((d) => delBatch.delete(d.ref));
        await delBatch.commit();
        console.log(`[news] Cleansed ${oldSnap.size} old events`);
    }
    console.log('[news] Refresh complete');
}
exports.refreshNewsCalendar = (0, scheduler_1.onSchedule)({ schedule: 'every 60 minutes', timeZone: 'UTC' }, async () => {
    await refreshNews();
});
exports.refreshNewsCalendarCallable = (0, https_1.onCall)(async () => {
    await refreshNews();
    return { success: true };
});
//# sourceMappingURL=index.js.map