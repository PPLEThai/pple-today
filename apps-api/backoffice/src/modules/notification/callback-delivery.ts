/**
 * The seam between answering an interactive notification and delivering the
 * answer to the sending app.
 *
 * The answer endpoint records the NotificationResponse row, then calls
 * `dispatchSoon(responseId)` after the transaction commits and does not wait for
 * it: the user's request never depends on the app's server. The row is the outbox,
 * so a missed dispatch is picked up by the sweep.
 *
 * The callback-delivery track replaces `NoopNotificationCallbackDispatcher` with
 * the real implementation (claim, sign, POST, backoff, purge).
 */
export interface NotificationCallbackDispatcher {
  dispatchSoon(responseId: string): void
}

export class NoopNotificationCallbackDispatcher implements NotificationCallbackDispatcher {
  dispatchSoon(_responseId: string): void {}
}
