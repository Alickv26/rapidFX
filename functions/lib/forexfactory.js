"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchNewsEvents = fetchNewsEvents;
const fast_xml_parser_1 = require("fast-xml-parser");
const FF_URL = 'https://www.forexfactory.com/ffcal_week_this.xml';
const parser = new fast_xml_parser_1.XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    isArray: (name) => name === 'event',
});
const IMPACT_MAP = {
    'High': 'High',
    'Medium': 'Medium',
    'Low': 'Low',
};
function parseTime(dateStr, timeStr) {
    if (!timeStr || timeStr === 'All Day' || timeStr === 'Day') {
        return new Date(`${dateStr}T00:00:00Z`).getTime();
    }
    if (timeStr.endsWith('Day')) {
        return new Date(`${dateStr}T00:00:00Z`).getTime();
    }
    return new Date(`${dateStr}T${timeStr}:00Z`).getTime();
}
function resolveText(v) {
    if (!v)
        return null;
    if (typeof v === 'string')
        return v;
    if (v['#text'])
        return v['#text'];
    return null;
}
async function fetchNewsEvents() {
    const res = await fetch(FF_URL);
    if (!res.ok) {
        throw new Error(`Forex Factory returned ${res.status}: ${res.statusText}`);
    }
    const xml = await res.text();
    const parsed = parser.parse(xml);
    const rawEvents = parsed?.events?.event ?? parsed?.ffcal?.events?.event ?? [];
    return rawEvents
        .filter((e) => e.currency)
        .map((e) => {
        const date = e.date || '';
        const time = e.time || '';
        return {
            id: e.id || `${e.currency}_${date}_${time}_${(e.event || '').replace(/\s+/g, '_')}`,
            date,
            time,
            timestamp: parseTime(date, time),
            currency: e.currency || '',
            impact: IMPACT_MAP[e.impact || 'Low'] || 'Low',
            event: e.event || '',
            previous: resolveText(e.previous),
            forecast: resolveText(e.forecast),
            actual: resolveText(e.actual),
        };
    });
}
//# sourceMappingURL=forexfactory.js.map