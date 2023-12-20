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
   * @param {string} command
   * @param {any} aFunction */


   const getInformation = async (command, aFunction) => {
      try {
         const response = await sendAwaitResponse(command)
         const isReturnTrue = response.response
         infoCS(
            `Response to '${command}'='${isReturnTrue}'`,
            'storedData.js',
            'getInformation'
         )
         aFunction(isReturnTrue)
      } catch (e) {
         warnCS(
            `Error seeking response to '${command}': ${e}`,
            'storedData.js',
            'getInformation'
         )
      }
   }

   // MAIN Implement User Parameters
   await getInformation('getCollapsed', isTrue => {
      isTrue ? collapseAllSections() : expandAllSections() // in helper.js
   })
   await getInformation('getShowBurnt', isTrue => {
      doShowBurnt(isTrue) // in helper.js
   })
   await getInformation('getShowSNs', isTrue => {
      doShowSourceNotes(isTrue) //  in helper.js
   })
   await getInformation('getFullWidth', isTrue => {
      setFullWidth(isTrue) // in helper.js
   })
   await getInformation('getShowMenu', isTrue => {
      doShowMenu(isTrue) // in helper.js
   })
   await getInformation('getShowNavigation', isTrue => {
      doShowNav(isTrue) // in helper.js
    })
   return true
}

/** determines section from url (based on #xxx) */
/** scroll to html id tag in url, if any */
const navigateToTag = async () => {
   let navToTag = new TagHandler (window.location.toString())
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
      await newDelay(1800) // delay in miliseconds before starting scroll. Seems to reduce issues with scrolling and then needing html redrawn.
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
         warnCS(error, "navToTag.js", "navigateToTag")
      }
   }
}

/**replaces part of stylesheet - called on launch or on msg from popup.js or options.js when user data changes re: stylesheet */
const userStylesRefresh = async () => {
   const theRootStyle = document.documentElement.style
   try {
      const response = await sendAwaitResponse('getBrowserStoredColorData') // calls /background/style.js
      const replacementSheet = response.response //returns object from json with keys & values
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