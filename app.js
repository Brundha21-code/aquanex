/* ═══════════════════════════════════════════════════════
   AQUANEX AI — Main Application Controller
   Initializes all modules and coordinates the refresh cycle
   ═══════════════════════════════════════════════════════ */

const App = (() => {
    let isInitialized = false;

    // ── Tab Navigation ──
    function initTabs() {
        const tabNav = document.getElementById('tabNav');
        const panels = document.querySelectorAll('.tab-panel');
        const buttons = document.querySelectorAll('.tab-btn');

        tabNav.addEventListener('click', (e) => {
            const btn = e.target.closest('.tab-btn');
            if (!btn) return;

            const tabId = btn.dataset.tab;

            // Deactivate all
            buttons.forEach(b => b.classList.remove('active'));
            panels.forEach(p => p.classList.remove('active'));

            // Activate clicked tab
            btn.classList.add('active');
            const panel = document.getElementById(`panel${capitalize(tabId)}`);
            if (panel) panel.classList.add('active');
        });
    }

    function capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    // ── Data Refresh Handler ──
    function onDataEvent(event, data) {
        if (event === 'data-updated') {
            const readings = DataManager.getReadings();

            // Update dashboard
            Dashboard.update(readings);

            // Evaluate alerts
            AlertSystem.evaluate(readings);

            console.log(`[AQUANEX] Data updated — ${readings.length} readings (${data.source})`);
        }

        if (event === 'connection-change') {
            const status = DataManager.getStatus();
            console.log(`[AQUANEX] Connection: ${status.connected ? 'Live' : 'Disconnected'}`);
        }
    }

    // ── Initialize Everything ──
    async function init() {
        if (isInitialized) return;
        isInitialized = true;

        console.log('%c🌊 AQUANEX AI — Starting...', 'color: #448aff; font-size: 14px; font-weight: bold;');

        try {
            // 1. Init Dashboard (creates charts)
            Dashboard.init();
            console.log('[AQUANEX] Dashboard initialized');

            // 2. Init Alert System
            AlertSystem.init();
            console.log('[AQUANEX] Alert system initialized');

            // 3. Init Chatbot
            Chatbot.init();
            console.log('[AQUANEX] Chatbot initialized');

            // 4. Init Tab Navigation
            initTabs();
            console.log('[AQUANEX] Navigation initialized');

            // 5. Subscribe to data events
            DataManager.subscribe(onDataEvent);

            // 6. Start data fetching
            DataManager.startAutoRefresh();
            console.log('[AQUANEX] Data auto-refresh started (30s interval)');

            console.log('%c🌊 AQUANEX AI — Ready!', 'color: #00e676; font-size: 14px; font-weight: bold;');

        } catch (error) {
            console.error('[AQUANEX] Initialization error:', error);

            // Show error toast
            const toastContainer = document.getElementById('toastContainer');
            if (toastContainer) {
                const toast = document.createElement('div');
                toast.className = 'toast danger';
                toast.innerHTML = `
                    <span class="toast-icon">❌</span>
                    <div class="toast-body">
                        <div class="toast-title">Initialization Error</div>
                        <div class="toast-message">${error.message}</div>
                    </div>
                `;
                toastContainer.appendChild(toast);
            }
        }
    }

    // ── Start when DOM is ready ──
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    return { init };
})();
