import { suggestions } from "./mock-data";

function randomizedDelay(maxDelay, callback) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve(callback());
    }, Math.random() * maxDelay);
  });
}

function randomizedError(errorRate, callback) {
  if (Math.random() < errorRate) {
    return Promise.reject("Mock server is mocked an error. Keep trying...");
  } else {
    return Promise.resolve(callback());
  }
}

const DEFAULT_MAX_DELAY = 3000;
const DEFAULT_ERROR_RATE = 0.5;

export function mockFetch(
  { maxDelay, errorRate } = {
    maxDelay: DEFAULT_MAX_DELAY,
    errorRate: DEFAULT_ERROR_RATE
  },
  callback
) {
  console.log("Starting mockFetch of " + callback.name);
  return randomizedDelay(maxDelay, () => callback())
    .then((result) => randomizedError(errorRate, () => result))
    .then(
      (result) => {
        console.log("Successful fetch of " + callback.name);
        return result;
      },
      (error) => {
        console.log("Error fetching " + callback.name);
        throw error;
      }
    );
}

export function fetchSuggestions(options) {
  const defaultOptions = {
    maxDelay: DEFAULT_MAX_DELAY,
    errorRate: DEFAULT_ERROR_RATE,
    query: ""
  };

  const config = Object.assign({}, defaultOptions, options);
  const { maxDelay, errorRate, query } = config;

  console.log("errorRate", errorRate);
  function getSuggestions() {
    return suggestions
      .filter((q) => q.includes(query.toLowerCase()))
      .slice(0, 5);
  }
  return mockFetch({ maxDelay, errorRate }, getSuggestions);
}
