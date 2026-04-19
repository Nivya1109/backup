/**
 * Transforms every `prisma.library.create({` in seed.ts into a
 * `findUnique ?? create` pattern so the seed never overwrites existing data.
 *
 * Run: node scripts/fix-seed-upsert.mjs
 */

import fs from 'fs'

const file = 'prisma/seed.ts'
let src = fs.readFileSync(file, 'utf8')

// Map of variable name → slug for all 21 seed libraries
const LIBS = {
  libRequests:   'requests',
  libAxios:      'axios',
  libReact:      'react',
  libSQLAlchemy: 'sqlalchemy',
  libJest:       'jest',
  libNumPy:      'numpy',
  libPassport:   'passport-js',
  libPandas:     'pandas',
  libWinston:    'winston',
  libBcrypt:     'bcrypt',
  libTFJS:       'tensorflow-js',
  libMongoose:   'mongoose',
  libPlaywright: 'playwright',
  libLoguru:     'loguru',
  libPrisma:     'prisma',
  libExpress:    'express',
  libTerraform:  'terraform',
  libVue:        'vue-js',
  libKafkaJS:    'kafkajs',
  libPyTest:     'pytest',
  libNextAuth:   'next-auth',
}

for (const [varName, slug] of Object.entries(LIBS)) {
  const from = `const ${varName} = await prisma.library.create({`
  const to   = `const ${varName} = await prisma.library.findUnique({ where: { slug: '${slug}' } })\n    ?? await prisma.library.create({`
  if (!src.includes(from)) {
    console.warn(`  ⚠  Not found: ${from}`)
    continue
  }
  src = src.replace(from, to)
  console.log(`  ✅  ${varName}`)
}

fs.writeFileSync(file, src, 'utf8')
console.log('\nDone — seed.ts is now non-destructive.')
