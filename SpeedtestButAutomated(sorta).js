// ==UserScript==
// @name         Speedtest.net, But Automated (sorta)
// @author       NoahBK was the guy with the whip, ChatGPT is the one that was doing all the work and getting whipped, but only metaphorically
// @namespace    https://speedtest.net
// @version      3.0
// @description  Run Speedtest automatically at random intervals between 5 and 60 minutes.
// @match        https://www.speedtest.net/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const MIN_MINUTES = 5;
    const MAX_MINUTES = 60;

    const STORAGE_NEXT_RUN = 'speedtest_next_run';
    const STORAGE_ENABLED = 'speedtest_enabled';
    const STORAGE_RUNNING = 'speedtest_running';

    let panel;
    let countdownLabel;

    function log(msg) {
        console.log(`[Speedtest Auto] ${msg}`);
    }

    function randomDelay() {
        const min = MIN_MINUTES * 60 * 1000;
        const max = MAX_MINUTES * 60 * 1000;

        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

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

    function createPanel() {
        if (panel) return;

        panel = document.createElement('div');

        panel.style.position = 'fixed';
        panel.style.bottom = '10px';
        panel.style.right = '10px';
        panel.style.zIndex = '999999';
        panel.style.background = 'rgba(0,0,0,0.85)';
        panel.style.color = 'white';
        panel.style.padding = '10px';
        panel.style.borderRadius = '8px';
        panel.style.fontSize = '12px';
        panel.style.fontFamily = 'Arial';
        panel.style.minWidth = '220px';

        const title = document.createElement('div');
        title.textContent = 'Speedtest Automation';
        title.style.fontWeight = 'bold';

        const startBtn = document.createElement('button');
        startBtn.textContent = 'Start Automation';

        const stopBtn = document.createElement('button');
        stopBtn.textContent = 'Stop Automation';

        countdownLabel = document.createElement('div');
        countdownLabel.style.marginTop = '10px';

        startBtn.onclick = () => {
            scheduleNext();
            setEnabled(true);
            log('Automation enabled');
        };

        stopBtn.onclick = () => {
            setEnabled(false);
            localStorage.removeItem(STORAGE_NEXT_RUN);
            countdownLabel.textContent = 'Stopped';
            log('Automation disabled');
        };

        panel.appendChild(title);
        panel.appendChild(document.createElement('br'));
        panel.appendChild(startBtn);
        panel.appendChild(stopBtn);
        panel.appendChild(countdownLabel);

        document.body.appendChild(panel);
    }

    function scheduleNext() {
        const delay = randomDelay();
        const nextRun = Date.now() + delay;

        setNextRun(nextRun);

        log(
            `Next test in ${(delay / 60000).toFixed(1)} minutes`
        );
    }

    function findGoButton() {
        return (
            document.querySelector('[data-testid="start-speedtest"]') ||
            document.querySelector('.start-button a') ||
            document.querySelector('.start-text') ||
            document.querySelector('.js-start-test')
        );
    }

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

    function monitorCompletion() {

        let attempts = 0;

        const interval = setInterval(() => {

            attempts++;

            const text = document.body.innerText.toLowerCase();

            const finished =
                text.includes('share results') ||
                text.includes('result id') ||
                text.includes('download');

            if (finished || attempts > 180) {

                clearInterval(interval);

                localStorage.removeItem(STORAGE_RUNNING);

                log('Test complete');

                scheduleNext();
            }

        }, 10000);
    }

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

    window.addEventListener('load', () => {

        createPanel();

        updateCountdown();

        setInterval(updateCountdown, 1000);

        setInterval(mainLoop, 30000);
    });

})();