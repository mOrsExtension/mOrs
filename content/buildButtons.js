//buttons.js
//@ts-check

/**Adds buttons for collapsible divs;
 * Adds id# to guide expansion when internal links are used (addCollapseButtons below)
 * Goes through each section & adds collapsing button out of heading & makes body of section collapsable */
const addButtons = () => {
   const addButtonsToSections = () => {
      document.body.querySelectorAll('div.section').forEach(aDiv => { // cycle through div w/ class sections
         let isORS = aDiv.classList.contains('ors')
         let isBurnt = aDiv.classList.contains('burnt')
         let newButton = document.createElement('button') // creating button functionality for collapsible divs that will include the section head
         newButton.className = 'collapser'
         let newCollapsibleDiv = document.createElement('div') // creating collapsible div below button that will include section body
         newCollapsibleDiv.className = 'collapsible'
         Array.from(aDiv.children).forEach(childOfDiv => { // cycling through the section div's children
            if (childOfDiv.classList.contains('sectionStart')) {  // First line becomes the button
               if (isBurnt || isORS) {  // ORS sections get id for internal links
                  const anchor = childOfDiv?.querySelector('a') // get the ORS section itself (including repealed/renumbered secs)
                  if (anchor) { // there ought to be one, but just to avoid throwing any errors
                     aDiv.id = anchor.textContent?.trim() // make the button id = the anchor text (its ORS #)
                     const replText = document.createTextNode(anchor.textContent)
                     childOfDiv.replaceChild(replText, anchor) // then remove the link (because it would just point to itself, pointlessly)
                  }
                  if (isBurnt) {
                     childOfDiv.textContent = `[Former ORS ${childOfDiv.textContent}]` // amend text to clarify it's former & not current ORS
                  }
               }
               newButton.appendChild(childOfDiv) // put the line in the button
            } else { // other than the first line
               newCollapsibleDiv.appendChild(childOfDiv) // put the text in the collapsible part of section
            }
         }) // forEach subUnit
         aDiv.appendChild(newButton) // adding button to current div
         aDiv.appendChild(newCollapsibleDiv) // and collapsible to current div
      })
   } // forEach section divs

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
      return aRegExp(`\\b${thisChapNum}\\.`).test(linkText)
   }

   const makeLinkExpandTarget = aLink => {
      let target = getCollapsibleTarget(aLink.text)
      if (target != null) {
         aLink.anchor.addEventListener('click', () => {
            expandSingle(target)
            infoCS(
               `scrolling to ${aLink.anchor.innerHTML}`,
               'buttons.js',
               'buildORSLinkButton'
            )
         })
      }
   }

   const getCollapsibleTarget = linkText => {
      const targetSection = document.getElementById(linkText)
      const collapsible = targetSection?.children[1]
      if (collapsible?.classList.contains('collapsible')) {
         return collapsible
      }
      warnCS(
         `Link target: '${linkText}' does not exist; or lacks collapsible children:\n Target is '${
          targetSection?.tagName}'. Child is '${collapsible?.tagName}'.`,
         'buttons.js',
         'buildOrsLinkButton'
      )
      return null
   }

   // buttons MAIN:
   addButtonsToSections()
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
