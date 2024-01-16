//enhanceSecs.js
//@ts-check

let annoList
const sectionAdjustments = async () => {
   document.body.querySelectorAll('div.section').forEach(aDiv => { // cycle through div w/ class of 'section'
      addIds(aDiv)
      labelBurnt(aDiv)
   })
   annoList = await getAnnoList()
   if ('chapter' in annoList) {
      const firstORS = document.body.querySelector('div.ors')
      if (firstORS !=null) {
         const firstId = firstORS.id
         console.log(`First ORS Section = ${firstId}`)
         if (!(firstId in annoList)) {
            annoList[firstId] = {}
         }
         annoList[firstId] = annoList.chapter
         delete annoList.chapter
      }
   }
   for (const anno in annoList) {
      annoList[anno]['div'] = addDivToAnnoList(annoList[anno])
   }
   document.body.querySelectorAll('div.section').forEach(aDiv => { // cycle through div w/ class of 'section'
      addAnnos(aDiv)
      addButtonsToSections(aDiv)
   })
   addCollapseToggleButtons()
   const links = splitInternalAndExternalLinks()
   links.externalOrs.forEach(aLink => {
      aLink.classList.add('linkExt')
   })
   links.internalOrs.forEach(aLink=> {
      aLink.anchor.classList.add('linkInt')
      makeLinkExpandTarget(aLink)
   })
}

const getAnnoList = async () => {
   return await sendAwait({'miscTask': 'finishAnnoRetrieval'})
}

const addDivToAnnoList = anno => {
   const newDiv = document.createElement('div')
   newDiv.classList.add('annotations')
   const details = document.createElement('details')
   const summary = document.createElement('summary')
   summary.innerHTML = `<b>ANNOTATIONS</b>`
   newDiv.appendChild(details)
   details.appendChild(summary)
   for (const type in anno) {
      const typePara = document.createElement('p')
      typePara.textContent = type
      const uList = document.createElement('ul')
      details.appendChild(typePara)
      details.appendChild(uList)
      try {
         anno[type].forEach(child => {
            let listItem = document.createElement('li')
            listItem.innerHTML = child
            uList.appendChild(listItem)
         })
      } catch (error) {
         console.log(`${error}\n${JSON.stringify(anno[type])}`)
      }
   }
   return newDiv
}


/**labels burnt sections as former ORS provisions */
const labelBurnt = (aDiv) => {
   if (aDiv.classList.contains('burnt')) {
      aDiv.children[0].textContent = `[Former ORS ${aDiv.children[0].textContent}]`
   }
}

/** Adds id# to guide expansion when internal links are used (in addCollapseButtons below) */
const addIds = (aDiv) => {
   if (aDiv.classList.contains('ors') || aDiv.classList.contains('burnt')) {
      const anchor = aDiv?.children[0]?.querySelector('a')
      if (anchor == null) { return }
      aDiv.id = anchor.textContent?.trim() // make the button id = the anchor text (its ORS #)
      const replText = document.createTextNode(anchor.textContent)
      aDiv.children[0].replaceChild(replText, anchor) // then remove the link (because it would just point to itself, pointlessly)
   }
}

/** adds section annotations from /ano###.html/ */
const addAnnos = (aDiv) => {
   if (aDiv.id in annoList) {
      aDiv.appendChild(annoList[aDiv.id].div)
   }
}

const addButtonsToSections = (aDiv) => {
   const newButton = document.createElement('button') // creating button functionality for collapsible divs that will include the section head
   newButton.className = 'collapser'
   const collapsibleDiv = document.createElement('div') // creating collapsible div below button that will include section body
   collapsibleDiv.className = 'collapsible'
   let childrenList = [...aDiv.children]
   childrenList.forEach((childOfDiv, index) => { // cycling through the section div's children
      if (index == 0) {
         newButton.appendChild(childOfDiv) // first line becomes the button
      } else {
         collapsibleDiv.appendChild(childOfDiv) // the rest go in the collapsible part of section
      }
   }) // forEach subUnit
   aDiv.appendChild(newButton) // adding button to current div
   aDiv.appendChild(collapsibleDiv) // and collapsible to current div
}

/** Adds functionality for each section leadline button to toggle expand/collapse following section */
const addCollapseToggleButtons = () => {
   document.querySelectorAll('button.collapser').forEach(buttonElement => {
      buttonElement.addEventListener('click', () => {
         buttonElement.nextElementSibling.classList.toggle('invisibility')
      })
   })
}

/** cycles through each internal ORS link adds button element to force target to expand on click */
const splitInternalAndExternalLinks = () => {
   let externalOrs = []
   let internalOrs = []
   document.querySelectorAll('a.orsLink').forEach(aLink => {
      let linkText = aLink.textContent
      if (isInternalChapLink(linkText)) {
         internalOrs.push({'text':linkText, 'anchor':aLink })
      } else {
         externalOrs.push(aLink)
      }
   })
   return {"externalOrs":externalOrs, "internalOrs": internalOrs}
}

/**@param {string} linkText */
const isInternalChapLink = linkText => {
   return new RegExpHandler(`\\b${chapterInfo.chapNo}\\.`).testMe(linkText)
}

const makeLinkExpandTarget = aLink => {
   let target = getCollapsibleTarget(aLink.text)
   if (target != null) {
      aLink.anchor.addEventListener('click', () => {
         expandSingle(target)
         infoCS(
            `scrolling to ${aLink.anchor.innerHTML}`,
            'enhanceSecs.js',
            'makeLinkExpandTarget'
         )
      })
   }
}

const getCollapsibleTarget = linkText => {
   const targetSection = document.getElementById(linkText)
   const collapsible = targetSection?.children[1]
   if (collapsible?.classList.contains('collapsible')) {
      return targetSection
   }
   warnCS(
      `Link target: '${linkText}' does not exist; or lacks collapsible children:\n Target is '${
         targetSection?.tagName}'. Child is '${collapsible?.tagName}'.`,
      'enhanceSecs.js',
      'getCollapsibleTarget'
   )
   return null
}
