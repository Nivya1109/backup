/**
 * patch-examples.ts
 *
 * Manually populates missing `exampleCode` values in the database.
 * - Only updates libraries where exampleCode is null or empty/whitespace.
 * - Preserves any existing non-empty exampleCode.
 * - Logs updated / skipped / already-populated counts at the end.
 *
 * Run: npx tsx scripts/patch-examples.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Manual mapping: normalized library name -> example code snippet
// ---------------------------------------------------------------------------
const EXAMPLES: Record<string, string> = {

  // ── NPM ──────────────────────────────────────────────────────────────────

  '@angular/core': `import { Component } from '@angular/core';

@Component({
  selector: 'app-hello',
  template: '<h1>Hello, {{ name }}!</h1>',
})
export class HelloComponent {
  name = 'World';
}`,

  'amqplib': `const amqp = require('amqplib');

async function main() {
  const conn = await amqp.connect('amqp://localhost');
  const channel = await conn.createChannel();
  const queue = 'hello';
  await channel.assertQueue(queue);
  channel.sendToQueue(queue, Buffer.from('Hello World'));
  console.log('Message sent');
  await conn.close();
}
main();`,

  'argon2': `const argon2 = require('argon2');

async function main() {
  const hash = await argon2.hash('myPassword');
  const valid = await argon2.verify(hash, 'myPassword');
  console.log(valid); // true
}
main();`,

  'bcryptjs': `const bcrypt = require('bcryptjs');

const password = 'mySecret';
const hash = bcrypt.hashSync(password, 10);
const isValid = bcrypt.compareSync(password, hash);
console.log(isValid); // true`,

  'bull': `const Queue = require('bull');
const emailQueue = new Queue('email', 'redis://127.0.0.1:6379');

emailQueue.add({ to: 'user@example.com', subject: 'Hello' });

emailQueue.process(async (job) => {
  console.log('Sending email to', job.data.to);
});`,

  'bullmq': `const { Queue, Worker } = require('bullmq');
const queue = new Queue('tasks');

await queue.add('myTask', { data: 'hello' });

const worker = new Worker('tasks', async (job) => {
  console.log('Processing job:', job.data);
});`,

  'bunyan': `const bunyan = require('bunyan');
const log = bunyan.createLogger({ name: 'myapp' });

log.info('Server started');
log.warn({ userId: 42 }, 'User not found');
log.error(new Error('Oops'), 'Something failed');`,

  'chai': `const { expect } = require('chai');

describe('Math', () => {
  it('adds numbers', () => {
    expect(1 + 1).to.equal(2);
  });
  it('checks type', () => {
    expect('hello').to.be.a('string');
  });
});`,

  'cors': `const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors({ origin: 'https://example.com' }));

app.get('/data', (req, res) => {
  res.json({ message: 'CORS enabled' });
});

app.listen(3000);`,

  'cypress': `describe('Login', () => {
  it('logs in successfully', () => {
    cy.visit('/login');
    cy.get('#username').type('admin');
    cy.get('#password').type('password');
    cy.get('button[type="submit"]').click();
    cy.url().should('include', '/dashboard');
  });
});`,

  'date-fns': `const { format, addDays } = require('date-fns');

const today = new Date();
console.log(format(today, 'yyyy-MM-dd'));

const nextWeek = addDays(today, 7);
console.log(format(nextWeek, 'MMMM do, yyyy'));`,

  'debug': `const debug = require('debug');
const log = debug('myapp:server');

log('Server starting on port %d', 3000);
// Enable with: DEBUG=myapp:* node app.js`,

  'drizzle-orm': `import { drizzle } from 'drizzle-orm/node-postgres';
import { pgTable, serial, text } from 'drizzle-orm/pg-core';

const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
});

const db = drizzle(process.env.DATABASE_URL!);
const allUsers = await db.select().from(users);
console.log(allUsers);`,

  'fastify': `const fastify = require('fastify')({ logger: true });

fastify.get('/hello', async (request, reply) => {
  return { message: 'Hello World' };
});

fastify.listen({ port: 3000 }, (err) => {
  if (err) throw err;
});`,

  'got': `const got = require('got');

const response = await got('https://api.example.com/data');
console.log(response.body);

const json = await got('https://api.example.com/users', {
  responseType: 'json',
});
console.log(json.body);`,

  'hapi': `const Hapi = require('@hapi/hapi');

const server = Hapi.server({ port: 3000 });

server.route({
  method: 'GET',
  path: '/',
  handler: () => 'Hello World',
});

await server.start();
console.log('Server running on', server.info.uri);`,

  'helmet': `const express = require('express');
const helmet = require('helmet');
const app = express();

app.use(helmet());

app.get('/', (req, res) => {
  res.send('Secured with Helmet');
});

app.listen(3000);`,

  'ioredis': `const Redis = require('ioredis');
const redis = new Redis();

await redis.set('key', 'value');
const value = await redis.get('key');
console.log(value); // 'value'

await redis.hset('user:1', { name: 'Alice', age: 30 });
const user = await redis.hgetall('user:1');
console.log(user);`,

  'jsonwebtoken': `const jwt = require('jsonwebtoken');

const secret = 'mySecretKey';
const token = jwt.sign({ userId: 42 }, secret, { expiresIn: '1h' });

const decoded = jwt.verify(token, secret);
console.log(decoded.userId); // 42`,

  'knex': `const knex = require('knex')({
  client: 'pg',
  connection: process.env.DATABASE_URL,
});

const users = await knex('users').select('*').where({ active: true });
console.log(users);

await knex('users').insert({ name: 'Alice', email: 'alice@example.com' });`,

  'koa': `const Koa = require('koa');
const app = new Koa();

app.use(async (ctx) => {
  ctx.body = 'Hello Koa';
});

app.listen(3000, () => console.log('Koa running on port 3000'));`,

  'ky': `import ky from 'ky';

const data = await ky.get('https://api.example.com/users').json();
console.log(data);

const result = await ky.post('https://api.example.com/users', {
  json: { name: 'Alice' },
}).json();`,

  'lodash': `const _ = require('lodash');

const arr = [1, 2, 3, 4, 5];
console.log(_.chunk(arr, 2)); // [[1,2],[3,4],[5]]
console.log(_.uniq([1, 1, 2, 2, 3])); // [1,2,3]

const users = [{ name: 'Alice', age: 25 }, { name: 'Bob', age: 30 }];
console.log(_.sortBy(users, 'age'));`,

  'mocha': `const assert = require('assert');

describe('Array', () => {
  it('returns -1 when value not found', () => {
    assert.strictEqual([1, 2, 3].indexOf(4), -1);
  });

  it('finds existing values', () => {
    assert.strictEqual([1, 2, 3].indexOf(2), 1);
  });
});`,

  'morgan': `const express = require('express');
const morgan = require('morgan');
const app = express();

app.use(morgan('combined'));

app.get('/', (req, res) => res.send('Hello'));
app.listen(3000);`,

  'mysql2': `const mysql = require('mysql2/promise');

const connection = await mysql.createConnection({
  host: 'localhost',
  user: 'root',
  database: 'mydb',
});

const [rows] = await connection.execute(
  'SELECT * FROM users WHERE id = ?', [1]
);
console.log(rows);
await connection.end();`,

  'nestjs': `import { Controller, Get, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

@Controller()
class AppController {
  @Get()
  getHello(): string {
    return 'Hello World!';
  }
}

@Module({ controllers: [AppController] })
class AppModule {}

const app = await NestFactory.create(AppModule);
await app.listen(3000);`,

  'next': `// pages/index.js
export default function Home() {
  return <h1>Hello from Next.js</h1>;
}

// pages/api/hello.js
export default function handler(req, res) {
  res.status(200).json({ message: 'Hello API' });
}`,

  'next-auth': `// pages/api/auth/[...nextauth].js
import NextAuth from 'next-auth';
import GitHubProvider from 'next-auth/providers/github';

export default NextAuth({
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
    }),
  ],
});`,

  'node-fetch': `const fetch = require('node-fetch');

const response = await fetch('https://api.example.com/data');
const data = await response.json();
console.log(data);

const post = await fetch('https://api.example.com/users', {
  method: 'POST',
  body: JSON.stringify({ name: 'Alice' }),
  headers: { 'Content-Type': 'application/json' },
});`,

  'nuxt': `// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@nuxtjs/tailwindcss'],
});

// pages/index.vue
// <template><h1>Hello Nuxt</h1></template>
// <script setup>
// const { data } = await useFetch('/api/hello')
// </script>`,

  'passport': `const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;

passport.use(new LocalStrategy((username, password, done) => {
  if (username === 'admin' && password === 'secret') {
    return done(null, { id: 1, username });
  }
  return done(null, false);
}));`,

  'pg': `const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const result = await pool.query(
  'SELECT * FROM users WHERE id = $1', [1]
);
console.log(result.rows);

await pool.query('INSERT INTO users (name) VALUES ($1)', ['Alice']);`,

  'pino': `const pino = require('pino');
const logger = pino({ level: 'info' });

logger.info('Server started');
logger.warn({ userId: 42 }, 'User action');
logger.error(new Error('Something failed'), 'Unhandled error');`,

  'puppeteer': `const puppeteer = require('puppeteer');

const browser = await puppeteer.launch();
const page = await browser.newPage();
await page.goto('https://example.com');
const title = await page.title();
console.log(title);
await browser.close();`,

  'sequelize': `const { Sequelize, DataTypes } = require('sequelize');
const sequelize = new Sequelize(process.env.DATABASE_URL);

const User = sequelize.define('User', {
  name: DataTypes.STRING,
  email: { type: DataTypes.STRING, unique: true },
});

await sequelize.sync();
const user = await User.create({ name: 'Alice', email: 'alice@example.com' });
console.log(user.toJSON());`,

  'sinon': `const sinon = require('sinon');
const assert = require('assert');

const obj = { method: () => 'original' };
const stub = sinon.stub(obj, 'method').returns('stubbed');

assert.strictEqual(obj.method(), 'stubbed');
assert(stub.calledOnce);
stub.restore();`,

  'socket.io': `const { Server } = require('socket.io');
const io = new Server(3000);

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('message', (data) => {
    io.emit('message', data);
  });
  socket.on('disconnect', () => console.log('Client disconnected'));
});`,

  'solid-js': `import { createSignal } from 'solid-js';
import { render } from 'solid-js/web';

function Counter() {
  const [count, setCount] = createSignal(0);
  return (
    <button onClick={() => setCount(c => c + 1)}>
      Count: {count()}
    </button>
  );
}

render(() => <Counter />, document.getElementById('app'));`,

  'superagent': `const superagent = require('superagent');

const res = await superagent.get('https://api.example.com/users');
console.log(res.body);

await superagent
  .post('https://api.example.com/users')
  .send({ name: 'Alice' })
  .set('Content-Type', 'application/json');`,

  'supertest': `const supertest = require('supertest');
const express = require('express');

const app = express();
app.get('/hello', (req, res) => res.json({ message: 'Hello' }));

const response = await supertest(app).get('/hello');
console.log(response.status);       // 200
console.log(response.body.message); // 'Hello'`,

  'svelte': `<script>
  let count = 0;
  function increment() { count += 1; }
</script>

<button on:click={increment}>
  Clicked {count} {count === 1 ? 'time' : 'times'}
</button>`,

  'typeorm': `import { Entity, PrimaryGeneratedColumn, Column, DataSource } from 'typeorm';

@Entity()
class User {
  @PrimaryGeneratedColumn() id: number;
  @Column() name: string;
}

const ds = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [User],
});
await ds.initialize();
const users = await ds.getRepository(User).find();
console.log(users);`,

  'undici': `const { fetch } = require('undici');

const response = await fetch('https://api.example.com/data');
const data = await response.json();
console.log(data);`,

  'vitest': `import { describe, it, expect } from 'vitest';

describe('Math utils', () => {
  it('adds numbers correctly', () => {
    expect(1 + 1).toBe(2);
  });

  it('handles edge cases', () => {
    expect(Number.isNaN(NaN)).toBe(true);
  });
});`,

  'vue': `import { createApp, ref } from 'vue';

const App = {
  setup() {
    const count = ref(0);
    return { count };
  },
  template: \`<button @click="count++">Count: {{ count }}</button>\`,
};

createApp(App).mount('#app');`,

  'yup': `const yup = require('yup');

const schema = yup.object({
  name: yup.string().required(),
  email: yup.string().email().required(),
  age: yup.number().min(18),
});

await schema.validate({ name: 'Alice', email: 'alice@example.com', age: 25 });
console.log('Validation passed');`,

  'zod': `const { z } = require('zod');

const UserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  age: z.number().int().min(0).optional(),
});

const result = UserSchema.safeParse({ name: 'Alice', email: 'alice@example.com' });
if (result.success) console.log(result.data);`,

  // ── PyPI ─────────────────────────────────────────────────────────────────

  'aiohttp': `import aiohttp
import asyncio

async def main():
    async with aiohttp.ClientSession() as session:
        async with session.get('https://api.example.com/data') as resp:
            data = await resp.json()
            print(data)

asyncio.run(main())`,

  'aiokafka': `from aiokafka import AIOKafkaProducer
import asyncio

async def produce():
    producer = AIOKafkaProducer(bootstrap_servers='localhost:9092')
    await producer.start()
    await producer.send_and_wait("my-topic", b"Hello Kafka")
    await producer.stop()

asyncio.run(produce())`,

  'alembic': `# alembic/versions/001_create_users.py
from alembic import op
import sqlalchemy as sa

def upgrade():
    op.create_table('users',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('name', sa.String(50), nullable=False),
        sa.Column('email', sa.String(100), unique=True),
    )

def downgrade():
    op.drop_table('users')`,

  'authlib': `from authlib.integrations.flask_client import OAuth
from flask import Flask

app = Flask(__name__)
oauth = OAuth(app)

github = oauth.register(
    name='github',
    client_id='YOUR_CLIENT_ID',
    client_secret='YOUR_CLIENT_SECRET',
    authorize_url='https://github.com/login/oauth/authorize',
    access_token_url='https://github.com/login/oauth/access_token',
    api_base_url='https://api.github.com/',
)`,

  'boto3': `import boto3

s3 = boto3.client('s3')
s3.upload_file('local_file.txt', 'my-bucket', 'remote_file.txt')

response = s3.list_objects_v2(Bucket='my-bucket')
for obj in response.get('Contents', []):
    print(obj['Key'])`,

  'celery': `from celery import Celery

app = Celery('tasks', broker='redis://localhost:6379/0')

@app.task
def send_email(to, subject):
    print(f'Sending email to {to}: {subject}')
    return True

# Dispatch async task
send_email.delay('user@example.com', 'Welcome!')`,

  'click': `import click

@click.command()
@click.option('--name', default='World', help='Name to greet')
@click.option('--count', default=1, type=int)
def greet(name, count):
    for _ in range(count):
        click.echo(f'Hello, {name}!')

if __name__ == '__main__':
    greet()`,

  'coverage': `# Run: coverage run -m pytest && coverage report
import coverage

cov = coverage.Coverage()
cov.start()

# ... run your code ...

cov.stop()
cov.save()
cov.report()`,

  'cryptography': `from cryptography.fernet import Fernet

key = Fernet.generate_key()
f = Fernet(key)

token = f.encrypt(b'my secret message')
print(token)

message = f.decrypt(token)
print(message)  # b'my secret message'`,

  'django': `# models.py
from django.db import models

class Post(models.Model):
    title = models.CharField(max_length=200)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

# views.py
from django.http import JsonResponse

def post_list(request):
    posts = Post.objects.all().values('id', 'title')
    return JsonResponse(list(posts), safe=False)`,

  'factory-boy': `import factory
from myapp.models import User

class UserFactory(factory.Factory):
    class Meta:
        model = User

    name = factory.Faker('name')
    email = factory.Faker('email')
    age = factory.Faker('random_int', min=18, max=80)

user = UserFactory()
print(user.name, user.email)`,

  'faker': `from faker import Faker

fake = Faker()
print(fake.name())         # 'John Doe'
print(fake.email())        # 'alice@example.com'
print(fake.address())      # '123 Main St, Springfield'
print(fake.phone_number()) # '+1-555-555-5555'`,

  'fastapi': `from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def read_root():
    return {"message": "Hello World"}

@app.get("/users/{user_id}")
def read_user(user_id: int):
    return {"user_id": user_id}`,

  'flask': `from flask import Flask, jsonify

app = Flask(__name__)

@app.route('/users')
def get_users():
    return jsonify([{'id': 1, 'name': 'Alice'}])

if __name__ == '__main__':
    app.run(debug=True, port=5000)`,

  'grpcio': `import grpc
from myproto import hello_pb2, hello_pb2_grpc

channel = grpc.insecure_channel('localhost:50051')
stub = hello_pb2_grpc.GreeterStub(channel)

response = stub.SayHello(hello_pb2.HelloRequest(name='World'))
print(response.message)`,

  'httpcore': `import httpcore

with httpcore.ConnectionPool() as http:
    response = http.request('GET', 'https://api.example.com/data')
    print(response.status)
    print(response.content)`,

  'httpx': `import httpx

response = httpx.get('https://api.example.com/data')
print(response.json())

with httpx.Client() as client:
    resp = client.post('https://api.example.com/users',
                       json={'name': 'Alice'})
    print(resp.status_code)`,

  'hypothesis': `from hypothesis import given, strategies as st

@given(st.lists(st.integers()))
def test_sorted_length(lst):
    assert len(sorted(lst)) == len(lst)

@given(st.text())
def test_string_roundtrip(s):
    assert s.encode('utf-8').decode('utf-8') == s`,

  'kafka-python': `from kafka import KafkaProducer, KafkaConsumer

producer = KafkaProducer(bootstrap_servers='localhost:9092')
producer.send('my-topic', b'Hello Kafka')
producer.flush()

consumer = KafkaConsumer('my-topic', bootstrap_servers='localhost:9092')
for msg in consumer:
    print(msg.value)`,

  'keras': `import keras
from keras import layers

model = keras.Sequential([
    layers.Dense(64, activation='relu', input_shape=(20,)),
    layers.Dense(10, activation='softmax'),
])
model.compile(optimizer='adam', loss='sparse_categorical_crossentropy',
              metrics=['accuracy'])
model.fit(x_train, y_train, epochs=5, batch_size=32)`,

  'matplotlib': `import matplotlib.pyplot as plt

x = [1, 2, 3, 4, 5]
y = [1, 4, 9, 16, 25]

plt.plot(x, y, marker='o')
plt.xlabel('x')
plt.ylabel('y = x²')
plt.title('Square Function')
plt.show()`,

  'motor': `import asyncio
import motor.motor_asyncio

client = motor.motor_asyncio.AsyncIOMotorClient('mongodb://localhost:27017')
db = client.mydb

async def main():
    await db.users.insert_one({'name': 'Alice', 'age': 30})
    user = await db.users.find_one({'name': 'Alice'})
    print(user)

asyncio.run(main())`,

  'paramiko': `import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('hostname', username='user', password='password')

stdin, stdout, stderr = ssh.exec_command('ls -la')
print(stdout.read().decode())
ssh.close()`,

  'passlib': `from passlib.hash import bcrypt

hashed = bcrypt.hash('my_password')
print(hashed)

is_valid = bcrypt.verify('my_password', hashed)
print(is_valid)  # True`,

  'peewee': `from peewee import SqliteDatabase, Model, CharField, IntegerField

db = SqliteDatabase('users.db')

class User(Model):
    name = CharField()
    age = IntegerField()
    class Meta:
        database = db

db.create_tables([User])
User.create(name='Alice', age=30)
for user in User.select():
    print(user.name, user.age)`,

  'pika': `import pika

connection = pika.BlockingConnection(pika.ConnectionParameters('localhost'))
channel = connection.channel()
channel.queue_declare(queue='hello')

channel.basic_publish(exchange='', routing_key='hello', body='Hello RabbitMQ!')
connection.close()`,

  'plotly': `import plotly.express as px

df = px.data.gapminder().query("year == 2007")
fig = px.scatter(df, x='gdpPercap', y='lifeExp',
                 size='pop', color='continent',
                 hover_name='country', log_x=True)
fig.show()`,

  'psycopg2': `import psycopg2

conn = psycopg2.connect(
    host='localhost', database='mydb',
    user='postgres', password='secret')
cur = conn.cursor()
cur.execute('SELECT * FROM users WHERE id = %s', (1,))
row = cur.fetchone()
print(row)
cur.close()
conn.close()`,

  'pydantic': `from pydantic import BaseModel

class User(BaseModel):
    name: str
    email: str
    age: int = 0

user = User(name='Alice', email='alice@example.com', age=30)
print(user.model_dump())
# {'name': 'Alice', 'email': 'alice@example.com', 'age': 30}`,

  'pyjwt': `import jwt

secret = 'my_secret'
token = jwt.encode({'user_id': 42}, secret, algorithm='HS256')
print(token)

decoded = jwt.decode(token, secret, algorithms=['HS256'])
print(decoded['user_id'])  # 42`,

  'pymongo': `from pymongo import MongoClient

client = MongoClient('mongodb://localhost:27017')
db = client['mydb']
collection = db['users']

collection.insert_one({'name': 'Alice', 'age': 30})
user = collection.find_one({'name': 'Alice'})
print(user)`,

  'pymysql': `import pymysql

conn = pymysql.connect(
    host='localhost', user='root',
    password='secret', database='mydb')
cursor = conn.cursor()
cursor.execute('SELECT * FROM users WHERE id = %s', (1,))
print(cursor.fetchone())
conn.close()`,

  'pytest-asyncio': `import pytest

@pytest.mark.asyncio
async def test_async_function():
    import asyncio
    await asyncio.sleep(0)
    result = 'expected'
    assert result == 'expected'`,

  'python-dotenv': `from dotenv import load_dotenv
import os

load_dotenv()  # loads from .env file

db_url = os.getenv('DATABASE_URL')
api_key = os.getenv('API_KEY')
print(db_url, api_key)`,

  'python-jose': `from jose import jwt, JWTError

secret = 'my_secret'
token = jwt.encode({'user_id': 42}, secret, algorithm='HS256')

try:
    payload = jwt.decode(token, secret, algorithms=['HS256'])
    print(payload['user_id'])  # 42
except JWTError:
    print('Invalid token')`,

  'python-json-logger': `import logging
from pythonjsonlogger import jsonlogger

logger = logging.getLogger()
handler = logging.StreamHandler()
formatter = jsonlogger.JsonFormatter()
handler.setFormatter(formatter)
logger.addHandler(handler)
logger.setLevel(logging.INFO)

logger.info('User logged in', extra={'user_id': 42, 'ip': '127.0.0.1'})`,

  'redis': `import redis

r = redis.Redis(host='localhost', port=6379, db=0)
r.set('key', 'value')
print(r.get('key'))  # b'value'

r.hset('user:1', mapping={'name': 'Alice', 'age': '30'})
print(r.hgetall('user:1'))`,

  'rich': `from rich.console import Console
from rich.table import Table

console = Console()
console.print('[bold green]Hello, World![/bold green]')

table = Table(title='Users')
table.add_column('Name')
table.add_column('Age')
table.add_row('Alice', '30')
table.add_row('Bob', '25')
console.print(table)`,

  'sanic': `from sanic import Sanic, response

app = Sanic('MyApp')

@app.get('/')
async def hello(request):
    return response.json({'message': 'Hello from Sanic'})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000)`,

  'scikit-learn': `from sklearn.datasets import load_iris
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score

X, y = load_iris(return_X_y=True)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)

clf = RandomForestClassifier()
clf.fit(X_train, y_train)
print(accuracy_score(y_test, clf.predict(X_test)))`,

  'scipy': `from scipy import stats
import numpy as np

data = np.array([2.1, 3.5, 2.8, 4.2, 3.1])
t_stat, p_value = stats.ttest_1samp(data, popmean=3.0)
print(f't={t_stat:.3f}, p={p_value:.3f}')`,

  'seaborn': `import seaborn as sns
import matplotlib.pyplot as plt

tips = sns.load_dataset('tips')
sns.boxplot(data=tips, x='day', y='total_bill', hue='sex')
plt.title('Tips by Day')
plt.show()`,

  'sentry-sdk': `import sentry_sdk

sentry_sdk.init(dsn='https://your-dsn@sentry.io/project-id')

try:
    1 / 0
except ZeroDivisionError as e:
    sentry_sdk.capture_exception(e)`,

  'starlette': `from starlette.applications import Starlette
from starlette.responses import JSONResponse
from starlette.routing import Route

async def homepage(request):
    return JSONResponse({'message': 'Hello Starlette'})

app = Starlette(routes=[Route('/', homepage)])`,

  'structlog': `import structlog

log = structlog.get_logger()
log.info('User logged in', user_id=42, ip='127.0.0.1')
log.warning('High CPU usage', cpu_percent=95)
log.error('Database error', exc_info=True)`,

  'tensorflow': `import tensorflow as tf

model = tf.keras.Sequential([
    tf.keras.layers.Dense(64, activation='relu', input_shape=(20,)),
    tf.keras.layers.Dense(1, activation='sigmoid'),
])
model.compile(optimizer='adam', loss='binary_crossentropy',
              metrics=['accuracy'])
print(model.summary())`,

  'torch': `import torch
import torch.nn as nn

model = nn.Sequential(
    nn.Linear(20, 64),
    nn.ReLU(),
    nn.Linear(64, 1),
    nn.Sigmoid(),
)

x = torch.randn(32, 20)
output = model(x)
print(output.shape)  # torch.Size([32, 1])`,

  'tornado': `import tornado.web
import tornado.ioloop

class MainHandler(tornado.web.RequestHandler):
    def get(self):
        self.write({'message': 'Hello Tornado'})

app = tornado.web.Application([(r'/', MainHandler)])
app.listen(8888)
tornado.ioloop.IOLoop.current().start()`,

  'tortoise-orm': `from tortoise import fields
from tortoise.models import Model
from tortoise import Tortoise

class User(Model):
    id = fields.IntField(pk=True)
    name = fields.CharField(max_length=50)

async def main():
    await Tortoise.init(
        db_url='sqlite://:memory:',
        modules={'models': ['__main__']})
    await Tortoise.generate_schemas()
    user = await User.create(name='Alice')
    print(user.name)`,

  'transformers': `from transformers import pipeline

classifier = pipeline('sentiment-analysis')
result = classifier('I love this library!')
print(result)  # [{'label': 'POSITIVE', 'score': 0.99}]`,

  'unittest': `import unittest

class TestMath(unittest.TestCase):
    def test_addition(self):
        self.assertEqual(1 + 1, 2)

    def test_string(self):
        self.assertIn('world', 'hello world')

if __name__ == '__main__':
    unittest.main()`,

  'urllib3': `import urllib3

http = urllib3.PoolManager()
response = http.request('GET', 'https://api.example.com/data')
print(response.status)
print(response.data)`,

  'xgboost': `import xgboost as xgb
from sklearn.datasets import make_regression
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error

X, y = make_regression(n_samples=1000, n_features=10)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)

model = xgb.XGBRegressor(n_estimators=100, learning_rate=0.1)
model.fit(X_train, y_train)
preds = model.predict(X_test)
print(f'RMSE: {mean_squared_error(y_test, preds, squared=False):.2f}')`,

  // ── Apache ────────────────────────────────────────────────────────────────

  'apache accumulo': `import org.apache.accumulo.core.client.*;
import org.apache.accumulo.core.data.*;

AccumuloClient client = Accumulo.newClient()
    .from("/path/to/accumulo-client.properties").build();

try (BatchWriter writer = client.createBatchWriter("myTable")) {
    Mutation m = new Mutation("row1");
    m.put("cf", "cq", "value");
    writer.addMutation(m);
}`,

  'apache activemq': `import org.apache.activemq.ActiveMQConnectionFactory;
import jakarta.jms.*;

ConnectionFactory factory = new ActiveMQConnectionFactory("tcp://localhost:61616");
Connection conn = factory.createConnection();
Session session = conn.createSession(false, Session.AUTO_ACKNOWLEDGE);
Queue queue = session.createQueue("myQueue");
MessageProducer producer = session.createProducer(queue);
producer.send(session.createTextMessage("Hello ActiveMQ"));
conn.close();`,

  'apache age': `-- Enable Apache AGE extension
CREATE EXTENSION age;
LOAD 'age';
SET search_path = ag_catalog, "$user", public;

SELECT create_graph('my_graph');

SELECT * FROM cypher('my_graph', $$
  CREATE (a:Person {name: 'Alice'})-[:KNOWS]->(b:Person {name: 'Bob'})
$$) AS (result agtype);`,

  'apache airavata': `import org.apache.airavata.api.Airavata;
import org.apache.airavata.model.experiment.ExperimentModel;

Airavata.Client client = AiravataClientFactory.createAiravataClient("localhost", 9090);
ExperimentModel experiment = new ExperimentModel();
experiment.setExperimentName("My Experiment");
String experimentId = client.createExperiment("gateway-id", experiment);
client.launchExperiment("gateway-id", experimentId, "");`,

  'apache airflow': `from airflow import DAG
from airflow.operators.python import PythonOperator
from datetime import datetime

def process_data():
    print('Processing data...')

with DAG('my_pipeline', start_date=datetime(2024, 1, 1), schedule='@daily') as dag:
    task = PythonOperator(
        task_id='process',
        python_callable=process_data,
    )`,

  'apache allura': `# Allura plugin development
from allura.lib.plugin import AuthenticationProvider

class MyAuthProvider(AuthenticationProvider):
    def authenticate_request(self, request):
        return None

    def login(self, request):
        pass`,

  'apache ambari': `import requests

r = requests.get(
    'http://localhost:8080/api/v1/clusters',
    auth=('admin', 'admin'),
    headers={'X-Requested-By': 'ambari'})
print(r.json())`,

  'apache ant': `<!-- build.xml -->
<project name="MyProject" default="compile" basedir=".">
  <property name="src" location="src"/>
  <property name="build" location="build"/>

  <target name="compile">
    <mkdir dir="\${build}"/>
    <javac srcdir="\${src}" destdir="\${build}"/>
  </target>

  <target name="run" depends="compile">
    <java classname="Main" classpath="\${build}"/>
  </target>
</project>`,

  'apache antunit': `<project xmlns:au="antlib:org.apache.ant.antunit">
  <target name="testAdd">
    <au:assertTrue>
      <equals arg1="2" arg2="2"/>
    </au:assertTrue>
  </target>

  <target name="suiteSetUp">
    <echo>Setting up test suite</echo>
  </target>
</project>`,

  'apache any23': `import org.apache.any23.Any23;
import org.apache.any23.source.URLDocumentSource;
import org.apache.any23.writer.TripleWriterHandler;

Any23 runner = new Any23();
URLDocumentSource source = new URLDocumentSource(
    new URL("http://example.org/data"), "http://example.org/data");
try (TripleWriterHandler handler = new TripleWriterHandler(System.out)) {
    runner.extract(source, handler);
}`,

  'apache apex': `@ApplicationAnnotation(name = "MyApp")
public class MyApp implements StreamingApplication {
    @Override
    public void populateDAG(DAG dag, Configuration conf) {
        InputOperator input = dag.addOperator("input", InputOperator.class);
        ProcessOperator process = dag.addOperator("process", ProcessOperator.class);
        dag.addStream("data", input.output, process.input);
    }
}`,

  'apache archiva': `// Archiva REST client example
import org.apache.cxf.jaxrs.client.WebClient;

WebClient client = WebClient.create("http://localhost:8080/archiva/");
client.header("Authorization", "Basic " + credentials);
// Use the client to manage artifacts in Archiva repository`,

  'apache aries': `import org.apache.aries.jpa.template.JpaTemplate;
import org.osgi.service.component.annotations.*;

@Component
public class UserRepository {
    @Reference
    private JpaTemplate jpa;

    public User findById(Long id) {
        return jpa.txExpr(em -> em.find(User.class, id));
    }
}`,

  'apache arrow': `import pyarrow as pa
import pyarrow.parquet as pq

data = {'name': ['Alice', 'Bob'], 'age': [30, 25]}
table = pa.table(data)

pq.write_table(table, 'users.parquet')

result = pq.read_table('users.parquet')
print(result.to_pandas())`,

  'apache beehive': `import org.apache.beehive.controls.api.bean.Control;
import org.apache.beehive.controls.system.jdbc.JdbcControl;

@Control
public interface UserDatabase {
    @JdbcControl.SQL(statement = "SELECT * FROM users WHERE id = {id}")
    User getUserById(int id);
}`,

  'apache buildr': `# Buildfile
VERSION_NUMBER = '1.0.0'

define 'myproject' do
  project.version = VERSION_NUMBER
  compile.options.target = '11'
  test.using :junit
  package :jar
end`,

  'apache chemistry': `import org.apache.chemistry.opencmis.client.api.*;
import org.apache.chemistry.opencmis.client.runtime.SessionFactoryImpl;

Map<String, String> params = new HashMap<>();
params.put(SessionParameter.USER, "admin");
params.put(SessionParameter.PASSWORD, "admin");
params.put(SessionParameter.ATOMPUB_URL, "http://localhost:8080/cmis/atom");
params.put(SessionParameter.BINDING_TYPE, BindingType.ATOMPUB.value());

Session session = SessionFactoryImpl.newInstance().createSession(params);
Folder root = session.getRootFolder();`,

  'apache chukwa': `public class MyAdaptor extends AbstractAdaptor {
    @Override
    public void start(String adaptorId, String type, long offset,
                      ChunkReceiver dest) throws AdaptorException {
        // Start collecting data from your source
    }

    @Override
    public long shutdown(AdaptorShutdownPolicy policy) {
        return 0;
    }
}`,

  'apache clerezza': `import org.apache.clerezza.rdf.core.*;
import org.apache.clerezza.rdf.simple.storage.SimpleGraph;

Graph graph = new SimpleGraph();
IRI subject = new IRI("http://example.org/Alice");
IRI predicate = new IRI("http://xmlns.com/foaf/0.1/name");
Literal name = new PlainLiteralImpl("Alice");
graph.add(new TripleImpl(subject, predicate, name));`,

  'apache click': `import org.apache.click.Page;
import org.apache.click.control.Form;
import org.apache.click.control.TextField;

public class HelloPage extends Page {
    public Form form = new Form();

    public HelloPage() {
        form.add(new TextField("name", true));
    }

    public void onPost() {
        String name = form.getFieldValue("name");
        addModel("message", "Hello, " + name);
    }
}`,

  'apache cocoon': `<!-- sitemap.xmap -->
<map:sitemap xmlns:map="http://apache.org/cocoon/sitemap/1.0">
  <map:pipelines>
    <map:pipeline>
      <map:match pattern="hello">
        <map:generate src="hello.xml"/>
        <map:transform src="hello.xsl"/>
        <map:serialize type="html"/>
      </map:match>
    </map:pipeline>
  </map:pipelines>
</map:sitemap>`,

  'apache compress ant library': `<taskdef resource="org/apache/ant/compress/antlib.xml"
         classpath="ant-compress.jar"/>

<czip destfile="archive.zip">
    <fileset dir="src" includes="**/*.java"/>
</czip>

<cunzip src="archive.zip" dest="output/"/>`,

  'apache continuum': `// Continuum CI API
Continuum continuum = new DefaultContinuum();
int projectId = continuum.addMavenTwoProject("http://example.com/pom.xml");
continuum.buildProject(projectId, BuildDefinition.BUILD_NOW);
BuildResult result = continuum.getLatestBuildResultForProject(projectId);
System.out.println(result.getState());`,

  'apache crunch': `Pipeline pipeline = new MRPipeline(getClass(), getConf());
PCollection<String> lines = pipeline.readTextFile("input.txt");
PCollection<String> words = lines.parallelDo(
    new DoFn<String, String>() {
        public void process(String line, Emitter<String> emitter) {
            for (String word : line.split("\\s+")) emitter.emit(word);
        }
    }, Writables.strings());
pipeline.writeTextFile(words, "output");
pipeline.done();`,

  'apache deltacloud': `require 'deltacloud'

client = DeltaCloud::API.new('user', 'password', 'http://localhost:3001/api')
client.instances.each { |i| puts "#{i.id}: #{i.state}" }

new_instance = client.create_instance(
  image_id: 'ami-12345',
  hwp_id: 'm1.small'
)`,

  'apache devicemap': `import org.apache.devicemap.DeviceMap;

DeviceMap dm = DeviceMap.getInstance();
Map<String, String> props = dm.getProperties(
    "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)");
System.out.println(props.get("device_type")); // mobile
System.out.println(props.get("brand_name"));  // Apple`,

  'apache directmemory': `import org.apache.directmemory.DirectMemory;
import org.apache.directmemory.cache.CacheService;

CacheService<String, Object> cache = new DirectMemory<String, Object>()
    .setNumberOfBuffers(10)
    .setSize(1000)
    .newCacheService();

cache.put("key", "value");
Object val = cache.retrieve("key");
System.out.println(val);`,

  'apache ecs': `import org.apache.ecs.html.*;

Body body = new Body();
body.addElement(new H1("Hello ECS"));
body.addElement(new P("Generated with Apache ECS."));

Html html = new Html();
html.addElement(new Head().addElement(new Title("My Page")));
html.addElement(body);
System.out.println(html.toString());`,

  'apache esme': `// ESME Scala microblogging example
val msg = Message.create
  .author(currentUser.id)
  .body("Hello ESME!")
  .when(now)
msg.save()`,

  'apache etch': `// Server side
EtchHelloWorldHelper.startServer("tcp://localhost:4001", null, new HelloWorldImpl());

// Client side
HelloWorld hw = EtchHelloWorldHelper.newServer("tcp://localhost:4001", null, null);
System.out.println(hw.greet("World"));`,

  'apache excalibur': `import org.apache.excalibur.source.*;

SourceResolver resolver = new URLSourceResolver();
Source source = resolver.resolveURI("http://example.org/data");
try {
    InputStream is = source.getInputStream();
    // process input stream
} finally {
    resolver.release(source);
}`,

  'apache falcon': `import org.apache.falcon.client.FalconClient;

FalconClient client = new FalconClient("http://localhost:15000");
client.submit("feed", "/path/to/feed.xml");
client.schedule("feed", "myFeed", "cluster1");
EntityResult result = client.getStatus("feed", "myFeed");
System.out.println(result.getStatus());`,

  'apache fluo': `import org.apache.fluo.api.client.*;
import org.apache.fluo.api.config.FluoConfiguration;

FluoConfiguration config = new FluoConfiguration();
config.setInstanceZookeepers("localhost/fluo");

try (FluoClient client = FluoFactory.newClient(config)) {
    try (Snapshot snap = client.newSnapshot()) {
        System.out.println(snap.gets("myRow", Column.EMPTY));
    }
}`,

  'apache fluo recipes': `import org.apache.fluo.recipes.core.combine.SummingCombiner;
import org.apache.fluo.recipes.core.map.CollisionFreeMap;

CollisionFreeMap.configure(fluoConfig, new CollisionFreeMap.Options(
    "word-counts",
    SummingCombiner.class,
    StringEncoder.class,
    LongEncoder.class,
    3
));`,

  'apache fluo yarn': `// Deploy Fluo on YARN
FluoYarnLauncher launcher = new FluoYarnLauncher();
launcher.setFluoHome("/opt/fluo");
launcher.setYarnConfig(conf);
launcher.start("my-fluo-app");`,

  'apache forrest': `<!-- content/xdocs/index.xml -->
<?xml version="1.0"?>
<!DOCTYPE document PUBLIC "-//APACHE//DTD Documentation V2.0//EN"
  "http://forrest.apache.org/dtd/document-v20.dtd">
<document>
  <header><title>My Project</title></header>
  <body>
    <section><title>Introduction</title>
      <p>Welcome to my project documentation.</p>
    </section>
  </body>
</document>`,

  'apache giraph': `public class PageRankVertex extends BasicComputation<
    LongWritable, DoubleWritable, FloatWritable, DoubleWritable> {

    public void compute(Vertex<LongWritable, DoubleWritable, FloatWritable> vertex,
                        Iterable<DoubleWritable> messages) {
        double sum = 0;
        for (DoubleWritable msg : messages) sum += msg.get();
        vertex.setValue(new DoubleWritable(0.15 + 0.85 * sum));
        sendMessageToAllEdges(vertex,
            new DoubleWritable(vertex.getValue().get() / vertex.getNumEdges()));
        vertex.voteToHalt();
    }
}`,

  'apache gora': `import org.apache.gora.store.DataStore;
import org.apache.gora.store.DataStoreFactory;

DataStore<String, User> dataStore = DataStoreFactory.getDataStore(
    String.class, User.class, new Configuration());
User user = dataStore.newPersistent();
user.setName("Alice");
dataStore.put("alice", user);
User found = dataStore.get("alice");`,

  'apache griffin': `// Griffin data quality rule (JSON DSL)
// {
//   "name": "completeness",
//   "rule": "SELECT count(*) AS total FROM users WHERE email IS NOT NULL",
//   "dqType": "completeness"
// }

DQContext context = new DQContext.Builder()
    .withDataSources(dataSourceList)
    .withRules(ruleList)
    .build();
context.run();`,

  'apache hama': `public class MyBSP extends BSP<NullWritable, NullWritable, Text, Text, Text> {
    @Override
    public void bsp(BSPPeer<NullWritable, NullWritable, Text, Text, Text> peer)
            throws IOException, InterruptedException {
        peer.send(peer.getPeerNames()[0], new Text("Hello BSP"));
        peer.sync();
        Text msg = peer.getCurrentMessage();
        peer.write(new Text("result"), msg);
    }
}`,

  'apache harmony': `// Apache Harmony provides a Java standard library implementation.
// Standard Java code runs on the Harmony JVM.
import java.util.HashMap;
import java.util.ArrayList;

HashMap<String, Integer> map = new HashMap<>();
map.put("one", 1);
map.put("two", 2);

ArrayList<String> list = new ArrayList<>(map.keySet());
System.out.println(list);`,

  'apache hivemind': `// hivemind.xml defines service points
// Registry registry = RegistryBuilder.constructDefaultRegistry();
// MyService svc = (MyService) registry.getService("myapp.MyService", MyService.class);
// svc.doWork();

Registry registry = RegistryBuilder.constructDefaultRegistry();
MyService service = (MyService) registry.getService(
    "myapp.MyService", MyService.class);
service.doWork();`,

  'apache ivy': `<!-- ivy.xml -->
<ivy-module version="2.0">
  <info organisation="org.example" module="myapp" revision="1.0"/>
  <dependencies>
    <dependency org="org.apache.commons" name="commons-lang3" rev="3.12.0"/>
    <dependency org="junit" name="junit" rev="4.13.2" conf="test->default"/>
  </dependencies>
</ivy-module>`,

  'apache jakarta cactus': `public class TestSampleServlet extends ServletTestCase {
    public void testSamplePost() throws Exception {
        request.setMethod("POST");
        request.addParameter("name", "Alice");
    }

    public void endSamplePost(WebResponse response) {
        assertEquals("Hello, Alice!", response.getText());
    }
}`,

  'apache jclouds': `import org.jclouds.*;
import org.jclouds.blobstore.*;

BlobStoreContext context = ContextBuilder.newBuilder("aws-s3")
    .credentials("accessKey", "secretKey")
    .buildView(BlobStoreContext.class);

BlobStore blobStore = context.getBlobStore();
blobStore.createContainerInLocation(null, "my-bucket");
blobStore.putBlob("my-bucket",
    blobStore.blobBuilder("file.txt").payload("Hello jclouds").build());
context.close();`,

  'apache kibble': `import kibble

config = kibble.Config('kibble.yaml')
view = kibble.View(config)

activities = view.get_activities(
    project='myproject',
    dateFrom='2024-01-01',
    dateTo='2024-12-31')
print(activities)`,

  'apache lens': `import org.apache.lens.client.*;
import org.apache.lens.api.query.*;

LensClient client = new LensClient(new LensClientConfig());
String session = client.createClientConnection("user");

QueryHandle handle = client.executeQueryAsynch(
    "SELECT * FROM mydb.mytable LIMIT 10", "mydb", session);
QueryStatus status = client.getQueryStatus(handle);
System.out.println(status.getStatus());`,

  'apache lenya': `import org.apache.lenya.cms.publication.*;

Publication pub = PublicationManagerImpl.getInstance()
    .getPublication("default");
DocumentFactory factory = DocumentUtil.createDocumentFactory(pub);
Document doc = factory.getByPath("/home",
    DocumentFactory.AREA_AUTHORING, "en");
System.out.println(doc.getTitle());`,

  'apache lucy': `#include "Lucy/Search/Indexer.h"
#include "Lucy/Plan/Schema.h"

Schema *schema = Schema_new();
FullTextType *type = FullTextType_new(EasyAnalyzer_new("en"));
Schema_Spec_Field(schema, "content", (FieldType*)type);

Indexer *indexer = Indexer_new(schema, Str_new("/index"), NULL, Indexer_CREATE);
Doc *doc = Doc_new();
Doc_Store(doc, "content", "Hello Apache Lucy!");
Indexer_Add_Doc(indexer, doc);
Indexer_Commit(indexer);`,

  'apache marmotta': `import org.apache.marmotta.client.*;
import org.apache.marmotta.client.model.rdf.*;

MarmottaClient client = new MarmottaClient("http://localhost:8080/marmotta");
SPARQLResult result = client.getSPARQLService()
    .select("SELECT ?s ?p ?o WHERE { ?s ?p ?o } LIMIT 10");
for (Map<String, RDFNode> row : result) {
    System.out.println(row.get("s") + " " + row.get("p") + " " + row.get("o"));
}`,

  'apache mesos': `import mesos.interface
from mesos.interface import mesos_pb2

class MyScheduler(mesos.interface.Scheduler):
    def resourceOffers(self, driver, offers):
        for offer in offers:
            task = mesos_pb2.TaskInfo()
            task.name = "my-task"
            task.task_id.value = "task-1"
            task.slave_id.value = offer.slave_id.value
            driver.launchTasks(offer.id, [task])`,

  'apache mrunit': `@RunWith(JUnit4.class)
public class WordCountTest {
    MapDriver<LongWritable, Text, Text, IntWritable> mapDriver;

    @Before
    public void setup() {
        mapDriver = MapDriver.newMapDriver(new WordCount.TokenizerMapper());
    }

    @Test
    public void testMapper() throws IOException {
        mapDriver.withInput(new LongWritable(), new Text("hello world"))
                 .withOutput(new Text("hello"), new IntWritable(1))
                 .withOutput(new Text("world"), new IntWritable(1))
                 .runTest();
    }
}`,

  'apache mxnet': `import mxnet as mx
from mxnet import gluon

net = gluon.nn.Sequential()
with net.name_scope():
    net.add(gluon.nn.Dense(64, activation='relu'))
    net.add(gluon.nn.Dense(10))

net.initialize()
loss = gluon.loss.SoftmaxCrossEntropyLoss()
trainer = gluon.Trainer(net.collect_params(), 'sgd', {'learning_rate': 0.1})`,

  'apache ode': `import org.apache.ode.bpel.engine.*;
import org.apache.ode.bpel.iapi.*;

BpelServer server = new BpelServerImpl();
server.init(dataSource, transactionManager);
server.start();

ProcessConf pconf = new ProcessConfImpl(processDir);
server.register(pconf);`,

  'apache olingo': `import org.apache.olingo.client.api.*;
import org.apache.olingo.client.core.ODataClientFactory;

ODataClient client = ODataClientFactory.getClient();
URIBuilder uriBuilder = client.newURIBuilder("https://services.odata.org/V4/")
    .appendEntitySetSegment("People");
ODataRetrieveResponse<ClientEntitySetIterator<ClientEntitySet, ClientEntity>> response =
    client.getRetrieveRequestFactory()
          .getEntitySetIteratorRequest(uriBuilder.build())
          .execute();`,

  'apache oltu - parent': `import org.apache.oltu.oauth2.client.*;
import org.apache.oltu.oauth2.common.message.types.GrantType;

OAuthClient oauthClient = new OAuthClient(new URLConnectionClient());
OAuthJSONAccessTokenResponse response = oauthClient.accessToken(
    OAuthClientRequest.tokenLocation("https://oauth.example.com/token")
        .setGrantType(GrantType.AUTHORIZATION_CODE)
        .setClientId("client-id")
        .setClientSecret("client-secret")
        .setCode("auth-code")
        .buildBodyMessage());
System.out.println(response.getAccessToken());`,

  'apache oodt': `import org.apache.oodt.cas.filemgr.system.XmlRpcFileManagerClient;

XmlRpcFileManagerClient fmClient = new XmlRpcFileManagerClient(
    new URL("http://localhost:9000"));
Product product = fmClient.getProductByName("myProduct");
System.out.println(product.getProductId());`,

  'apache oozie': `<!-- workflow.xml -->
<workflow-app xmlns='uri:oozie:workflow:0.4' name='my-workflow'>
  <start to='my-action'/>
  <action name='my-action'>
    <hive xmlns='uri:oozie:hive-action:0.3'>
      <job-tracker>\${jobTracker}</job-tracker>
      <name-node>\${nameNode}</name-node>
      <script>my_query.hql</script>
    </hive>
    <ok to='end'/>
    <error to='fail'/>
  </action>
  <kill name='fail'><message>Workflow failed</message></kill>
  <end name='end'/>
</workflow-app>`,

  'apache open climate workbench': `import ocw.data_source.local as local
import ocw.metrics as metrics
import ocw.evaluation as evaluation

dataset = local.load_file('temperature_data.nc', 'tas')
ref_dataset = local.load_file('reference_data.nc', 'tas')

bias = metrics.Bias()
ev = evaluation.Evaluation(ref_dataset, [dataset], [bias])
ev.run()
print(ev.results)`,

  'apache oro': `import org.apache.oro.text.regex.*;

PatternCompiler compiler = new Perl5Compiler();
PatternMatcher matcher = new Perl5Matcher();
Pattern pattern = compiler.compile("(\\w+)@(\\w+\\.\\w+)");

if (matcher.matches("user@example.com", pattern)) {
    MatchResult result = matcher.getMatch();
    System.out.println(result.group(1)); // user
    System.out.println(result.group(2)); // example.com
}`,

  'apache pivot': `import org.apache.pivot.wtk.*;

public class HelloPivot implements Application {
    @Override
    public void startup(Display display, Map<String, String> props) {
        Window window = new Window();
        Label label = new Label("Hello Apache Pivot");
        window.setContent(label);
        window.setTitle("Hello");
        window.open(display);
    }
}`,

  'apache polygene': `@Mixins(PersonMixin.class)
public interface Person extends TransientComposite {
    String name();
    void setName(String name);
}

SingletonAssembler assembler = new SingletonAssembler(module -> {
    module.transients(Person.class);
});
Person person = assembler.module().newTransient(Person.class);
person.setName("Alice");
System.out.println(person.name());`,

  'apache portable runtime': `#include <apr_pools.h>
#include <apr_strings.h>

apr_pool_t *pool;
apr_pool_initialize();
apr_pool_create(&pool, NULL);

char *str = apr_pstrcat(pool, "Hello", ", ", "APR!", NULL);
printf("%s\\n", str);

apr_pool_destroy(pool);
apr_pool_terminate();`,

  'apache portals': `@SupportsPortletMode(PortletMode.VIEW)
public class HelloPortlet extends GenericPortlet {
    @Override
    protected void doView(RenderRequest req, RenderResponse resp)
            throws PortletException, IOException {
        resp.setContentType("text/html");
        PrintWriter out = resp.getWriter();
        out.println("<h1>Hello from Portlet!</h1>");
    }
}`,

  'apache predictionio': `class DataSource(ep: EmptyParams)
    extends LDataSource[TrainingData, EmptyEvaluationInfo, Query, ActualResult] {

  override def readTraining(sc: SparkContext): TrainingData = {
    val data = sc.textFile("data/training.csv")
      .map(line => line.split(","))
    new TrainingData(data)
  }
}`,

  'apache props ant library': `<taskdef resource="org/apache/ant/props/antlib.xml"
         classpath="ant-props.jar"/>

<propertyhelper>
  <props/>
</propertyhelper>

<property name="greeting" value="Hello \${user.name}!"/>
<echo message="\${greeting}"/>`,

  'apache reef': `final JavaConfigurationBuilder cb =
    Tang.Factory.getTang().newConfigurationBuilder();
final Configuration conf = cb.build();

final REEF reef = Tang.Factory.getTang()
    .newInjector(conf).getInstance(REEF.class);
reef.submit(HelloREEFDriver.class);`,

  'apache regexp': `import org.apache.regexp.*;

RE re = new RE("(\\\\w+)@(\\\\w+)\\\\.com");
if (re.match("user@example.com")) {
    System.out.println(re.getParen(1)); // user
    System.out.println(re.getParen(2)); // example
}`,

  'apache river': `import net.jini.core.lookup.*;
import net.jini.lookup.*;

ServiceTemplate template = new ServiceTemplate(
    null, new Class[]{ MyService.class }, null);
ServiceDiscoveryManager sdm = new ServiceDiscoveryManager(null, null);
ServiceItem item = sdm.lookup(template, null, 5000);
MyService service = (MyService) item.service;
service.doSomething();`,

  'apache shale': `public class LoginForm {
    private String username;
    private String password;

    public String login() {
        if ("admin".equals(username)) {
            return "success";
        }
        return "failure";
    }

    public String getUsername() { return username; }
    public void setUsername(String u) { this.username = u; }
}`,

  'apache shindig': `import org.apache.shindig.gadgets.*;

GadgetSpec spec = gadgetSpecFactory.getGadgetSpec(gadgetUri, requestContext);
Gadget gadget = gadgetFactory.newGadget(spec, requestContext);
String content = gadgetRenderer.renderGadget(gadget);
System.out.println(content);`,

  'apache stanbol': `import org.apache.stanbol.enhancer.servicesapi.*;

ContentItem ci = ContentItemFactory.getInstance()
    .createContentItem(new StringSource("Apache is a software foundation."));
enhancementJobManager.enhanceContent(ci);

Graph metadata = ci.getMetadata();
// Process extracted named entities from metadata`,

  'apache stratos': `import org.apache.stratos.messaging.event.*;

EventPublisher publisher = new EventPublisher(topic);
ArtifactUpdatedEvent event = new ArtifactUpdatedEvent();
event.setServiceName("my-service");
event.setClusterId("cluster-1");
publisher.publish(event);`,

  'apache submarine': `import submarine

client = submarine.ExperimentClient(host='http://localhost:8080')
experiment_spec = submarine.ExperimentSpec(
    meta=submarine.ExperimentMeta(
        name='mnist-experiment',
        framework='TensorFlow',
    ),
    environment=submarine.EnvironmentSpec(
        image='tensorflow/tensorflow:2.1.0'),
    spec={'Worker': {'replicas': 1, 'resources': 'cpu=1,memory=512M'}}
)
response = client.create_experiment(experiment_spec)
print(response)`,

  'apache tajo': `import org.apache.tajo.client.*;
import org.apache.tajo.conf.TajoConf;

TajoConf conf = new TajoConf();
TajoClient client = new TajoClientImpl(ServiceTrackerFactory.get(conf));
client.executeQueryAndGetResult("SELECT * FROM users LIMIT 10")
      .forEachRemaining(tuple -> System.out.println(tuple.getText(0)));
client.close();`,

  'apache tiles': `<!-- tiles.xml -->
<tiles-definitions>
  <definition name="base" template="/WEB-INF/templates/base.jsp">
    <put-attribute name="header" value="/WEB-INF/templates/header.jsp"/>
    <put-attribute name="footer" value="/WEB-INF/templates/footer.jsp"/>
  </definition>
  <definition name="home" extends="base">
    <put-attribute name="content" value="/WEB-INF/views/home.jsp"/>
  </definition>
</tiles-definitions>`,

  'apache traffic control': `package main

import (
    "fmt"
    toclient "github.com/apache/trafficcontrol/traffic_ops/v5-client"
)

client, _, err := toclient.LoginWithAgent(
    "https://trafficops.example.com", "admin", "password", true, nil, false, 10)
servers, _, err := client.GetServers(nil, nil)
for _, server := range servers {
    fmt.Printf("Server: %s (%s)\\n", *server.HostName, *server.Status)
}`,

  'apache trafodion': `// Trafodion uses standard JDBC
import java.sql.*;

Connection conn = DriverManager.getConnection(
    "jdbc:t4jdbc://localhost:23400/:", "user", "password");
Statement stmt = conn.createStatement();
ResultSet rs = stmt.executeQuery("SELECT * FROM users LIMIT 10");
while (rs.next()) {
    System.out.println(rs.getString("name"));
}
conn.close();`,

  'apache tuscany': `import org.apache.tuscany.sca.host.embedded.*;

@Remotable
public interface HelloService {
    String sayHello(String name);
}

SCADomain domain = SCADomain.newInstance("hello.composite");
HelloService hello = domain.getService(HelloService.class, "HelloComponent");
System.out.println(hello.sayHello("World"));
domain.close();`,

  'apache vss ant library': `<taskdef resource="org/apache/ant/vss/antlib.xml"
         classpath="ant-vss.jar"/>

<vssget vsspath="$/MyProject"
        localpath="C:/dev/myproject"
        login="user,password"
        serverPath="C:/VSS"/>`,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalize(name: string): string {
  return name.toLowerCase().trim();
}

function isEmpty(value: string | null | undefined): boolean {
  return !value || value.trim() === '';
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('\n🔍 Querying libraries with missing example code...\n');

  const libraries = await prisma.library.findMany({
    where: {
      OR: [
        { exampleCode: null },
        { exampleCode: '' },
      ],
    },
    select: { id: true, name: true, slug: true },
    orderBy: { name: 'asc' },
  });

  console.log(`Found ${libraries.length} libraries without example code.\n`);

  let updated = 0;
  let skipped = 0;

  for (const lib of libraries) {
    const key = normalize(lib.name);
    const example = EXAMPLES[key];

    if (!example || isEmpty(example)) {
      console.log(`  ⏭️  Skipped (no mapping): ${lib.name}`);
      skipped++;
      continue;
    }

    try {
      await prisma.library.update({
        where: { id: lib.id },
        data: { exampleCode: example },
      });
      console.log(`  ✅ Updated: ${lib.name}`);
      updated++;
    } catch (err) {
      console.error(`  ❌ Error updating ${lib.name}:`, err);
    }
  }

  // Count already-populated (not in the missing list)
  const total = await prisma.library.count();
  const withExample = await prisma.library.count({
    where: {
      AND: [
        { exampleCode: { not: null } },
        { exampleCode: { not: '' } },
      ],
    },
  });

  const alreadyPopulated = total - libraries.length;

  console.log('\n═══════════════════════════════════════');
  console.log('  Summary');
  console.log('═══════════════════════════════════════');
  console.log(`  Total libraries:        ${total}`);
  console.log(`  Already had code:       ${alreadyPopulated}`);
  console.log(`  Updated this run:       ${updated}`);
  console.log(`  Skipped (no mapping):   ${skipped}`);
  console.log(`  Now have example code:  ${withExample}`);
  console.log('═══════════════════════════════════════\n');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
