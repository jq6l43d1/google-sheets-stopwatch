function mountTimer(mountToEl) {
  // Define helper function $ to query the DOM
  const $ = (...args) => {
    // Reverse the arguments if there are more than one
    if (args.length > 1) args.reverse()
    // Get the query and parent element
    const [query, parent = document] = args
    // Return an array of elements matching the query
    return Array.from(parent.querySelectorAll(query))
  }

  // Define helper function to create DOM elements from an HTML string
  $.create = (html) => {
    // Create a div element and set its inner HTML
    const div = document.createElement('div')
    // Set the inner HTML
    div.innerHTML = html
    // Return the first child of the div
    return div.children[0]
  }

  // Define helper function to remove duplicates from an array
  const unique = (arr) => [...new Set(arr)]

  // Define helper function to generate unique IDs
  const uniqueId = (() => {
    // Define a variable to store the ID
    let id = 1
    // Return a function to increment the ID and return it
    return () => id++
  })()

  // Define helper function to normalize event names
  const normalizeEventName = (name) =>
    // Remove the "on" prefix and convert to lowercase
    name.trim().toLowerCase().replace(/^on/, '')

  // Define helper function to mount an element to the DOM
  const mount = (root, elem) => {
    // Remove all children from the root element and append the new element
    root.innerHTML = ''
    // Append the new element
    root.appendChild(elem)
  }

  // Define regular expressions for matching HTML tags and event names
  const REGEXES = {
    // Match opening HTML tags
    openingHtmlTags: /<[^\/].*?>/gm,
    // Match event names and functions
    nameAndFunc: /\s(on[A-Z].+?\})/gm,
  }

  // Define helper function to render HTML with event listeners
  function renderWithEvents(htmlStr, events) {
    // Define object to store event handlers
    const eventStore = {}

    // Replace opening HTML tags with unique IDs and store event handlers
    const newHtmlStr = htmlStr.replace(REGEXES.openingHtmlTags, (tag) => {
      // Get unique ID
      const tagId = uniqueId()
      // Replace event names and functions with unique IDs
      return tag.replace(REGEXES.nameAndFunc, (nameAndFunc) => {
        // Get event name and function name
        const [eventNameCamel, funcName] = nameAndFunc
          // Remove curly braces
          .replace(/[\{\}]/g, '')
          // Split on the first space
          .split('=')

        // Store event handler function under unique ID and event name
        eventStore[tagId + '-' + normalizeEventName(eventNameCamel)] =
          funcName
        // Return the unique ID
        return ' data-id="' + tagId + '"'
      })
    })

    // Create HTML element from new HTML string
    const root = $.create(newHtmlStr)

    // Get unique event names and add event listeners
    const allEventNames = unique(
      // Get all event names from the event store
      Object.keys(eventStore).map((v) => v.split('-')[1])
    )

    // Add event listeners to root element
    allEventNames.forEach((eventName) => {
      root.addEventListener(eventName, (e) => {
        // Get event handler function name
        const funcName =
          // Get the event handler function name from the event store
          eventStore[e.target.getAttribute('data-id') + '-' + eventName]

        // Call event handler function if it exists
        funcName && events[funcName] && events[funcName](e)
      })
    })

    // Return an object with the root element and any other elements with IDs
    return $(root, '[id]').reduce(
      // Add the element to the object
      (acc, el) => {
        // Add the element to the object using the ID as the key
        acc['$' + el.id] = el
        // Return the object
        return acc
      },
      // Add the root element to the object
      { $root: root }
    )
  }

  // Define helper functions for working with time
  const padZero = (val, n) =>
    // Return the value if it's longer than n, otherwise pad it with zeros
    val.toString().length > n ? val : ('0' + val).slice(n * -1)
  // Define helper function to get the start of the day
  const startOfDay = (date) => new Date(new Date(date).setHours(0, 0, 0, 0))
  // Define helper function to convert seconds to time
  const secsToTime = (secs, withSeconds = false) => {
    // Convert seconds to a date object
    const mmss = new Date(startOfDay(new Date()).getTime() + secs * 1000)
      // Format the date object as a string
      .toString()
      // Get the time part of the string
      .substr(19, withSeconds ? 5 : 2)
    // Get the hours part of the string
    const hh = padZero(Math.floor(secs / 60 / 60), 2)
    // Return the formatted time
    return [hh, mmss].join(':')
  }

  // Define helper functions for working with intervals
  const createInterval = () => {
    // Define variables to store the interval and the last play time
    let interval = null
    // Define helper function to start the interval
    const start = (cb, delay) =>
      // Start the interval if it's not already running
      !interval && (interval = setInterval(cb, delay))
    // Define helper function to stop the interval
    const stop = () => {
      // Stop the interval if it's running
      clearInterval(interval)
      // Reset the interval variable
      interval = null
    }
    // Return an object with the start and stop functions
    return { start, stop }
  }

  // Define helper function to create a timer
  const createTimer = (initial, delay = 1000) => {
    // Create an interval and set the initial duration
    const interval = createInterval()
    // Define variables to store the duration and the last play time
    let duration = initial
    let lastPlay = null

    // Define helper function to play the timer
    const play = (cb) => {
      // Start the interval if it's not already running
      interval.start(() => {
        // Call the callback function with the updated duration
        cb((duration += new Date().getTime() / 1000 - lastPlay))
        // Update the last play time
        lastPlay = new Date().getTime() / 1000
      // Set the interval delay
      }, delay)

      // Update the last play time
      lastPlay = new Date().getTime() / 1000
    }

    // Define helper function to pause the timer
    const pause = () => {
      // Copy the duration to the clipboard
      navigator.clipboard.writeText(secsToTime(duration, true))
      // Stop the interval
      interval.stop()
    }

    // Return an object with the play and pause functions
    return { play, pause }
  }

  // Define helper function to create a timer
  let timer = createTimer(0, 1000)

  // Define helper function to render the timer
  const state = {
    status: 'paused',
    duration: '00:00:00',
  }

  // Define helper function to update the state
  function updateState(fresh) {
    // Update the state
    Object.assign(state, fresh)
    // Render the timer
    render(state)
  }

  // Define helper function to render the timer
  const DOMEvents = {
    // Define helper function to start or stop the timer
    startStop() {
      // Get the new status
      const newStatus = state.status === 'playing' ? 'paused' : 'playing'

      // Start or stop the timer
      newStatus === 'playing'
        // Start the timer
        ? timer.play((seconds) =>
          // Update the state
          updateState({ duration: secsToTime(seconds, true) })
        )
        // Stop the timer
        : timer.pause()

      // Update the state
      updateState({
        // Set the new status
        status: newStatus,
      })
    },

    // Define helper function to reset the timer
    reset() {
      timer.pause()
      timer = createTimer(0, 1000)
      updateState({
        duration: '00:00:00',
        status: 'paused',
      })
    },
  }

  // Define helper function to render the timer
  function render(state) {
    // Define styles for the timer
    const style = {
      base: [
        'border-radius: 100px',
        'border:none',
        'padding: 6px 16px',
        'color: #fff',
        'text-decoration: none',
        'font-size: 16px',
        'cursor: pointer',
        'background: #D2D2D2',
      ].join(';'),
      // Define styles for the active state
      active: ['background: #76B3FA'].join(';'),
    }

    // Define template for the timer
    const template = `
          <div>
            <button id='timer' style="${[
        style.base,
        // Add the active style if the timer is playing
        state.status === 'playing' ? style.active : '',
      ].join(';')}" onClick={startStop}>${state.duration}</button>
            <button onClick={reset} style="${style.base}">x</button>
          </div>
        `
    // Render the timer
    const { $root } = renderWithEvents(template, DOMEvents)
    // Mount the timer
    mount(mountToEl, $root)
  }

  // Render the timer
  render(state)
}

// Mount the timer
const div = document.createElement('div')
mountTimer(div)
document.querySelector('.docs-titlebar-buttons').prepend(div)
