import { useSession } from '@tanstack/react-start/server'
import type { users } from '#/db/schema'

export type AppSessionData = {
  id?: number
  userName?: string
  congregationId?: number
  userType?: typeof users.$inferSelect.userType
  mustChangePassword?: boolean
  passwordResetUserId?: number
  passwordResetReason?: 'first_login' | 'forgot_password'
}

export function useAppSession() {
  return useSession<AppSessionData>({
    name: 'cms',
    password: process.env.SESSION_SECRET as string,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      httpOnly: true,
      maxAge: 24 * 60 * 60,
    },
  })
}
