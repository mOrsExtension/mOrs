/* global require */
//utilities/volumeCrawler.js
//fetches volume, title, chapter list from ORS website
// does not run on/through webapp

/**requirements: Node & NPM.js (http://node.js)
 * Puppeteer (> npm puppeteer)
 * Set year range (at bottom of script) before running
 **/

const puppeteer = require("puppeteer");
const fs = require("fs");

class ORScraper {
  constructor() {
    this.browser = null;
    this.page = null;
    this.pageUrl =
      "https://www.oregonlegislature.gov/bills_laws/Pages/ORS.aspx";
    this.volumes = { volumes: {} };
  }

  async init() {
    this.browser = await puppeteer.launch({
      headless: false,
      devtools: false,
    });
    this.page = await this.browser.newPage();
    // Listen for browser console messages (for debugging)
    this.page.on("console", (msg) => {
      console.log("BROWSER:", msg.text());
    });

    // Set user agent to avoid bot detection
    await this.page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    );

    // Set viewport
    await this.page.setViewport({ width: 1280, height: 720 });
  }

  // navigate to page
  async navigate() {
    await this.page.goto(this.pageUrl, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });
  }

  async wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async clickLinks() {
    let cssSelector = `a[onclick*="ExpCollGroup"]`;
    await this.page.waitForSelector(cssSelector);
    await this.page.evaluate(async () => {
      const wait = (ms) => {
        return new Promise((resolve) => setTimeout(resolve, ms));
      };
      let cssSelector = `a[onclick*="ExpCollGroup"]`;
      const links = Array.from(document.querySelectorAll(cssSelector));
      for (var link of links) {
        link.click();
        await wait(50);
      }
    });
  }

  async getRawData() {
    this.rawData = await this.page.evaluate(() => {
      console.log("running in browser context");
      let result = [];
      document
        .querySelectorAll("td.ms-gb,td.ms-gb2, .ms-itmHoverEnabled")
        .forEach((item) => {
          if (item.classList.contains("ms-gb")) {
            result.push({ volume: item.textContent });
          } else if (item.classList.contains("ms-gb2")) {
            result.push({ title: item.textContent });
          } else if (item.classList.contains("ms-itmHoverEnabled")) {
            result.push({ chapter: item.textContent });
          } else {
            console.log(`Failed: ${item.textContent}`);
          }
        });
      return result;
    });
  }
  parseData() {
    let curVol;
    let curTitle;
    this.rawData.forEach((elem) => {
      if (elem.volume) {
        let { number, text } = this.makeVol(elem.volume);
        this.volumes.volumes[number] = {};
        curVol = this.volumes.volumes[number];
        curVol.heading = text;
        curVol.titles = {};
      }
      if (elem.title) {
        let { number, text } = this.makeTitle(elem.title);
        curVol.titles[number] = {};
        curTitle = curVol.titles[number];
        curTitle.heading = text;
        curTitle.chapters = {};
      }
      if (elem.chapter) {
        let { number, text } = this.makeChap(elem.chapter);
        console.log(`${number} and ${text}`);
        curTitle.chapters[number] = text;
      }
    });
  }

  /** @param {string} rawText */
  makeVol(rawText) {
    let results = {};
    results.number = this.findMatch(rawText, /Volume\s+:\s+0?(\d+)/); // title stripped of leading zeros
    results.text = this.findMatch(rawText, /\s+-\s+([^]*?)\s+-\s+Ch/);
    return results;
  }
  makeTitle(rawText) {
    let results = {};
    results.number = this.findMatch(
      rawText,
      /Title\sNumber\s+:\s+0*([1-9]\d*\w?)\./
    ); // title stripped of leading zeros
    results.text = this.findMatch(rawText, /\d\w?\.\s+([^]*?)\s+-\s+Ch/);
    return results;
  }
  makeChap(rawText) {
    let results = {};
    results.number = this.findMatch(
      rawText,
      /Chapter\s+0*([1-9]\d*[A-C]?)[(A-Z]/
    ); // chapter stripped of leading zeros
    results.text = this.findMatch(rawText, /\d[A-C]?([(A-Z][^]*)/);
    return results;
  }

  /**
   * @param {string} text
   * @param {RegExp} re */
  findMatch(text, re) {
    let match = text.match(re);
    if (match) {
      return match[1];
    } else {
      console.log(`No match for ${re.source} in ${text}`);
      return "null";
    }
  }

  async saveToFile(fileName) {
    let jsonString = JSON.stringify(this.volumes);
    fs.writeFileSync(fileName, jsonString);
  }

  async close() {
    if (this.browser) {
      try {
        await this.browser.close();
      } catch (error) {
        console.error("Error closing browser:", error.message);
      }
    }
  }
}

async function main() {
  const scraper = new ORScraper();
  await scraper.init();
  await scraper.navigate();
  await scraper.wait(1000);
  await scraper.clickLinks();
  await scraper.wait(500);
  await scraper.getRawData();
  await scraper.parseData();
  await scraper.saveToFile(`volNav.json`);
  await scraper.close();
  console.log("done");
}

// Run the scraper
if (require.main === module) {
  main().catch(console.error);
}
