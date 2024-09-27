// mutations.js

/**  forces redraw after changes are all finished
 * maybe janky, but seems to be only way to make sure internal links and scroll work as expected. */
const startObserver = (maxWait = 5) => {
// Function to force redraw

    const infoMutation = (info, script) => {
        infoCS(info, script, 'mutations', '#ebf') // lavender
    }

    function forceRedraw() {
        infoMutation('Forcing redraw', 'forceRedraw')
        void document.body.offsetHeight
        infoMutation('Redraw complete', 'forceRedraw')
    }

    // Configure the observer
    const config = {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'style']
    }

    let redrawTimeout = null
    let maxWaitTimeout = null
    let isObserving = true

    // Set up the MutationObserver
    const observer = new MutationObserver((mutations) => {
        if (!isObserving) return
            let significantChanges = mutations.some(mutation =>
            mutation.type === 'childList' ||
            (mutation.type === 'attributes' &&
            (mutation.attributeName === 'class' || mutation.attributeName === 'style'))
        )

        if (significantChanges) {
        infoMutation('Significant changes detected:', mutations.length, 'mutations', 'observer')

        // Clear the existing timeout if there is one
        if (redrawTimeout) {
            clearTimeout(redrawTimeout)
        }

        // Set a new timeout
        redrawTimeout = setTimeout(() => {
            infoMutation('No significant changes detected for 100ms, initiating redraw', 'observer')
            stopObserving()
            forceRedraw()
        }, 100)
        }
    })

    function stopObserving() {
        if (isObserving) {
            observer.disconnect()
            isObserving = false
            clearTimeout(maxWaitTimeout)
            infoMutation('MutationObserver disconnected', 'stopObserving')
        }
    }

    observer.observe(document.body, config)
    infoMutation('MutationObserver set up and observing', "startObserver")

    // Safeguard: Maximum wait time
    maxWaitTimeout = setTimeout(() => {
        infoMutation('Maximum wait time reached, forcing redraw', 'maxWaitTimeout')
        forceRedraw()
        stopObserving()
    }, maxWait * 1000) // Adjust this value as needed
}
