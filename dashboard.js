/* ═══════════════════════════════════════════════════════
   FloodGuard AI — Dashboard & Charts
   Chart.js visualizations for sensor data
   ═══════════════════════════════════════════════════════ */

const Dashboard = (() => {
    let waterLevelChart = null;
    let temperatureChart = null;
    let combinedChart = null;
    let currentRange = 20;

    // ── Chart.js Global Config ──
    const chartDefaults = {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
            duration: 800,
            easing: 'easeOutQuart'
        },
        plugins: {
            legend: {
                display: false,
                labels: {
                    color: '#90a4ae',
                    font: { family: "'Inter', sans-serif", size: 11 }
                }
            },
            tooltip: {
                backgroundColor: 'rgba(255, 255, 255, 0.96)',
                titleColor: '#1a2332',
                bodyColor: '#4a5568',
                borderColor: '#e2e8f0',
                borderWidth: 1,
                cornerRadius: 8,
                padding: 12,
                titleFont: { family: "'Inter', sans-serif", weight: 600, size: 13 },
                bodyFont: { family: "'JetBrains Mono', monospace", size: 12 },
                displayColors: false
            }
        },
        scales: {
            x: {
                ticks: {
                    color: '#64748b',
                    font: { family: "'JetBrains Mono', monospace", size: 10 },
                    maxRotation: 45,
                    maxTicksLimit: 12
                },
                grid: {
                    color: 'rgba(0,0,0,0.05)',
                    drawBorder: false
                }
            },
            y: {
                ticks: {
                    color: '#64748b',
                    font: { family: "'JetBrains Mono', monospace", size: 10 }
                },
                grid: {
                    color: 'rgba(0,0,0,0.05)',
                    drawBorder: false
                }
            }
        }
    };

    // ── Create Labels from Readings ──
    function getLabels(readings) {
        return readings.map((r, i) => {
            try {
                const date = new Date(r.timestamp);
                if (!isNaN(date.getTime())) {
                    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                }
            } catch (e) { }
            return `#${i + 1}`;
        });
    }

    // ── Initialize Charts ──
    function initCharts() {
        const waterCtx = document.getElementById('waterLevelChart').getContext('2d');
        const tempCtx = document.getElementById('temperatureChart').getContext('2d');
        const combinedCtx = document.getElementById('combinedChart').getContext('2d');

        // Water Level Chart
        const waterGradient = waterCtx.createLinearGradient(0, 0, 0, 250);
        waterGradient.addColorStop(0, 'rgba(0, 119, 182, 0.25)');
        waterGradient.addColorStop(1, 'rgba(0, 180, 216, 0.02)');

        waterLevelChart = new Chart(waterCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Water Level (cm)',
                    data: [],
                    borderColor: '#0077b6',
                    backgroundColor: waterGradient,
                    borderWidth: 2.5,
                    fill: true,
                    tension: 0.35,
                    pointRadius: 2,
                    pointHoverRadius: 6,
                    pointBackgroundColor: '#0077b6',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2
                }]
            },
            options: {
                ...chartDefaults,
                plugins: {
                    ...chartDefaults.plugins,
                    tooltip: {
                        ...chartDefaults.plugins.tooltip,
                        callbacks: {
                            label: (ctx) => `Water Level: ${ctx.parsed.y.toFixed(1)} cm`
                        }
                    }
                },
                scales: {
                    ...chartDefaults.scales,
                    y: {
                        ...chartDefaults.scales.y,
                        title: {
                            display: true,
                            text: 'Water Level (cm)',
                            color: '#546e7a',
                            font: { family: "'Inter', sans-serif", size: 11 }
                        }
                    }
                }
            }
        });

        // Temperature Chart
        const tempGradient = tempCtx.createLinearGradient(0, 0, 0, 250);
        tempGradient.addColorStop(0, 'rgba(249, 115, 22, 0.2)');
        tempGradient.addColorStop(1, 'rgba(249, 115, 22, 0.02)');

        temperatureChart = new Chart(tempCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Temperature (°C)',
                    data: [],
                    borderColor: '#f97316',
                    backgroundColor: tempGradient,
                    borderWidth: 2.5,
                    fill: true,
                    tension: 0.35,
                    pointRadius: 2,
                    pointHoverRadius: 6,
                    pointBackgroundColor: '#f97316',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2
                }]
            },
            options: {
                ...chartDefaults,
                plugins: {
                    ...chartDefaults.plugins,
                    tooltip: {
                        ...chartDefaults.plugins.tooltip,
                        callbacks: {
                            label: (ctx) => `Temperature: ${ctx.parsed.y.toFixed(1)} °C`
                        }
                    }
                },
                scales: {
                    ...chartDefaults.scales,
                    y: {
                        ...chartDefaults.scales.y,
                        title: {
                            display: true,
                            text: 'Temperature (°C)',
                            color: '#546e7a',
                            font: { family: "'Inter', sans-serif", size: 11 }
                        }
                    }
                }
            }
        });

        // Combined Chart
        combinedChart = new Chart(combinedCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Water Level (cm)',
                        data: [],
                        borderColor: '#0077b6',
                        backgroundColor: 'rgba(0,119,182,0.08)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.35,
                        pointRadius: 1,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Temperature (°C)',
                        data: [],
                        borderColor: '#f97316',
                        backgroundColor: 'rgba(249,115,22,0.05)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.35,
                        pointRadius: 1,
                        yAxisID: 'y1'
                    },
                    {
                        label: 'Risk Score',
                        data: [],
                        borderColor: '#ff5252',
                        borderDash: [5, 5],
                        borderWidth: 1.5,
                        fill: false,
                        tension: 0.3,
                        pointRadius: 0,
                        yAxisID: 'y2'
                    }
                ]
            },
            options: {
                ...chartDefaults,
                plugins: {
                    ...chartDefaults.plugins,
                    legend: {
                        display: true,
                        position: 'top',
                        align: 'end',
                        labels: {
                            color: '#4a5568',
                            font: { family: "'Inter', sans-serif", size: 11 },
                            boxWidth: 12,
                            boxHeight: 2,
                            padding: 16,
                            usePointStyle: false
                        }
                    }
                },
                scales: {
                    x: chartDefaults.scales.x,
                    y: {
                        type: 'linear',
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Water Level (cm)',
                            color: '#0077b6',
                            font: { family: "'Inter', sans-serif", size: 11 }
                        },
                        ticks: { color: '#0077b6', font: { size: 10 } },
                        grid: { color: 'rgba(0,119,182,0.08)', drawBorder: false }
                    },
                    y1: {
                        type: 'linear',
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Temp (°C)',
                            color: '#f97316',
                            font: { family: "'Inter', sans-serif", size: 11 }
                        },
                        ticks: { color: '#f97316', font: { size: 10 } },
                        grid: { display: false }
                    },
                    y2: {
                        type: 'linear',
                        position: 'right',
                        min: 0,
                        max: 100,
                        display: false,
                        grid: { display: false }
                    }
                }
            }
        });

        // Range buttons
        document.querySelectorAll('.chart-range-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.chart-range-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                const range = e.target.dataset.range;
                currentRange = range === 'all' ? 999 : parseInt(range);
                updateCharts(DataManager.getReadings());
            });
        });
    }

    // ── Update Charts with Data ──
    function updateCharts(allReadings) {
        if (!waterLevelChart || !allReadings || allReadings.length === 0) return;

        const readings = currentRange >= allReadings.length
            ? allReadings
            : allReadings.slice(-currentRange);

        const labels = getLabels(readings);
        const waterData = readings.map(r => r.waterLevel);
        const tempData = readings.map(r => r.temperature);

        // Calculate running risk scores
        const riskData = readings.map((_, i) => {
            const subset = readings.slice(0, i + 1);
            return AIEngine.calculateFloodRisk(subset).score;
        });

        // Water Level Chart
        waterLevelChart.data.labels = labels;
        waterLevelChart.data.datasets[0].data = waterData;
        waterLevelChart.update('none');

        // Temperature Chart
        temperatureChart.data.labels = labels;
        temperatureChart.data.datasets[0].data = tempData;
        temperatureChart.update('none');

        // Combined Chart
        combinedChart.data.labels = labels;
        combinedChart.data.datasets[0].data = waterData;
        combinedChart.data.datasets[1].data = tempData;
        combinedChart.data.datasets[2].data = riskData;
        combinedChart.update('none');
    }

    // ── Update Stats Cards ──
    function updateStats(readings) {
        if (!readings || readings.length === 0) return;

        const latest = readings[readings.length - 1];
        const waterTrend = AIEngine.detectTrend(readings, 'waterLevel');
        const tempTrend = AIEngine.detectTrend(readings, 'temperature');

        // Water Level
        const waterVal = document.getElementById('waterLevelValue');
        const waterTrendEl = document.getElementById('waterLevelTrend');
        if (latest.waterLevel !== null) {
            waterVal.textContent = `${latest.waterLevel.toFixed(1)} cm`;
            waterTrendEl.textContent = waterTrend.description;
            waterTrendEl.className = `stat-trend ${waterTrend.direction === 'rising' ? 'up' : waterTrend.direction === 'falling' ? 'down' : 'stable'}`;
        }

        // Temperature
        const tempVal = document.getElementById('temperatureValue');
        const tempTrendEl = document.getElementById('temperatureTrend');
        if (latest.temperature !== null) {
            tempVal.textContent = `${latest.temperature.toFixed(1)} °C`;
            tempTrendEl.textContent = tempTrend.description;
            tempTrendEl.className = `stat-trend ${tempTrend.direction === 'rising' ? 'up' : tempTrend.direction === 'falling' ? 'down' : 'stable'}`;
        }

        // Distance
        const distVal = document.getElementById('distanceValue');
        const distTrendEl = document.getElementById('distanceTrend');
        if (latest.distance !== null) {
            distVal.textContent = `${latest.distance.toFixed(1)} cm`;
            distTrendEl.textContent = 'Raw ultrasonic reading';
            distTrendEl.className = 'stat-trend stable';
        }

        // Total Readings
        document.getElementById('totalReadings').textContent = readings.length;
        document.getElementById('readingRate').textContent = `${DataManager.getStatus().usingFallback ? 'Simulated data' : 'Live from ESP32'}`;
        document.getElementById('readingRate').className = 'stat-trend stable';
    }

    // ── Update Risk Banner ──
    function updateRiskBanner(readings) {
        const risk = AIEngine.calculateFloodRisk(readings);
        const banner = document.getElementById('riskBanner');
        const riskIcon = document.getElementById('riskIcon');
        const riskTitle = document.getElementById('riskTitle');
        const riskSubtitle = document.getElementById('riskSubtitle');
        const riskScoreValue = document.getElementById('riskScoreValue');
        const riskProgress = document.getElementById('riskProgress');

        // Update score
        riskScoreValue.textContent = risk.score;

        // Update progress ring
        const circumference = 2 * Math.PI * 52; // r=52
        const offset = circumference - (risk.score / 100) * circumference;
        riskProgress.style.strokeDashoffset = offset;

        // Color based on risk level
        const colors = {
            safe: '#10b981',
            low: '#34d399',
            moderate: '#f59e0b',
            high: '#f97316',
            critical: '#ef4444',
            unknown: '#94a3b8'
        };

        const color = colors[risk.level] || colors.unknown;
        riskProgress.style.stroke = color;
        riskScoreValue.style.color = color;

        // Banner styling
        banner.className = `risk-banner ${risk.level === 'safe' || risk.level === 'low' ? 'safe' :
            risk.level === 'moderate' ? 'warning' :
                risk.level === 'high' ? 'danger' : risk.level === 'critical' ? 'critical' : ''}`;

        // Icons and text
        const icons = { safe: '🟢', low: '🟡', moderate: '🟠', high: '🔴', critical: '🚨', unknown: '⚪' };
        const titles = {
            safe: 'All Clear — No Flood Risk',
            low: 'Low Risk — Conditions Normal',
            moderate: 'Moderate Risk — Monitor Closely',
            high: 'High Risk — Prepare for Action',
            critical: 'CRITICAL — Flood Conditions Detected!',
            unknown: 'Analyzing...'
        };
        const subtitles = {
            safe: 'Water levels and temperature within safe parameters',
            low: 'Slightly elevated readings but within safe range',
            moderate: 'Water levels rising — increased vigilance recommended',
            high: 'Water levels approaching dangerous thresholds',
            critical: 'Immediate action required — consider evacuation',
            unknown: 'Gathering sensor data'
        };

        riskIcon.textContent = icons[risk.level] || icons.unknown;
        riskTitle.textContent = titles[risk.level] || titles.unknown;
        riskSubtitle.textContent = subtitles[risk.level] || subtitles.unknown;
    }

    // ── Update Connection Status ──
    function updateConnectionStatus(connected, usingFallback) {
        const statusEl = document.getElementById('connectionStatus');
        const dot = statusEl.querySelector('.status-dot');
        const text = statusEl.querySelector('.status-text');

        if (connected) {
            dot.className = 'status-dot connected';
            text.textContent = 'Live Data';
        } else if (usingFallback) {
            dot.className = 'status-dot';
            text.textContent = 'Simulated Data';
        } else {
            dot.className = 'status-dot error';
            text.textContent = 'Disconnected';
        }
    }

    function updateLastUpdateTime() {
        document.getElementById('lastUpdate').querySelector('span').textContent =
            `Last update: ${new Date().toLocaleTimeString()}`;
    }

    // ── Full Dashboard Update ──
    function update(readings) {
        updateCharts(readings);
        updateStats(readings);
        updateRiskBanner(readings);
        updateLastUpdateTime();

        const status = DataManager.getStatus();
        updateConnectionStatus(status.connected, status.usingFallback);
    }

    function init() {
        initCharts();
    }

    return { init, update, updateCharts, updateStats, updateRiskBanner };
})();
