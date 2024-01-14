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


/////////////////////


//GLOBAL CONSTANTS FOR ANNO HANDLER
const orsRegExp = /\b0*([1-9]\d{0,2}[a-c]?)(\.\d{3,4})?/ // finds "chapter" or "chapter.section", e.g. "459A"
let annoBuild

const startAnnoRetrieval = (chapter) => {
   console.log(chapter)
   annoBuild = new AnnoHandler(chapter)
   console.log(annoBuild)
}

const finishAnnoRetrieval = async () => {
   console.log('finishAnnoRetrieval')
   console.log(annoBuild)
   let a
   try {
      a = annoBuild.loopAwaitingData()
   } catch (error) {
      console.log(`Nope ${error}`)
      a = true
   }
   console.log(a)
   if (a) {
      return annoBuild.sections
   }
   return new Error ('failed to retrieve annotations in 10 seconds')
}


class AnnoHandler {

   constructor(chapNo) {
      this.chapter = '0'
      this.#validateAndCleanChapter(chapNo)
      this.url = `https://www.oregonlegislature.gov/bills_laws/ors/ano00${this.chapter}.html`.replace(/0*(\d{3})/, '$1')
      this.doc = ' '
      this.paragraphList = []
      this.fetchStart = false
      this.annoList = [{'name': chapNo, 'children': []}]
      this.sections = {}
      if (this.chapter != '0') {
         this.#fetchData()
      }
   }
   #validateAndCleanChapter(chapNo) {
      if (orsRegExp.test(chapNo)) {
         this.chapter =  [...chapNo.match(RegExp(orsRegExp.source, ''))][1]
      } else {
         console.log('hmmm....')
      }
   }
   async #fetchData() {
      if (this.fetchStart) {
         return
      }
      else {
         this.fetchStart = true
         console.log('fetching')
         this.doc = await this.#getDocFromUrl()
         console.log('fetched')
         this.docDomParsing()
      }
   }
   async #getDocFromUrl () {
      try {
         const urlResponse = await fetch(this.url)
         if (!urlResponse.ok && !urlResponse.redirected) {
            throw new Error(`Unable to fetch from ${this.url}. Document is empty. `)
         }
         const bufferResponse = await urlResponse.arrayBuffer()
         const decoderMSWord = new TextDecoder('windows-1251')  // because anno file is just uploaded from Word, not typical utf-8 for websites
         return decoderMSWord.decode(bufferResponse)
      } catch (error) {
         warnBG(`${error}`, 'webResources.js', 'getDocFromUrl')
         return ' '
      }
   }

   loopAwaitingData() {
      let i = 0
      let isSuccess = false
      let newLoop = setInterval(() => {
         if (i > 20) {
            isSuccess = false
            clearInterval(newLoop)
         }
         if (this.doc) {
            isSuccess = true
            clearInterval(newLoop)
         }
         this.#fetchData()
         console.log(`${i}, ${isSuccess}`)
         i++
      }, 500)
      return isSuccess
   }

   async docDomParsing () {
      if(!this.doc) {
         if (!this.loopAwaitingData()) {
            return
         }
      }
      this.sections = await offScreenText2DOM2JSON(this.doc, this.chapter)
   }
}

let creating  // A global promise to avoid concurrency issues
const offScreenText2DOM2JSON = async (/**@type {string} */ htmlText, /**@type {string} */ chapter) => {
   await setupOffscreenDocument('../offscreen/offscreen.html')
   try {
      let sections = await chrome.runtime.sendMessage({
         'target': 'offscreen',
         'data': htmlText,
         'chapter': chapter
      }, result => {
         return result
      })
      return sections
   } catch (error) {
      warnBG(`fetching from offscreen failure ${error}`, 'webResources.js', 'offscreenUrl')
      return false
   }
}
const setupOffscreenDocument = async (/**@type {string} */ localPath) => {
   // Check all windows controlled by service worker to see if one is offscreen document with path
   const offscreenUrl = chrome.runtime.getURL(localPath)
   const existingContexts = await chrome.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT'],
      documentUrls: [offscreenUrl]
   })
   if (await existingContexts.length > 0) {
      return
   }

// create offscreen document
   if (creating) {
      await creating;
   } else {
      creating = chrome.offscreen.createDocument({
         url: localPath,
         reasons: [chrome.offscreen.Reason.DOM_PARSER],
         justification: 'Send text to convert to html and parse',
      })
      await creating
      creating = null
   }
}
