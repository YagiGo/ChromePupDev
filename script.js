// Get the page loading speed with chromium
const puppeteer = require("puppeteer");
const extPath = "/Users/mac/YPTN-Client-Server-Communication/YPTN-Client"; // YPTN Client Extension to be loaded
const NETWORK_PRESETS = {
    'ExtremelyCrowded': {
        'offline': false,
        'downloadThroughput': 240 * 1024 / 8,
        'uploadThroughput': 800 * 1024 / 8,
        'latency': 200
    },
    'Crowded': {
        'offline': false,
        'downloadThroughput': 2 * 1024 * 1024 / 8,
        'uploadThroughput': 800 * 1024 / 8,
        'latency': 100
    },
    'Regular4G': {
        'offline': false,
        'downloadThroughput': 40 * 1024 * 1024 / 8,
        'uploadThroughput': 30 * 1024 * 1024 / 8,
        'latency': 50
    },
    'RegularWifi': {
        'offline': false,
        'downloadThroughput': 40 * 1024 * 1024 / 8,
        'uploadThroughput': 30 * 1024 * 1024 / 8,
        'latency': 20
    },
    'IdealNetwork': {
        'offline': false,
        'downloadThroughput': 500 * 1024 * 1024 / 8,
        'uploadThroughput': 500 * 1024 * 1024 / 8,
        'latency': 5
    }
};

const testSite_cached = [
    "https://192.168.1.47:8081/fe82dac84d8b896b3e7cf9edcb4f0eb8",
    "https://192.168.1.47:8081/e5cc01b67c7457d1a2d12b6337a64458",
    "https://192.168.1.47:8081/09d3713efe5fc9cb8bfe1830b44cd5be",
];
const testSite_original = [
    "https://www.yahoo.co.jp",
    "https://www.github.com/yagigo",
    "https://www.zhaoxinblog.com"
];
const benchmarkRoot = "/Users/mac/ChromePupDev/BenchmarkRoot";
const {URL} = require("url"); // URL parse
const fs = require("fs-extra");
const path = require("path");
const BENCHMARK_TIMES = 100; // Benchmark every web page for 100 times

// async function getPageLoaded() {
//     const browser = await puppeteer.launch({
//         headless: false,
//         devtools: true,
//         args: [ `--disable-extensions-except=${extPath}`, `--load-extension=${extPath}`]
//     });
//     const page = browser.newPage();
//     await page.goto("https://www.github.com");
//     const pageMetrics = await page.metrics();
//     console.log(pageMetrics);
//     await browser.close();
// }
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function getDOMLoadedTime(url, networkEnvironment) {
    //CSV file related preparation
    // let parsedURL = new URL(url);
    // let benchmarkFilePath = path.join(benchmarkRoot, parsedURL.hostname, ".csv");
    const browser = await puppeteer.launch({
        headless: false,
        devtools: true,
        ignoreHTTPSErrors: true,
        args: [ `--disable-extensions-except=${extPath}`, `--load-extension=${extPath}`]
    });
    const page = await browser.newPage();
    const client = await page.target().createCDPSession(); // Connect to developer tool
    //Disable cache and set throttling
    await client.send('Network.setCacheDisabled', {cacheDisabled: true}); // Disable cache usage
    await client.send('Network.emulateNetworkConditions',networkEnvironment);
    await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 30000})
        .catch(() => {
            console.log("INFO: Loading Timeout");
            return 30000
        });
    page.keyboard.press('Escape');
    const performanceTime = JSON.parse(
        await page.evaluate(() => {// Stop loading for Edge Caching in case of hanging
            return JSON.stringify(window.performance.timing)
        })
    );
    // console.log(performanceTime);
    const pageLoadTime = // (performanceTime["domainLookupEnd"] - performanceTime["domainLookupStart"]) +
        // (performanceTime["connectEnd"] - performanceTime["connectStart"]) +
        // (performanceTime["responseEnd"] - performanceTime["responseStart"]) +
        (performanceTime["domContentLoadedEventEnd"] - performanceTime["domLoading"]);
        // (performanceTime["loadEventEnd"] - performanceTime["loadEventStart"]);
    // console.log(pageLoadTime);
    setTimeout(async ()=>{await browser.close();}, 2000);
    return pageLoadTime
};

async function evaluate() {
    for(let i = 0; i < testSite_original.length; i++) {
        console.log("Benchmarking ", testSite_original[i])
        for(let index in NETWORK_PRESETS) {
            let networkName = index;
            let networkPreset = NETWORK_PRESETS[index];
            console.log("Network Status:",networkName);
            // console.log(networkPreset);
            for(let j = 0; j < BENCHMARK_TIMES; j++) {
                console.log(`Test No.${j+1}`)
                let originalLoadTime = await getDOMLoadedTime(testSite_original[i], networkPreset);
                let cachedLoadTime = await getDOMLoadedTime(testSite_cached[i], networkPreset);
                console.log("Original: ",originalLoadTime, " Cached: ",cachedLoadTime);
            }
        }
    }

}

evaluate()