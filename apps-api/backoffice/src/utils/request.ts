export function setUserIdHeader(request: Request, userId: string) {
  request.headers.set('x-user-id', userId)
}
