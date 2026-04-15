/* ═══════════════════════════════════════════════════════
   FloodGuard AI — AI Analysis Engine
   Flood risk scoring, trend detection, and prediction
   ═══════════════════════════════════════════════════════ */

const AIEngine = (() => {

    // ── Configurable Thresholds ──
    let thresholds = {
        waterLevel: {
            low: 30,       // cm — normal
            moderate: 60,  // cm — elevated
            high: 90,      // cm — dangerous
            critical: 120  // cm — emergency
        },
        temperature: {
            cold: 10,
            normal: 35,
            hot: 40,
            extreme: 45
        },
        rateOfChange: {
            moderate: 2,   // cm per reading
            fast: 5,       // cm per reading
            extreme: 10    // cm per reading
        }
    };

    // ── Risk Scoring (0–100) ──
    function calculateFloodRisk(readings) {
        if (!readings || readings.length === 0) return { score: 0, level: 'unknown', factors: [] };

        const latest = readings[readings.length - 1];
        const factors = [];
        let score = 0;

        // 1. Water Level Score (0–60 points)
        if (latest.waterLevel !== null) {
            const wl = latest.waterLevel;
            let waterScore = 0;

            if (wl < thresholds.waterLevel.low) {
                waterScore = (wl / thresholds.waterLevel.low) * 15;
            } else if (wl < thresholds.waterLevel.moderate) {
                waterScore = 15 + ((wl - thresholds.waterLevel.low) / (thresholds.waterLevel.moderate - thresholds.waterLevel.low)) * 20;
            } else if (wl < thresholds.waterLevel.high) {
                waterScore = 35 + ((wl - thresholds.waterLevel.moderate) / (thresholds.waterLevel.high - thresholds.waterLevel.moderate)) * 15;
            } else {
                waterScore = 50 + Math.min(10, ((wl - thresholds.waterLevel.high) / 30) * 10);
            }

            score += waterScore;
            factors.push({
                name: 'Water Level',
                value: `${wl.toFixed(1)} cm`,
                contribution: Math.round(waterScore),
                status: wl > thresholds.waterLevel.high ? 'critical' :
                        wl > thresholds.waterLevel.moderate ? 'warning' : 'normal'
            });
        }

        // 2. Temperature Score (0–20 points)
        if (latest.temperature !== null) {
            const temp = latest.temperature;
            let tempScore = 0;

            // Extreme cold or extreme heat can correlate with weather events
            if (temp < thresholds.temperature.cold) {
                tempScore = 10; // Cold snap — possible ice melt flood
            } else if (temp > thresholds.temperature.hot) {
                tempScore = 8; // Hot — potential thunderstorm conditions
            } else if (temp > thresholds.temperature.extreme) {
                tempScore = 15;
            } else {
                tempScore = 2; // Normal temperature — low risk contribution
            }

            score += tempScore;
            factors.push({
                name: 'Temperature',
                value: `${temp.toFixed(1)} °C`,
                contribution: Math.round(tempScore),
                status: temp > thresholds.temperature.hot || temp < thresholds.temperature.cold ? 'warning' : 'normal'
            });
        }

        // 3. Rate of Change Score (0–20 points)
        if (readings.length >= 3) {
            const roc = calculateRateOfChange(readings);
            let rocScore = 0;

            if (roc.waterLevelRate > thresholds.rateOfChange.extreme) {
                rocScore = 20;
            } else if (roc.waterLevelRate > thresholds.rateOfChange.fast) {
                rocScore = 14;
            } else if (roc.waterLevelRate > thresholds.rateOfChange.moderate) {
                rocScore = 8;
            } else if (roc.waterLevelRate > 0.5) {
                rocScore = 3;
            }

            score += rocScore;
            factors.push({
                name: 'Rising Rate',
                value: `${roc.waterLevelRate.toFixed(2)} cm/reading`,
                contribution: Math.round(rocScore),
                status: roc.waterLevelRate > thresholds.rateOfChange.fast ? 'critical' :
                        roc.waterLevelRate > thresholds.rateOfChange.moderate ? 'warning' : 'normal'
            });
        }

        // Clamp score
        score = Math.min(100, Math.max(0, Math.round(score)));

        // Determine risk level
        let level;
        if (score < 20) level = 'safe';
        else if (score < 45) level = 'low';
        else if (score < 65) level = 'moderate';
        else if (score < 80) level = 'high';
        else level = 'critical';

        return { score, level, factors };
    }

    // ── Rate of Change ──
    function calculateRateOfChange(readings) {
        if (readings.length < 2) return { waterLevelRate: 0, tempRate: 0 };

        const recent = readings.slice(-5);
        const deltas = [];
        const tempDeltas = [];

        for (let i = 1; i < recent.length; i++) {
            if (recent[i].waterLevel !== null && recent[i - 1].waterLevel !== null) {
                deltas.push(recent[i].waterLevel - recent[i - 1].waterLevel);
            }
            if (recent[i].temperature !== null && recent[i - 1].temperature !== null) {
                tempDeltas.push(recent[i].temperature - recent[i - 1].temperature);
            }
        }

        const avgDelta = deltas.length > 0 ? deltas.reduce((a, b) => a + b, 0) / deltas.length : 0;
        const avgTempDelta = tempDeltas.length > 0 ? tempDeltas.reduce((a, b) => a + b, 0) / tempDeltas.length : 0;

        return {
            waterLevelRate: avgDelta,
            tempRate: avgTempDelta
        };
    }

    // ── Trend Detection ──
    function detectTrend(readings, key = 'waterLevel', windowSize = 5) {
        if (readings.length < windowSize) return { direction: 'unknown', strength: 0, description: 'Insufficient data' };

        const recent = readings.slice(-windowSize);
        const values = recent.map(r => r[key]).filter(v => v !== null);

        if (values.length < 3) return { direction: 'unknown', strength: 0, description: 'Insufficient data' };

        // Simple linear regression
        const n = values.length;
        const xMean = (n - 1) / 2;
        const yMean = values.reduce((a, b) => a + b, 0) / n;

        let numerator = 0;
        let denominator = 0;
        for (let i = 0; i < n; i++) {
            numerator += (i - xMean) * (values[i] - yMean);
            denominator += (i - xMean) ** 2;
        }

        const slope = denominator !== 0 ? numerator / denominator : 0;
        const strength = Math.min(100, Math.abs(slope) * 10);

        let direction, description;
        if (slope > 1) {
            direction = 'rising';
            description = `Rising rapidly (+${slope.toFixed(1)}/reading)`;
        } else if (slope > 0.2) {
            direction = 'rising';
            description = `Rising gradually (+${slope.toFixed(1)}/reading)`;
        } else if (slope < -1) {
            direction = 'falling';
            description = `Falling rapidly (${slope.toFixed(1)}/reading)`;
        } else if (slope < -0.2) {
            direction = 'falling';
            description = `Falling gradually (${slope.toFixed(1)}/reading)`;
        } else {
            direction = 'stable';
            description = 'Stable — no significant change';
        }

        return { direction, strength, description, slope };
    }

    // ── Moving Average ──
    function movingAverage(readings, key = 'waterLevel', windowSize = 5) {
        const values = readings.map(r => r[key]).filter(v => v !== null);
        if (values.length < windowSize) return values;

        const result = [];
        for (let i = windowSize - 1; i < values.length; i++) {
            const window = values.slice(i - windowSize + 1, i + 1);
            result.push(window.reduce((a, b) => a + b, 0) / windowSize);
        }
        return result;
    }

    // ── Prediction (simple linear extrapolation) ──
    function predict(readings, key = 'waterLevel', steps = 6) {
        if (readings.length < 5) return [];

        const recent = readings.slice(-10);
        const values = recent.map(r => r[key]).filter(v => v !== null);
        if (values.length < 3) return [];

        // Linear regression for prediction
        const n = values.length;
        const xMean = (n - 1) / 2;
        const yMean = values.reduce((a, b) => a + b, 0) / n;

        let numerator = 0;
        let denominator = 0;
        for (let i = 0; i < n; i++) {
            numerator += (i - xMean) * (values[i] - yMean);
            denominator += (i - xMean) ** 2;
        }

        const slope = denominator !== 0 ? numerator / denominator : 0;
        const intercept = yMean - slope * xMean;

        const predictions = [];
        for (let i = 0; i < steps; i++) {
            const predictedValue = intercept + slope * (n + i);
            predictions.push({
                step: i + 1,
                value: Math.max(0, parseFloat(predictedValue.toFixed(1))),
                confidence: Math.max(0.3, 1 - (i * 0.1)) // Confidence decreases over time
            });
        }

        return predictions;
    }

    // ── Spike Detection ──
    function detectSpikes(readings, key = 'waterLevel', threshold = 0.2) {
        if (readings.length < 3) return [];

        const spikes = [];
        for (let i = 1; i < readings.length; i++) {
            const prev = readings[i - 1][key];
            const curr = readings[i][key];
            if (prev !== null && curr !== null && prev !== 0) {
                const change = Math.abs((curr - prev) / prev);
                if (change > threshold) {
                    spikes.push({
                        index: i,
                        timestamp: readings[i].timestamp,
                        previousValue: prev,
                        currentValue: curr,
                        changePercent: (change * 100).toFixed(1)
                    });
                }
            }
        }
        return spikes;
    }

    // ── Statistics ──
    function getStatistics(readings, key = 'waterLevel') {
        const values = readings.map(r => r[key]).filter(v => v !== null);
        if (values.length === 0) return { min: 0, max: 0, avg: 0, current: 0, stdDev: 0 };

        const min = Math.min(...values);
        const max = Math.max(...values);
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        const current = values[values.length - 1];

        const variance = values.reduce((sum, val) => sum + (val - avg) ** 2, 0) / values.length;
        const stdDev = Math.sqrt(variance);

        return {
            min: parseFloat(min.toFixed(1)),
            max: parseFloat(max.toFixed(1)),
            avg: parseFloat(avg.toFixed(1)),
            current: parseFloat(current.toFixed(1)),
            stdDev: parseFloat(stdDev.toFixed(1)),
            count: values.length
        };
    }

    // ── Generate Status Summary ──
    function generateSummary(readings) {
        if (!readings || readings.length === 0) {
            return { text: 'No data available', risk: { score: 0, level: 'unknown' } };
        }

        const risk = calculateFloodRisk(readings);
        const waterTrend = detectTrend(readings, 'waterLevel');
        const tempTrend = detectTrend(readings, 'temperature');
        const latest = readings[readings.length - 1];
        const waterStats = getStatistics(readings, 'waterLevel');
        const tempStats = getStatistics(readings, 'temperature');
        const predictions = predict(readings, 'waterLevel');
        const spikes = detectSpikes(readings);

        let summary = '';

        // Risk level text
        const riskDescriptions = {
            safe: '✅ Conditions are SAFE. No flooding risk detected.',
            low: '🟡 Low risk. Water levels are slightly elevated but within safe limits.',
            moderate: '🟠 MODERATE risk. Water levels are rising — monitor closely.',
            high: '🔴 HIGH risk! Water levels are approaching dangerous thresholds.',
            critical: '🚨 CRITICAL! Flood conditions detected. Take immediate action!'
        };

        summary = riskDescriptions[risk.level] || 'Status unknown.';

        return {
            text: summary,
            risk,
            waterTrend,
            tempTrend,
            latest,
            waterStats,
            tempStats,
            predictions,
            spikes
        };
    }

    // ── Threshold management ──
    function setThresholds(newThresholds) {
        if (newThresholds.warning !== undefined) thresholds.waterLevel.low = newThresholds.warning;
        if (newThresholds.danger !== undefined) thresholds.waterLevel.moderate = newThresholds.danger;
        if (newThresholds.critical !== undefined) thresholds.waterLevel.high = newThresholds.critical;
        if (newThresholds.temp !== undefined) thresholds.temperature.hot = newThresholds.temp;
    }

    function getThresholds() {
        return { ...thresholds };
    }

    return {
        calculateFloodRisk,
        calculateRateOfChange,
        detectTrend,
        movingAverage,
        predict,
        detectSpikes,
        getStatistics,
        generateSummary,
        setThresholds,
        getThresholds
    };
})();
