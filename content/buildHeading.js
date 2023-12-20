//heading.js
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
   const chapNameRegEx = /Chapter\s([1-9]\d{0,2}[A-C]?)\s+(?:(?:—|-)\s([^]+))/
   let /**@type {HTMLParagraphElement[]} */ removalList = []
   let /**@type {boolean} */ notDone = true
   const pElements = docBody.querySelectorAll('p')

   /**loops through each parent, looking for elements of heading until allDone */
   pElements.forEach((aPara, index) => {
      if (notDone) {
         const paraText = aPara.textContent + ''
         if (/\d\s\(Former\sProvisions\)/.test(paraText)) { // identifying "former provisions" chapter
            infoCS(
               'Former provisions chapter detected',
               'heading.js',
               'buildHeading'
            )
            headingInfo.isFormerProvisions = true
            thisChapNum = ifRegExMatch(/Chapter\s([1-9]\d{0,2}[A-C]?)/, paraText, 0, 1) // global variable in helper.js
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
               'heading.js',
               'pElements.forEach'
            )
            notDone = false
            return
         }

         if (/(20\d{2})\sEDITION/.test(paraText)) {
            headingInfo.thisEdition = ifRegExMatch(/(20\d{2})/, paraText) // Get ORS chapter number
            removalList.push(aPara, pElements[index + 1], pElements[index + 2])
            notDone = false
            return
         }
         if (!hasFoundChapter && chapNameRegEx.test(paraText)) {
            thisChapNum = ifRegExMatch(chapNameRegEx, paraText, 0, 1) // Get ORS chapter number
            headingInfo.thisChapName = ifRegExMatch(chapNameRegEx, paraText, 0, 2) // Get chapter title alone - could kill and just retrieve from .json, but this works.
            hasFoundChapter = true
            removalList.push(aPara)
            return
         }
         if (hasFoundChapter) {
            //everything either gets appended or deleted until we get to
            headingInfo.miscHead.appendChild(aPara) // will automatically remove it from body when moving
         } else {
            removalList.push(aPara)
         }
      }
   })
   infoCS(
      `Deleting ${removalList.length} duplicate paragraphs from heading.`,
      'heading.js',
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
         const response = await sendAwaitResponse({chapInfo: { chapNum: thisChapNum }})
         const chapInfo = response.response
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

   // Append the <h1 - 3> elements to the <div> element + any misc info between headings
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
