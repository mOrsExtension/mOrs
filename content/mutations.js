// mutations.js

/**  forces redraw after changes are all finished;
 * maybe janky, but seems to be only way to make sure internal links and scroll work as expected. */
const startObserver = async (maxWait = 5) => {

    /** lets bridge function get triggered from outside bridge Promise */
    let mutIsDone
    let redrawTimeout = null
    let maxWaitTimeout = null
    let isObserving = true

    const infoMutation = (info, script) => {
        infoCS(info, 'mutations.js', script, '#ebf') // lavender
    }

    /** Forces redrawing of webpage after mutation observer done */
    function forceRedraw() {
        infoMutation('Forcing redraw', 'forceRedraw')
        void document.body.offsetHeight
        setTimeout(() => {
            infoMutation('Redraw complete', 'forceRedraw')
            mutIsDone()
        }, 150)
    }

    function stopObserving() {
        if (isObserving) {
            observer.disconnect()
            isObserving = false
            clearTimeout(maxWaitTimeout)
            infoMutation('MutationObserver disconnected', 'stopObserving')
        }
    }

    // Configure the observer
    const config = {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'style']
    }

    // Set up the MutationObserver
    const observer = new MutationObserver((mutations) => {
        if (!isObserving) return
            let significantChanges = mutations.some(mutation =>
                mutation.type === 'childList' ||
                (mutation.type === 'attributes' &&
                    (mutation.attributeName === 'class' ||
                        mutation.attributeName === 'style'
                    )
                )
            )

        if (significantChanges) {
            infoMutation(`Significant changes detected: ${mutations.length}`, 'observer')

            // Clear the existing timeout if there is one
            if (redrawTimeout) {
                clearTimeout(redrawTimeout)
            }

            // Set a new timeout
            redrawTimeout = setTimeout(() => {
                infoMutation('No significant changes detected for 150ms, initiating redraw', 'observer')
                stopObserving()
                forceRedraw()
            }, 150)
        }
    })

    observer.observe(document.body, config)
    infoMutation('MutationObserver set up and observing', "startObserver")

    // Safeguard: Maximum wait time
    maxWaitTimeout = setTimeout(() => {
        infoMutation('Maximum wait time reached, forcing redraw', 'maxWaitTimeout')
        forceRedraw()
        stopObserving()
    }, maxWait * 1000) // default is 5 seconds value as needed

    /** Creating a promise bridge;
     *  Let's mutation observer tell startObserver when it's wrapped up rather than having to requery
    */
    const ObserverFinishedPromise = new Promise ((resolve) => {
        mutIsDone = resolve
    })

    return ObserverFinishedPromise
}
