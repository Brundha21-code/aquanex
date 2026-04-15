/* ═══════════════════════════════════════════════════════
   FloodGuard AI — Data Layer
   Fetches sensor data from Google Sheets (CSV export)
   ═══════════════════════════════════════════════════════ */

const DataManager = (() => {
    // Google Sheets config
    const SHEET_ID = '1rdkA1_Bq_7J7xv3-VVaDsCz9s-RfIamknqZG4J4OcbY';
    const GID = '28516179';
    const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${GID}`;
    const EXPORT_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID}`;

    const REFRESH_INTERVAL = 30000; // 30 seconds
    const MAX_HISTORY = 200;

    let readings = [];
    let refreshTimer = null;
    let isConnected = false;
    let usingFallback = false;
    let listeners = [];

    // ── CSV Parser ──
    function parseCSV(csvText) {
        const lines = csvText.trim().split('\n');
        if (lines.length < 2) return [];

        // Parse headers — clean up quotes
        const headers = lines[0].split(',').map(h =>
            h.replace(/^"|"$/g, '').trim().toLowerCase()
        );

        const dataRows = [];
        for (let i = 1; i < lines.length; i++) {
            const values = parseCSVLine(lines[i]);
            if (values.length < 2) continue;

            const row = {};
            headers.forEach((h, idx) => {
                row[h] = values[idx] ? values[idx].replace(/^"|"$/g, '').trim() : '';
            });
            dataRows.push(row);
        }
        return dataRows;
    }

    function parseCSVLine(line) {
        const values = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        values.push(current);
        return values;
    }

    // ── Normalize row data into a standard format ──
    function normalizeRow(row) {
        // Try to find temperature value
        let temperature = null;
        const tempKeys = ['temperature', 'temp', 'temperature (°c)', 'temperature(°c)', 'temp (c)', 'temperature_c', 'dht11', 'dht22'];
        for (const key of tempKeys) {
            if (row[key] !== undefined && row[key] !== '') {
                temperature = parseFloat(row[key]);
                if (!isNaN(temperature)) break;
            }
        }

        // Try to find distance/water level value
        let distance = null;
        const distKeys = ['distance', 'dist', 'distance (cm)', 'distance(cm)', 'ultrasonic', 'water_level', 'water level', 'level', 'waterlevel', 'water level (cm)'];
        for (const key of distKeys) {
            if (row[key] !== undefined && row[key] !== '') {
                distance = parseFloat(row[key]);
                if (!isNaN(distance)) break;
            }
        }

        // Try to find timestamp
        let timestamp = null;
        const dateKeys = ['date', 'datetime', 'timestamp', 'time', 'created_at'];
        for (const key of dateKeys) {
            if (row[key] !== undefined && row[key] !== '') {
                timestamp = row[key];
                break;
            }
        }

        // If we have separate date and time columns, combine them
        if (row['date'] && row['time']) {
            timestamp = `${row['date']} ${row['time']}`;
        }

        // Fallback for any numeric columns if named ones weren't found
        if (temperature === null || distance === null) {
            const numericValues = [];
            Object.values(row).forEach(v => {
                const num = parseFloat(v);
                if (!isNaN(num)) numericValues.push(num);
            });
            if (temperature === null && numericValues.length > 0) temperature = numericValues[0];
            if (distance === null && numericValues.length > 1) distance = numericValues[1];
        }

        // Calculate water level from distance
        // Assuming sensor is mounted at a fixed height above the channel
        // Higher distance = lower water level
        const SENSOR_HEIGHT = 200; // cm — height of sensor above channel bottom
        const waterLevel = distance !== null ? Math.max(0, SENSOR_HEIGHT - distance) : null;

        return {
            timestamp: timestamp || new Date().toISOString(),
            temperature: temperature,
            distance: distance,
            waterLevel: waterLevel,
            raw: row
        };
    }

    // ── Fetch from Google Sheets ──
    async function fetchFromSheets() {
        const urls = [CSV_URL, EXPORT_URL];

        for (const url of urls) {
            try {
                const response = await fetch(url, {
                    mode: 'cors',
                    cache: 'no-cache'
                });

                if (!response.ok) continue;

                const csvText = await response.text();
                if (!csvText || csvText.length < 10) continue;

                const rawRows = parseCSV(csvText);
                if (rawRows.length === 0) continue;

                const normalized = rawRows
                    .map(normalizeRow)
                    .filter(r => r.temperature !== null || r.distance !== null);

                if (normalized.length > 0) {
                    return { success: true, data: normalized };
                }
            } catch (e) {
                console.warn(`Fetch failed for ${url}:`, e.message);
            }
        }

        return { success: false, data: [] };
    }

    // ── Fallback / Simulated Data ──
    function generateFallbackData() {
        const data = [];
        const now = new Date();
        const baseTemp = 28;
        const baseDist = 120;

        for (let i = 99; i >= 0; i--) {
            const time = new Date(now.getTime() - i * 60000);
            const hourCycle = Math.sin((i / 24) * Math.PI * 2);
            const noise = () => (Math.random() - 0.5) * 4;

            // Simulate a gradual water rise event around reading 50-70
            let disturbance = 0;
            if (i < 60 && i > 30) {
                disturbance = (60 - i) * 1.5;
            } else if (i <= 30) {
                disturbance = Math.max(0, 30 * 1.5 - (30 - i) * 2);
            }

            const temperature = parseFloat((baseTemp + hourCycle * 3 + noise()).toFixed(1));
            const distance = parseFloat((baseDist - disturbance + noise() * 2).toFixed(1));
            const waterLevel = parseFloat(Math.max(0, 200 - distance).toFixed(1));

            data.push({
                timestamp: time.toISOString(),
                temperature: temperature,
                distance: distance,
                waterLevel: waterLevel,
                raw: {}
            });
        }
        return data;
    }

    // ── Public API ──
    function subscribe(callback) {
        listeners.push(callback);
        return () => { listeners = listeners.filter(l => l !== callback); };
    }

    function notifyListeners(event, data) {
        listeners.forEach(cb => {
            try { cb(event, data); } catch (e) { console.error('Listener error:', e); }
        });
    }

    async function refresh() {
        const result = await fetchFromSheets();

        if (result.success) {
            readings = result.data.slice(-MAX_HISTORY);
            isConnected = true;
            usingFallback = false;
            notifyListeners('data-updated', { source: 'live' });
        } else {
            if (readings.length === 0) {
                // First load and no connection — use fallback
                readings = generateFallbackData();
                usingFallback = true;
                notifyListeners('data-updated', { source: 'fallback' });
            } else {
                // Already have data, just mark disconnected
                usingFallback = true;
            }
            isConnected = false;
            notifyListeners('connection-change', { connected: false });
        }

        return readings;
    }

    function startAutoRefresh() {
        if (refreshTimer) clearInterval(refreshTimer);
        refresh(); // initial fetch
        refreshTimer = setInterval(refresh, REFRESH_INTERVAL);
    }

    function stopAutoRefresh() {
        if (refreshTimer) {
            clearInterval(refreshTimer);
            refreshTimer = null;
        }
    }

    function getReadings() {
        return [...readings];
    }

    function getLatest() {
        return readings.length > 0 ? readings[readings.length - 1] : null;
    }

    function getRecentN(n) {
        return readings.slice(-n);
    }

    function getStatus() {
        return {
            connected: isConnected,
            usingFallback: usingFallback,
            totalReadings: readings.length,
            lastReading: getLatest()
        };
    }

    return {
        subscribe,
        refresh,
        startAutoRefresh,
        stopAutoRefresh,
        getReadings,
        getLatest,
        getRecentN,
        getStatus
    };
})();
