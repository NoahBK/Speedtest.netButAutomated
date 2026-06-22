// ==UserScript==
// @name         Speedtest.net, But Automated (sorta)
// @author       NoahBK was the guy with the whip, ChatGPT is the one that was doing all the work and getting whipped, but only metaphorically
// @namespace    https://speedtest.net
// @version      3.2
// @description  Run Speedtest automatically at random intervals between 5 and 60 minutes.
// @match        https://www.speedtest.net/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // =========================
    // Configuration
    // =========================

    const MIN_MINUTES = 5;
    const MAX_MINUTES = 60;

    // =========================
    // Local Storage Keys
    // =========================

    const STORAGE_NEXT_RUN = 'speedtest_next_run';
    const STORAGE_ENABLED = 'speedtest_enabled';
    const STORAGE_RUNNING = 'speedtest_running';

    // =========================
    // UI References
    // =========================

    let panel;
    let countdownLabel;

    // =========================
    // Logging Helper
    // =========================

    function log(msg) {
        console.log(`[Speedtest Auto] ${msg}`);
    }

    // =========================
    // Scheduling
    // =========================

    function randomDelay() {
        const min = MIN_MINUTES * 60 * 1000;
        const max = MAX_MINUTES * 60 * 1000;

        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function scheduleNext() {
        const delay = randomDelay();
        const nextRun = Date.now() + delay;

        setNextRun(nextRun);

        log(`Next test in ${(delay / 60000).toFixed(1)} minutes`);
    }

    // =========================
    // Storage Helpers
    // =========================

    function enabled() {
        return localStorage.getItem(STORAGE_ENABLED) === 'true';
    }

    function setEnabled(value) {
        localStorage.setItem(STORAGE_ENABLED, value);
    }

    function setNextRun(timestamp) {
        localStorage.setItem(STORAGE_NEXT_RUN, timestamp);
    }

    function getNextRun() {
        return Number(localStorage.getItem(STORAGE_NEXT_RUN) || 0);
    }

    // =========================
    // UI Panel
    // =========================

    function createPanel() {
        if (panel) return;

        panel = document.createElement('div');

        panel.style.position = 'fixed';
        panel.style.top = '75px';
        panel.style.left = '10px';
        panel.style.zIndex = '999999';
        panel.style.background = 'rgba(0,0,0,0.85)';
        panel.style.color = 'white';
        panel.style.padding = '10px';
        panel.style.borderRadius = '8px';
        panel.style.fontSize = '12px';
        panel.style.fontFamily = 'Arial';
        panel.style.minWidth = '220px';
        panel.style.boxShadow = '0 2px 10px rgba(0,0,0,0.4)';
        panel.style.border = '1px solid rgba(255,255,255,0.15)';

        const title = document.createElement('div');
        title.textContent = 'Speedtest Automation';
        title.style.fontWeight = 'bold';

        const startBtn = document.createElement('button');
        startBtn.textContent = 'Start Automation';

        // Style Start button
        startBtn.style.padding = '6px 10px';
        startBtn.style.marginRight = '8px';
        startBtn.style.cursor = 'pointer';
        startBtn.style.border = 'none';
        startBtn.style.borderRadius = '4px';

        const stopBtn = document.createElement('button');
        stopBtn.textContent = 'Stop Automation';

        // Style Stop button
        stopBtn.style.padding = '6px 10px';
        stopBtn.style.cursor = 'pointer';
        stopBtn.style.border = 'none';
        stopBtn.style.borderRadius = '4px';

        countdownLabel = document.createElement('div');
        countdownLabel.style.marginTop = '10px';

        startBtn.onclick = () => {
            setEnabled(true);
            scheduleNext();
            log('Automation enabled');
        };

        stopBtn.onclick = () => {
            setEnabled(false);
            localStorage.removeItem(STORAGE_NEXT_RUN);
            localStorage.removeItem(STORAGE_RUNNING);

            countdownLabel.textContent = 'Stopped';

            log('Automation disabled');
        };

        panel.appendChild(title);
        panel.appendChild(document.createElement('br'));

        const buttonContainer = document.createElement('div');
        buttonContainer.style.marginTop = '8px';
        buttonContainer.style.marginBottom = '8px';

        buttonContainer.appendChild(startBtn);
        buttonContainer.appendChild(stopBtn);

        panel.appendChild(buttonContainer);
        panel.appendChild(countdownLabel);

        document.body.appendChild(panel);
    }

    // =========================
    // Speedtest Button Detection
    // =========================

    function findGoButton() {
        return document.querySelector(
            'button[aria-label*="start speed test"]'
        );
    }

    // =========================
    // Start Test
    // =========================

    function startTest() {

        if (!enabled()) return;

        if (localStorage.getItem(STORAGE_RUNNING) === 'true') {
            return;
        }

        const button = findGoButton();

        if (!button) {
            log('Go button not found');
            scheduleNext();
            return;
        }

        localStorage.setItem(STORAGE_RUNNING, 'true');

        log('Starting speed test');

        button.click();

        monitorCompletion();
    }

    // =========================
    // Completion Detection
    // =========================

    function monitorCompletion() {

        let attempts = 0;

        const interval = setInterval(() => {

            attempts++;

            const button = findGoButton();

            // If GO button exists again after starting,
            // assume the test completed and returned
            // to the ready state.

            if (attempts > 3 && button) {

                clearInterval(interval);

                localStorage.removeItem(STORAGE_RUNNING);

                log('Test complete');

                scheduleNext();
            }

            // 30 minute safety timeout

            if (attempts > 180) {

                clearInterval(interval);

                localStorage.removeItem(STORAGE_RUNNING);

                log('Completion timeout reached');

                scheduleNext();
            }

        }, 10000);
    }

    // =========================
    // Countdown Display
    // =========================

    function updateCountdown() {

        if (!countdownLabel) return;

        if (!enabled()) {
            countdownLabel.textContent = 'Stopped';
            return;
        }

        const nextRun = getNextRun();

        if (!nextRun) {
            countdownLabel.textContent = 'Waiting...';
            return;
        }

        const remaining = nextRun - Date.now();

        if (remaining <= 0) {
            countdownLabel.textContent = 'Running test...';
            return;
        }

        const minutes = Math.floor(remaining / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);

        countdownLabel.textContent =
            `Next test: ${minutes}m ${seconds}s`;
    }

    // =========================
    // Main Scheduler Loop
    // =========================

    function mainLoop() {

        if (!enabled()) return;

        const nextRun = getNextRun();

        if (!nextRun) {
            scheduleNext();
            return;
        }

        if (Date.now() >= nextRun) {
            startTest();
        }
    }

    // =========================
    // Initialization
    // =========================

    window.addEventListener('load', () => {

        createPanel();

        updateCountdown();

        setInterval(updateCountdown, 1000);

        setInterval(mainLoop, 30000);

        log('Script initialized');
    });

})();
