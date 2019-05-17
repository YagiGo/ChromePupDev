// Get all the parts of loading speed
const puppeteer = require("puppeteer");
const exPath = "/Users/mac/YPTN-Client-Server-Communication/YPTN-Client";
const BENCHMARK_TIMES = 100;
const testSite_original = [
    "https://www.yahoo.co.jp",
    "https://github.com",
    "https://www.zhaoxinblog.com"
    ];

const {URL} = require("url"); // URL parse
const fs = require("fs-extra");

function sleep(ms) {
    return new Promise(resolve => setTimeOut(resolve, ms));
}

/**
 * Reference: format of performance json
 *  {
      navigationStart: 1557809768171,
      unloadEventStart: 0,
      unloadEventEnd: 0,
      redirectStart: 0,
      redirectEnd: 0,
      fetchStart: 1557809768177,
      domainLookupStart: 1557809768220,
      domainLookupEnd: 1557809768220,
      connectStart: 1557809768220, //TCP Connect Start
      connectEnd: 1557809768256, // TCP Connect Finish


      secureConnectionStart: 1557809768226,

      requestStart: 1557809768259, // HTTP Response Start
      responseStart: 1557809768399,
      responseEnd: 1557809768418, // HTTP Response End


      domLoading: 1557809768423, // HTML Parsing Start
      domInteractive: 1557809770053, //HTML Parsing Finished, DOM created.
      domContentLoadedEventStart: 1557809770054, // DOM Ready, waiting for CSSOM Tree
      domContentLoadedEventEnd: 1557809770059, // DOM Tree and CSSOM tree both ready, render tree can be created
      domComplete: 0, // Web page and its resource are ready

      loadEventStart: 0,
      loadEventEnd: 0 }
 */

async function getPerformance(url, browser) {

    const page = await browser.newPage();
    const client = await page.target().createCDPSession(); // connect to developer tool
    await client.send('Network.setCacheDisabled', {cacheDisabled: true}); // Disable cache usage
    await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
    }).catch(()=>{console.log("INFO:loading timeout!")});
    const performance = JSON.parse(
        await page.evaluate(()=>{
            // stop loading for edge caching in case of hanging
            return JSON.stringify(window.performance.timing);
        })
    );
    let result = {
        "BENCHMARKING_URL"    : url,
        "TCP_HANDSHAKE_TIME"  : performance["connectEnd"] - performance["connectStart"],
        "HTTP_RESPONSE_TIME"  : performance["responseEnd"] - performance["responseStart"],
        "DOM_CREATION_TIME"   : performance["domContentLoadedEventStart"] - performance["domLoading"],
        "CSSOM_CREATION_TIME" : performance["domContentLoadedEventEnd"] - performance["domLoading"]
    };

    console.log(result);
    return result;
}


async function benchmark() {
    const browser = await puppeteer.launch({
        headless: true, // show the browser
        devtools: true,
        ignoreHTTPSErrors: true, // self-signed certificate problem
    });
    for(let i = 0; i < testSite_original.length; i++) {
        let testSite = new URL(testSite_original[i]);
        console.log("Benchmarking ", testSite_original[i]);
        let outputCSVName = testSite.hostname + ".csv";
        await fs.writeFile(outputCSVName, "Test Site,TCP Handshake Time,HTTP Response Time,DOM Creation Time,CSSOM Creation Time\n"); // write csv header
        for(let j=0; j<BENCHMARK_TIMES; j++) {
                console.log("TEST NO. ", j);
                let benchmarkResult = await getPerformance(testSite_original[i], browser);
                await fs.appendFile(outputCSVName, `${benchmarkResult["BENCHMARKING_URL"]},${benchmarkResult["TCP_HANDSHAKE_TIME"]},${benchmarkResult["HTTP_RESPONSE_TIME"]},${benchmarkResult["DOM_CREATION_TIME"]},${benchmarkResult["CSSOM_CREATION_TIME"]}\n`);
        }
    }
}

benchmark();