//webResources.js
//@ts-check

let retrievalObject = {}

/** returns promise to retrieves JSON data from "filename" and returns javascript library
* @param {string} filename */
const promiseReadJsonFile = async filename => {
   if (retrievalObject.fileName) {
      infoBG(
         `Retrieving cached ${filename}`,
         'webResources.js',
         'promiseReadJsonFile'
      )
      return retrievalObject.fileName
   }
   try {
      const jsonFile = browser.runtime.getURL(`/data/${filename}`)
      infoBG(`Unpacking: ${jsonFile}`, 'webResources.js', 'promiseReadJsonFile')
      const fetchResponse = await fetch(jsonFile)
      if (!fetchResponse.ok) {
         throw new Error(`File ${filename} not loaded: ${fetchResponse.statusText}`)
      }
      const fetchedJson = await fetchResponse.json()
      retrievalObject.filename = fetchedJson // caches response
      return fetchedJson
   } catch (e) {
      warnBG(e, 'webResources.js', 'promiseReadJsonFile')
      throw e
   }
}

const promiseGetPalletteList = async () => {
   let presetObj = await promiseReadJsonFile('cssPresetColors.json')
   return Object.keys(presetObj)
}

// volumeOutline.json specific
/** is a list of chapters in order returning [chapter#, title#, volume#, chapterName, titleName] */
const buildChapterList = async () => {
   let chapterList = []
   const fullOutline = await promiseReadJsonFile('volumeOutline.json')
   const Volumes = fullOutline.Volumes
   for (let volume in fullOutline.Volumes) {
      const Titles = Volumes[volume].Titles
      for (let title in Titles) {
         const Chapters = Titles[title].Chapters
         for (let chapter in fullOutline.Volumes[volume].Titles[title].Chapters) {
            chapterList.push([
               chapter.trim(),
               title.trim(),
               volume,
               Chapters[chapter],
               Titles[title].Heading
            ])
         }
      }
   }
   return chapterList
}

//caching chapterList
let chapter = null
const getChapterList = async () => {
   if (chapter == null) {
      infoBG(
         'building chapter list from volumeOutline.js',
         'webResources.js',
         'getChapterList'
      )
      chapter = await buildChapterList()
   } else {
      infoBG(
         'Recycling used chapter list on volumeOutline.js',
         'webResources.js',
         'getChapterLink'
      )
   }
   return chapter
}

/** returns chapter info based on json file for 'volume>title>chap' info;
* based on matching chapter number (or offset to allow return of previous or next chapter)*/
const promiseGetChapterInfo = async ({ chapNum, offset = 0 }) => {
   const myList = await getChapterList()
   let ans = []
   myList.every((chapter, index) => {
      // every works like forEach, but breaks on "false"
      if (chapter[0] == chapNum) {
         let limitRange = Math.max(Math.min(index + offset, myList.length - 1), 0)
         ans = myList[limitRange]
      }
      return ans.length == 0 // keeps going while true; stops as soon as we find it
   })
   const ansArray = (ans.length == 0
   ? [chapNum, 0, 0, 'chapter not found', 'title not found']
   : ans)
   return {
      'chapNo' : ansArray[0],
      'titleNo' : ansArray[1],
      'volNo' : ansArray[2],
      'chapName' : ansArray[3],
      'titleName' : ansArray[4]
   }
}

const emptyDoc = () => {
   let parser = new DOMParser()
   return parser.parseFromString(
      `<!DOCTYPE html><html><head></head><body></body></html>`,
      'text/html'
   )
}
const getDocFromUrl = async (/**@type {string} */ url) => {
   try {
      let response = await fetch(url)
      if (!response.ok && !response.redirected) {
         throw new Error(`Unable to fetch from ${url}. Document is empty. `)
      }
      let text = await response.text()
      let parser = new DOMParser()
      return parser.parseFromString(text, 'text/html')
   } catch (error) {
      warnBG(error)
      return emptyDoc()
   }
}

//GLOBAL CONSTANTS FOR ANNO HANDLER
const orsRegExp = /\b0*([1-9]\d{0,2}[a-c]?)(\.\d{3,4})?/ // finds "chapter" or "chapter.section", e.g. "459A"
const tabRegExp = /(&nbsp;|\s)*/

class AnnoHandler {

   constructor(chapNo) {
      this.chapter = '0'
      this.url = `https://www.oregonlegislature.gov/bills_laws/ors/ano${this.chapter}.html`
      this.#validateAndCleanChapter(chapNo)
      this.response = false
      this.fetchStart = false
      this.doc= emptyDoc()
      if (this.chapter != '0') {
         this.#fetchData()
      }
   }
   #validateAndCleanChapter(chapNo) {
      if (orsRegExp.test(chapNo)) {
         this.chapter =  [...chapNo.match(RegExp(AnnoHandler.orsRegExp.source, ''))][1]
      }
   }
   async #fetchData() {
      if (this.fetchStart) {
         return
      }
      else {
         this.fetchStart = true
         this.doc = await getDocFromUrl(this.url)
         this.response = true
      }
   }

   docTagOne () {
      if(!this.response) {
         while(this.response = false) {
            this.#fetchData()
         }
      }
      this.doc.body.querySelectorAll('p').forEach(p => {
         p.className = this.getClass(p)
         if (p.className = 'remove') {
            p.remove
         }
      })
   }

   getClass(pElem) {
      if(RegExp(`^${tabRegExp}${this.chapter}\\.\d{3,4}`).test(pElem.textContent)) {
         return 'sectionHead'
      }
      if (/^NOTES\sOF\sDECISION/.test(pElem.textContent)) {
         return 'decisionHead'
      }
      if ((/^ATTY.\sGEN.\sOPINION/).test(pElem.textContent)) {
         return 'agHeading'
      }
      if ((/^LAW\sREVIEW\sCITATION/).test(pElem.textContent)) {
         return 'lawReviewHeading'
      }
      if (RegExp(`^${tabRegExp}$`).test(pElem.textContent)) {
         return 'remove'
      }
      if (RegExp(`${tabRegExp}<b>`).test(pElem.innerHTML)) {
         return 'remove'
      }
      return 'default'
   }

}
