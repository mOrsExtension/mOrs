//storedData.js
//@ts-check

//TODO #12 - build userData classes with setters & getters to implement userParameters?
/*    class RetrieveUserDataAndRespond {
      constructor (command, responseFunction) {
         this.command = command
         this.responseFunction = responseFunction
      }
   } */

const implementUserParameters = async () => {

   /** returns promise to take in a command and executes function if true (or false if any)
   * @param {string} dataRequest
   * @param {any} responsiveFunction */
   const getInformation = async (dataRequest, responsiveFunction) => {
      try {
         const response = await sendAwait({'getStorage': dataRequest})
         const isReturnTrue = response[dataRequest]
         infoCS(
            `Response to '${dataRequest}'='${isReturnTrue}'`,
            'storedData.js',
            'getInformation'
         )
         responsiveFunction(isReturnTrue)
      } catch (e) {
         warnCS(
            `Error seeking response to '${dataRequest}': ${e}`,
            'storedData.js',
            'getInformation'
         )
      }
   }

   // MAIN Implement User Parameters
   await getInformation('collapseDefaultStored', doCollapse => {
      doCollapse ? collapseAllSections() : expandAllSections() // in helper.js
   })
   await getInformation('doShowBurnt', doShow => {
      showBurnt(doShow) // in helper.js
   })
   await getInformation('showSNsStored', isTrue => {
      showSourceNotes(isTrue) //  in helper.js
   })
   await getInformation('showFullWidth', isTrue => {
      setFullWidth(isTrue) // in helper.js
   })
   await getInformation('showMenuStored', isTrue => {
      showMenu(isTrue) // in helper.js
   })
   await getInformation('showNavStored', isTrue => {
      showVolumeOutline(isTrue) // in helper.js
    })
   return true
}

/** determines section from url (based on #xxx) */
/** scroll to html id tag in url, if any */
const navigateToTag = async () => {
   let navToTag = new TagHandler ()
   if (navToTag.hasTarget) {
      navToTag.scrollBrowserToTarget()
   }
}
const idFinder = /(?:\.html\#)([^\/]*)/
const newDelay = msecs => {
   setTimeout(() => {return true}, msecs)
}

class TagHandler {
   constructor (fullUrl) {
      this.url = fullUrl
      this.hasTarget = idFinder.test(fullUrl)
      if (this.hasTarget) {
         this.getUpperTargetString()
         this.setDocElement()
      }
   }
   getUpperTargetString () {
      try {
         let id = idFinder.exec(this.url)[1]
         if (id !=null) {
            this.targetIdString = id.toUpperCase()
         }
      } catch (error) {
         warnCS(error)
         this.hasTarget = false
      }
   }
   setDocElement() {
      let elem = document.getElementById(this.targetIdString)
      if (elem != null) {
         this.targetDocElement = elem
      } else {
         this.hasTarget = false
      }
   }

   async scrollBrowserToTarget() {
      await newDelay(1800) // delay in milliseconds before starting scroll. Seems to reduce issues with scrolling and then needing html redrawn.
      if (!this.hasTarget || this.targetDocElement == null) {
         return
      }
      infoCS(`navigating to ${this.targetDocElement.title}`, "userData.js", "scrollToTarget")
      this.targetDocElement.scrollIntoView()
      this.expandTarget ()
   }
   expandTarget () {
      try {
         expandSingle(this.targetDocElement) // helper.js - expands the section if collapsed
      } catch (error) {
         warnCS(error, "userData.js", "navigateToTag")
      }
   }
}

/**replaces part of stylesheet - called on launch or on msg from popup.js or options.js when user data changes re: stylesheet */
const userStylesRefresh = async () => {
   const theRootStyle = document.documentElement.style
   try {
      const replacementSheet = await sendAwait({miscTask: 'buildColorData'}) // calls /background/style.js
      for (let key in replacementSheet) {
         theRootStyle.setProperty(`--${key}`, replacementSheet[key])
      }
      infoCS(
         `Added user css properties to stylesheet: ${JSON.stringify(replacementSheet)}`,
         'userData.js',
         'userStylesRefresh'
      )
   } catch (e) {
      warnCS(
         `Error applying stylesheet ${e}.`,
         'userData.js',
         'userStylesRefresh'
      )
   }
}