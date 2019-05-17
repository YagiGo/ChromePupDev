// Get the page loading speed with chromium
const puppeteer = require("puppeteer");
const extPath = "/Users/mac/YPTN-Client-Server-Communication/YPTN-Client"; // YPTN Client Extension to be loaded
//Update: Browser level network throttling will no longer be used.
//Set up a network condition simulator to do this.
const NETWORK_PRESETS = {
    'ExtremelyCrowded': {
        'offline': false,
        'downloadThroughput': 500 * 1024 / 8,
        'uploadThroughput': 500 * 1024 / 8,
        'latency': 350
    },
    'Crowded': {
        'offline': false,
        'downloadThroughput': 2 * 1024 * 1024 / 8,
        'uploadThroughput': 2 * 1024 / 8,
        'latency': 150
    },
    'Regular4G': {
        'offline': false,
        'downloadThroughput': 40 * 1024 * 1024 / 8,
        'uploadThroughput': 30 * 1024 * 1024 / 8,
        'latency': 50
    },
    'RegularWifi': {
        'offline': false,
        'downloadThroughput': 10 * 1024 * 1024 / 8,
        'uploadThroughput': 10 * 1024 * 1024 / 8,
        'latency': 20
    },
    'IdealNetwork': {
        'offline': false,
        'downloadThroughput': 500 * 1024 * 1024 / 8,
        'uploadThroughput': 500 * 1024 * 1024 / 8,
        'latency': 5
    }
};

// Ideal Up/Down Link Speed, variance on latencies.
const NETWORK_PRESET_LATENCY = {
    "LowLatency": {
        'offline': false,
        'downloadThroughput': 500 * 1024 * 1024 / 8,
        'uploadThroughput': 500 * 1024 * 1024 / 8,
        'latency': 5
    },

    "ModerateLatency": {
        'offline': false,
        'downloadThroughput': 500 * 1024 * 1024 / 8,
        'uploadThroughput': 500 * 1024 * 1024 / 8,
        'latency': 100
    },

    "HighLatency": {
        'offline': false,
        'downloadThroughput': 500 * 1024 * 1024 / 8,
        'uploadThroughput': 500 * 1024 * 1024 / 8,
        'latency': 500
    }
};

const testSite_cached = [
    "https://192.168.1.47:8081/fe82dac84d8b896b3e7cf9edcb4f0eb8",
    "https://192.168.1.47:8081/008ec4453ff31513f43893cba7aa31c8",
    "https://192.168.1.47:8081/09d3713efe5fc9cb8bfe1830b44cd5be",
];
const testSite_original = [
    "https://www.yahoo.co.jp",
    "https://github.com",
    "https://www.zhaoxinblog.com"
];

const testSite_original_1 = [
    "https://www.zhaoxinblog.com"
];

const testSite_cached_1 = [
    "https://192.168.1.47:8081/09d3713efe5fc9cb8bfe1830b44cd5be"
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
        // args: [ `--disable-extensions-except=${extPath}`, `--load-extension=${extPath}`]
    });
    const page = await browser.newPage();
    const client = await page.target().createCDPSession(); // Connect to developer tool
    //Disable cache and set throttling
    await client.send('Network.setCacheDisabled', {cacheDisabled: true}); // Disable cache usage
    // await client.send('Network.emulateNetworkConditions',networkEnvironment);
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
    console.log("DEBUG:ALL TIME MONITORED:", performanceTime);
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
        console.log("Benchmarking ", testSite_original[i]);
        let testSite = new URL(testSite_original[i]);
        for(let index in NETWORK_PRESET_LATENCY) {
            let networkName = index;
            let testResultName = testSite.hostname + "_" + networkName + ".csv"; // benchmark result csv file
            let networkPreset = NETWORK_PRESET_LATENCY[index];
            await fs.writeFile(testResultName, "Test Site,Original Load Time,Cached Load Time\n");
            console.log("Network Status:",networkName);
            // console.log(networkPreset);
            for(let j = 0; j < BENCHMARK_TIMES; j++) {
                console.log(`Test No.${j+1}`);
                let originalLoadTime = await getDOMLoadedTime(testSite_original[i], networkPreset);
                let cachedLoadTime = await getDOMLoadedTime(testSite_cached[i], networkPreset);
                console.log("Original: ",originalLoadTime, " Cached: ",cachedLoadTime);
                await fs.appendFile(testResultName, `${testSite_original[i]},${originalLoadTime},${cachedLoadTime}\n`);
            }
        }
    }

}
async function evaluate_indeNetwork(currentNetworkCondition) {
    for(let i = 0; i < testSite_original.length; i++) {
        console.log("Benchmarking ", testSite_original[i]);
        let testSite = new URL(testSite_original[i]);
        let testResultName = testSite.hostname + "_" + currentNetworkCondition + ".csv"; // benchmark result csv file
        await fs.writeFile(testResultName, "Test Site,Original Load Time,Cached Load Time\n");
        console.log("Network Status:",currentNetworkCondition);
        // console.log(networkPreset);
        for(let j = 0; j < BENCHMARK_TIMES; j++) {
            console.log(`Test No.${j+1}`);
            let originalLoadTime = await getDOMLoadedTime(testSite_original[i]);
            let cachedLoadTime = await getDOMLoadedTime(testSite_cached[i]);
            console.log("Original: ",originalLoadTime, " Cached: ",cachedLoadTime);
            await fs.appendFile(testResultName, `${testSite_original[i]},${originalLoadTime},${cachedLoadTime}\n`);
        }
    }
}
evaluate_indeNetwork("IdealNetwork");
