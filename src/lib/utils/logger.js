let isLoggingEnabled = false;

/**
 * Enables logging.
 */
function enableLogging() {
  isLoggingEnabled = true;
}

/**
 * Disables logging.
 */
function disableLogging() {
  isLoggingEnabled = false;
}

/**
 * Logs a message if logging is enabled.
 * @param  {...any} args - The arguments to log.
 */
function log(...args) {
  if (isLoggingEnabled) {
    console.log(...args);
  }
}

module.exports = {
  enableLogging,
  disableLogging,
  log,
};
