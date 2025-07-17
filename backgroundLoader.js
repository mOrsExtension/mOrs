//backgroundLoader.js

const browser = chrome

/** list of background scripts to load in from background folder*/
const scriptList = [
   '/background/helperBG.js',
   '/background/msgListenerBG.js',
   '/background/navigate.js',
   '/background/styles.js',
   '/background/userStorage.js',
   '/background/webResources.js',
   '/background/annotations.js'
]

/** attempt to load; success/error logged to service worker */
scriptList.forEach(aScript => {
    try {
        importScripts(aScript) // javaScript command to load script into background (service worker)
        infoBG(
            `'${aScript}' successfully loaded.`,
            'helperBG.js',
            'importScripts',
            '#afa'
        ) // helperBG.js (why it needs to load first)
    } catch (e) {
        /** using console warn for script import issues, rather than warnBG in helper.js, because it might not have imported */
        console.warn(`'${aScript}' loading error: ${e}`)
    }
})