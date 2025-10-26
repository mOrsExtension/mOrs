//options.js
//depends on ../popup/popAndOpHelper.js

window.addEventListener('load', async () => {
    await browser.storage.sync.set({ cssSelector: 'Custom' })

    const main = async () => {
        await refreshHtml()
    }

    // global variables
    const optionsFrame = window.frames['left'].document
    const exampleFrame = window.frames['right'].document
    const exampleStyle = exampleFrame.documentElement.style
    const optionsStyle = optionsFrame.documentElement.style
    const buttonsDiv = optionsFrame.getElementById('buttons')
    const saveButton = optionsFrame.getElementById('save')
    const refreshButton = optionsFrame.getElementById('refresh')
    const exportSaveButton = optionsFrame.getElementById('exportSave')
    const importDiv = optionsFrame.getElementById('exportDiv')
    const textColorCode = optionsFrame.getElementById('textColorCode')
    const importButton = optionsFrame.getElementById('import')
    const loadPresetSelector = optionsFrame.getElementById('loadPreset')
    const importCancelButton = optionsFrame.getElementById('cancelExport')
    const userEditableColorsList = [
        'altBack',
        'background',
        'buttonColor',
        'formBack',
        'heading',
        'linkText',
        'mainText',
        'note',
        'sourceNote',
        'subheading',
    ]

    /** hide save buttons; fetch custom colors from user's storage; populate them into option buttons */
    const refreshHtml = async () => {
        const userCustomColors = await getUserColorInputsFromBrowser()
        menuButtonsUpdateColors(userCustomColors)
        setInputCodeAndHtmlColors(userCustomColors)
        doHideSaveAndCancel(true)
        populatePresetDropdown()
    }

    const getUserColorInputsFromBrowser = async () => {
        let msg = new MessageDispatch({'miscTask': 'buildColorData'})
        return await msg.sendAwaitResponse()
    }
    /** take color object and update input selection buttons;
        * fires on page load, cancel/reset or receiving input code
    * @param {any} colorObject */
    const menuButtonsUpdateColors = colorObject => {
        userEditableColorsList.forEach(cssVarName => {
            if (colorObject[cssVarName] != null) {
                optionsFrame.getElementById(cssVarName).value = colorObject[cssVarName]
            }
        })
    }
    /** with color object update styleSheet and the export code
        * @param {any} colorObject - from storage or user input code*/
    const setInputCodeAndHtmlColors = colorObject => {
        let exportList = []
        try {
            for (let key in colorObject) {
                exampleStyle.setProperty(`--${key}`, colorObject[key]) // put colors into example frame
                optionsStyle.setProperty(`--${key}`, colorObject[key])  // and for option button frame
                if (userEditableColorsList.includes(key)) {
                exportList.push(colorObject[key].slice(1))
                }
            }
            infoOptions(
                `Set colors for example & option stylesheets: '${JSON.stringify(colorObject)}'`,
                'cssLoadColors'
            )
        } catch (error) {
            warnOptions(
                `Error setting stylesheet colors from '${JSON.stringify(colorObject)}.' Error: ${error}`,
                'cssLoadColors'
            )
        }
        textColorCode.value = exportList.join("-")
    }
    /** hide or show Save/Cancel buttons
     * @param {boolean} doHide */
    const doHideSaveAndCancel = doHide => {
        doHide ? buttonsDiv.classList.add('invisibility') : buttonsDiv.classList.remove('invisibility')
        if (doHide) {doHideImportMenu(true)}
        infoOptions(`Hiding buttons set to : ${doHide}`, 'doHideSaveAndCancel')
    }
    /** hide or show Export Save & Cancel buttons
     * @param {boolean} doHide */
    const doHideImportMenu = doHide => {
        doHide ? importDiv.classList.add('invisibility') : importDiv.classList.remove('invisibility')
        infoOptions(`Hiding export buttons set to : ${doHide}`, 'doHideImportMenu')
    }
    const populatePresetDropdown = async () => {
        let msg = new MessageDispatch ({miscTask: 'getPaletteList'})
        const colorOptionsList = await msg.sendAwaitResponse()
        colorOptionsList.pop() // remove "custom" as separate option
        loadPresetSelector.options.length = 0
        const blankOption = document.createElement("option")
        blankOption.value = ""
        blankOption.textContent = ""
        loadPresetSelector.appendChild(blankOption)
        colorOptionsList.forEach(colorOption => {
            const selectOption = document.createElement("option")
            selectOption.value = colorOption
            selectOption.textContent = colorOption
            loadPresetSelector.appendChild(selectOption)
        })
        blankOption.selected = true
    }

    /** set up button functionality on optionsFrame (save, reset, color change) */
    /**COLOR SELECTORS */
    /**color change input buttons */
        const buildColorChangeListener = aSelector => {
            let delayAfterChange // create timer
            aSelector.addEventListener('input', () => {
                clearTimeout(delayAfterChange) // clear any existing timer
                delayAfterChange = setTimeout(updateCss, 300) // set timer
                doHideSaveAndCancel(false)
            })
            const updateCss = () => {
                exampleStyle.setProperty(`--${aSelector.id}`, aSelector.value)
            }
        }
    userEditableColorsList.forEach(cssVarName => {
        if (optionsFrame.getElementById(cssVarName)) {
            buildColorChangeListener(optionsFrame.getElementById(cssVarName))
        } else {
            warnOptions(`Couldn't load : ${cssVarName}`, 'addListeners(cssElementArray)')
        }
    })

    /**SAVE BUTTON*/
        const getUserColorInputsFromSelectors = () => {
            let userSelectedColors = {}
            userEditableColorsList.forEach(cssVarName => {
                const colorSelector = optionsFrame.getElementById(cssVarName)
                try {
                userSelectedColors[cssVarName] = colorSelector.value
                } catch (error) {
                warnOptions('Error: ${error}', 'getUserColorInputsFromSelectors')
                }
            })
            return userSelectedColors
        }
        const saveColorsAndAlertTabs = async (userColors) => {
            await saveToUserBrowserStorage({'userColors' : userColors})
            setInputCodeAndHtmlColors(userColors)
            let msg = new MessageDispatch({updateCss:true}, 'tabs')
            msg.sendOneWay()
        }
        const saveToUserBrowserStorage = async (userData) => {
            try {
                await browser.storage.sync.set(userData)
                infoOptions(`Successful save of ${JSON.stringify(userData)}`, 'saveToUserBrowserStorage')
            } catch (error) {
                warnOptions(`Failed to store user data: ${error}`, 'setStorage')
            }
        }
    saveButton.addEventListener('click', async () => {
        const userColors = getUserColorInputsFromSelectors()
        saveColorsAndAlertTabs(userColors)
        refreshHtml()
    })


    /**CANCEL BUTTON */
    refreshButton.addEventListener('click', () => {
        refreshHtml()
    })

    /** IMPORT/EXPORT VALUES BUTTON */
    exportSaveButton.addEventListener('click', () => {
        importDiv.classList.remove('invisibility')
    })

    /**(import Box) SUBMIT BUTTON */
    importButton.addEventListener('click', async () => {
        const importedPalette = {}
        let codeArray = textColorCode.value.split('-').reverse()
        userEditableColorsList.forEach(cssVarName =>{
            importedPalette[cssVarName] = '#' + codeArray.pop()
        })
        menuButtonsUpdateColors(importedPalette) // put colors into menu buttons
        await saveColorsAndAlertTabs(importedPalette) // save menu button data to user browser & alert tabs
        refreshHtml()
    })

    /**(import/export) CANCEL BUTTON */
    importCancelButton.addEventListener('click', () => {
        importDiv.classList.add('invisibility')
    })

    /**change to load preset dropdown */
    loadPresetSelector.addEventListener('change', async () => {
        let msg = new MessageDispatch({ fetchJson : 'cssPresetColors' })
        const presetColors = await msg.sendAwaitResponse()
        const userChoice = loadPresetSelector.value
        if (presetColors[userChoice] != null) {
            const presetPalette = presetColors[userChoice]
            menuButtonsUpdateColors(presetPalette) // put colors into menu buttons
            infoOptions("Menu populated", 'loadPresetSelector.change')
            await saveColorsAndAlertTabs(presetPalette) // save menu button data to user browser & alert tabs
            refreshHtml()
        }
    })

    //helper functions:

    //Message passing to background.js (send message, no need (yet) for responses)
    const sendMessageToBackground = messageContent => {
        /**return*/ browser.runtime.sendMessage({ message: messageContent }) // should be able to remove return
    }

    const sendAndReceiveFromBackground = async (messageContent) => {
    try {
            const response = await browser.runtime.sendMessage({message: messageContent})
            return response.response
        } catch (error) {
            warnOptions(`Error sending & awaiting response to '${messageContent}': ${error}`, 'exampleColorsRefresh')
            return false
        }
    }

    /** Sends "information" message to console; viewable in "inspect service worker"
     * @param {string} infoMsg
     * @param {string} functionName*/
    const infoOptions = (infoMsg, functionName = '??') => {
        let msg = new MessageDispatch({
            log: {
                doWarn: false,
                txt: infoMsg,
                script: 'options.js',
                aCaller: functionName,
                color: '#db8' //pinkish
            }
        })
        msg.sendOneWay()
    }

    /**Sends "warning" message to console; viewable in "inspect service worker."
     * @param {string} warnMsg
     * @param {string} functionName*/
    const warnOptions = (warnMsg, functionName = '??') => {
        let msg = new MessageDispatch({
            log: {
                doWarn: false,
                txt: warnMsg,
                script: 'options.js',
                aCaller: functionName,
                color: 'yellow'
            }
        })
        msg.sendOneWay()
    }

    main()
})