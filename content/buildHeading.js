//buildHeading.js
//@ts-check

/**Find elements of heading (title, chapter, edition, notes)
* Returns headingPieces object containing the info needed to build headingDiv
* Removes existing heading elements from the main body and returns what's left*/
const stripInfo = (/**@type {HTMLBodyElement}*/ docBody) => {
   //VARIABLES
   let hasFoundChapter = false
   let headingInfo = {
      isFormerProvisions: false,
      miscHead: document.createElement('div') //info in heading that isn't title, chapter or edition (usually notes about short session)
   }
   headingInfo.miscHead.classList.add('note')
   /** splits into $1(chapter number) & $2(chapter title) */
   const chapNameRegExp = new RegExpHandler(/Chapter\s([1-9]\d{0,2}[A-C]?)\s+(?:(?:—|-)\s([^]+))/)
   const editionNoRegExp = new RegExpHandler(/(20\d{2})\sEDITION/)
   let formerChapRegExp = new RegExpHandler(/Chapter\s([1-9]\d{0,2}[A-C]?)\s\(Former\sProvisions\)/)
   let /**@type {HTMLParagraphElement[]} */ removalList = []
   let /**@type {boolean} */ notDone = true
   const pElements = docBody.querySelectorAll('p')

   /**loops through each parent, looking for elements of heading until allDone */
   pElements.forEach((aPara, index) => {
      if (notDone) {
         const paraText = aPara.textContent + ''
         if (formerChapRegExp.testMe(paraText)) { // identifying "former provisions" chapter
            infoCS(
               'Former provisions chapter detected',
               'buildHeading.js',
               'stripInfo'
            )
            headingInfo.isFormerProvisions = true
            thisChapNum = formerChapRegExp.firstMatchGroupNo(paraText, 1) // global variable in helper.js
            headingInfo.thisChapName = `(Former Provisions: ${pElements[index + 1]?.textContent})`
            headingInfo.thisTitleName = pElements[index + 3].textContent
            removalList.push(
               pElements[index + 1],
               pElements[index + 2],
               pElements[index + 3]
            )
            headingInfo.miscHead.innerHTML = `<p><b>Note:</b> All former sections in chapter have been repealed or renumbered.</p>
            <p>If "Show repealed/renumbered sections" is unchecked, the rest of the page will be blank.</p?`
            infoCS(
               `Found Title: ${headingInfo.thisTitleName} and chapter ${thisChapNum}: ${headingInfo.thisChapName}`,
               'buildHeading.js',
               'pElements.forEach'
            )
            notDone = false
            return
         }

         if (editionNoRegExp.testMe(paraText)) {
            headingInfo.thisEdition = editionNoRegExp.firstMatchGroupNo(paraText, 1) // Get ORS chapter number
            removalList.push(aPara, pElements[index + 1], pElements[index + 2])
            notDone = false
            return
         }
         if (!hasFoundChapter && chapNameRegExp.testMe(paraText)) {
            thisChapNum = chapNameRegExp.firstMatchGroupNo(paraText, 1) // Get ORS chapter number
            headingInfo.thisChapName = chapNameRegExp.firstMatchGroupNo(paraText, 2) // Get chapter title alone
            infoCS(
               `Found chapter ${thisChapNum}: ${headingInfo.thisChapName} in line ${index+1}`,
               'buildHeading.js',
               'stripInfo'
            )
            removalList.push(aPara)
            return
         }
         if (hasFoundChapter) {
            headingInfo.miscHead.appendChild(aPara) // moved to misc heading; leaves no copy in body
         } else {
            removalList.push(aPara) // deleted pieces not used anywhere
         }
      }
   })
   infoCS(
      `Deleting ${removalList.length} duplicate paragraphs from heading.`,
      'buildHeading.js',
      'stripInfo'
   )
   removalList.forEach(deadPara => {
      deadPara.remove()
   })
   return {
      headData: headingInfo,
      bodyComponent: docBody
   }
}

/**Create the <h1 - 3> elements and set their text content
* @param {object} headingInfo*/
const buildHeading = async headingInfo => {
   let headingChildrenList = []
   const h1Elem = document.createElement('h1')
   const h2Elem1 = document.createElement('h2')
   const h2Elem2 = document.createElement('h2')
   const h3Elem = document.createElement('h3')
   /**looks up volume & title from json file */
   const buildH2 = async () => {
      if (!headingInfo.isFormerProvisions) {
         const chapInfo = await deliverToBackground({getChapInfo: { chapNum: thisChapNum }}, true)
         h2Elem2.textContent = `Title ${chapInfo[1]}: ${chapInfo[4]},`
         h2Elem1.textContent = `Volume ${chapInfo[2]},`
         return chapInfo.length == 5 // error testing
      } else {
         return false
      }
   }
   if (await buildH2()) {headingChildrenList.push(h2Elem1, h2Elem2)}
   h1Elem.textContent = `Chapter ${thisChapNum}: ${headingInfo.thisChapName}` // chapter num & name
   headingChildrenList.push(h1Elem)
   h3Elem.textContent = headingInfo.isFormerProvisions ?
      '' :
      `Oregon Revised Statutes (${headingInfo.thisEdition} Edition)` // edition
   h3Elem.textContent.length > 0 && headingChildrenList.push(h3Elem)
   headingInfo.miscHead.textContent.length > 2 &&
   headingChildrenList.push(headingInfo.miscHead)

   // Create new heading <div>
   let htmlMainHead = document.createElement('div')
   htmlMainHead.id = 'mainHead'

   // Append the <h1 - 3> elements (+ any misc info between headings) to the heading <div>
   headingChildrenList.forEach(child => {
      htmlMainHead.appendChild(child)
   })

   //builds document <head> (includes title for the tab)
   let docHead = document.head
   let meta = document.createElement('meta')
   let headTitle = document.createElement('title')
   meta.name = 'viewport'
   meta.content = 'width=device-width'
   headTitle.textContent = `${thisChapNum}-${headingInfo.thisChapName}`
   docHead.appendChild(meta)
   docHead.appendChild(headTitle)

   for (let index = 0; index < docHead.style.length - 1; index++) {
      const styleElement = docHead.style[index]
      docHead.style.removeProperty(styleElement) // I just cannot get style to remove; tried a lot.
   }
   return htmlMainHead
}
