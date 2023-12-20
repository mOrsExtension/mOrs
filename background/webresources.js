//webResources.js
//@ts-check

let retrievalObject = {}

/** returns promise to retrieves JSON data from "filename" and returns javascript library
* @param {string} filename */
const promiseReadJsonFile = async filename => {
   if (retrievalObject.fileName) {
      infoBG(
         `Retrieving cached ${jsonFile}`,
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

/** returns chapter info from chapter List [number, title, volume, chapterName, titleName]
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
   return (ans.length == 0
   ? [chapNum, 0, 0, 'chapter not found', 'title not found']
   : ans)
}
