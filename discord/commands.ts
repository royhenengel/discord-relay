export function isFromMe(botUserId: string | null, authorId: string): boolean {
  return botUserId ? botUserId === authorId : false
}