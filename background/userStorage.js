//background/userStorage.js
//@ts-check

/**
* @param {string} objKey */
const promiseGetFromStorage = async objKey => {
   try {
      const storedObj = await browser.storage.sync.get(objKey)
      if (storedObj) {
         let objStr = typeof storedObj[objKey] == "string"
         ? storedObj[objKey]
         : JSON.stringify(storedObj[objKey])
         infoBG(
            `'${objKey}' : '${objStr}'`,
            'userStorage.js',
            'promiseGetFromStorage'
            ) //helper.js
            return storedObj[objKey]
      } else {
         warnBG(
            'Unable to retrieve stored user preference',
            'userStorage.js',
            'promiseGetFromStorage'
            ) //helper.js
         throw new Error('Unable to retrieve stored user preference')
      }
   } catch (e) {
      warnBG(`Error: ${e}`, 'userStorage.js', 'promiseGetFromStorage') //helper.js
      throw e
   }
}

//TODO #4 Create "add to storage" class and make background handle all of this (return success, in case we need timing to work)

const promiseQueryToTabs = async queryObj => {
   return await browser.tabs.query(queryObj)
}
