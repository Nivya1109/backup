/**
 * useCaseMap.ts — Phrase-level use-case → keyword mapping
 *
 * Purpose: when a user types a use-case phrase, return specific library names
 * and keywords so Typesense surfaces the right results.
 *
 * Rules:
 *  - Keys are lowercase phrases (single words OR multi-word)
 *  - Values are specific library names / exact keywords (not generic synonyms)
 *  - Prefer library names over generic terms → keeps Typesense results targeted
 *  - Adding a new use case: just add a key + array of library names
 */

export const useCaseMap: Record<string, string[]> = {

  // ── Testing ─────────────────────────────────────────────────────────────────
  testing:           ['jest', 'vitest', 'mocha', 'jasmine', 'cypress', 'playwright'],
  'unit testing':    ['jest', 'vitest', 'mocha', 'jasmine'],
  'e2e testing':     ['cypress', 'playwright', 'selenium', 'puppeteer'],
  'test react':      ['react testing library', 'jest', 'vitest', 'enzyme'],
  'react testing':   ['react testing library', 'jest', 'vitest', 'enzyme', 'cypress'],
  'react test':      ['react testing library', 'jest', 'vitest', 'enzyme'],
  'testing react':   ['react testing library', 'jest', 'vitest'],
  'test app':        ['jest', 'vitest', 'cypress', 'playwright'],
  'test component':  ['react testing library', 'enzyme', 'jest', 'vitest'],
  'integration test': ['jest', 'supertest', 'vitest', 'cypress'],

  // ── Authentication & Login ───────────────────────────────────────────────────
  authentication:    ['passport', 'next-auth', 'auth0', 'jwt', 'oauth2', 'session'],
  'auth library':    ['passport', 'next-auth', 'auth0', 'jwt', 'oauth2'],
  'user auth':       ['passport', 'next-auth', 'auth0', 'jwt', 'session'],
  login:             ['passport', 'next-auth', 'jwt', 'session', 'auth0', 'oauth'],
  'login system':    ['passport', 'next-auth', 'jwt', 'session', 'auth0', 'oauth2'],
  'sign in':         ['passport', 'next-auth', 'jwt', 'session', 'oauth'],
  'sign up':         ['passport', 'next-auth', 'auth0', 'oauth2'],
  'user login':      ['passport', 'next-auth', 'jwt', 'session'],
  'jwt auth':        ['jsonwebtoken', 'jwt', 'passport', 'express-jwt'],
  'oauth':           ['passport', 'oauth2', 'next-auth', 'auth0'],
  'session management': ['express-session', 'cookie-session', 'next-auth', 'passport'],

  // ── HTTP / API clients ───────────────────────────────────────────────────────
  'http client':     ['axios', 'got', 'ky', 'node-fetch', 'superagent'],
  'api client':      ['axios', 'got', 'ky', 'node-fetch', 'superagent'],
  'rest client':     ['axios', 'got', 'ky', 'superagent', 'node-fetch'],
  'rest api':        ['axios', 'got', 'ky', 'superagent', 'express', 'fastify'],
  'make request':    ['axios', 'got', 'node-fetch', 'ky'],
  'call api':        ['axios', 'got', 'ky', 'node-fetch'],
  'fetch data':      ['axios', 'swr', 'react-query', 'got', 'node-fetch'],
  'api request':     ['axios', 'got', 'ky', 'superagent'],

  // ── Forms ────────────────────────────────────────────────────────────────────
  'form validation': ['zod', 'yup', 'joi', 'formik', 'react-hook-form', 'valibot'],
  'validate form':   ['zod', 'yup', 'joi', 'formik', 'valibot'],
  'schema validation': ['zod', 'yup', 'joi', 'valibot'],
  'input validation': ['zod', 'yup', 'joi', 'valibot'],

  // ── State management ─────────────────────────────────────────────────────────
  'state management': ['redux', 'zustand', 'recoil', 'mobx', 'jotai', 'valtio'],
  'global state':     ['redux', 'zustand', 'recoil', 'mobx', 'jotai'],
  'react state':      ['zustand', 'redux', 'recoil', 'jotai'],
  'app state':        ['redux', 'zustand', 'recoil', 'mobx', 'jotai'],

  // ── Database / ORM ───────────────────────────────────────────────────────────
  'database orm':    ['prisma', 'sequelize', 'typeorm', 'drizzle', 'knex'],
  'query builder':   ['knex', 'drizzle', 'kysely', 'slonik'],
  'database client': ['prisma', 'pg', 'mysql2', 'mongoose', 'sequelize'],
  'sql client':      ['pg', 'mysql2', 'knex', 'drizzle', 'kysely'],

  // ── Logging ──────────────────────────────────────────────────────────────────
  logging:           ['winston', 'pino', 'bunyan', 'morgan', 'log4js'],
  'log library':     ['winston', 'pino', 'bunyan'],
  'server logging':  ['winston', 'pino', 'morgan', 'bunyan'],

  // ── File handling ────────────────────────────────────────────────────────────
  'file upload':     ['multer', 'busboy', 'formidable'],
  'image upload':    ['multer', 'sharp', 'cloudinary'],
  'image processing': ['sharp', 'jimp', 'imagemagick', 'cloudinary'],

  // ── Real-time ────────────────────────────────────────────────────────────────
  'real time':       ['socket.io', 'ws', 'pusher'],
  'websocket':       ['socket.io', 'ws', 'uwebsockets'],
  'live updates':    ['socket.io', 'ws', 'sse', 'pusher'],

  // ── Date / Time ──────────────────────────────────────────────────────────────
  'date time':       ['dayjs', 'date-fns', 'luxon', 'moment'],
  'date formatting': ['dayjs', 'date-fns', 'moment', 'luxon'],
  'time zone':       ['dayjs', 'luxon', 'date-fns'],

  // ── Email ────────────────────────────────────────────────────────────────────
  'send email':      ['nodemailer', 'sendgrid', 'mailgun', 'resend'],
  'email library':   ['nodemailer', 'sendgrid', 'mailgun', 'resend'],
  'email service':   ['nodemailer', 'sendgrid', 'mailgun', 'postmark', 'resend'],
}
