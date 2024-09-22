import { fail, redirect } from '@sveltejs/kit'
import bcrypt from 'bcrypt'
import type { Action, Actions, PageServerLoad } from './$types'
import { db } from '$lib/database'

export const load: PageServerLoad = async ({ locals }) => {
  if (locals.user) {
    throw redirect(302, '/')
  }
}

const login: Action = async ({ cookies, request }) => {
  const data = await request.formData()
  const username = data.get('username')
  const password = data.get('password')

  if (
    typeof username !== 'string' ||
    typeof password !== 'string' ||
    !username ||
    !password
  ) {
    return fail(400, { invalid: true })
  }

  const user = await db.user.findUnique({ where: { username } })

  if (!user) {
    return fail(400, { credentials: true })
  }

  const userPassword = await bcrypt.compare(password, user.passwordHash)
  if (!userPassword) {
    return fail(400, { credentials: true })
  }

  if (!user.isApproved) {
    return fail(400, { notApproved: true })
  }

  // Update last login time and generate new auth token
  const authenticatedUser = await db.user.update({
    where: { username: user.username },
    data: { 
      userAuthToken: crypto.randomUUID(),
      lastLogin: new Date()
    },
  })

  cookies.set('session', authenticatedUser.userAuthToken, {
    path: '/',
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
  })

  throw redirect(302, '/')
}

export const actions: Actions = { login }