/**
 * Backfill exampleCode via Playwright — official docs pages only.
 *
 * Strategy:
 *  1. Find all libraries with missing exampleCode
 *  2. Match each against the curated DOCS_MAP (name → official docs URL)
 *  3. Launch a headless Chromium browser
 *  4. Visit each docs page, extract the first meaningful code snippet
 *  5. Validate quality (not install-only, has real usage)
 *  6. Save to exampleCode (never overwrites existing data)
 *
 * Run:
 *   pnpm backfill:examples:docs              # dry run (default)
 *   pnpm backfill:examples:docs -- --live    # write to database
 *   pnpm backfill:examples:docs -- --goal=50 # stop after N successes
 */

import { chromium, Browser, Page } from 'playwright'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// ── CLI flags ──────────────────────────────────────────────────────────────────
const IS_DRY_RUN = !process.argv.includes('--live')
const goalArg    = process.argv.find(a => /^--goal=\d+$/.test(a))
const GOAL       = goalArg ? parseInt(goalArg.split('=')[1], 10) : 130

const PAGE_TIMEOUT   = 20_000  // ms to wait for page load
const ELEMENT_WAIT   = 5_000   // ms to wait for code elements
const RATE_LIMIT_MS  = 1_000   // ms between page loads (be polite)

// ─────────────────────────────────────────────────────────────────────────────
// Curated docs map: library name (lowercase, no spaces) → docs URL + language hint
// URLs point to quickstart / getting-started / first-steps pages where real
// code examples are most likely to appear above the fold.
// ─────────────────────────────────────────────────────────────────────────────

interface DocsEntry {
  url: string
  lang?: 'js' | 'ts' | 'python' | 'java' | 'go' | 'rust' | 'any'
}

const DOCS_MAP: Record<string, DocsEntry> = {
  // ── JavaScript / TypeScript ecosystem (npm) ──────────────────────────────
  'vue':                    { url: 'https://vuejs.org/guide/quick-start',                            lang: 'js'  },
  'nuxt':                   { url: 'https://nuxt.com/docs/getting-started/introduction',             lang: 'ts'  },
  'next':                   { url: 'https://nextjs.org/docs/getting-started/installation',           lang: 'js'  },
  'nextjs':                 { url: 'https://nextjs.org/docs/getting-started/installation',           lang: 'js'  },
  '@nestjs/core':           { url: 'https://docs.nestjs.com/first-steps',                           lang: 'ts'  },
  'nestjs':                 { url: 'https://docs.nestjs.com/first-steps',                           lang: 'ts'  },
  'express':                { url: 'https://expressjs.com/en/starter/hello-world.html',             lang: 'js'  },
  'fastify':                { url: 'https://fastify.dev/docs/latest/Guides/Getting-Started/',       lang: 'js'  },
  'koa':                    { url: 'https://koajs.com/',                                            lang: 'js'  },
  'hapi':                   { url: 'https://hapi.dev/tutorials/',                                   lang: 'js'  },
  'sequelize':              { url: 'https://sequelize.org/docs/v6/getting-started/',                lang: 'js'  },
  'typeorm':                { url: 'https://typeorm.io/',                                           lang: 'ts'  },
  'mongoose':               { url: 'https://mongoosejs.com/docs/index.html',                        lang: 'js'  },
  'prisma':                 { url: 'https://www.prisma.io/docs/getting-started/quickstart',         lang: 'ts'  },
  'drizzle-orm':            { url: 'https://orm.drizzle.team/docs/get-started-postgresql',          lang: 'ts'  },
  'redux':                  { url: 'https://redux.js.org/introduction/getting-started',             lang: 'js'  },
  '@reduxjs/toolkit':       { url: 'https://redux-toolkit.js.org/introduction/getting-started',    lang: 'js'  },
  'zustand':                { url: 'https://zustand-demo.pmnd.rs/',                                 lang: 'js'  },
  'jotai':                  { url: 'https://jotai.org/docs/introduction',                           lang: 'js'  },
  'recoil':                 { url: 'https://recoiljs.org/docs/introduction/getting-started',        lang: 'js'  },
  '@tanstack/react-query':  { url: 'https://tanstack.com/query/latest/docs/framework/react/quick-start', lang: 'ts' },
  'react-query':            { url: 'https://tanstack.com/query/latest/docs/framework/react/quick-start', lang: 'ts' },
  'swr':                    { url: 'https://swr.vercel.app/',                                       lang: 'js'  },
  'axios':                  { url: 'https://axios-http.com/docs/example',                           lang: 'js'  },
  'graphql':                { url: 'https://graphql.org/graphql-js/',                               lang: 'js'  },
  'apollo-server':          { url: 'https://www.apollographql.com/docs/apollo-server/getting-started/', lang: 'js' },
  '@apollo/client':         { url: 'https://www.apollographql.com/docs/react/get-started/',        lang: 'js'  },
  'socket.io':              { url: 'https://socket.io/docs/v4/tutorial/step-2',                    lang: 'js'  },
  'ws':                     { url: 'https://github.com/websockets/ws#usage-examples',              lang: 'js'  },
  'jest':                   { url: 'https://jestjs.io/docs/getting-started',                        lang: 'js'  },
  'vitest':                 { url: 'https://vitest.dev/guide/',                                     lang: 'ts'  },
  'mocha':                  { url: 'https://mochajs.org/#getting-started',                         lang: 'js'  },
  'chai':                   { url: 'https://www.chaijs.com/api/bdd/',                              lang: 'js'  },
  'cypress':                { url: 'https://docs.cypress.io/guides/getting-started/writing-your-first-cy-test', lang: 'js' },
  'playwright':             { url: 'https://playwright.dev/docs/writing-tests',                    lang: 'ts'  },
  'webpack':                { url: 'https://webpack.js.org/guides/getting-started/',               lang: 'js'  },
  'vite':                   { url: 'https://vite.dev/guide/',                                       lang: 'js'  },
  'rollup':                 { url: 'https://rollupjs.org/tutorial/',                               lang: 'js'  },
  'esbuild':                { url: 'https://esbuild.github.io/getting-started/',                   lang: 'js'  },
  'tailwindcss':            { url: 'https://tailwindcss.com/docs/installation',                    lang: 'any' },
  'styled-components':      { url: 'https://styled-components.com/docs/basics',                    lang: 'js'  },
  '@emotion/react':         { url: 'https://emotion.sh/docs/introduction',                         lang: 'js'  },
  'lodash':                 { url: 'https://lodash.com/docs/4.17.15',                              lang: 'js'  },
  'ramda':                  { url: 'https://ramdajs.com/docs/',                                    lang: 'js'  },
  'rxjs':                   { url: 'https://rxjs.dev/guide/overview',                              lang: 'ts'  },
  'date-fns':               { url: 'https://date-fns.org/docs/Getting-Started',                    lang: 'js'  },
  'dayjs':                  { url: 'https://day.js.org/docs/en/installation/installation',         lang: 'js'  },
  'moment':                 { url: 'https://momentjs.com/docs/#/use-it/',                          lang: 'js'  },
  'zod':                    { url: 'https://zod.dev/',                                             lang: 'ts'  },
  'yup':                    { url: 'https://github.com/jquense/yup#usage',                         lang: 'js'  },
  'joi':                    { url: 'https://joi.dev/api/?v=17.x',                                  lang: 'js'  },
  'sharp':                  { url: 'https://sharp.pixelplumbing.com/',                             lang: 'js'  },
  'multer':                 { url: 'https://github.com/expressjs/multer#usage',                    lang: 'js'  },
  'jsonwebtoken':           { url: 'https://github.com/auth0/node-jsonwebtoken#usage',             lang: 'js'  },
  'bcrypt':                 { url: 'https://github.com/kelektiv/node.bcrypt.js#usage',             lang: 'js'  },
  'stripe':                 { url: 'https://stripe.com/docs/api/charges/create?lang=node',         lang: 'js'  },
  'nodemailer':             { url: 'https://nodemailer.com/about/',                                lang: 'js'  },
  'winston':                { url: 'https://github.com/winstonjs/winston#quick-start',             lang: 'js'  },
  'pino':                   { url: 'https://getpino.io/#/',                                        lang: 'js'  },
  'dotenv':                 { url: 'https://github.com/motdotla/dotenv#usage',                     lang: 'js'  },
  'commander':              { url: 'https://github.com/tj/commander.js#quick-start',               lang: 'js'  },
  'yargs':                  { url: 'https://yargs.js.org/docs/',                                   lang: 'js'  },
  'inquirer':               { url: 'https://github.com/SBoudrias/Inquirer.js#usage',               lang: 'js'  },
  'chalk':                  { url: 'https://github.com/chalk/chalk#usage',                         lang: 'js'  },
  'ora':                    { url: 'https://github.com/sindresorhus/ora#usage',                    lang: 'js'  },

  // ── Python ecosystem (pypi) ──────────────────────────────────────────────
  'tensorflow':             { url: 'https://www.tensorflow.org/api_docs/python/tf',               lang: 'python' },
  'torch':                  { url: 'https://pytorch.org/docs/stable/index.html',                  lang: 'python' },
  'pytorch':                { url: 'https://pytorch.org/docs/stable/index.html',                  lang: 'python' },
  'scikit-learn':           { url: 'https://scikit-learn.org/stable/getting_started.html',        lang: 'python' },
  'sklearn':                { url: 'https://scikit-learn.org/stable/getting_started.html',        lang: 'python' },
  'scipy':                  { url: 'https://docs.scipy.org/doc/scipy/tutorial/general.html',      lang: 'python' },
  'matplotlib':             { url: 'https://matplotlib.org/stable/tutorials/pyplot.html',         lang: 'python' },
  'seaborn':                { url: 'https://seaborn.pydata.org/tutorial/introduction.html',       lang: 'python' },
  'plotly':                 { url: 'https://plotly.com/python/getting-started/',                   lang: 'python' },
  'pandas':                 { url: 'https://pandas.pydata.org/docs/user_guide/10min.html',        lang: 'python' },
  'numpy':                  { url: 'https://numpy.org/doc/stable/user/absolute_beginners.html',   lang: 'python' },
  'fastapi':                { url: 'https://fastapi.tiangolo.com/tutorial/first-steps/',          lang: 'python' },
  'flask':                  { url: 'https://flask.palletsprojects.com/en/3.0.x/quickstart/',      lang: 'python' },
  'django':                 { url: 'https://docs.djangoproject.com/en/5.0/intro/overview/',       lang: 'python' },
  'sqlalchemy':             { url: 'https://docs.sqlalchemy.org/en/20/orm/quickstart.html',       lang: 'python' },
  'pydantic':               { url: 'https://docs.pydantic.dev/latest/concepts/models/',           lang: 'python' },
  'pydantic-v1':            { url: 'https://docs.pydantic.dev/1.10/usage/models/',                lang: 'python' },
  'httpx':                  { url: 'https://www.python-httpx.org/quickstart/',                    lang: 'python' },
  'aiohttp':                { url: 'https://docs.aiohttp.org/en/stable/client_quickstart.html',   lang: 'python' },
  'requests':               { url: 'https://requests.readthedocs.io/en/latest/user/quickstart/',  lang: 'python' },
  'celery':                 { url: 'https://docs.celeryq.dev/en/stable/getting-started/first-steps-with-celery.html', lang: 'python' },
  'pytest':                 { url: 'https://docs.pytest.org/en/stable/how-to/assert.html',        lang: 'python' },
  'boto3':                  { url: 'https://boto3.amazonaws.com/v1/documentation/api/latest/guide/quickstart.html', lang: 'python' },
  'paramiko':               { url: 'https://docs.paramiko.org/en/stable/api/client.html',         lang: 'python' },
  'cryptography':           { url: 'https://cryptography.io/en/latest/fernet/',                   lang: 'python' },
  'pillow':                 { url: 'https://pillow.readthedocs.io/en/stable/handbook/tutorial.html', lang: 'python' },
  'pil':                    { url: 'https://pillow.readthedocs.io/en/stable/handbook/tutorial.html', lang: 'python' },
  'opencv-python':          { url: 'https://docs.opencv.org/4.x/d9/df8/tutorial_root.html',       lang: 'python' },
  'cv2':                    { url: 'https://docs.opencv.org/4.x/d9/df8/tutorial_root.html',       lang: 'python' },
  'nltk':                   { url: 'https://www.nltk.org/book/ch01.html',                         lang: 'python' },
  'spacy':                  { url: 'https://spacy.io/usage/spacy-101',                            lang: 'python' },
  'transformers':           { url: 'https://huggingface.co/docs/transformers/quicktour',          lang: 'python' },
  'langchain':              { url: 'https://python.langchain.com/docs/tutorials/llm_chain/',      lang: 'python' },
  'openai':                 { url: 'https://platform.openai.com/docs/quickstart',                 lang: 'python' },
  'anthropic':              { url: 'https://docs.anthropic.com/en/api/getting-started',           lang: 'python' },
  'click':                  { url: 'https://click.palletsprojects.com/en/8.x/quickstart/',        lang: 'python' },
  'typer':                  { url: 'https://typer.tiangolo.com/tutorial/',                        lang: 'python' },
  'rich':                   { url: 'https://rich.readthedocs.io/en/stable/introduction.html',     lang: 'python' },

  // ── Apache projects ────────────────────────────────────────────────────────
  'apache kafka':           { url: 'https://kafka.apache.org/quickstart',                         lang: 'any'    },
  'kafka':                  { url: 'https://kafka.apache.org/quickstart',                         lang: 'any'    },
  'apache spark':           { url: 'https://spark.apache.org/docs/latest/quick-start.html',       lang: 'python' },
  'spark':                  { url: 'https://spark.apache.org/docs/latest/quick-start.html',       lang: 'python' },
  'apache flink':           { url: 'https://nightlies.apache.org/flink/flink-docs-stable/docs/try-flink/local_installation/', lang: 'java' },
  'flink':                  { url: 'https://nightlies.apache.org/flink/flink-docs-stable/docs/try-flink/local_installation/', lang: 'java' },
  'apache hadoop':          { url: 'https://hadoop.apache.org/docs/stable/hadoop-project-dist/hadoop-common/SingleCluster.html', lang: 'any' },
  'hadoop':                 { url: 'https://hadoop.apache.org/docs/stable/hadoop-project-dist/hadoop-common/SingleCluster.html', lang: 'any' },
  'apache hive':            { url: 'https://cwiki.apache.org/confluence/display/Hive/GettingStarted', lang: 'any' },
  'hive':                   { url: 'https://cwiki.apache.org/confluence/display/Hive/GettingStarted', lang: 'any' },
  'apache hbase':           { url: 'https://hbase.apache.org/book.html#quickstart',              lang: 'any'    },
  'hbase':                  { url: 'https://hbase.apache.org/book.html#quickstart',              lang: 'any'    },
  'apache cassandra':       { url: 'https://cassandra.apache.org/doc/latest/cassandra/getting_started/quickstart.html', lang: 'any' },
  'cassandra':              { url: 'https://cassandra.apache.org/doc/latest/cassandra/getting_started/quickstart.html', lang: 'any' },
  'apache airflow':         { url: 'https://airflow.apache.org/docs/apache-airflow/stable/tutorial/fundamentals.html', lang: 'python' },
  'airflow':                { url: 'https://airflow.apache.org/docs/apache-airflow/stable/tutorial/fundamentals.html', lang: 'python' },
  'apache beam':            { url: 'https://beam.apache.org/get-started/wordcount-example/',     lang: 'python' },
  'beam':                   { url: 'https://beam.apache.org/get-started/wordcount-example/',     lang: 'python' },
  'apache arrow':           { url: 'https://arrow.apache.org/docs/python/getstarted.html',       lang: 'python' },
  'arrow':                  { url: 'https://arrow.apache.org/docs/python/getstarted.html',       lang: 'python' },
  'apache druid':           { url: 'https://druid.apache.org/docs/latest/tutorials/',            lang: 'any'    },
  'druid':                  { url: 'https://druid.apache.org/docs/latest/tutorials/',            lang: 'any'    },
  'apache solr':            { url: 'https://solr.apache.org/guide/solr/latest/getting-started/solr-tutorial.html', lang: 'any' },
  'solr':                   { url: 'https://solr.apache.org/guide/solr/latest/getting-started/solr-tutorial.html', lang: 'any' },
  'apache zookeeper':       { url: 'https://zookeeper.apache.org/doc/current/zookeeperStarted.html', lang: 'any' },
  'zookeeper':              { url: 'https://zookeeper.apache.org/doc/current/zookeeperStarted.html', lang: 'any' },
  'apache nifi':            { url: 'https://nifi.apache.org/docs/nifi-docs/html/getting-started.html', lang: 'any' },
  'nifi':                   { url: 'https://nifi.apache.org/docs/nifi-docs/html/getting-started.html', lang: 'any' },
  'apache maven':           { url: 'https://maven.apache.org/guides/getting-started/maven-in-five-minutes.html', lang: 'any' },
  'maven':                  { url: 'https://maven.apache.org/guides/getting-started/maven-in-five-minutes.html', lang: 'any' },
  'apache ant':             { url: 'https://ant.apache.org/manual/tutorial-HelloWorldWithAnt.html', lang: 'any' },
  'ant':                    { url: 'https://ant.apache.org/manual/tutorial-HelloWorldWithAnt.html', lang: 'any' },
  'apache tomcat':          { url: 'https://tomcat.apache.org/tomcat-10.1-doc/appdev/index.html', lang: 'java'  },
  'tomcat':                 { url: 'https://tomcat.apache.org/tomcat-10.1-doc/appdev/index.html', lang: 'java'  },
  'apache httpd':           { url: 'https://httpd.apache.org/docs/2.4/getting-started.html',    lang: 'any'    },
  'apache zeppelin':        { url: 'https://zeppelin.apache.org/docs/latest/quickstart/tutorial.html', lang: 'python' },
  'zeppelin':               { url: 'https://zeppelin.apache.org/docs/latest/quickstart/tutorial.html', lang: 'python' },
  'apache superset':        { url: 'https://superset.apache.org/docs/quickstart',               lang: 'python' },
  'superset':               { url: 'https://superset.apache.org/docs/quickstart',               lang: 'python' },
  'apache mxnet':           { url: 'https://mxnet.apache.org/api/python/docs/tutorials/packages/gluon/index.html', lang: 'python' },
  'mxnet':                  { url: 'https://mxnet.apache.org/api/python/docs/tutorials/packages/gluon/index.html', lang: 'python' },
  'apache tinkerpop':       { url: 'https://tinkerpop.apache.org/docs/current/tutorials/getting-started/', lang: 'any' },
  'tinkerpop':              { url: 'https://tinkerpop.apache.org/docs/current/tutorials/getting-started/', lang: 'any' },

  // ── Java / JVM ecosystem ──────────────────────────────────────────────────
  'spring boot':            { url: 'https://spring.io/guides/gs/spring-boot',                    lang: 'java'   },
  'spring-boot':            { url: 'https://spring.io/guides/gs/spring-boot',                    lang: 'java'   },
  'spring framework':       { url: 'https://spring.io/guides/gs/rest-service',                   lang: 'java'   },
  'quarkus':                { url: 'https://quarkus.io/guides/getting-started',                  lang: 'java'   },
  'micronaut':              { url: 'https://guides.micronaut.io/latest/micronaut-creating-first-graal-app-gradle-java.html', lang: 'java' },
  'hibernate':              { url: 'https://docs.jboss.org/hibernate/orm/6.6/quickstart/html_single/', lang: 'java' },

  // ── Go ecosystem ──────────────────────────────────────────────────────────
  'gin':                    { url: 'https://gin-gonic.com/docs/quickstart/',                     lang: 'go'     },
  'echo':                   { url: 'https://echo.labstack.com/docs/quick-start',                 lang: 'go'     },
  'fiber':                  { url: 'https://docs.gofiber.io/',                                   lang: 'go'     },
  'gorm':                   { url: 'https://gorm.io/docs/',                                      lang: 'go'     },

  // ── Rust ecosystem ────────────────────────────────────────────────────────
  'tokio':                  { url: 'https://tokio.rs/tokio/tutorial/hello-tokio',                lang: 'rust'   },
  'actix-web':              { url: 'https://actix.rs/docs/getting-started/',                     lang: 'rust'   },
  'axum':                   { url: 'https://docs.rs/axum/latest/axum/',                          lang: 'rust'   },
  'serde':                  { url: 'https://serde.rs/',                                          lang: 'rust'   },
  'reqwest':                { url: 'https://docs.rs/reqwest/latest/reqwest/',                    lang: 'rust'   },

  // ── DevOps / Infrastructure ───────────────────────────────────────────────
  'docker':                 { url: 'https://docs.docker.com/guides/getting-started/',            lang: 'any'    },
  'kubernetes':             { url: 'https://kubernetes.io/docs/tutorials/hello-minikube/',       lang: 'any'    },
  'terraform':              { url: 'https://developer.hashicorp.com/terraform/tutorials/aws-get-started/aws-build', lang: 'any' },
  'ansible':                { url: 'https://docs.ansible.com/ansible/latest/getting_started/get_started_playbook.html', lang: 'any' },
  'prometheus':             { url: 'https://prometheus.io/docs/introduction/first_steps/',      lang: 'any'    },
  'grafana':                { url: 'https://grafana.com/docs/grafana/latest/getting-started/build-first-dashboard/', lang: 'any' },

  // ── Targeted: npm packages currently missing exampleCode ─────────────────
  'sinon':                          { url: 'https://sinonjs.org/releases/latest/',                              lang: 'js'     },
  '@tinymce/tinymce-react':         { url: 'https://www.tiny.cloud/docs/tinymce/6/react-cloud/',               lang: 'js'     },
  'tinymce-react':                  { url: 'https://www.tiny.cloud/docs/tinymce/6/react-cloud/',               lang: 'js'     },
  '@fortawesome/react-fontawesome': { url: 'https://fontawesome.com/docs/web/use-with/react/',                 lang: 'js'     },
  'react-fontawesome':              { url: 'https://fontawesome.com/docs/web/use-with/react/',                 lang: 'js'     },
  'prelude-ls':                     { url: 'https://github.com/gkz/prelude-ls#list',                          lang: 'js'     },
  'livefyre':                       { url: 'https://github.com/livefyre/livefyre-nodejs-utils#usage',          lang: 'js'     },
  'discord.ts-buddy':               { url: 'https://github.com/MitchCodes/Discord.ts-Buddy#about',             lang: 'ts'     },

  // ── Targeted: pypi packages currently missing exampleCode ────────────────
  'alembic':                        { url: 'https://alembic.sqlalchemy.org/en/latest/tutorial.html',          lang: 'python' },
  'anyio':                          { url: 'https://anyio.readthedocs.io/en/stable/basics.html',              lang: 'python' },
  'coverage':                       { url: 'https://coverage.readthedocs.io/en/latest/',                      lang: 'python' },
  'filelock':                       { url: 'https://py-filelock.readthedocs.io/en/latest/',                   lang: 'python' },
  'google-auth':                    { url: 'https://google-auth.readthedocs.io/en/master/',                   lang: 'python' },
  'google-cloud-storage':           { url: 'https://cloud.google.com/python/docs/reference/storage/latest/google.cloud.storage.client.Client', lang: 'python' },
  'greenlet':                       { url: 'https://greenlet.readthedocs.io/en/latest/',                      lang: 'python' },
  'importlib-metadata':             { url: 'https://importlib-metadata.readthedocs.io/en/latest/',            lang: 'python' },
  'jinja2':                         { url: 'https://jinja.palletsprojects.com/en/3.1.x/api/',                 lang: 'python' },
  'keyring':                        { url: 'https://github.com/jaraco/keyring#usage',                         lang: 'python' },
  'lxml':                           { url: 'https://lxml.de/tutorial.html',                                   lang: 'python' },
  'oauthlib':                       { url: 'https://oauthlib.readthedocs.io/en/latest/',                      lang: 'python' },
  'packaging':                      { url: 'https://packaging.pypa.io/en/stable/',                            lang: 'python' },
  'passlib':                        { url: 'https://passlib.readthedocs.io/en/stable/narr/quickstart.html',   lang: 'python' },
  'protobuf':                       { url: 'https://protobuf.dev/getting-started/pythontutorial/',             lang: 'python' },
  'pygments':                       { url: 'https://pygments.org/docs/quickstart/',                           lang: 'python' },
  'pynacl':                         { url: 'https://pynacl.readthedocs.io/en/latest/signing/',                lang: 'python' },
  'pyopenssl':                      { url: 'https://www.pyopenssl.org/en/stable/api/crypto.html',             lang: 'python' },
  'pydantic-settings':              { url: 'https://docs.pydantic.dev/latest/concepts/pydantic_settings/',    lang: 'python' },
  'python-multipart':               { url: 'https://github.com/Kludex/python-multipart#usage',                lang: 'python' },
  'setuptools':                     { url: 'https://setuptools.pypa.io/en/stable/userguide/quickstart.html',  lang: 'python' },
  'six':                            { url: 'https://six.readthedocs.io/',                                     lang: 'python' },
  'structlog':                      { url: 'https://www.structlog.org/en/stable/getting-started.html',        lang: 'python' },
  'tabulate':                       { url: 'https://pypi.org/project/tabulate/',                              lang: 'python' },
  'tenacity':                       { url: 'https://tenacity.readthedocs.io/en/latest/',                      lang: 'python' },
  'virtualenv':                     { url: 'https://virtualenv.pypa.io/en/latest/user_guide.html',            lang: 'python' },
  'xgboost':                        { url: 'https://xgboost.readthedocs.io/en/stable/get_started.html',       lang: 'python' },

  // ── Targeted: Apache projects currently missing exampleCode ──────────────
  'apache activemq':    { url: 'https://activemq.apache.org/getting-started',                             lang: 'any'    },
  'apache avro':        { url: 'https://avro.apache.org/docs/current/getting-started-python/',            lang: 'python' },
  'apache bookkeeper':  { url: 'https://bookkeeper.apache.org/docs/getting-started/concepts',             lang: 'any'    },
  'apache brooklyn':    { url: 'https://brooklyn.apache.org/learnmore/blueprint-tour/',                   lang: 'any'    },
  'apache calcite':     { url: 'https://calcite.apache.org/docs/tutorial.html',                           lang: 'java'   },
  'apache camel':       { url: 'https://camel.apache.org/manual/getting-started.html',                    lang: 'java'   },
  'apache carbondata':  { url: 'https://carbondata.apache.org/quick-start-guide.html',                    lang: 'any'    },
  'apache causeway':    { url: 'https://causeway.apache.org/docs/2.0.0/starters/helloworld.html',         lang: 'java'   },
  'apache crunch':      { url: 'https://crunch.apache.org/user-guide.html',                               lang: 'java'   },
  'apache fluo':        { url: 'https://fluo.apache.org/tour/',                                           lang: 'java'   },
  'apache giraph':      { url: 'https://giraph.apache.org/quick_start.html',                              lang: 'java'   },
  'apache gora':        { url: 'https://gora.apache.org/current/overview.html',                           lang: 'java'   },
  'apache ivy':         { url: 'https://ant.apache.org/ivy/history/latest-milestone/tutorial/start.html', lang: 'any'    },
  'apache jclouds':     { url: 'https://jclouds.apache.org/start/',                                       lang: 'java'   },
  'apache lens':        { url: 'https://lens.apache.org/user/cli.html',                                   lang: 'any'    },
  'apache mesos':       { url: 'https://mesos.apache.org/getting-started/',                               lang: 'any'    },
  'apache oozie':       { url: 'https://oozie.apache.org/docs/5.2.1/DG_QuickStart.html',                  lang: 'any'    },
  'apache pivot':       { url: 'https://pivot.apache.org/tutorials/hello-world.html',                     lang: 'java'   },
  'apache predictionio':{ url: 'https://predictionio.apache.org/start/',                                  lang: 'any'    },
  'apache tajo':        { url: 'https://tajo.apache.org/docs/0.11.3/started.html',                        lang: 'any'    },
  'apache ambari':      { url: 'https://ambari.apache.org/1.2.4/installing-hadoop-using-apache-ambari/index.html', lang: 'any' },
  'apache ooze':        { url: 'https://oozie.apache.org/docs/5.2.1/DG_QuickStart.html',                  lang: 'any'    },
}

// ─────────────────────────────────────────────────────────────────────────────
// Code selectors — tried in order; first one with real content wins
// ─────────────────────────────────────────────────────────────────────────────

const CODE_SELECTORS = [
  // Language-specific Prism / Shiki / highlight.js code blocks
  'pre code[class*="language-"]',
  'pre[class*="language-"]',
  '[class*="codeBlock"] code',
  '[class*="code-block"] code',
  '[class*="CodeBlock"] code',
  '[class*="highlight"] pre code',
  '[class*="highlight"] pre',
  '.highlight pre',
  // Generic pre/code
  'article pre code',
  'main pre code',
  '.content pre code',
  '.docs-content pre code',
  '.markdown-body pre code',
  '.prose pre code',
  // Fallback
  'pre code',
  'pre',
]

// ─────────────────────────────────────────────────────────────────────────────
// Code quality helpers (mirrors backfill-example-code.ts)
// ─────────────────────────────────────────────────────────────────────────────

function isLowQualitySnippet(code: string): boolean {
  const lines = code.split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length === 0) return true
  const installRe = /^(?:\$\s+)?(?:npm|yarn|pnpm|pip[23]?|gem|cargo|go\s+get|composer|apt(?:-get)?|brew|conda)\s+(?:install|add|i|require|get|update)\b/i
  const buildRe   = /^(?:mvn|gradle|ant|make|cmake|bazel|sbt|lein|mix|cabal)\s+/i
  const commentRe = /^(?:#|\/\/|<!--)\s*/
  const shebangRe = /^#!\//
  const cliOptRe  = /^(?:--[\w-]+=?|<\w[\w-]*>)\s*/  // bare CLI flags / placeholders
  const meaningful = lines.filter(l =>
    !installRe.test(l) && !buildRe.test(l) &&
    !commentRe.test(l) && !shebangRe.test(l) &&
    !cliOptRe.test(l)  && l !== '' && l !== '$',
  )
  return meaningful.length === 0
}

function cleanCode(raw: string): string {
  // Strip ANSI escape codes, normalise line endings, trim
  return raw
    .replace(/\x1b\[[0-9;]*m/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim()
    .slice(0, 2000)
}

// ─────────────────────────────────────────────────────────────────────────────
// Normalise a library name for docs-map lookup
// ─────────────────────────────────────────────────────────────────────────────

function normaliseKey(name: string): string {
  return name.toLowerCase().replace(/^apache\s+/i, 'apache ').trim()
}

function docsEntry(name: string): DocsEntry | null {
  const key = normaliseKey(name)
  if (DOCS_MAP[key]) return DOCS_MAP[key]
  // Try without scope prefix (e.g. @nestjs/core → nestjs/core → nestjs)
  const noScope = key.replace(/^@[^/]+\//, '')
  if (DOCS_MAP[noScope]) return DOCS_MAP[noScope]
  // Try first segment of scoped name
  const firstSeg = noScope.split('/')[0]
  if (DOCS_MAP[firstSeg]) return DOCS_MAP[firstSeg]
  return null
}

// ─────────────────────────────────────────────────────────────────────────────
// Playwright page extraction
// ─────────────────────────────────────────────────────────────────────────────

async function extractCodeFromPage(page: Page, lang?: string): Promise<string | null> {
  // Wait briefly for any JS-rendered code blocks to appear
  try {
    await page.waitForSelector('pre', { timeout: ELEMENT_WAIT })
  } catch {
    // No <pre> found — page may have no code blocks
  }

  for (const selector of CODE_SELECTORS) {
    try {
      const elements = await page.locator(selector).all()
      for (const el of elements) {
        const text = await el.innerText().catch(() => null)
        if (!text) continue
        const code = cleanCode(text)
        if (code.length < 8) continue
        if (isLowQualitySnippet(code)) continue

        // Language preference filter: if the element has a language class,
        // prefer the one matching the hint (but don't reject others entirely)
        if (lang && lang !== 'any') {
          const cls = (await el.getAttribute('class').catch(() => '')) ?? ''
          const hasLangHint = cls.includes(lang) ||
            cls.includes(lang === 'js' ? 'javascript' : lang) ||
            cls.includes(lang === 'python' ? 'py' : lang)
          if (elements.length > 3 && !hasLangHint) continue  // skip mis-matched on pages with many blocks
        }

        return code
      }
    } catch { /* try next selector */ }
  }

  // Second pass — relax language filter and accept any non-install code
  for (const selector of CODE_SELECTORS) {
    try {
      const elements = await page.locator(selector).all()
      for (const el of elements) {
        const text = await el.innerText().catch(() => null)
        if (!text) continue
        const code = cleanCode(text)
        if (code.length < 8 || isLowQualitySnippet(code)) continue
        return code
      }
    } catch { /* continue */ }
  }

  return null
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗')
  console.log('║   SLIB — Backfill exampleCode via Playwright (docs pages)    ║')
  console.log('╚══════════════════════════════════════════════════════════════╝')
  console.log(IS_DRY_RUN
    ? '\n  MODE: DRY RUN — nothing will be written to the database\n'
    : '\n  MODE: LIVE — will update database\n')
  console.log(`  Goal : ${GOAL} successful backfills`)
  console.log(`  Docs map entries : ${Object.keys(DOCS_MAP).length}\n`)

  // ── Fetch libraries with missing exampleCode ─────────────────────────────
  const missing = await prisma.library.findMany({
    where: { OR: [{ exampleCode: null }, { exampleCode: '' }] },
    select: { id: true, name: true, slug: true, dataSource: true },
    orderBy: { createdAt: 'asc' },
  })

  const totalMissing = missing.length
  console.log(`  Libraries missing exampleCode : ${totalMissing}`)

  // ── Match against docs map ────────────────────────────────────────────────
  const candidates = missing.map(lib => ({
    lib,
    entry: docsEntry(lib.name),
  })).filter(x => x.entry !== null) as { lib: typeof missing[0]; entry: DocsEntry }[]

  console.log(`  Libraries with a known docs URL : ${candidates.length}`)
  console.log(`  Libraries without a docs URL    : ${totalMissing - candidates.length}  (skipped)`)

  if (candidates.length === 0) {
    console.log('\n  Nothing to do — no candidates matched the docs map.')
    await prisma.$disconnect()
    return
  }

  // ── Print plan ───────────────────────────────────────────────────────────
  console.log('\n' + '─'.repeat(66))
  console.log('  Libraries selected for docs scraping:')
  console.log('─'.repeat(66))
  for (const { lib, entry } of candidates) {
    console.log(`  • [${lib.dataSource ?? 'unknown'}]  ${lib.name}`)
    console.log(`      ${entry.url}`)
  }
  console.log('─'.repeat(66) + '\n')

  // ── Launch browser ────────────────────────────────────────────────────────
  let browser: Browser | null = null
  let totalUpdated = 0
  let totalFailed  = 0
  let totalNoCode  = 0

  try {
    browser = await chromium.launch({ headless: true })
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (compatible; SLIBDirectory-backfill/1.0; educational project)',
      javaScriptEnabled: true,
    })

    for (let i = 0; i < candidates.length; i++) {
      if (totalUpdated >= GOAL) {
        console.log(`\n  🎯  Goal of ${GOAL} reached — stopping early.\n`)
        break
      }

      const { lib, entry } = candidates[i]
      const tag = `[${i + 1}/${candidates.length} | ✅ ${totalUpdated}/${GOAL}]`

      const page = await context.newPage()
      try {
        // Navigate with timeout
        await page.goto(entry.url, {
          waitUntil: 'domcontentloaded',
          timeout: PAGE_TIMEOUT,
        })

        // Small wait for any lazy-loaded code blocks
        await page.waitForTimeout(1500)

        const code = await extractCodeFromPage(page, entry.lang)

        if (code) {
          if (!IS_DRY_RUN) {
            await prisma.library.update({
              where: { id: lib.id },
              data:  { exampleCode: code },
            })
          }
          totalUpdated++
          const preview = code.slice(0, 70).replace(/\n/g, '↵')
          console.log(`  ✅  ${tag}  ${lib.name}  [${lib.dataSource ?? 'unknown'}]`)
          console.log(`       preview : ${preview}…`)
        } else {
          totalNoCode++
          console.log(`  ⚠️   ${tag}  ${lib.name}  — no real code found on ${entry.url}`)
        }

      } catch (err) {
        totalFailed++
        const msg = err instanceof Error ? err.message.split('\n')[0].slice(0, 80) : String(err)
        console.error(`  ❌  ${tag}  ${lib.name}  — page error: ${msg}`)
      } finally {
        await page.close()
        await new Promise(r => setTimeout(r, RATE_LIMIT_MS))
      }
    }

  } finally {
    await browser?.close()
  }

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(66))
  console.log('  RESULTS')
  console.log('═'.repeat(66))
  console.log(`  Candidates checked  : ${Math.min(candidates.length, totalUpdated + totalNoCode + totalFailed)}`)
  console.log(`  ✅  Updated         : ${totalUpdated}`)
  console.log(`  ⚠️   No code found   : ${totalNoCode}   (page has no extractable snippet)`)
  console.log(`  ❌  Failed          : ${totalFailed}   (page load error / timeout)`)
  console.log(`  Still missing       : ${totalMissing - totalUpdated}`)
  console.log(`  Goal reached        : ${totalUpdated >= GOAL ? `YES (${totalUpdated}/${GOAL})` : `NO (${totalUpdated}/${GOAL})`}`)
  if (IS_DRY_RUN) {
    console.log('\n  ⚠️  DRY RUN — no database changes were made')
    console.log('  Re-run with --live to apply updates')
  }
  console.log('─'.repeat(66) + '\n')

  await prisma.$disconnect()
}

main().catch(err => {
  console.error('Fatal:', err)
  prisma.$disconnect().finally(() => process.exit(1))
})
