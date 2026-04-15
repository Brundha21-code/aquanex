/* ═══════════════════════════════════════════════════════
   AQUANEX — Chatbot
   Natural language interface for querying flood data
   ═══════════════════════════════════════════════════════ */

const Chatbot = (() => {
    const messagesEl = document.getElementById('chatMessages');
    const inputEl = document.getElementById('chatInput');
    const sendBtn = document.getElementById('chatSendBtn');
    const suggestionsEl = document.getElementById('chatSuggestions');

    let messageHistory = [];

    // ── Intent Recognition ──
    const intents = [
        {
            name: 'greeting',
            patterns: ['hi', 'hello', 'hey', 'good morning', 'good evening', 'howdy', 'hii', 'hola'],
            handler: handleGreeting
        },
        {
            name: 'risk',
            patterns: ['risk', 'flood risk', 'danger', 'dangerous', 'safe', 'safety', 'threat', 'chance of flood', 'flooding'],
            handler: handleRisk
        },
        {
            name: 'water_level',
            patterns: ['water level', 'water', 'level', 'depth', 'height', 'how high', 'how deep'],
            handler: handleWaterLevel
        },
        {
            name: 'temperature',
            patterns: ['temperature', 'temp', 'how hot', 'how cold', 'weather', 'heat'],
            handler: handleTemperature
        },
        {
            name: 'trend',
            patterns: ['trend', 'trending', 'direction', 'going up', 'going down', 'rising', 'falling', 'increasing', 'decreasing', 'pattern'],
            handler: handleTrend
        },
        {
            name: 'prediction',
            patterns: ['predict', 'prediction', 'forecast', 'next hour', 'future', 'expect', 'will it flood', 'what will happen', 'next'],
            handler: handlePrediction
        },
        {
            name: 'status',
            patterns: ['status', 'current', 'now', 'overview', 'summary', 'report', 'situation', 'update'],
            handler: handleStatus
        },
        {
            name: 'statistics',
            patterns: ['stats', 'statistics', 'average', 'minimum', 'maximum', 'min', 'max', 'avg', 'mean', 'peak'],
            handler: handleStatistics
        },
        {
            name: 'advice',
            patterns: ['what should i do', 'advice', 'recommend', 'suggestion', 'help me', 'action', 'precaution', 'prepare', 'evacuat'],
            handler: handleAdvice
        },
        {
            name: 'alert_history',
            patterns: ['alert', 'alerts', 'warning', 'warnings', 'notification', 'last alert', 'recent alert'],
            handler: handleAlertHistory
        },
        {
            name: 'sensor',
            patterns: ['sensor', 'esp32', 'device', 'hardware', 'ultrasonic', 'dht', 'connected', 'connection'],
            handler: handleSensor
        },
        {
            name: 'help',
            patterns: ['help', 'what can you do', 'commands', 'features', 'capabilities', 'how to use'],
            handler: handleHelp
        }
    ];

    // ── Intent Matching ──
    function matchIntent(message) {
        const lower = message.toLowerCase().trim();

        // Try exact and partial matching
        let bestMatch = null;
        let bestScore = 0;

        for (const intent of intents) {
            for (const pattern of intent.patterns) {
                if (lower.includes(pattern)) {
                    const score = pattern.length / lower.length + (lower === pattern ? 0.5 : 0);
                    if (score > bestScore) {
                        bestScore = score;
                        bestMatch = intent;
                    }
                }
            }
        }

        return bestMatch || { name: 'unknown', handler: handleUnknown };
    }

    // ── Intent Handlers ──
    function handleGreeting() {
        const greetings = [
            "Hello! 👋 I'm AQUANEX. I monitor water levels and temperature to keep you safe from flooding. Ask me anything about the current conditions!",
            "Hey there! 🌊 I'm your flood monitoring assistant. I can tell you about water levels, temperature, risk assessments, and predictions. What would you like to know?",
            "Hi! 🛡️ Welcome to AQUANEX. I'm analyzing sensor data in real-time to protect you from flood risks. How can I help?"
        ];
        return greetings[Math.floor(Math.random() * greetings.length)];
    }

    function handleRisk() {
        const readings = DataManager.getReadings();
        const summary = AIEngine.generateSummary(readings);

        if (summary.risk.score === 0) return "I don't have enough data to assess flood risk yet. Please wait for sensor data to come in.";

        let response = `**Current Flood Risk: ${summary.risk.score}/100** (${summary.risk.level.toUpperCase()})\n\n`;
        response += `${summary.text}\n\n`;

        if (summary.risk.factors.length > 0) {
            response += '**Contributing Factors:**\n';
            summary.risk.factors.forEach(f => {
                const icon = f.status === 'critical' ? '🔴' : f.status === 'warning' ? '🟡' : '🟢';
                response += `${icon} ${f.name}: ${f.value} (+${f.contribution} pts)\n`;
            });
        }

        return response;
    }

    function handleWaterLevel() {
        const readings = DataManager.getReadings();
        if (readings.length === 0) return "No water level data available yet. Waiting for sensor readings...";

        const stats = AIEngine.getStatistics(readings, 'waterLevel');
        const trend = AIEngine.detectTrend(readings, 'waterLevel');
        const latest = DataManager.getLatest();

        const trendIcon = trend.direction === 'rising' ? '📈' : trend.direction === 'falling' ? '📉' : '➡️';

        let response = `**Water Level: ${stats.current} cm** ${trendIcon}\n\n`;
        response += `• Trend: ${trend.description}\n`;
        response += `• Average: ${stats.avg} cm\n`;
        response += `• Range: ${stats.min} – ${stats.max} cm\n`;
        response += `• Sensor distance: ${latest.distance !== null ? latest.distance.toFixed(1) + ' cm' : 'N/A'}\n\n`;

        if (stats.current > 90) {
            response += '⚠️ **WARNING**: Water level is very high! Monitor closely.';
        } else if (stats.current > 60) {
            response += '🟡 Water level is elevated but manageable.';
        } else {
            response += '✅ Water level is within normal range.';
        }

        return response;
    }

    function handleTemperature() {
        const readings = DataManager.getReadings();
        if (readings.length === 0) return "No temperature data available yet.";

        const stats = AIEngine.getStatistics(readings, 'temperature');
        const trend = AIEngine.detectTrend(readings, 'temperature');

        let response = `**Temperature: ${stats.current} °C** 🌡️\n\n`;
        response += `• Trend: ${trend.description}\n`;
        response += `• Average: ${stats.avg} °C\n`;
        response += `• Range: ${stats.min} – ${stats.max} °C\n\n`;

        if (stats.current > 40) response += '🔥 Temperature is very high — potential for severe weather.';
        else if (stats.current > 35) response += '☀️ Temperature is warm but normal.';
        else if (stats.current < 10) response += '❄️ Cold conditions — watch for ice-related issues.';
        else response += '✅ Temperature is in a comfortable range.';

        return response;
    }

    function handleTrend() {
        const readings = DataManager.getReadings();
        if (readings.length < 5) return "I need at least 5 readings to detect trends. Please wait for more data.";

        const waterTrend = AIEngine.detectTrend(readings, 'waterLevel');
        const tempTrend = AIEngine.detectTrend(readings, 'temperature');

        let response = `**Trend Analysis** 📊\n\n`;
        response += `**Water Level:**\n`;
        response += `• ${waterTrend.description}\n`;
        response += `• Strength: ${waterTrend.strength.toFixed(0)}%\n\n`;
        response += `**Temperature:**\n`;
        response += `• ${tempTrend.description}\n`;
        response += `• Strength: ${tempTrend.strength.toFixed(0)}%\n\n`;

        if (waterTrend.direction === 'rising' && waterTrend.strength > 50) {
            response += '⚠️ Water levels are rising significantly — stay alert!';
        } else if (waterTrend.direction === 'falling') {
            response += '👍 Water levels are decreasing — conditions improving.';
        } else {
            response += '✅ Conditions appear stable.';
        }

        return response;
    }

    function handlePrediction() {
        const readings = DataManager.getReadings();
        if (readings.length < 5) return "Not enough data for predictions yet. Need at least 5 readings.";

        const predictions = AIEngine.predict(readings, 'waterLevel', 6);
        const currentLevel = DataManager.getLatest().waterLevel;

        let response = `**Water Level Prediction** 🔮\n\n`;
        response += `Current: ${currentLevel !== null ? currentLevel.toFixed(1) : '--'} cm\n\n`;
        response += `**Next 6 readings forecast:**\n`;

        predictions.forEach((p, i) => {
            const change = currentLevel !== null ? (p.value - currentLevel).toFixed(1) : '--';
            const arrow = change > 0 ? '↑' : change < 0 ? '↓' : '→';
            const conf = (p.confidence * 100).toFixed(0);
            response += `• Step ${p.step}: **${p.value} cm** (${arrow}${change} cm) — ${conf}% confidence\n`;
        });

        response += '\n';
        if (predictions.length > 0 && predictions[predictions.length - 1].value > 90) {
            response += '⚠️ **Predicted to reach dangerous levels!** Take precautions.';
        } else if (predictions.length > 0 && predictions[predictions.length - 1].value > 60) {
            response += '🟡 Predicted to reach elevated levels. Keep monitoring.';
        } else {
            response += '✅ Predictions show levels staying within safe range.';
        }

        return response;
    }

    function handleStatus() {
        const readings = DataManager.getReadings();
        const status = DataManager.getStatus();
        const summary = AIEngine.generateSummary(readings);

        let response = `**System Status Report** 📋\n\n`;
        response += `• Connection: ${status.connected ? '🟢 Connected (Live Data)' : '🟡 Using cached/simulated data'}\n`;
        response += `• Total Readings: ${status.totalReadings}\n`;
        response += `• Data Source: ${status.usingFallback ? 'Fallback/Simulated' : 'Google Sheets (Live)'}\n\n`;

        if (summary.latest) {
            response += `**Latest Reading:**\n`;
            response += `• Water Level: ${summary.latest.waterLevel !== null ? summary.latest.waterLevel.toFixed(1) + ' cm' : 'N/A'}\n`;
            response += `• Temperature: ${summary.latest.temperature !== null ? summary.latest.temperature.toFixed(1) + ' °C' : 'N/A'}\n`;
            response += `• Distance: ${summary.latest.distance !== null ? summary.latest.distance.toFixed(1) + ' cm' : 'N/A'}\n`;
            response += `• Time: ${summary.latest.timestamp}\n\n`;
        }

        response += summary.text;

        return response;
    }

    function handleStatistics() {
        const readings = DataManager.getReadings();
        if (readings.length === 0) return "No data available for statistics.";

        const waterStats = AIEngine.getStatistics(readings, 'waterLevel');
        const tempStats = AIEngine.getStatistics(readings, 'temperature');

        let response = `**Sensor Statistics** 📊\n\n`;
        response += `**Water Level (${waterStats.count} readings):**\n`;
        response += `• Current: ${waterStats.current} cm\n`;
        response += `• Average: ${waterStats.avg} cm\n`;
        response += `• Minimum: ${waterStats.min} cm\n`;
        response += `• Maximum: ${waterStats.max} cm\n`;
        response += `• Std Dev: ${waterStats.stdDev} cm\n\n`;
        response += `**Temperature (${tempStats.count} readings):**\n`;
        response += `• Current: ${tempStats.current} °C\n`;
        response += `• Average: ${tempStats.avg} °C\n`;
        response += `• Minimum: ${tempStats.min} °C\n`;
        response += `• Maximum: ${tempStats.max} °C\n`;
        response += `• Std Dev: ${tempStats.stdDev} °C\n`;

        return response;
    }

    function handleAdvice() {
        const readings = DataManager.getReadings();
        const summary = AIEngine.generateSummary(readings);
        const riskLevel = summary.risk.level;

        const advice = {
            safe: `**Current Risk: SAFE** ✅\n\n**Recommendations:**\n• Continue normal activities\n• Keep monitoring the dashboard periodically\n• Ensure your ESP32 sensors are working properly\n• Have an emergency plan ready just in case\n• Check that alert thresholds are set correctly`,
            low: `**Current Risk: LOW** 🟡\n\n**Recommendations:**\n• Stay informed — check the dashboard regularly\n• Ensure drainage channels are clear\n• Keep emergency contacts accessible\n• Monitor weather forecasts\n• Prepare basic supplies (flashlight, water, phone charger)`,
            moderate: `**Current Risk: MODERATE** 🟠\n\n**Recommendations:**\n• ⚠️ Increase monitoring frequency\n• Move valuable items to higher ground\n• Prepare sand bags if available\n• Check on elderly neighbors\n• Keep vehicles fueled and ready\n• Stay tuned to local emergency alerts\n• Avoid walking near water bodies`,
            high: `**Current Risk: HIGH** 🔴\n\n**Immediate Actions:**\n• 🚨 Be ready to evacuate\n• Move to higher ground if water approaches\n• Unplug electrical appliances\n• Do NOT walk or drive through flood water\n• Contact emergency services if needed\n• Ensure family knows the evacuation route\n• Keep important documents in waterproof bags`,
            critical: `**⚠️ CRITICAL FLOOD RISK ⚠️**\n\n**EMERGENCY ACTIONS:**\n• 🚨 **EVACUATE IMMEDIATELY** if in a flood-prone area\n• Call emergency services: 112 / local emergency number\n• Move to the highest available floor\n• Do NOT attempt to cross flood water\n• Stay away from electrical equipment\n• Signal for help if trapped\n• Do NOT return until authorities give the all-clear`
        };

        return advice[riskLevel] || advice['safe'];
    }

    function handleAlertHistory() {
        if (typeof AlertSystem === 'undefined') return "Alert system is loading...";

        const history = AlertSystem.getHistory();
        if (history.length === 0) return "No alerts have been recorded yet. The system is monitoring your sensors and will alert you when thresholds are exceeded.";

        let response = `**Recent Alerts** 🔔\n\n`;
        const recent = history.slice(-5).reverse();
        recent.forEach(alert => {
            const icon = alert.severity === 'critical' ? '🔴' :
                alert.severity === 'danger' ? '🟠' :
                    alert.severity === 'warning' ? '🟡' : 'ℹ️';
            response += `${icon} **${alert.title}**\n`;
            response += `   ${alert.message}\n`;
            response += `   _${alert.time}_\n\n`;
        });

        return response;
    }

    function handleSensor() {
        const status = DataManager.getStatus();

        let response = `**Sensor & Device Info** 🔧\n\n`;
        response += `• **ESP32** Microcontroller\n`;
        response += `• **Ultrasonic Sensor** (HC-SR04) — Measures water level via distance\n`;
        response += `• **Temperature Sensor** (DHT11/DHT22) — Ambient temperature\n\n`;
        response += `**Connection Status:**\n`;
        response += `• ${status.connected ? '🟢 Connected — receiving live data' : '🔴 Disconnected — using cached data'}\n`;
        response += `• Total readings stored: ${status.totalReadings}\n`;
        response += `• Data source: ${status.usingFallback ? 'Simulated (sheet not accessible)' : 'Google Sheets (live)'}\n`;

        return response;
    }

    function handleHelp() {
        return `**AQUANEX — Help** 💡\n\nI can help you with:\n\n` +
            `🌊 **"What's the flood risk?"** — Current risk assessment\n` +
            `💧 **"Water level"** — Current water level & stats\n` +
            `🌡️ **"Temperature"** — Current temperature data\n` +
            `📈 **"Show trends"** — Trend analysis\n` +
            `🔮 **"Predict next hour"** — Water level forecast\n` +
            `📋 **"Status report"** — Full system overview\n` +
            `📊 **"Statistics"** — Min, max, avg values\n` +
            `💡 **"What should I do?"** — Safety recommendations\n` +
            `🔔 **"Recent alerts"** — Alert history\n` +
            `🔧 **"Sensor info"** — Device & connection status\n\n` +
            `Just type your question naturally — I'll understand! 😊`;
    }

    function handleUnknown() {
        const fallbacks = [
            "I'm not sure I understood that. Could you rephrase? Try asking about **flood risk**, **water level**, **temperature**, or **predictions**.",
            "Hmm, I didn't quite catch that. You can ask me about current conditions, trends, predictions, or safety advice!",
            "I'm specialized in flood monitoring. Try asking: *\"What's the current risk?\"* or *\"Show me the water level trend\"*"
        ];
        return fallbacks[Math.floor(Math.random() * fallbacks.length)];
    }

    // ── Message Rendering ──
    function formatMessage(text) {
        // Simple markdown-like formatting
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/_(.*?)_/g, '<span style="opacity:0.7;font-size:0.85em">$1</span>')
            .replace(/\n/g, '<br>');
    }

    function addMessage(content, type = 'ai', animate = true) {
        const bubble = document.createElement('div');
        bubble.className = `chat-bubble ${type}`;

        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        if (type === 'ai') {
            bubble.innerHTML = `
                <span class="ai-label">🤖 AQUANEX</span>
                <div class="bubble-content">${formatMessage(content)}</div>
                <div class="bubble-meta">${timeStr}</div>
            `;
        } else {
            bubble.innerHTML = `
                <div class="bubble-content">${formatMessage(content)}</div>
                <div class="bubble-meta">${timeStr}</div>
            `;
        }

        if (!animate) bubble.style.animation = 'none';

        messagesEl.appendChild(bubble);
        messagesEl.scrollTop = messagesEl.scrollHeight;

        messageHistory.push({ type, content, time: timeStr });
    }

    function showTypingIndicator() {
        const typing = document.createElement('div');
        typing.className = 'chat-bubble ai';
        typing.id = 'typingIndicator';
        typing.innerHTML = `
            <span class="ai-label">🤖 AQUANEX</span>
            <div class="typing-indicator">
                <span></span><span></span><span></span>
            </div>
        `;
        messagesEl.appendChild(typing);
        messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    function removeTypingIndicator() {
        const el = document.getElementById('typingIndicator');
        if (el) el.remove();
    }

    // ── Process User Message ──
    async function processMessage(message) {
        if (!message || !message.trim()) return;

        const trimmed = message.trim();

        // Add user message
        addMessage(trimmed, 'user');
        inputEl.value = '';

        // Show typing indicator
        showTypingIndicator();

        // Simulate AI "thinking" delay (300-900ms)
        const delay = 300 + Math.random() * 600;
        await new Promise(resolve => setTimeout(resolve, delay));

        // Match intent and get response
        const intent = matchIntent(trimmed);
        const response = intent.handler();

        // Remove typing and show response
        removeTypingIndicator();
        addMessage(response, 'ai');
    }

    // ── Initialization ──
    function init() {
        // Send button
        sendBtn.addEventListener('click', () => {
            processMessage(inputEl.value);
        });

        // Enter key
        inputEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                processMessage(inputEl.value);
            }
        });

        // Suggestion buttons
        suggestionsEl.addEventListener('click', (e) => {
            const btn = e.target.closest('.suggestion-btn');
            if (btn) {
                processMessage(btn.dataset.query);
            }
        });

        // Welcome message
        setTimeout(() => {
            addMessage(
                "Welcome to **AQUANEX**! 🌊\n\n" +
                "I'm your intelligent flood monitoring assistant. I analyze real-time data from your ESP32 sensors to assess flood risk, detect trends, and provide safety recommendations.\n\n" +
                "Try asking me something, or tap a suggestion below! 👇",
                'ai',
                false
            );
        }, 500);
    }

    return { init, addMessage, processMessage };
})();
