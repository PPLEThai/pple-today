export const promiseWithExponentialBackoff = async <T>(
  fn: () => Promise<T>,
  config?: {
    maxRetries?: number
    initialDelayMs?: number
  }
): Promise<T> => {
  const maxRetries = config?.maxRetries ?? 5
  const initialDelayMs = config?.initialDelayMs ?? 100

  let attempt = 0
  let delay = initialDelayMs

  while (true) {
    try {
      return await fn()
    } catch (error) {
      if (attempt >= maxRetries) {
        throw error
      }

      await new Promise((resolve) => setTimeout(resolve, delay))
      attempt++
      delay *= 2 // Exponential backoff
    }
  }
}
