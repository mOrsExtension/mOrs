//firstClean.js
//@ts-check

const firstClean = async (bodyNode) => {
   let bodyHtml = bodyNode.innerHTML
   bodyHtml = regExpCleanUp(bodyHtml)
   bodyNode.innerHTML = wrapAnchorText(bodyHtml)
   bodyNode = removeSpanStyles(bodyNode)
   bodyNode = cleanParagraphs(bodyNode)
   bodyHtml = await(errataFixes(bodyNode.innerHTML))
   bodyNode.innerHTML = bodyHtml
   return bodyNode
}

const regExpCleanUp = bodyHTML => {
   const /** @type {[RegExp|String, String][]} */ cleanUpList = [
      [/(\n|\r|\f|\s\s)+/, ' '], // removes line breaks, double spaces
      [/\s\s+/, ' '], // removes left over double spaces ('done twice to deal with odd number of spaces >2)
      [/<div[^>]*>/, ''], // remove opening divs
      [/<\/div>/, ''], // remove closing divs
      [/\[(19\d{2}|20\d{2}|Sub|For|Re|Am)/, '</p><p class="default">[$1'], // new paragraph for source notes
      [/<\/b>/, '</b></p><p class="default">'] // new paragraph after bold text ends
   ]
   cleanUpList.forEach(([toReplace, replaceWith]) => {
      bodyHTML = replacer(bodyHTML, aRegExp(toReplace), replaceWith)
   })
   return bodyHTML
}

const wrapAnchorText = bodyHTML => {
   bodyHTML = anchorWrap(
      /**wrap ORS chapters in anchor class="orsLink"*/
      bodyHTML,
      /\b[1-9]\d{0,2}[A-C]?\b\.(\d{3}\b|\b7\dA?\.\d{4})\b/,
      'orsLink'
   )
   bodyHTML = anchorWrap(
      /**wrap "Preface to ORS text" in anchor */
      bodyHTML,
      /Preface\sto\sOregon\sRevised\sStatutes/,
      'preface'
   )
   bodyHTML = anchorWrap(
      /**wrap "CST" references in anchor */
      bodyHTML,
      /(\d{4}\sComparative\sSection\sTable\slocated\sin\sVolume\s22)/,
      'cst'
   )
   bodyHTML = anchorWrap(
      //wrap session laws in source notes in anchor
      bodyHTML,
      /((?:20|19)\d{2})(?:\W*s\.s\.\d?)?\W*c\.\W*(\d+)/, // ("e.g. 2015 c.218"; "1996 s.s.1 c.3"; "1974 s.s. c.24")
      'sessionLaw'
   )
   bodyHTML = anchorWrap(
      // wrap session laws references in text in anchor
      bodyHTML,
      // (e.g. Chapter 28, Oregon Laws 2015, or "chapter 3, Oregon Laws 2020 (first special session)."
      /(?:C|c)hapter\s(\d{1,4}),\sOregon\sLaws\s((?:20|19)\d{2})(\s\(\w+\sspecial\ssession\))?/,
      'sessionLaw'
   )
   return bodyHTML
}
/**wraps text found by regular expression in an anchor & gives it <a> class; helper.js
* @param {string} oldText
* @param {RegExp|string} regExWrap
* @param {string} anchorClass */
const anchorWrap = (oldText, regExWrap, anchorClass) => {
   return oldText.replace(aRegExp(regExWrap), (/** @type {string} */ match) => {
      return `<a class="${anchorClass}">${match}</a>`
   })
}

const removeSpanStyles = (/**@type {Node}*/ docBody) => {
   const spanElements = docBody.querySelectorAll('span[style]')
   spanElements.forEach(aSpan => {
      const spanParent = aSpan.parentElement
      while (aSpan.firstChild) {
         spanParent.insertBefore(aSpan.firstChild, aSpan)
      }
      spanParent.removeChild(aSpan)
   })
   return docBody
}

const cleanParagraphs = (/**@type {Node}*/ docBody) => {
   const pElements = docBody.querySelectorAll('p')
   pElements.forEach(aPara => {
      aPara.removeAttribute('style') // remove all style elements
      aPara.removeAttribute('align') // remove all align elements
      aPara.className = 'default' // Reclassify all <p> elements to "default"
      if (!/[\S]+/.test(aPara.textContent)) {aPara.remove()} //delete paragraphs without text
   })
   return docBody
}

/** Returns string of text with errata replaced per errataList.json
* and global RegExp cleanup & wrapping of anchors (links) */
const errataFixes = async (/**@type {String}*/ bodyHtml) => {
   /**returns errataList from JSON file /data/errataList.json as {key:value} object*/
   const promiseErrataList = await (async () => {
      try {
         return await deliverToBackground({'fetchJson':'ErrataList'})
      } catch (e) {
         warnCS(e)
         return bodyHtml
      }
   })()

   // After awaiting the retrieval of list, iterate through it and make each regExp change to text
   const errataList = await promiseErrataList
   for (var key in errataList) {
      bodyHtml = replacer(
         bodyHtml,
         errataList[key]['old'],
         errataList[key]['new']
      )
   }
   return bodyHtml
}
