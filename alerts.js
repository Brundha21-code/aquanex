/* ═══════════════════════════════════════════════════════
   FloodGuard AI — Alert System
   Threshold-based alerts with toasts & history
   ═══════════════════════════════════════════════════════ */

const AlertSystem = (() => {
    const toastContainer = document.getElementById('toastContainer');
    const activeAlertList = document.getElementById('activeAlertList');
    const alertHistoryList = document.getElementById('alertHistoryList');
    const alertBadge = document.getElementById('alertBadge');
    const clearBtn = document.getElementById('clearAlerts');
    const saveBtn = document.getElementById('saveThresholds');
    const soundToggle = document.getElementById('alertSoundToggle');

    let activeAlerts = [];
    let alertHistory = [];
    let soundEnabled = true;
    let lastAlertState = {};
    let audioCtx = null;

    // ── Thresholds (synced with inputs) ──
    function getThresholdValues() {
        return {
            warning: parseFloat(document.getElementById('thresholdWarning').value) || 30,
            danger: parseFloat(document.getElementById('thresholdDanger').value) || 60,
            critical: parseFloat(document.getElementById('thresholdCritical').value) || 90,
            temp: parseFloat(document.getElementById('thresholdTemp').value) || 40
        };
    }

    // ── Check Data Against Thresholds ──
    function evaluate(readings) {
        if (!readings || readings.length === 0) return;

        const latest = readings[readings.length - 1];
        const thresholds = getThresholdValues();
        const newAlerts = [];

        // Water Level Checks
        if (latest.waterLevel !== null) {
            if (latest.waterLevel >= thresholds.critical) {
                addAlertIfNew('water-critical', {
                    severity: 'critical',
                    title: '🚨 CRITICAL Water Level',
                    message: `Water level at ${latest.waterLevel.toFixed(1)} cm — exceeds critical threshold (${thresholds.critical} cm)!`,
                    icon: '🚨'
                });
            } else if (latest.waterLevel >= thresholds.danger) {
                addAlertIfNew('water-danger', {
                    severity: 'danger',
                    title: '⚠️ Dangerous Water Level',
                    message: `Water level at ${latest.waterLevel.toFixed(1)} cm — exceeds danger threshold (${thresholds.danger} cm).`,
                    icon: '⚠️'
                });
            } else if (latest.waterLevel >= thresholds.warning) {
                addAlertIfNew('water-warning', {
                    severity: 'warning',
                    title: '🟡 Elevated Water Level',
                    message: `Water level at ${latest.waterLevel.toFixed(1)} cm — above warning threshold (${thresholds.warning} cm).`,
                    icon: '🟡'
                });
            } else {
                // Clear water alerts if level drops below warning
                clearAlertByKey('water-critical');
                clearAlertByKey('water-danger');
                clearAlertByKey('water-warning');
            }
        }

        // Temperature Check
        if (latest.temperature !== null && latest.temperature >= thresholds.temp) {
            addAlertIfNew('temp-high', {
                severity: 'warning',
                title: '🌡️ High Temperature',
                message: `Temperature at ${latest.temperature.toFixed(1)} °C — exceeds threshold (${thresholds.temp} °C).`,
                icon: '🌡️'
            });
        } else {
            clearAlertByKey('temp-high');
        }

        // Rapid Rise Detection
        if (readings.length >= 3) {
            const roc = AIEngine.calculateRateOfChange(readings);
            if (roc.waterLevelRate > 5) {
                addAlertIfNew('rapid-rise', {
                    severity: 'danger',
                    title: '📈 Rapid Water Rise',
                    message: `Water level rising at ${roc.waterLevelRate.toFixed(1)} cm/reading — unusually fast!`,
                    icon: '📈'
                });
            } else if (roc.waterLevelRate <= 1) {
                clearAlertByKey('rapid-rise');
            }
        }

        updateUI();
    }

    // ── Alert Management ──
    function addAlertIfNew(key, alertData) {
        // Don't re-add if this alert is already active
        if (lastAlertState[key]) return;

        lastAlertState[key] = true;

        const alert = {
            ...alertData,
            key,
            id: Date.now() + '_' + key,
            time: new Date().toLocaleString(),
            timestamp: Date.now()
        };

        activeAlerts.push(alert);
        alertHistory.push(alert);

        // Keep history manageable
        if (alertHistory.length > 50) alertHistory = alertHistory.slice(-50);

        // Show toast
        showToast(alert);

        // Play sound
        if (soundEnabled) playAlertSound(alert.severity);

        // Try browser notification
        tryBrowserNotification(alert);
    }

    function clearAlertByKey(key) {
        if (!lastAlertState[key]) return;
        lastAlertState[key] = false;
        activeAlerts = activeAlerts.filter(a => a.key !== key);
        updateUI();
    }

    function clearAll() {
        activeAlerts = [];
        lastAlertState = {};
        updateUI();
    }

    // ── Toast Notifications ──
    function showToast(alert) {
        const toast = document.createElement('div');
        toast.className = `toast ${alert.severity}`;
        toast.innerHTML = `
            <span class="toast-icon">${alert.icon}</span>
            <div class="toast-body">
                <div class="toast-title">${alert.title}</div>
                <div class="toast-message">${alert.message}</div>
            </div>
            <button class="toast-close" onclick="this.parentElement.classList.add('hiding'); setTimeout(() => this.parentElement.remove(), 300)">&times;</button>
        `;

        toastContainer.appendChild(toast);

        // Auto-remove after 8 seconds
        setTimeout(() => {
            if (toast.parentElement) {
                toast.classList.add('hiding');
                setTimeout(() => toast.remove(), 300);
            }
        }, 8000);
    }

    // ── Sound ──
    function playAlertSound(severity) {
        try {
            if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();

            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);

            // Different tones for different severities
            if (severity === 'critical') {
                oscillator.frequency.value = 880;
                oscillator.type = 'sawtooth';
                gainNode.gain.value = 0.15;
            } else if (severity === 'danger') {
                oscillator.frequency.value = 660;
                oscillator.type = 'square';
                gainNode.gain.value = 0.1;
            } else {
                oscillator.frequency.value = 440;
                oscillator.type = 'sine';
                gainNode.gain.value = 0.08;
            }

            oscillator.start();
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
            oscillator.stop(audioCtx.currentTime + 0.5);
        } catch (e) {
            // Audio not available
        }
    }

    // ── Browser Notifications ──
    function tryBrowserNotification(alert) {
        if (!('Notification' in window)) return;

        if (Notification.permission === 'granted') {
            new Notification(alert.title, {
                body: alert.message,
                icon: '🌊',
                tag: alert.key
            });
        } else if (Notification.permission !== 'denied') {
            Notification.requestPermission();
        }
    }

    // ── UI Update ──
    function updateUI() {
        // Active alerts list
        if (activeAlerts.length === 0) {
            activeAlertList.innerHTML = `
                <div class="empty-state">
                    <span>✅</span>
                    <p>No active alerts</p>
                </div>
            `;
        } else {
            activeAlertList.innerHTML = activeAlerts.map(alert => `
                <div class="alert-item ${alert.severity}">
                    <span class="alert-severity-icon">${alert.icon}</span>
                    <div class="alert-content">
                        <div class="alert-message">${alert.title}</div>
                        <div class="alert-time">${alert.time}</div>
                    </div>
                    <button class="alert-dismiss" onclick="AlertSystem.dismissAlert('${alert.key}')">&times;</button>
                </div>
            `).join('');
        }

        // History list
        if (alertHistory.length === 0) {
            alertHistoryList.innerHTML = `
                <div class="empty-state">
                    <span>📭</span>
                    <p>No alerts recorded yet</p>
                </div>
            `;
        } else {
            alertHistoryList.innerHTML = alertHistory.slice().reverse().slice(0, 20).map(alert => `
                <div class="alert-item ${alert.severity}">
                    <span class="alert-severity-icon">${alert.icon}</span>
                    <div class="alert-content">
                        <div class="alert-message">${alert.message}</div>
                        <div class="alert-time">${alert.time}</div>
                    </div>
                </div>
            `).join('');
        }

        // Badge
        if (activeAlerts.length > 0) {
            alertBadge.textContent = activeAlerts.length;
            alertBadge.style.display = 'inline-block';
        } else {
            alertBadge.style.display = 'none';
        }
    }

    function dismissAlert(key) {
        clearAlertByKey(key);
    }

    // ── Init ──
    function init() {
        soundToggle.addEventListener('change', () => {
            soundEnabled = soundToggle.checked;
        });

        clearBtn.addEventListener('click', () => {
            clearAll();
            showToast({
                severity: 'info',
                icon: 'ℹ️',
                title: 'Alerts Cleared',
                message: 'All active alerts have been dismissed.'
            });
        });

        saveBtn.addEventListener('click', () => {
            const vals = getThresholdValues();
            AIEngine.setThresholds(vals);
            showToast({
                severity: 'success',
                icon: '✅',
                title: 'Thresholds Updated',
                message: `Warning: ${vals.warning}cm | Danger: ${vals.danger}cm | Critical: ${vals.critical}cm`
            });
        });

        // Request notification permission
        if ('Notification' in window && Notification.permission === 'default') {
            // Will request on first alert
        }

        updateUI();
    }

    function getHistory() {
        return [...alertHistory];
    }

    return {
        init,
        evaluate,
        clearAll,
        dismissAlert,
        getHistory,
        getThresholdValues
    };
})();
