//buildOrLawLinks.js
//@ts-check

/** Returns #main id of body of document with updated links to Oregon Session Laws for HeinOnline or oregonLegislature.gov
 * @param {Node} bodyMain // already tagged with anchors classed as 'sessionLaw' */
const newOrUpdateOrLawLinks = async bodyMain => {
   try {
      const anchorList = getAnchorList(bodyMain)
      const response = await sendAwaitResponse('getOrLaw') // check user form input for source of OrLaws lookup (Hein/OrLeg)
      const orLaw = response.response
      switch (orLaw) {
         case 'Hein': {
            buildHeinLinks(anchorList)
         } break

         case 'OrLeg': {
            const sortedAnchors = sortByDate(anchorList)
            deleteAllLinks(sortedAnchors.oldList)
            buildOrLegLinks(sortedAnchors.newList)
         } break

         case 'Both': {
            const sortedAnchors = sortByDate(anchorList)
            buildHeinLinks(sortedAnchors.oldList)
            buildOrLegLinks(sortedAnchors.newList)
         } break

         default: {
            deleteAllLinks(anchorList)
         } break
      }
      return bodyMain
   } catch (error) {
      const warning = `Error attempting to generate OrLaws links: ${error}`
      warnCS(warning, 'navigate.js', 'OrLawLinking')
   }
}

/** put info into anchors (data-year, data-chapter, data-ss) to keep data gathering & link building separate */
const getAnchorList = (html) => {
   const sessionLawAnchors = html.querySelectorAll('a.sessionLaw')
   if (sessionLawAnchors.length < 1) {
      return []
   }
   if (isAnchorListTagged[0]) {
      return sessionLawAnchors
   }
   addTagsToAllAnchors(sessionLawAnchors)
   return sessionLawAnchors
}
const isAnchorListTagged = anchor => {
   let isTagged = (anchor.dataset.year != null)
      infoCS(`Laws ${(isTagged ? 'were':'need')} tagged with data.`, 'orLawLinking.js', 'OrLawLinking')
      return isTagged
   }
const addTagsToAllAnchors = anchorList => {
   anchorList.forEach(anAnchor => {
      const anchorText = anAnchor.textContent
      const anchorData = anAnchor.dataset
      anchorData.year = setYear(anchorText)
      const isLong = /hapter/.test(anchorText)  // e.g. "Chapter 13, Oregon Laws 2023" v. "2023 c.13"`
      anchorData.chapter = setChapter(anchorText, isLong)
      const shortSession = setShortSession(anchorText, isLong)
      if (shortSession !=null) {
         anchorData.shortSession = shortSession
      }
   })
   return anchorList
}
const setYear = text => {
   text.replace(/[^]*((?:20|19)\d{2})[^]*/, '$1')
}
const setChapter = (text, isLong) => {
   return isLong
      ? text.replace(/[^]*hapter (\d{1,4})[^]*/, '$1')
      : text.replace(/[^]*c\.(\d{1,4})[^]*/, '$1')
}
const setShortSession = (text, isLong) => {
   if (isLong && /\sspecial\ssession/.test(text)) {
      let sessionOrdinal = text.replace(/[^]*\(([\w]+)\sspecial\ssession\)[^]*/, '$1').toLowerCase()
      return ['0', 'first', 'second', 'third', 'forth', 'fifth'].forEach((ordinal, index) => {
         if (ordinal == sessionOrdinal) {
            return index.toString()
         }
      })
   }
   return /s\.s\./.test(text) ? text.replace(/[^]*s\.s\.(\d)[^]*/, '$1') : null
}

/** building links for HeinOnline through SOLL for each anchor (session law reference) in chapter
* @param {any} sessionLawAnchors // will be list of anchors */
const buildHeinLinks = sessionLawAnchors => {
   infoCS('Building HeinOnline Links', 'buildOrLawLinks.js', 'buildHeinLinks')
   sessionLawAnchors.forEach(anAnchor => {
      const HeinUrl =  buildHeinURL(anAnchor.dataset.year, anAnchor.dataset.chapter)
      appendLinkData(anAnchor, HeinUrl)
   })
}
const buildHeinURL = (year, chapter) => {
   return `https://heinonline-org.soll.idm.oclc.org/HOL/SSLSearchCitation?journal=ssor&yearhi=${year}&chapter=${chapter}&sgo=Search&collection=ssl&search=go`
}

const sortByDate = anchors => {
   let newList = []
   let oldList = []
   anchors.forEach(anAnchor => {
      anAnchor.dataset.year > 1998
       ? newList.push(anAnchor)
       : oldList.push(anAnchor)
   })
   return {"oldList": oldList, "newList": newList}
}

/**builds links for oregonlegislature.gov session laws for each anchor (session law reference) in chapter */
const buildOrLegLinks = (anchors) => {
   infoCS('building OrLeg links', 'buildOrLawLinks.js', 'buildOrLegLinks')
   anchors.forEach(async (anAnchor) => {
      const orLegUrl  = await buildOrLegUrl(
         anAnchor.dataset.year,
         anAnchor.dataset.chapter,
         anAnchor.dataset.ss
      )
      appendLinkData(anAnchor, orLegUrl)
   })
}

/** Converts data in anchor into OrLeg url for session law *
   * @param {string} year
   * @param {string} chapter
   * @param {string} specialSession*/
const buildOrLegUrl = async (year, chapter, specialSession) => {
   const addSpecialSession = specialSession ? ` s.s.${specialSession}` : ''
   const yearAndSS = `${year}${addSpecialSession}`
   const pdfFileCode = await getOrLegLookupJson[yearAndSS]
   if (pdfFileCode != null) {
      let orLawFileName = pdfFileCode.replace(/~/, '000' + chapter)
      orLawFileName = orLawFileName.replace(/([^]*?\w)0*(\d{4}(?:\.|\w)*)/, '$1$2') /** trim excess zeros */
      return `https://www.oregonlegislature.gov/bills_laws/lawsstatutes/${orLawFileName}`
   } else {
      warnCS(`Cannot find [${yearAndSS}] in ORS lookup.`, 'buildOrLawLinks.js', 'buildOrLegUrl')
      return ''
   }
}
let oreLegLookupJson = null // cashing global object
const getOrLegLookupJson = async () => {
   if (oreLegLookupJson == null) {
      infoBG('retrieving OrLegLookup', 'buildOrLawLinks.js', 'getOrLegLookupJson')
      oreLegLookupJson = await sendAwaitResponse({'getJson':'OrLawLegLookup'})
   } return oreLegLookupJson
}

const deleteAllLinks = (anchors) => {
   anchors.forEach(anAnchor => {
      removeLinkData(anAnchor)
   })
}

const appendLinkData = (anchor, url) => {
   if (url.length > 0) {
      anchor.rel = 'noopener'
      anchor.classList.remove('linkOff')
      anchor.href = url
   }
}
const removeLinkData = anchor => {
   anchor.classList.add('linkOff')
   anchor.removeAttribute('rel')
   anchor.removeAttribute('href')
}
