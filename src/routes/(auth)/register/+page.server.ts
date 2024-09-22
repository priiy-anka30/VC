import { fail, redirect } from '@sveltejs/kit'
import type { Action, Actions, PageServerLoad } from './$types'
import bcrypt from 'bcrypt'
import { db } from '$lib/database'

enum Roles {
  ADMIN = 'ADMIN',
  USER = 'USER',
  OPERATION = 'OPERATION',
  WAREHOUSE = 'WAREHOUSE',
  MATERIALPROCURE = 'MATERIALPROCURE',
  ACCOUNTANT = 'ACCOUNTANT'
}

export const load: PageServerLoad = async ({ locals }) => {
  if (locals.user) {
    throw redirect(302, '/')
  }
}

const register: Action = async ({ request }) => {
  const data = await request.formData()
  const username = data.get('username')
  const password = data.get('password')
  const email = data.get('email')
  const phone = data.get('phoneNo')
  const role = data.get('role')

  const validateEmail = (email: string) => {
    const re = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;
    return re.test(email);
  }

  if (
    typeof username !== 'string' ||
    typeof password !== 'string' ||
    typeof email !== 'string' ||
    typeof phone !== 'string' ||
    typeof role !== 'string' ||
    !username ||
    !password ||
    !email ||
    !phone ||
    !role ||
    !(role in Roles) ||
    !validateEmail(email)
  ) {
    return fail(400, { invalid: true })
  }

  const user = await db.user.findUnique({ where: { username } })
  const emailid = await db.user.findUnique({ where: { email } })
  const phoneno = await db.user.findUnique({ where: { phoneNo: phone } })

  if (user) {
    return fail(400, { user: true })
  }
  if (emailid) {
    return fail(400, { emailid: true })
  }
  if (phoneno) {
    return fail(400, { phoneno: true })
  }

  await db.user.create({
    data: {
      username,
      passwordHash: await bcrypt.hash(password, 10),
      email,
      phoneNo: phone,
      userAuthToken: crypto.randomUUID(),
      role: { connect: { name: role as Roles } },
    },
  })

  return { success: true }
}

export const actions: Actions = { register }