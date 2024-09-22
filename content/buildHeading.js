//buildHeading.js

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
    const /** capGroups $1:chapNo, $2:chapName */chapNameRegExp = new RegExpHandler(/Chapter\s([1-9]\d{0,2}[A-C]?)\s+(?:(?:—|-)\s([^]+))/)
    const /** capGroup $1:editionYear */ editionRegExp = new RegExpHandler(/(20\d{2})\sEDITION/)
    const /** capGroup $1:chapNo */ formerChapRegExp = new RegExpHandler(/Chapter\s([1-9]\d{0,2}[A-C]?)\s\(Former\sProvisions\)/)
    const /**@type {HTMLParagraphElement[]} */ removalList = []
    let hasFoundChapter = false
    let /**@type {boolean} */ notDone = true
    const pElements = docBody.querySelectorAll('p')

//FUNCTIONS
    const main = () => {
        pElements.forEach((pElem, index) => {
            if (notDone) {
            getChapInfoAndBodyRemovalList(pElem, index)
            }
        })
        infoCS(`Deleting ${removalList.length} duplicate paragraph(s) from heading.`, 'buildHeading.js', 'main')
        removalList.forEach(deadPara => {
            deadPara.remove()
        })
        return {
            bodyComponent: docBody
        }
    }
    const getChapInfoAndBodyRemovalList = (/**@type {HTMLParagraphElement} */pElem, /**@type {Number} */ index) => {
        const paraText = pElem.textContent + ''
        if (formerChapRegExp.testMe(paraText)) { // identifying "former provisions" chapter
            infoCS('Former provisions chapter detected', 'buildHeading.js', 'getChapInfoAndBodyRemovalList')
            chapterInfo.isFormerProvisions = true
            chapterInfo.chapNo = formerChapRegExp.firstMatchGroupNo(paraText, 1)
            chapterInfo.chapName = `(Former Provisions: ${pElements[index + 1]?.textContent})`
            let titleCandidate = pElements[index + 3].textContent
            chapterInfo.titleName = (titleCandidate != null) ? titleCandidate : ''
            removalList.push(
                pElements[index + 1],
                pElements[index + 2],
                pElements[index + 3]
            )
            chapterInfo.miscHead.innerHTML = `<p><b>Note:</b> All former sections in chapter have been repealed or renumbered.</p>
            <p>If "Show repealed/renumbered sections" is unchecked, the rest of the page will be blank.</p?`
            infoCS(`Found Title: ${chapterInfo.titleName} and chapter ${chapterInfo.chapNo}: ${chapterInfo.chapName}`, 'buildHeading.js', 'getChapInfoAndBodyRemovalList')
            notDone = false
            return
        }
        if (editionRegExp.testMe(paraText)) {
            chapterInfo.thisEdition = editionRegExp.firstMatchGroupNo(paraText, 1) // get edition year
            removalList.push(pElem, pElements[index + 1], pElements[index + 2]) // delete next two paragraphs
            notDone = false
            return
        }
        if (!hasFoundChapter && chapNameRegExp.testMe(paraText)) {
            chapterInfo.chapNo = chapNameRegExp.firstMatchGroupNo(paraText, 1) // Get ORS chapter number
            chapterInfo.chapName = chapNameRegExp.firstMatchGroupNo(paraText, 2) // Get chapter title alone
            infoCS(`Found chapter ${chapterInfo.chapNo}: ${chapterInfo.chapName} in paragraph #${index+1}`, 'buildHeading.js', 'getChapInfoAndBodyRemovalList')
            removalList.push(pElem) // deleted pieces not used anywhere (will build new heading from scratch below)
            return
        }
        /**paragraphs after the chapter and before edition are moved to misc heading; leaves no copy in body*/
        if (hasFoundChapter) {
            chapterInfo.miscHead.appendChild(pElem)
        } else {
            removalList.push(pElem) // before the chapter, these are deleted pieces not used anywhere
        }
    }

// EXECUTE
    return main()
}

/**Create the <h1 - 3> elements and set their text content */
const buildHeading = async () => {
    let headingChildrenList = [...await buildH2()]
    headingChildrenList.push(buildH1())
    headingChildrenList.concat([...buildH3()])
    if (Boolean(chapterInfo.miscHead.textContent)) {   // must be non-falsy
        chapterInfo.miscHead.classList.add('note')
        headingChildrenList.push(chapterInfo.miscHead)
    }
    let htmlMainHead = document.createElement('div')
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
        h2Title.textContent = `Title ${chapterInfo.volNo}: ${chapterInfo.titleName},`
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
