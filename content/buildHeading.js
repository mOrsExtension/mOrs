//buildHeading.js

/** Global constant with information about the ORS chapter being viewed*/
const chapterInfo = {
   isFormerProvisions: false,
   chapNo: '0',
   titleNo: '0',
   volNo: '0',
   chapName: '',
   titleName: '',
   miscHead: document.createElement('div'), //info in heading that isn't title, chapter or edition (usually notes about short session)
}

/**Find elements of heading (title, chapter, edition, notes)
* Returns headingPieces object containing the info needed to build headingDiv
* Removes existing heading elements from the main body and returns remainder */
const extractChapterInfo = (/**@type {HTMLBodyElement}*/ docBody) => {

//VARIABLES
    const /** capGroups $1:chapNo, $2:chapName */chapNameAndNoRegExp = new RegExpHandler(/Chapter\s([1-9]\d{0,2}[A-C]?)\s+(?:(?:—|-)\s([^]+))/)
    const /** capGroup $1:editionYear */ editionRegExp = new RegExpHandler(/(20\d{2})\sEDITION/)
    const /** capGroup $1:chapNo */ formerChapRegExp = new RegExpHandler(/Chapter\s([1-9]\d{0,2}[A-C]?)\s\(Former\sProvisions\)/)
	const titleRegExp = new RegExpHandler(/TITLE\s[1-9]/)
	const horizontalLineRegExp = new RegExpHandler(/_{15}/)
    const /**@type {HTMLParagraphElement[]} */ removalList = []
    let /**@type {boolean} */ addToMiscHead = false
    let /**@type {boolean} */ isDone = false
    const allParagraphs = docBody.querySelectorAll('p')
	let endIndex = 1000

//FUNCTIONS
	/** extracts data from heading; strips out heading & misc junk; and returns document body */
    const main = () => {
		allParagraphs.forEach((aPara, index) => {
			if (index <= endIndex) {
				getChapInfoAndBodyRemovalList(aPara, index)
			}
		})
        infoCS(`Deleting ${removalList.length} paragraphs from heading.`, 'buildHeading.js', 'main')
        removalList.forEach(deadPara => {
            deadPara.remove()
        })
        return {
            bodyComponent: docBody
        }
    }
	/** interate through paragraphs until TOC (isDone) found */
    const getChapInfoAndBodyRemovalList = (/**@type {HTMLParagraphElement} */aPara, /**@type {Number} */ index) => {
        const paraText = aPara.textContent + ''
		removalList.push(aPara)
		
		if (formerChapRegExp.testMe(paraText)) { 
			infoCS('Former provisions chapter detected', 'buildHeading.js', 'getChapInfoAndBodyRemovalList')
			chapterInfo.isFormerProvisions = true
			chapterInfo.chapNo = formerChapRegExp.firstMatchGroupNo(paraText, 1)
			chapterInfo.chapName = `(Former Provisions: ${allParagraphs[index + 1]?.textContent})`
			titleCandidate = allParagraphs[index + 3].textContent
			chapterInfo.titleName = (titleCandidate != null) ? titleCandidate : ''
			endIndex = index + 3
			chapterInfo.miscHead.innerHTML = `<p><b>Note:</b> All former sections in chapter have been repealed or renumbered.</p>
			<p>If "Show repealed/renumbered sections" is unchecked, the rest of the page will be blank.</p?`
			infoCS(`Found Title: ${chapterInfo.titleName} and chapter ${chapterInfo.chapNo}: ${chapterInfo.chapName}`, 'buildHeading.js', 'getChapInfoAndBodyRemovalList')
		}
		
        if (editionRegExp.testMe(paraText)) {
            chapterInfo.thisEdition = editionRegExp.firstMatchGroupNo(paraText, 1) // get edition year
			endIndex = index + 2 // TOC will start in 3 lines, unless we run into "TITLE ##"
			addToMiscHead = false
        }
		
		if (titleRegExp.testMe(paraText)) {
			infoCS('Beginning of title detected', 'buildHeading.js', 'getChapInfoAndBodyRemovalList')
			endIndex = 1000
			addToMiscHead = false
		}
		
		if (horizontalLineRegExp.testMe(paraText)) {
			endIndex = index + 2 // end of title list; TOC will start in 2 lines unless chapter starts
		}
			
        if (!addToMiscHead && chapNameAndNoRegExp.testMe(paraText)) {
            addToMiscHead = true
            chapterInfo.chapNo = chapNameAndNoRegExp.firstMatchGroupNo(paraText, 1) // Get ORS chapter number
            chapterInfo.chapName = chapNameAndNoRegExp.firstMatchGroupNo(paraText, 2) // Get chapter title alone

            infoCS(`Found chapter ${chapterInfo.chapNo}: ${chapterInfo.chapName} in paragraph #${index+1}`, 'buildHeading.js', 'getChapInfoAndBodyRemovalList')
			endIndex = 1000
			
            return
        }

/** depreciating 
        if (chapNameRegExp.testMe(paraText)) {  // second time we see chapter name, we're finished
            removalList.push(aPara, allParagraphs[index + 1]) // delete next line as well
            isDone = true
            return
        }
*/

        /**paragraphs after the chapter and before edition are moved to misc heading; leaves no copy in body*/
        if (addToMiscHead) {
            chapterInfo.miscHead.appendChild(aPara.cloneNode(true))
			infoCS(`adding to heading note: "${paraText.trim(40)}..."`, 'buildHeading.js', 'getChapInfoAndBodyRemovalList') 
			console.log(chapterInfo.miscHead)
			console.log(chapterInfo.miscHead.textContent)
        } 
    }


// EXECUTE
    return main()
}

/**Create the <h1 - 3> elements and set their text content 
 * H1 = Chapter Number (comes third) 
 * H2 = Volume & title
 * H3 = ORS Edition*/
const buildHeading = async () => {
    let headingChildrenList = [...await buildH2()]
    headingChildrenList.push(buildH1())
    headingChildrenList.concat([...buildH3()])
    let htmlMainHead = document.createElement('div')
	if (Boolean(chapterInfo.miscHead.textContent)) {   // must be non-falsy content
		chapterInfo.miscHead.classList.add('note')
		headingChildrenList.push(chapterInfo.miscHead)
	}
    htmlMainHead.id = 'mainHead'
    // Append the <h1 - 3> elements (+ any misc info between headings) to the heading <div>
    headingChildrenList.forEach(child => {
        htmlMainHead.appendChild(child)
    })
    return htmlMainHead
}
const buildH2 = async () => {
    if (!chapterInfo.isFormerProvisions) {
        const h2Volume = document.createElement('h2')
        const h2Title = document.createElement('h2')
        const extraChapInfo = await sendAwait({getChapInfo: { chapNum: chapterInfo.chapNo }}, true)
        chapterInfo.titleNo = extraChapInfo.titleNo
        chapterInfo.volNo = extraChapInfo.volNo
        chapterInfo.titleName = extraChapInfo.titleName
        h2Title.textContent = `Title ${chapterInfo.titleNo}: ${chapterInfo.titleName},`
        h2Volume.textContent = `Volume ${extraChapInfo.volNo},`

		return [h2Volume, h2Title]
    } else {
        return []
    }
}
const buildH1 = () => {
    const h1Chapter = document.createElement('h1')
    h1Chapter.textContent = `Chapter ${chapterInfo.chapNo}: ${chapterInfo.chapName}` // chapter num & name
    return h1Chapter
}
const buildH3 = () => {
    if (chapterInfo.isFormerProvisions != null) {
        const h3Edition = document.createElement('h3')
        h3Edition.textContent = `Oregon Revised Statutes (${chapterInfo.thisEdition} Edition)` // edition
        return [h3Edition]
    }
    return []
}

/** @function addToHead */
const addToHead = () => {
    //builds document <head> (includes title for the tab)
    let docHead = document.head
    let meta = document.createElement('meta')
    meta.name = 'viewport'
    meta.content = 'width=device-width'
    docHead.appendChild(meta)
    let headTitle = document.createElement('title')
    headTitle.textContent = `${chapterInfo.chapNo}-${chapterInfo.chapName}`
    docHead.appendChild(headTitle)
}
