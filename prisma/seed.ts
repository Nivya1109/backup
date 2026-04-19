import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed — Software Library Directory...')

  // Seed is non-destructive — never wipes existing data.
  // All records are upserted so crawler-added libraries are always preserved.

  // -------------------------------------------------------------------------
  // Categories
  // -------------------------------------------------------------------------
  console.log('Upserting categories...')
  const [
    catHTTP,
    catAuth,
    catDatabase,
    catUI,
    catTesting,
    catDataScience,
    catLogging,
    catSecurity,
    catDevOps,
    catMessaging,
  ] = await Promise.all([
    prisma.category.upsert({ where: { name: 'HTTP & Networking' },        create: { name: 'HTTP & Networking' },        update: {} }),
    prisma.category.upsert({ where: { name: 'Authentication & Security' },create: { name: 'Authentication & Security' },update: {} }),
    prisma.category.upsert({ where: { name: 'Database & ORM' },           create: { name: 'Database & ORM' },           update: {} }),
    prisma.category.upsert({ where: { name: 'UI Frameworks' },            create: { name: 'UI Frameworks' },            update: {} }),
    prisma.category.upsert({ where: { name: 'Testing' },                  create: { name: 'Testing' },                  update: {} }),
    prisma.category.upsert({ where: { name: 'Data Science & ML' },        create: { name: 'Data Science & ML' },        update: {} }),
    prisma.category.upsert({ where: { name: 'Logging & Monitoring' },     create: { name: 'Logging & Monitoring' },     update: {} }),
    prisma.category.upsert({ where: { name: 'Security & Cryptography' },  create: { name: 'Security & Cryptography' },  update: {} }),
    prisma.category.upsert({ where: { name: 'DevOps & Infrastructure' },  create: { name: 'DevOps & Infrastructure' },  update: {} }),
    prisma.category.upsert({ where: { name: 'Messaging & Events' },       create: { name: 'Messaging & Events' },       update: {} }),
  ])

  // -------------------------------------------------------------------------
  // Platforms
  // -------------------------------------------------------------------------
  console.log('Upserting platforms...')
  const [platMacOS, platWindows, platLinux, platWeb, platAndroid, platIOS, platCross] =
    await Promise.all([
      prisma.platform.upsert({ where: { name: 'macOS' },            create: { name: 'macOS' },            update: {} }),
      prisma.platform.upsert({ where: { name: 'Windows' },          create: { name: 'Windows' },          update: {} }),
      prisma.platform.upsert({ where: { name: 'Linux' },            create: { name: 'Linux' },            update: {} }),
      prisma.platform.upsert({ where: { name: 'Web' },              create: { name: 'Web' },              update: {} }),
      prisma.platform.upsert({ where: { name: 'Android' },          create: { name: 'Android' },          update: {} }),
      prisma.platform.upsert({ where: { name: 'iOS' },              create: { name: 'iOS' },              update: {} }),
      prisma.platform.upsert({ where: { name: 'Cross-platform' },   create: { name: 'Cross-platform' },   update: {} }),
    ])

  // -------------------------------------------------------------------------
  // Languages
  // -------------------------------------------------------------------------
  console.log('Upserting languages...')
  const [
    langPython,
    langJS,
    langTS,
    langJava,
    langGo,
    langRust,
    langCSharp,
    langRuby,
    langSwift,
    langKotlin,
  ] = await Promise.all([
    prisma.language.upsert({ where: { name: 'Python' },     create: { name: 'Python' },     update: {} }),
    prisma.language.upsert({ where: { name: 'JavaScript' }, create: { name: 'JavaScript' }, update: {} }),
    prisma.language.upsert({ where: { name: 'TypeScript' }, create: { name: 'TypeScript' }, update: {} }),
    prisma.language.upsert({ where: { name: 'Java' },       create: { name: 'Java' },       update: {} }),
    prisma.language.upsert({ where: { name: 'Go' },         create: { name: 'Go' },         update: {} }),
    prisma.language.upsert({ where: { name: 'Rust' },       create: { name: 'Rust' },       update: {} }),
    prisma.language.upsert({ where: { name: 'C#' },         create: { name: 'C#' },         update: {} }),
    prisma.language.upsert({ where: { name: 'Ruby' },       create: { name: 'Ruby' },       update: {} }),
    prisma.language.upsert({ where: { name: 'Swift' },      create: { name: 'Swift' },      update: {} }),
    prisma.language.upsert({ where: { name: 'Kotlin' },     create: { name: 'Kotlin' },     update: {} }),
  ])

  // -------------------------------------------------------------------------
  // Developers & Organizations
  // -------------------------------------------------------------------------
  console.log('Upserting developers and organizations...')
  const [
    devKennethReitz,
    devTJHolowaychuk,
    devYehudaKatz,
    orgMeta,
    orgGoogle,
    orgMicrosoft,
    orgApache,
    orgPSF,
    orgOpenJS,
    orgHashiCorp,
  ] = await Promise.all([
    prisma.developer.upsert({ where: { name: 'Kenneth Reitz' },             create: { name: 'Kenneth Reitz',             url: 'https://kennethreitz.org' },          update: {} }),
    prisma.developer.upsert({ where: { name: 'TJ Holowaychuk' },            create: { name: 'TJ Holowaychuk',            url: 'https://github.com/tj' },             update: {} }),
    prisma.developer.upsert({ where: { name: 'Yehuda Katz' },               create: { name: 'Yehuda Katz',               url: 'https://yehudakatz.com' },            update: {} }),
    prisma.organization.upsert({ where: { name: 'Meta Open Source' },        create: { name: 'Meta Open Source',          url: 'https://opensource.fb.com' },         update: {} }),
    prisma.organization.upsert({ where: { name: 'Google' },                  create: { name: 'Google',                    url: 'https://opensource.google' },         update: {} }),
    prisma.organization.upsert({ where: { name: 'Microsoft' },               create: { name: 'Microsoft',                 url: 'https://opensource.microsoft.com' },  update: {} }),
    prisma.organization.upsert({ where: { name: 'Apache Software Foundation' }, create: { name: 'Apache Software Foundation', url: 'https://www.apache.org' },        update: {} }),
    prisma.organization.upsert({ where: { name: 'Python Software Foundation' }, create: { name: 'Python Software Foundation', url: 'https://www.python.org' },        update: {} }),
    prisma.organization.upsert({ where: { name: 'OpenJS Foundation' },       create: { name: 'OpenJS Foundation',         url: 'https://openjsf.org' },               update: {} }),
    prisma.organization.upsert({ where: { name: 'HashiCorp' },               create: { name: 'HashiCorp',                 url: 'https://www.hashicorp.com' },         update: {} }),
  ])

  // -------------------------------------------------------------------------
  // Libraries
  // -------------------------------------------------------------------------
  console.log('Upserting libraries...')

  // 1. requests (Python HTTP)
  const libRequests = await prisma.library.findUnique({ where: { slug: 'requests' } })
    ?? await prisma.library.create({
    data: {
      name: 'requests',
      slug: 'requests',
      shortSummary: 'Elegant and simple HTTP library for Python',
      description:
        'Requests is a simple, yet elegant, HTTP library for Python. It allows you to send HTTP/1.1 requests, with no need for manual work. There\'s no need to add query strings to your URLs, or to form-encode your PUT & POST data — just use the json parameter.',
      functionDesc: 'Making HTTP/HTTPS requests from Python applications',
      socialImpact:
        'One of the most downloaded Python packages of all time. Changed how Python developers interact with the web.',
      exampleCode: `import requests

response = requests.get('https://api.example.com/data')
data = response.json()
print(data)

# POST with JSON body
response = requests.post(
    'https://api.example.com/users',
    json={'name': 'Alice', 'email': 'alice@example.com'}
)
print(response.status_code)`,
      officialUrl: 'https://requests.readthedocs.io',
      repositoryUrl: 'https://github.com/psf/requests',
      costMinUSD: 0,
      costMaxUSD: 0,
      developerId: devKennethReitz.id,
      organizationId: orgPSF.id,
      dataSource: 'curated',
      categories: { create: [{ categoryId: catHTTP.id }] },
      platforms: {
        create: [
          { platformId: platMacOS.id },
          { platformId: platWindows.id },
          { platformId: platLinux.id },
        ],
      },
      languages: { create: [{ languageId: langPython.id }] },
      versions: {
        create: [
          { name: '2.31.0', releasedAt: new Date('2023-05-22'), notes: 'Security fix for CVE-2023-32681' },
          { name: '2.30.0', releasedAt: new Date('2023-05-03'), notes: 'urllib3 2.0 support' },
          { name: '2.28.2', releasedAt: new Date('2023-01-12'), notes: 'Bug fixes and improvements' },
        ],
      },
      features: {
        create: [
          { name: 'Session persistence', spec: 'Reuse TCP connections with Session objects', required: true },
          { name: 'Authentication', spec: 'Basic, Digest, OAuth1 support', required: false },
          { name: 'SSL/TLS verification', spec: 'Automatic certificate verification', required: true },
          { name: 'Streaming downloads', spec: 'Stream large files without loading into memory', required: false },
          { name: 'Proxy support', spec: 'HTTP/HTTPS/SOCKS proxy configuration', required: false },
        ],
      },
    },
  })

  // 2. axios (JavaScript HTTP)
  const libAxios = await prisma.library.findUnique({ where: { slug: 'axios' } })
    ?? await prisma.library.create({
    data: {
      name: 'axios',
      slug: 'axios',
      shortSummary: 'Promise-based HTTP client for the browser and Node.js',
      description:
        'Axios is a simple promise based HTTP client for the browser and node.js. It provides an easy-to-use API for making XMLHttpRequests from the browser or HTTP requests from node.js.',
      functionDesc: 'Making HTTP requests from JavaScript/TypeScript applications (browser + Node.js)',
      socialImpact:
        'The de-facto standard HTTP client in the JavaScript ecosystem with over 100 million weekly downloads.',
      exampleCode: `import axios from 'axios';

// GET request
const response = await axios.get('/api/users');
console.log(response.data);

// POST request with error handling
try {
  const res = await axios.post('/api/users', {
    name: 'Alice',
    email: 'alice@example.com'
  });
  console.log(res.data);
} catch (error) {
  if (axios.isAxiosError(error)) {
    console.error(error.response?.status);
  }
}`,
      officialUrl: 'https://axios-http.com',
      repositoryUrl: 'https://github.com/axios/axios',
      costMinUSD: 0,
      costMaxUSD: 0,
      organizationId: orgOpenJS.id,
      dataSource: 'curated',
      categories: { create: [{ categoryId: catHTTP.id }] },
      platforms: {
        create: [
          { platformId: platWeb.id },
          { platformId: platMacOS.id },
          { platformId: platWindows.id },
          { platformId: platLinux.id },
        ],
      },
      languages: {
        create: [{ languageId: langJS.id }, { languageId: langTS.id }],
      },
      versions: {
        create: [
          { name: '1.6.8', releasedAt: new Date('2024-03-15'), notes: 'Security patches and bug fixes' },
          { name: '1.6.0', releasedAt: new Date('2023-10-10'), notes: 'Improved TypeScript types' },
          { name: '1.5.0', releasedAt: new Date('2023-08-01'), notes: 'New interceptor API' },
        ],
      },
      features: {
        create: [
          { name: 'Interceptors', spec: 'Request/response transformation pipeline', required: true },
          { name: 'Automatic JSON transform', spec: 'Serialize/deserialize JSON automatically', required: true },
          { name: 'Request cancellation', spec: 'Cancel in-flight requests with AbortController', required: false },
          { name: 'TypeScript support', spec: 'First-class TypeScript types included', required: false },
          { name: 'Browser & Node.js', spec: 'Same API works in both environments', required: true },
        ],
      },
    },
  })

  // 3. React
  const libReact = await prisma.library.findUnique({ where: { slug: 'react' } })
    ?? await prisma.library.create({
    data: {
      name: 'React',
      slug: 'react',
      shortSummary: 'JavaScript library for building user interfaces',
      description:
        'React is the library for web and native user interfaces. Build user interfaces out of individual pieces called components written in JavaScript. React is designed to let you seamlessly combine components written by independent people, teams, and organizations.',
      functionDesc: 'Building interactive, component-based user interfaces for web and native apps',
      socialImpact:
        'Transformed frontend development. Used by millions of developers and powers major products at Meta, Netflix, Airbnb, and many others.',
      exampleCode: `import { useState } from 'react';

function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>
        Increment
      </button>
    </div>
  );
}

export default Counter;`,
      officialUrl: 'https://react.dev',
      repositoryUrl: 'https://github.com/facebook/react',
      costMinUSD: 0,
      costMaxUSD: 0,
      organizationId: orgMeta.id,
      dataSource: 'curated',
      categories: { create: [{ categoryId: catUI.id }] },
      platforms: {
        create: [
          { platformId: platWeb.id },
          { platformId: platAndroid.id },
          { platformId: platIOS.id },
        ],
      },
      languages: {
        create: [{ languageId: langJS.id }, { languageId: langTS.id }],
      },
      versions: {
        create: [
          { name: '18.3.1', releasedAt: new Date('2024-04-26'), notes: 'Bug fixes for React 18' },
          { name: '18.2.0', releasedAt: new Date('2022-06-14'), notes: 'Concurrent features, Suspense improvements' },
          { name: '18.0.0', releasedAt: new Date('2022-03-29'), notes: 'Concurrent Mode, automatic batching, Suspense' },
        ],
      },
      features: {
        create: [
          { name: 'Virtual DOM', spec: 'Efficient diffing and reconciliation', required: true },
          { name: 'Hooks API', spec: 'useState, useEffect, useContext and custom hooks', required: true },
          { name: 'Concurrent rendering', spec: 'Non-blocking rendering for responsive UIs', required: false },
          { name: 'Server components', spec: 'Render components on the server without hydration', required: false },
          { name: 'React DevTools', spec: 'Browser extension for debugging', required: false },
        ],
      },
    },
  })

  // 4. SQLAlchemy
  const libSQLAlchemy = await prisma.library.findUnique({ where: { slug: 'sqlalchemy' } })
    ?? await prisma.library.create({
    data: {
      name: 'SQLAlchemy',
      slug: 'sqlalchemy',
      shortSummary: 'Python SQL toolkit and Object-Relational Mapper',
      description:
        'SQLAlchemy is the Python SQL toolkit and Object Relational Mapper that gives application developers the full power and flexibility of SQL. It provides a full suite of well known enterprise-level persistence patterns, designed for efficient and high-performing database access.',
      functionDesc: 'Database access, ORM mapping, and SQL query building for Python applications',
      socialImpact:
        'The standard ORM for Python applications. Used in major frameworks including Flask and Pyramid.',
      exampleCode: `from sqlalchemy import create_engine, Column, Integer, String
from sqlalchemy.orm import DeclarativeBase, Session

class Base(DeclarativeBase):
    pass

class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True)
    name = Column(String(50))
    email = Column(String(100), unique=True)

engine = create_engine('postgresql://user:pass@localhost/db')
Base.metadata.create_all(engine)

with Session(engine) as session:
    user = User(name='Alice', email='alice@example.com')
    session.add(user)
    session.commit()`,
      officialUrl: 'https://www.sqlalchemy.org',
      repositoryUrl: 'https://github.com/sqlalchemy/sqlalchemy',
      costMinUSD: 0,
      costMaxUSD: 0,
      dataSource: 'curated',
      categories: { create: [{ categoryId: catDatabase.id }] },
      platforms: {
        create: [
          { platformId: platMacOS.id },
          { platformId: platWindows.id },
          { platformId: platLinux.id },
        ],
      },
      languages: { create: [{ languageId: langPython.id }] },
      versions: {
        create: [
          { name: '2.0.29', releasedAt: new Date('2024-03-23'), notes: 'Bug fixes and performance improvements' },
          { name: '2.0.0', releasedAt: new Date('2023-01-26'), notes: 'Major release: new 2.0 style API' },
          { name: '1.4.50', releasedAt: new Date('2023-04-21'), notes: 'Legacy 1.x maintenance release' },
        ],
      },
      features: {
        create: [
          { name: 'ORM layer', spec: 'Map Python classes to database tables', required: true },
          { name: 'Core SQL expression language', spec: 'Type-safe SQL query builder', required: true },
          { name: 'Connection pooling', spec: 'Efficient database connection management', required: true },
          { name: 'Async support', spec: 'asyncio-compatible via asyncpg/aiomysql', required: false },
          { name: 'Multiple backends', spec: 'PostgreSQL, MySQL, SQLite, Oracle, MSSQL', required: true },
        ],
      },
    },
  })

  // 5. Jest
  const libJest = await prisma.library.findUnique({ where: { slug: 'jest' } })
    ?? await prisma.library.create({
    data: {
      name: 'Jest',
      slug: 'jest',
      shortSummary: 'Delightful JavaScript testing framework with a focus on simplicity',
      description:
        'Jest is a delightful JavaScript Testing Framework with a focus on simplicity. It works with projects using Babel, TypeScript, Node, React, Angular, Vue and more. Jest aims to work out of the box, config free, on most JavaScript projects.',
      functionDesc: 'Unit testing, integration testing, and snapshot testing for JavaScript/TypeScript projects',
      socialImpact:
        'The most popular JavaScript testing framework. Standardized how JS projects approach testing.',
      exampleCode: `// sum.test.js
import { sum } from './sum';

describe('sum function', () => {
  test('adds two numbers', () => {
    expect(sum(1, 2)).toBe(3);
  });

  test('handles negative numbers', () => {
    expect(sum(-1, 1)).toBe(0);
  });
});

// Async test example
test('fetches user data', async () => {
  const user = await fetchUser(1);
  expect(user).toHaveProperty('name');
});`,
      officialUrl: 'https://jestjs.io',
      repositoryUrl: 'https://github.com/jestjs/jest',
      costMinUSD: 0,
      costMaxUSD: 0,
      organizationId: orgMeta.id,
      dataSource: 'curated',
      categories: { create: [{ categoryId: catTesting.id }] },
      platforms: {
        create: [
          { platformId: platMacOS.id },
          { platformId: platWindows.id },
          { platformId: platLinux.id },
        ],
      },
      languages: {
        create: [{ languageId: langJS.id }, { languageId: langTS.id }],
      },
      versions: {
        create: [
          { name: '29.7.0', releasedAt: new Date('2023-09-07'), notes: 'Node 20 support, bug fixes' },
          { name: '29.6.0', releasedAt: new Date('2023-07-19'), notes: 'Improved test isolation' },
          { name: '29.0.0', releasedAt: new Date('2022-08-25'), notes: 'Dropped Node 12, new defaults' },
        ],
      },
      features: {
        create: [
          { name: 'Snapshot testing', spec: 'Capture and compare component output', required: false },
          { name: 'Mocking', spec: 'Auto-mock modules, timers, and functions', required: true },
          { name: 'Code coverage', spec: 'Built-in Istanbul coverage reporting', required: false },
          { name: 'Watch mode', spec: 'Re-run tests on file changes', required: false },
          { name: 'Parallel execution', spec: 'Run test suites concurrently', required: true },
        ],
      },
    },
  })

  // 6. NumPy
  const libNumPy = await prisma.library.findUnique({ where: { slug: 'numpy' } })
    ?? await prisma.library.create({
    data: {
      name: 'NumPy',
      slug: 'numpy',
      shortSummary: 'Fundamental package for scientific computing with Python',
      description:
        'NumPy is the fundamental package for scientific computing in Python. It provides a multidimensional array object, various derived objects, and an assortment of routines for fast operations on arrays.',
      functionDesc: 'Numerical computation, array processing, and linear algebra in Python',
      socialImpact:
        'The foundation of the entire Python data science ecosystem. Nearly every ML/data library depends on it.',
      exampleCode: `import numpy as np

# Create arrays
a = np.array([1, 2, 3, 4, 5])
b = np.zeros((3, 3))
c = np.random.rand(5, 5)

# Vectorized operations (no loops needed)
result = a * 2 + 10
print(result)  # [12 14 16 18 20]

# Matrix operations
matrix = np.array([[1, 2], [3, 4]])
inverse = np.linalg.inv(matrix)
eigenvalues = np.linalg.eigvals(matrix)`,
      officialUrl: 'https://numpy.org',
      repositoryUrl: 'https://github.com/numpy/numpy',
      costMinUSD: 0,
      costMaxUSD: 0,
      organizationId: orgPSF.id,
      dataSource: 'curated',
      categories: { create: [{ categoryId: catDataScience.id }] },
      platforms: {
        create: [
          { platformId: platMacOS.id },
          { platformId: platWindows.id },
          { platformId: platLinux.id },
        ],
      },
      languages: { create: [{ languageId: langPython.id }] },
      versions: {
        create: [
          { name: '1.26.4', releasedAt: new Date('2024-02-05'), notes: 'Bug fix release' },
          { name: '1.26.0', releasedAt: new Date('2023-09-16'), notes: 'Python 3.12 support' },
          { name: '1.25.0', releasedAt: new Date('2023-06-17'), notes: 'String dtype improvements' },
        ],
      },
      features: {
        create: [
          { name: 'N-dimensional arrays', spec: 'Efficient multi-dimensional array storage and operations', required: true },
          { name: 'Broadcasting', spec: 'Element-wise operations on arrays of different shapes', required: true },
          { name: 'Linear algebra', spec: 'Matrix operations, decompositions, eigenvalues', required: false },
          { name: 'FFT routines', spec: 'Discrete Fourier transforms', required: false },
          { name: 'C API', spec: 'Extend or call from C/C++ code', required: false },
        ],
      },
    },
  })

  // 7. Passport.js
  const libPassport = await prisma.library.findUnique({ where: { slug: 'passport-js' } })
    ?? await prisma.library.create({
    data: {
      name: 'Passport.js',
      slug: 'passport-js',
      shortSummary: 'Simple, unobtrusive authentication middleware for Node.js',
      description:
        'Passport is authentication middleware for Node.js. Extremely flexible and modular, Passport can be unobtrusively dropped in to any Express-based web application. A comprehensive set of strategies support authentication using a username and password, Facebook, Twitter, and more.',
      functionDesc: 'Adding authentication (local, OAuth, social login) to Node.js applications',
      socialImpact:
        'Standardized authentication patterns in the Node.js ecosystem with 500+ strategies available.',
      exampleCode: `const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;

passport.use(new LocalStrategy(
  async (username, password, done) => {
    const user = await User.findOne({ username });
    if (!user) return done(null, false, { message: 'User not found' });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return done(null, false, { message: 'Incorrect password' });

    return done(null, user);
  }
));

// Protect a route
app.get('/profile', passport.authenticate('jwt'), (req, res) => {
  res.json(req.user);
});`,
      officialUrl: 'https://www.passportjs.org',
      repositoryUrl: 'https://github.com/jaredhanson/passport',
      costMinUSD: 0,
      costMaxUSD: 0,
      developerId: devTJHolowaychuk.id,
      dataSource: 'curated',
      categories: { create: [{ categoryId: catAuth.id }] },
      platforms: {
        create: [
          { platformId: platMacOS.id },
          { platformId: platWindows.id },
          { platformId: platLinux.id },
        ],
      },
      languages: {
        create: [{ languageId: langJS.id }, { languageId: langTS.id }],
      },
      versions: {
        create: [
          { name: '0.7.0', releasedAt: new Date('2023-07-20'), notes: 'Rewritten session and state management' },
          { name: '0.6.0', releasedAt: new Date('2022-09-12'), notes: 'Multi-factor authentication support' },
          { name: '0.5.3', releasedAt: new Date('2022-01-08'), notes: 'Bug fixes' },
        ],
      },
      features: {
        create: [
          { name: '500+ strategies', spec: 'Local, OAuth, SAML, OpenID, social providers', required: true },
          { name: 'Express middleware', spec: 'Drop-in middleware for Express/Connect', required: true },
          { name: 'Session management', spec: 'Serialize/deserialize user from session', required: false },
          { name: 'JWT support', spec: 'passport-jwt strategy for stateless auth', required: false },
        ],
      },
    },
  })

  // 8. Pandas
  const libPandas = await prisma.library.findUnique({ where: { slug: 'pandas' } })
    ?? await prisma.library.create({
    data: {
      name: 'pandas',
      slug: 'pandas',
      shortSummary: 'Powerful data analysis and manipulation library for Python',
      description:
        'pandas is a fast, powerful, flexible and easy to use open source data analysis and manipulation tool, built on top of the Python programming language.',
      functionDesc: 'Data manipulation, cleaning, transformation, and analysis in Python',
      socialImpact:
        'Became the standard tool for data wrangling in Python. Essential for data scientists and analysts worldwide.',
      exampleCode: `import pandas as pd

# Load and explore data
df = pd.read_csv('sales.csv')
print(df.head())
print(df.describe())

# Filter and aggregate
top_products = (
    df[df['revenue'] > 1000]
    .groupby('product')['revenue']
    .sum()
    .sort_values(ascending=False)
    .head(10)
)

# Export results
top_products.to_csv('top_products.csv')`,
      officialUrl: 'https://pandas.pydata.org',
      repositoryUrl: 'https://github.com/pandas-dev/pandas',
      costMinUSD: 0,
      costMaxUSD: 0,
      dataSource: 'curated',
      categories: { create: [{ categoryId: catDataScience.id }] },
      platforms: {
        create: [
          { platformId: platMacOS.id },
          { platformId: platWindows.id },
          { platformId: platLinux.id },
        ],
      },
      languages: { create: [{ languageId: langPython.id }] },
      versions: {
        create: [
          { name: '2.2.1', releasedAt: new Date('2024-02-22'), notes: 'Bug fixes for 2.2 release' },
          { name: '2.2.0', releasedAt: new Date('2024-01-19'), notes: 'Copy-on-Write improvements' },
          { name: '2.0.0', releasedAt: new Date('2023-04-03'), notes: 'PyArrow backend, nullable dtypes by default' },
        ],
      },
      features: {
        create: [
          { name: 'DataFrame', spec: '2D labeled data structure with columns of different types', required: true },
          { name: 'GroupBy operations', spec: 'Split-apply-combine data aggregation', required: true },
          { name: 'Time series', spec: 'Resampling, shifting, rolling window functions', required: false },
          { name: 'IO tools', spec: 'Read/write CSV, Excel, SQL, JSON, Parquet', required: true },
          { name: 'Merging & joining', spec: 'Database-style joins between DataFrames', required: false },
        ],
      },
    },
  })

  // 9. Winston (Logging)
  const libWinston = await prisma.library.findUnique({ where: { slug: 'winston' } })
    ?? await prisma.library.create({
    data: {
      name: 'Winston',
      slug: 'winston',
      shortSummary: 'Versatile logging library for Node.js',
      description:
        'Winston is designed to be a simple and universal logging library with support for multiple transports. A transport is essentially a storage device for your logs. Each Winston logger can have multiple transports configured at different levels.',
      functionDesc: 'Structured logging with multiple output targets (console, files, databases) in Node.js',
      socialImpact:
        'The most widely adopted logging library in the Node.js ecosystem.',
      exampleCode: `const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'app.log' }),
  ],
});

logger.info('Server started', { port: 3000 });
logger.error('Database connection failed', { error: err.message });`,
      officialUrl: 'https://github.com/winstonjs/winston',
      repositoryUrl: 'https://github.com/winstonjs/winston',
      costMinUSD: 0,
      costMaxUSD: 0,
      dataSource: 'curated',
      categories: { create: [{ categoryId: catLogging.id }] },
      platforms: {
        create: [
          { platformId: platMacOS.id },
          { platformId: platWindows.id },
          { platformId: platLinux.id },
        ],
      },
      languages: {
        create: [{ languageId: langJS.id }, { languageId: langTS.id }],
      },
      versions: {
        create: [
          { name: '3.13.0', releasedAt: new Date('2024-03-01'), notes: 'Dependency updates and bug fixes' },
          { name: '3.11.0', releasedAt: new Date('2023-09-10'), notes: 'Node 20 support' },
          { name: '3.10.0', releasedAt: new Date('2023-06-06'), notes: 'Performance improvements' },
        ],
      },
      features: {
        create: [
          { name: 'Multiple transports', spec: 'Log to console, files, HTTP, databases simultaneously', required: true },
          { name: 'Log levels', spec: 'error, warn, info, http, verbose, debug, silly', required: true },
          { name: 'Custom formats', spec: 'JSON, colorize, printf, combine formatters', required: false },
          { name: 'Exception handling', spec: 'Capture unhandled exceptions and rejections', required: false },
        ],
      },
    },
  })

  // 10. bcrypt (Security)
  const libBcrypt = await prisma.library.findUnique({ where: { slug: 'bcrypt' } })
    ?? await prisma.library.create({
    data: {
      name: 'bcrypt',
      slug: 'bcrypt',
      shortSummary: 'Library for hashing passwords using the bcrypt algorithm',
      description:
        'A library to help you hash passwords using the bcrypt algorithm. Bcrypt is a password-hashing function designed by Niels Provos and David Mazières, based on the Blowfish cipher. It incorporates a salt to protect against rainbow table attacks.',
      functionDesc: 'Secure password hashing and verification for user authentication systems',
      socialImpact:
        'Helps protect millions of user accounts by making password storage safe against brute-force attacks.',
      exampleCode: `const bcrypt = require('bcrypt');

const SALT_ROUNDS = 12;

// Hash a password (e.g., at registration)
async function hashPassword(plaintext) {
  return await bcrypt.hash(plaintext, SALT_ROUNDS);
}

// Verify password (e.g., at login)
async function verifyPassword(plaintext, hash) {
  return await bcrypt.compare(plaintext, hash);
}

// Usage
const hash = await hashPassword('mySecretPassword');
const valid = await verifyPassword('mySecretPassword', hash);
console.log(valid); // true`,
      officialUrl: 'https://github.com/kelektiv/node.bcrypt.js',
      repositoryUrl: 'https://github.com/kelektiv/node.bcrypt.js',
      costMinUSD: 0,
      costMaxUSD: 0,
      dataSource: 'curated',
      categories: { create: [{ categoryId: catSecurity.id }, { categoryId: catAuth.id }] },
      platforms: {
        create: [
          { platformId: platMacOS.id },
          { platformId: platWindows.id },
          { platformId: platLinux.id },
        ],
      },
      languages: {
        create: [{ languageId: langJS.id }, { languageId: langTS.id }],
      },
      versions: {
        create: [
          { name: '5.1.1', releasedAt: new Date('2023-09-19'), notes: 'Security dependency updates' },
          { name: '5.1.0', releasedAt: new Date('2022-05-06'), notes: 'Node 18 support' },
          { name: '5.0.1', releasedAt: new Date('2021-03-26'), notes: 'Bug fix release' },
        ],
      },
      features: {
        create: [
          { name: 'Adaptive cost factor', spec: 'Tune computation cost to stay ahead of hardware improvements', required: true },
          { name: 'Automatic salting', spec: 'Salt generated and embedded automatically', required: true },
          { name: 'Async API', spec: 'Non-blocking hash/compare operations', required: true },
          { name: 'Sync API', spec: 'Synchronous fallback for scripts', required: false },
        ],
      },
    },
  })

  // 11. TensorFlow.js
  const libTFJS = await prisma.library.findUnique({ where: { slug: 'tensorflow-js' } })
    ?? await prisma.library.create({
    data: {
      name: 'TensorFlow.js',
      slug: 'tensorflow-js',
      shortSummary: 'Machine learning library for JavaScript (browser and Node.js)',
      description:
        'TensorFlow.js is a library for machine learning in JavaScript. You can develop ML models in JavaScript, and use ML directly in the browser or in Node.js.',
      functionDesc: 'Training and running machine learning models in JavaScript environments',
      socialImpact:
        'Democratized ML by enabling browser-based model inference without a server backend.',
      exampleCode: `import * as tf from '@tensorflow/tfjs';

// Build a simple model
const model = tf.sequential();
model.add(tf.layers.dense({ units: 64, activation: 'relu', inputShape: [10] }));
model.add(tf.layers.dense({ units: 1, activation: 'sigmoid' }));

model.compile({ optimizer: 'adam', loss: 'binaryCrossentropy', metrics: ['accuracy'] });

// Train
const xs = tf.randomNormal([100, 10]);
const ys = tf.randomUniform([100, 1]);
await model.fit(xs, ys, { epochs: 10 });

// Predict
const prediction = model.predict(tf.randomNormal([1, 10]));
prediction.print();`,
      officialUrl: 'https://www.tensorflow.org/js',
      repositoryUrl: 'https://github.com/tensorflow/tfjs',
      costMinUSD: 0,
      costMaxUSD: 0,
      organizationId: orgGoogle.id,
      dataSource: 'curated',
      categories: { create: [{ categoryId: catDataScience.id }] },
      platforms: {
        create: [
          { platformId: platWeb.id },
          { platformId: platMacOS.id },
          { platformId: platWindows.id },
          { platformId: platLinux.id },
        ],
      },
      languages: {
        create: [{ languageId: langJS.id }, { languageId: langTS.id }],
      },
      versions: {
        create: [
          { name: '4.17.0', releasedAt: new Date('2024-03-25'), notes: 'WebGPU backend improvements' },
          { name: '4.15.0', releasedAt: new Date('2024-01-10'), notes: 'Performance fixes' },
          { name: '4.0.0', releasedAt: new Date('2022-11-21'), notes: 'ES modules, tree-shaking support' },
        ],
      },
      features: {
        create: [
          { name: 'WebGL acceleration', spec: 'GPU-accelerated computation in browser', required: false },
          { name: 'Pre-trained models', spec: 'Load and run models from TensorFlow Hub', required: false },
          { name: 'Model training', spec: 'Train models directly in browser or Node.js', required: true },
          { name: 'Transfer learning', spec: 'Fine-tune existing models on custom data', required: false },
        ],
      },
    },
  })

  // 12. Mongoose (MongoDB ORM)
  const libMongoose = await prisma.library.findUnique({ where: { slug: 'mongoose' } })
    ?? await prisma.library.create({
    data: {
      name: 'Mongoose',
      slug: 'mongoose',
      shortSummary: 'Elegant MongoDB object modeling for Node.js',
      description:
        'Mongoose provides a straight-forward, schema-based solution to model your application data. It includes built-in type casting, validation, query building, business logic hooks and more.',
      functionDesc: 'Schema-based MongoDB data modeling and querying in Node.js applications',
      socialImpact:
        'Brought structure and validation to MongoDB\'s schemaless documents, widely adopted in MEAN/MERN stacks.',
      exampleCode: `const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model('User', userSchema);

// Create and save
const user = new User({ name: 'Alice', email: 'alice@example.com' });
await user.save();

// Query
const users = await User.find({ name: /alice/i }).limit(10);`,
      officialUrl: 'https://mongoosejs.com',
      repositoryUrl: 'https://github.com/Automattic/mongoose',
      costMinUSD: 0,
      costMaxUSD: 0,
      dataSource: 'curated',
      categories: { create: [{ categoryId: catDatabase.id }] },
      platforms: {
        create: [
          { platformId: platMacOS.id },
          { platformId: platWindows.id },
          { platformId: platLinux.id },
        ],
      },
      languages: {
        create: [{ languageId: langJS.id }, { languageId: langTS.id }],
      },
      versions: {
        create: [
          { name: '8.3.4', releasedAt: new Date('2024-04-25'), notes: 'Bug fixes' },
          { name: '8.0.0', releasedAt: new Date('2023-11-20'), notes: 'Dropped Node 14, new defaults' },
          { name: '7.6.0', releasedAt: new Date('2023-10-05'), notes: 'Improved TypeScript support' },
        ],
      },
      features: {
        create: [
          { name: 'Schema validation', spec: 'Define types, required fields, and custom validators', required: true },
          { name: 'Middleware (hooks)', spec: 'pre/post hooks for save, find, delete operations', required: false },
          { name: 'Population', spec: 'Automatically replace document IDs with referenced documents', required: false },
          { name: 'TypeScript support', spec: 'First-class TypeScript types and generics', required: false },
        ],
      },
    },
  })

  // 13. Playwright (Testing)
  const libPlaywright = await prisma.library.findUnique({ where: { slug: 'playwright' } })
    ?? await prisma.library.create({
    data: {
      name: 'Playwright',
      slug: 'playwright',
      shortSummary: 'End-to-end testing framework for modern web apps',
      description:
        'Playwright enables reliable end-to-end testing for modern web apps. It supports Chromium, Firefox and WebKit with a single API. Playwright is built to enable cross-browser web automation that is ever-green, capable, reliable and fast.',
      functionDesc: 'Browser automation and end-to-end testing for web applications across all major browsers',
      socialImpact:
        'Rapidly replaced Cypress and Selenium as the go-to E2E testing tool with its superior reliability.',
      exampleCode: `import { test, expect } from '@playwright/test';

test('user can log in', async ({ page }) => {
  await page.goto('/login');

  await page.fill('[name="email"]', 'alice@example.com');
  await page.fill('[name="password"]', 'secret123');
  await page.click('button[type="submit"]');

  await expect(page).toHaveURL('/dashboard');
  await expect(page.locator('h1')).toContainText('Welcome, Alice');
});`,
      officialUrl: 'https://playwright.dev',
      repositoryUrl: 'https://github.com/microsoft/playwright',
      costMinUSD: 0,
      costMaxUSD: 0,
      organizationId: orgMicrosoft.id,
      dataSource: 'curated',
      categories: { create: [{ categoryId: catTesting.id }] },
      platforms: {
        create: [
          { platformId: platMacOS.id },
          { platformId: platWindows.id },
          { platformId: platLinux.id },
        ],
      },
      languages: {
        create: [{ languageId: langJS.id }, { languageId: langTS.id }, { languageId: langPython.id }],
      },
      versions: {
        create: [
          { name: '1.43.1', releasedAt: new Date('2024-04-18'), notes: 'Bug fixes' },
          { name: '1.43.0', releasedAt: new Date('2024-04-17'), notes: 'Component testing improvements' },
          { name: '1.40.0', releasedAt: new Date('2023-11-16'), notes: 'WebSocket testing support' },
        ],
      },
      features: {
        create: [
          { name: 'Cross-browser', spec: 'Chromium, Firefox, WebKit with one API', required: true },
          { name: 'Auto-waiting', spec: 'Smart waiting for elements to be ready', required: true },
          { name: 'Trace viewer', spec: 'Full trace with screenshots and network logs', required: false },
          { name: 'Component testing', spec: 'Test React/Vue/Svelte components in isolation', required: false },
          { name: 'API testing', spec: 'Make and assert HTTP requests directly', required: false },
        ],
      },
    },
  })

  // 14. Loguru (Python logging)
  const libLoguru = await prisma.library.findUnique({ where: { slug: 'loguru' } })
    ?? await prisma.library.create({
    data: {
      name: 'Loguru',
      slug: 'loguru',
      shortSummary: 'Python logging made simple and powerful',
      description:
        'Loguru is a library which aims to bring enjoyable logging in Python. It is a fully featured, batteries-included logging library with a simple interface. The main concept is that there is one and only one logger.',
      functionDesc: 'Structured, colorized logging for Python applications with minimal setup',
      socialImpact:
        'Dramatically simplified Python logging which was traditionally verbose and complex.',
      exampleCode: `from loguru import logger

# Zero configuration — works out of the box
logger.info("Application started")
logger.warning("Config not found, using defaults")
logger.error("Failed to connect: {error}", error="Timeout")

# Write to file with rotation
logger.add("app.log", rotation="10 MB", retention="7 days")

# Structured logging
logger.bind(request_id="abc123").info("Processing request")`,
      officialUrl: 'https://loguru.readthedocs.io',
      repositoryUrl: 'https://github.com/Delgan/loguru',
      costMinUSD: 0,
      costMaxUSD: 0,
      dataSource: 'curated',
      categories: { create: [{ categoryId: catLogging.id }] },
      platforms: {
        create: [
          { platformId: platMacOS.id },
          { platformId: platWindows.id },
          { platformId: platLinux.id },
        ],
      },
      languages: { create: [{ languageId: langPython.id }] },
      versions: {
        create: [
          { name: '0.7.2', releasedAt: new Date('2023-11-09'), notes: 'Python 3.12 compatibility' },
          { name: '0.7.0', releasedAt: new Date('2023-01-30'), notes: 'Improved structured logging' },
          { name: '0.6.0', releasedAt: new Date('2022-03-14'), notes: 'New opt() method' },
        ],
      },
      features: {
        create: [
          { name: 'No configuration needed', spec: 'Works out of the box with sensible defaults', required: true },
          { name: 'Colorized output', spec: 'Beautiful colored terminal output', required: false },
          { name: 'Log rotation', spec: 'Rotate files by size, time, or custom strategy', required: false },
          { name: 'Exception formatting', spec: 'Rich traceback with variable values', required: true },
        ],
      },
    },
  })

  // 15. Prisma (ORM) — meta!
  const libPrisma = await prisma.library.findUnique({ where: { slug: 'prisma' } })
    ?? await prisma.library.create({
    data: {
      name: 'Prisma',
      slug: 'prisma',
      shortSummary: 'Next-generation ORM for Node.js and TypeScript',
      description:
        'Prisma is a next-generation Node.js and TypeScript ORM that unlocks a new level of developer experience when working with databases thanks to its intuitive data model, automated migrations, type-safety & auto-completion.',
      functionDesc: 'Type-safe database access, schema management, and migrations for Node.js/TypeScript',
      socialImpact:
        'Brought type-safety to database queries, eliminating a whole class of runtime errors in TypeScript projects.',
      exampleCode: `import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Fully type-safe query with auto-complete
const users = await prisma.user.findMany({
  where: { active: true },
  include: { posts: { orderBy: { createdAt: 'desc' } } },
  take: 10,
});

// Create with relations
const newPost = await prisma.post.create({
  data: {
    title: 'Hello World',
    author: { connect: { id: userId } },
  },
});`,
      officialUrl: 'https://www.prisma.io',
      repositoryUrl: 'https://github.com/prisma/prisma',
      costMinUSD: 0,
      costMaxUSD: 0,
      dataSource: 'curated',
      categories: { create: [{ categoryId: catDatabase.id }] },
      platforms: {
        create: [
          { platformId: platMacOS.id },
          { platformId: platWindows.id },
          { platformId: platLinux.id },
        ],
      },
      languages: {
        create: [{ languageId: langJS.id }, { languageId: langTS.id }],
      },
      versions: {
        create: [
          { name: '5.13.0', releasedAt: new Date('2024-04-16'), notes: 'Prisma Postgres preview' },
          { name: '5.10.0', releasedAt: new Date('2024-02-27'), notes: 'Improved query performance' },
          { name: '5.0.0', releasedAt: new Date('2023-07-18'), notes: 'Dropped Node 14, new engine' },
        ],
      },
      features: {
        create: [
          { name: 'Type-safe queries', spec: 'Auto-generated types from your schema', required: true },
          { name: 'Automated migrations', spec: 'prisma migrate dev/deploy', required: true },
          { name: 'Prisma Studio', spec: 'Visual database browser', required: false },
          { name: 'Multiple databases', spec: 'PostgreSQL, MySQL, SQLite, MongoDB, CockroachDB', required: true },
          { name: 'Prisma Accelerate', spec: 'Global connection pooling and caching (paid)', required: false },
        ],
      },
    },
  })

  // 16. Express.js
  const libExpress = await prisma.library.findUnique({ where: { slug: 'express' } })
    ?? await prisma.library.create({
    data: {
      name: 'Express',
      slug: 'express',
      shortSummary: 'Fast, unopinionated, minimalist web framework for Node.js',
      description:
        'Express is a minimal and flexible Node.js web application framework that provides a robust set of features for web and mobile applications. With a myriad of HTTP utility methods and middleware, creating a robust API is quick and easy.',
      functionDesc: 'Building REST APIs and web servers with Node.js',
      socialImpact:
        'The most popular Node.js web framework. Powers countless production APIs and web applications worldwide.',
      exampleCode: `const express = require('express');
const app = express();

app.use(express.json());

// Routes
app.get('/api/users', async (req, res) => {
  const users = await db.user.findMany();
  res.json(users);
});

app.post('/api/users', async (req, res) => {
  const user = await db.user.create({ data: req.body });
  res.status(201).json(user);
});

app.listen(3000, () => console.log('Server running on port 3000'));`,
      officialUrl: 'https://expressjs.com',
      repositoryUrl: 'https://github.com/expressjs/express',
      costMinUSD: 0,
      costMaxUSD: 0,
      organizationId: orgOpenJS.id,
      dataSource: 'curated',
      categories: { create: [{ categoryId: catHTTP.id }] },
      platforms: {
        create: [
          { platformId: platMacOS.id },
          { platformId: platWindows.id },
          { platformId: platLinux.id },
        ],
      },
      languages: {
        create: [{ languageId: langJS.id }, { languageId: langTS.id }],
      },
      versions: {
        create: [
          { name: '4.19.2', releasedAt: new Date('2024-03-25'), notes: 'Security fix for open redirect' },
          { name: '4.18.2', releasedAt: new Date('2022-10-08'), notes: 'Bug fixes' },
          { name: '5.0.0', releasedAt: new Date('2024-08-01'), notes: 'Major release — async error handling' },
        ],
      },
      features: {
        create: [
          { name: 'Routing', spec: 'Expressive routing with parameters, query strings', required: true },
          { name: 'Middleware', spec: 'Composable request/response pipeline', required: true },
          { name: 'Template engines', spec: 'EJS, Pug, Handlebars integration', required: false },
          { name: 'Static file serving', spec: 'Serve static assets efficiently', required: false },
        ],
      },
    },
  })

  // 17. Terraform (DevOps)
  const libTerraform = await prisma.library.findUnique({ where: { slug: 'terraform' } })
    ?? await prisma.library.create({
    data: {
      name: 'Terraform',
      slug: 'terraform',
      shortSummary: 'Infrastructure as Code tool for provisioning cloud resources',
      description:
        'Terraform is an infrastructure as code tool that lets you build, change, and version cloud and on-prem resources safely and efficiently. Terraform can manage low-level components like compute, storage, and networking resources, as well as high-level components like DNS entries and SaaS features.',
      functionDesc: 'Provisioning and managing cloud infrastructure declaratively',
      socialImpact:
        'Standardized infrastructure management across clouds. Now the industry standard for IaC.',
      exampleCode: `# main.tf
terraform {
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
}

provider "aws" { region = "us-east-1" }

resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"
  tags = { Name = "web-server" }
}

output "instance_ip" {
  value = aws_instance.web.public_ip
}`,
      officialUrl: 'https://www.terraform.io',
      repositoryUrl: 'https://github.com/hashicorp/terraform',
      costMinUSD: 0,
      costMaxUSD: 0,
      organizationId: orgHashiCorp.id,
      dataSource: 'curated',
      categories: { create: [{ categoryId: catDevOps.id }] },
      platforms: {
        create: [
          { platformId: platMacOS.id },
          { platformId: platWindows.id },
          { platformId: platLinux.id },
        ],
      },
      languages: { create: [{ languageId: langGo.id }] },
      versions: {
        create: [
          { name: '1.8.3', releasedAt: new Date('2024-05-08'), notes: 'Bug fixes and provider updates' },
          { name: '1.7.0', releasedAt: new Date('2024-01-17'), notes: 'Removed/replaced resource support' },
          { name: '1.6.0', releasedAt: new Date('2023-10-04'), notes: 'State encryption preview' },
        ],
      },
      features: {
        create: [
          { name: 'Multi-cloud', spec: 'AWS, GCP, Azure, and 3000+ providers', required: true },
          { name: 'State management', spec: 'Track infrastructure state locally or remotely', required: true },
          { name: 'Plan & Apply', spec: 'Preview changes before applying', required: true },
          { name: 'Modules', spec: 'Reusable infrastructure components', required: false },
        ],
      },
    },
  })

  // 18. Vue.js
  const libVue = await prisma.library.findUnique({ where: { slug: 'vue-js' } })
    ?? await prisma.library.create({
    data: {
      name: 'Vue.js',
      slug: 'vue-js',
      shortSummary: 'Progressive JavaScript framework for building user interfaces',
      description:
        'Vue is a JavaScript framework for building user interfaces. It builds on top of standard HTML, CSS, and JavaScript and provides a declarative, component-based programming model that helps you efficiently develop user interfaces of any complexity.',
      functionDesc: 'Building interactive web UIs with a gentle learning curve and excellent performance',
      socialImpact:
        'Democratized frontend development. Particularly popular in Asia and for teams transitioning from jQuery.',
      exampleCode: `<script setup>
import { ref, computed } from 'vue';

const count = ref(0);
const doubled = computed(() => count.value * 2);

function increment() {
  count.value++;
}
</script>

<template>
  <div>
    <p>Count: {{ count }} (doubled: {{ doubled }})</p>
    <button @click="increment">Increment</button>
  </div>
</template>`,
      officialUrl: 'https://vuejs.org',
      repositoryUrl: 'https://github.com/vuejs/core',
      costMinUSD: 0,
      costMaxUSD: 0,
      dataSource: 'curated',
      categories: { create: [{ categoryId: catUI.id }] },
      platforms: { create: [{ platformId: platWeb.id }] },
      languages: {
        create: [{ languageId: langJS.id }, { languageId: langTS.id }],
      },
      versions: {
        create: [
          { name: '3.4.21', releasedAt: new Date('2024-03-14'), notes: 'Bug fixes' },
          { name: '3.4.0', releasedAt: new Date('2023-12-28'), notes: 'Improved reactivity system, defineModel' },
          { name: '3.3.0', releasedAt: new Date('2023-05-08'), notes: 'Improved TypeScript DX' },
        ],
      },
      features: {
        create: [
          { name: 'Composition API', spec: 'Composable logic with setup() and script setup', required: false },
          { name: 'Single-File Components', spec: 'HTML, CSS, JS in one .vue file', required: false },
          { name: 'Reactivity system', spec: 'Fine-grained reactive data tracking', required: true },
          { name: 'Transitions', spec: 'Built-in animation and transition system', required: false },
        ],
      },
    },
  })

  // 19. Kafka client (Messaging)
  const libKafkaJS = await prisma.library.findUnique({ where: { slug: 'kafkajs' } })
    ?? await prisma.library.create({
    data: {
      name: 'KafkaJS',
      slug: 'kafkajs',
      shortSummary: 'Modern Apache Kafka client for Node.js',
      description:
        'KafkaJS is a modern Apache Kafka client for Node.js. It was designed from scratch to be easily testable, backward compatible and future-proof. It has zero external dependencies and supports Kafka 0.10+.',
      functionDesc: 'Publishing and consuming messages from Apache Kafka in Node.js services',
      socialImpact:
        'Enabled JavaScript developers to participate in event-driven architectures built on Kafka.',
      exampleCode: `const { Kafka } = require('kafkajs');

const kafka = new Kafka({ brokers: ['localhost:9092'] });

// Producer
const producer = kafka.producer();
await producer.connect();
await producer.send({
  topic: 'order-events',
  messages: [{ value: JSON.stringify({ orderId: '123', status: 'placed' }) }],
});

// Consumer
const consumer = kafka.consumer({ groupId: 'order-service' });
await consumer.connect();
await consumer.subscribe({ topic: 'order-events' });
await consumer.run({
  eachMessage: async ({ message }) => {
    const event = JSON.parse(message.value.toString());
    console.log('Received:', event);
  },
});`,
      officialUrl: 'https://kafka.js.org',
      repositoryUrl: 'https://github.com/tulios/kafkajs',
      costMinUSD: 0,
      costMaxUSD: 0,
      dataSource: 'curated',
      categories: { create: [{ categoryId: catMessaging.id }] },
      platforms: {
        create: [
          { platformId: platMacOS.id },
          { platformId: platWindows.id },
          { platformId: platLinux.id },
        ],
      },
      languages: {
        create: [{ languageId: langJS.id }, { languageId: langTS.id }],
      },
      versions: {
        create: [
          { name: '2.2.4', releasedAt: new Date('2023-03-22'), notes: 'Bug fixes' },
          { name: '2.2.0', releasedAt: new Date('2021-11-20'), notes: 'New admin client features' },
          { name: '2.0.0', releasedAt: new Date('2021-01-01'), notes: 'Dropped Node 8/10 support' },
        ],
      },
      features: {
        create: [
          { name: 'Producer', spec: 'Publish messages with batching and compression', required: true },
          { name: 'Consumer groups', spec: 'Distributed message consumption with offsets', required: true },
          { name: 'Admin client', spec: 'Manage topics, partitions, and consumer groups', required: false },
          { name: 'Exactly-once semantics', spec: 'Transactional producer support', required: false },
        ],
      },
    },
  })

  // 20. PyTest
  const libPyTest = await prisma.library.findUnique({ where: { slug: 'pytest' } })
    ?? await prisma.library.create({
    data: {
      name: 'pytest',
      slug: 'pytest',
      shortSummary: 'The leading testing framework for Python',
      description:
        'The pytest framework makes it easy to write small, readable tests, and can scale to support complex functional testing for applications and libraries.',
      functionDesc: 'Writing and running unit, integration, and functional tests for Python code',
      socialImpact:
        'Replaced unittest as the standard testing tool in Python, making TDD accessible to Python developers.',
      exampleCode: `import pytest
from myapp import divide

# Simple test
def test_divide():
    assert divide(10, 2) == 5

# Test exception
def test_divide_by_zero():
    with pytest.raises(ZeroDivisionError):
        divide(10, 0)

# Parametrize
@pytest.mark.parametrize("a,b,expected", [
    (10, 2, 5),
    (9, 3, 3),
    (7, 2, 3.5),
])
def test_divide_parametrized(a, b, expected):
    assert divide(a, b) == expected

# Fixture
@pytest.fixture
def db_connection():
    conn = create_test_db()
    yield conn
    conn.close()`,
      officialUrl: 'https://docs.pytest.org',
      repositoryUrl: 'https://github.com/pytest-dev/pytest',
      costMinUSD: 0,
      costMaxUSD: 0,
      dataSource: 'curated',
      categories: { create: [{ categoryId: catTesting.id }] },
      platforms: {
        create: [
          { platformId: platMacOS.id },
          { platformId: platWindows.id },
          { platformId: platLinux.id },
        ],
      },
      languages: { create: [{ languageId: langPython.id }] },
      versions: {
        create: [
          { name: '8.1.1', releasedAt: new Date('2024-03-08'), notes: 'Bug fixes' },
          { name: '8.0.0', releasedAt: new Date('2024-01-27'), notes: 'Dropped Python 3.7 support' },
          { name: '7.4.0', releasedAt: new Date('2023-07-12'), notes: 'Improved fixture ordering' },
        ],
      },
      features: {
        create: [
          { name: 'Fixtures', spec: 'Composable test setup and teardown', required: true },
          { name: 'Parametrize', spec: 'Run tests with multiple input sets', required: false },
          { name: 'Plugins', spec: '1000+ plugins (coverage, mock, django, asyncio)', required: false },
          { name: 'Auto-discovery', spec: 'Finds test files automatically', required: true },
          { name: 'Assertions', spec: 'Rich assertion introspection without boilerplate', required: true },
        ],
      },
    },
  })

  // 21. NextAuth.js
  const libNextAuth = await prisma.library.findUnique({ where: { slug: 'next-auth' } })
    ?? await prisma.library.create({
    data: {
      name: 'next-auth',
      slug: 'next-auth',
      shortSummary: 'Authentication for Next.js applications',
      description:
        'NextAuth.js is a complete open-source authentication solution for Next.js applications. It supports OAuth providers (GitHub, Google, Twitter), email/password credentials, magic links, and more — with built-in session management.',
      functionDesc: 'Adding authentication (OAuth, credentials, magic links) to Next.js apps',
      socialImpact:
        'Became the standard authentication library for Next.js, dramatically lowering the barrier to adding secure auth to React apps.',
      exampleCode: `// app/api/auth/[...nextauth]/route.ts
import NextAuth from 'next-auth'
import GitHub from 'next-auth/providers/github'

const handler = NextAuth({
  providers: [
    GitHub({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      return session
    },
  },
})

export { handler as GET, handler as POST }

// In a server component:
import { getServerSession } from 'next-auth'
const session = await getServerSession()
if (!session) redirect('/login')
console.log('Logged in as', session.user?.email)`,
      officialUrl: 'https://next-auth.js.org',
      repositoryUrl: 'https://github.com/nextauthjs/next-auth',
      costMinUSD: 0,
      costMaxUSD: 0,
      dataSource: 'curated',
      tags: ['auth', 'oauth', 'next.js', 'jwt', 'session', 'authentication'],
      categories: { create: [{ categoryId: catAuth.id }] },
      platforms: {
        create: [
          { platformId: platMacOS.id },
          { platformId: platWindows.id },
          { platformId: platLinux.id },
          { platformId: platWeb.id },
        ],
      },
      languages: { create: [{ languageId: langJS.id }, { languageId: langTS.id }] },
      versions: {
        create: [
          { name: '4.24.7', releasedAt: new Date('2024-03-01'), notes: 'Bug fixes and security patches' },
          { name: '4.24.0', releasedAt: new Date('2023-10-18'), notes: 'Next.js 14 App Router support' },
          { name: '4.23.0', releasedAt: new Date('2023-07-01'), notes: 'New provider updates' },
        ],
      },
      features: {
        create: [
          { name: 'OAuth providers', spec: 'GitHub, Google, Twitter, Discord, and 50+ more', required: true },
          { name: 'Credentials auth', spec: 'Username/password with custom validation', required: false },
          { name: 'JWT sessions', spec: 'Stateless sessions with signed JWTs', required: true },
          { name: 'Database sessions', spec: 'Persist sessions to any Prisma-compatible DB', required: false },
          { name: 'Magic links', spec: 'Passwordless email sign-in', required: false },
        ],
      },
    },
  })

  // -------------------------------------------------------------------------
  // Inter-library dependencies
  // -------------------------------------------------------------------------
  console.log('Creating dependencies...')
  await Promise.all([
    // pandas depends on numpy
    prisma.libraryDep.create({
      data: { libraryId: libPandas.id, dependsOnId: libNumPy.id },
    }),
    // Passport.js is often used with Express
    prisma.libraryDep.create({
      data: { libraryId: libPassport.id, dependsOnId: libExpress.id },
    }),
    // Winston used with Express (logging middleware)
    prisma.libraryDep.create({
      data: { libraryId: libWinston.id, dependsOnId: libExpress.id },
    }),
    // Mongoose used with Express
    prisma.libraryDep.create({
      data: { libraryId: libMongoose.id, dependsOnId: libExpress.id },
    }),
    // bcrypt typically used alongside Passport.js
    prisma.libraryDep.create({
      data: { libraryId: libBcrypt.id, dependsOnId: libPassport.id },
    }),
  ])

  console.log('✅ Database seeded successfully!')
  console.log('\nCreated:')
  console.log('- 10 Categories')
  console.log('- 7 Platforms (macOS, Windows, Linux, Web, Android, iOS, Cross-platform)')
  console.log('- 10 Languages')
  console.log('- 3 Developers, 10 Organizations')
  console.log('- 21 Libraries with versions, features, and dependencies')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('Error seeding database:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
