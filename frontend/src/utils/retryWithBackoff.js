/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {Object} options - Retry options
 * @returns {Promise} Result of the function
 */
export async function retryWithBackoff(fn, options = {}) {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffMultiplier = 2,
    shouldRetry = (error) => {
      // Retry on network errors or 5xx server errors
      if (!navigator.onLine) return true;
      if (error.response?.status >= 500) return true;
      if (error.code === 'ECONNABORTED') return true;
      if (error.message?.includes('Network Error')) return true;
      return false;
    }
  } = options;

  let lastError;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry if this is the last attempt or if we shouldn't retry this error
      if (attempt === maxRetries || !shouldRetry(error)) {
        throw error;
      }

      // Wait before retrying
      console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));

      // Increase delay for next attempt (exponential backoff)
      delay = Math.min(delay * backoffMultiplier, maxDelay);
    }
  }

  throw lastError;
}

/**
 * Create a wrapper for axios that includes retry logic
 * @param {Object} axiosInstance - Axios instance
 * @param {Object} retryOptions - Retry options
 * @returns {Object} Wrapped axios methods
 */
export function createRetryableAxios(axiosInstance, retryOptions = {}) {
  return {
    get: (url, config) => retryWithBackoff(() => axiosInstance.get(url, config), retryOptions),
    post: (url, data, config) => retryWithBackoff(() => axiosInstance.post(url, data, config), retryOptions),
    put: (url, data, config) => retryWithBackoff(() => axiosInstance.put(url, data, config), retryOptions),
    delete: (url, config) => retryWithBackoff(() => axiosInstance.delete(url, config), retryOptions),
    patch: (url, data, config) => retryWithBackoff(() => axiosInstance.patch(url, data, config), retryOptions)
  };
}
