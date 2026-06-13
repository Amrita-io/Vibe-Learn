import os
import re
import json
import google.generativeai as genai
from typing import List, Dict, Any, Optional
from analyzer.models import ConceptGraph, ConceptNode, ConceptEdge, MissionTask, MissionTaskContent

# Predefined metadata templates for the 24 core concepts
CONCEPT_TEMPLATES = {
    "cn_hashing": {
        "name": "Hashing",
        "full_name": "Cryptographic Hashing",
        "categories": ["security", "auth"],
        "difficulty": "beginner",
        "prerequisites": [],
        "unlocks": ["cn_jwt"],
        "learn_next": ["cn_jwt"],
        "one_liner": "A one-way cryptographic function that converts an input of any size into a fixed-length digest.",
        "why_used_here": "Passwords and tokens are hashed to prevent exposing plaintext credentials in database files.",
        "keywords": ["bcrypt", "hash", "md5", "sha", "digest", "salt"],
        "expected_recall": ["one-way", "digest", "salt", "bcrypt"],
        "sample_sol": "Hashing converts passwords to a fixed-length hash using a one-way function. Salting is added to secure hashes against dictionary attacks.",
        "mcqs": [
            {
                "prompt": "What primary security problem does cryptographic hashing solve?",
                "options": [
                    "It encrypts transport packets over TCP connections.",
                    "It ensures passwords are not stored in plaintext, so a database breach does not immediately expose user passwords.",
                    "It compresses large file uploads into zip format.",
                    "It automatically creates redundant backups of table records."
                ],
                "correct": 1
            },
            {
                "prompt": "In standard security architectures, which part of the codebase performs hashing?",
                "options": [
                    "The client-side browser before transmitting forms.",
                    "The database index manager during query planning.",
                    "The server-side password utility during registration or login checks.",
                    "The CORS filter interceptor."
                ],
                "correct": 2
            },
            {
                "prompt": "What is a major limitation of a basic hash function without a 'salt'?",
                "options": [
                    "It takes too long to run on low-power devices.",
                    "It is vulnerable to precomputed dictionary attacks (rainbow tables) where identical inputs produce identical hashes.",
                    "It requires active network connections to verify digests.",
                    "It can only hash strings shorter than 128 characters."
                ],
                "correct": 1
            }
        ],
        "apply_code": "import hashlib\n\ndef store_password(raw_password):\n    # VULNERABLE: md5 is weak and lacks salt!\n    return hashlib.md5(raw_password.encode()).hexdigest()",
        "apply_question": "What is the critical security vulnerability in this password storage code and how should it be fixed?",
        "apply_options": [
            "It does not encode the password string to UTF-8; it should be encoded as ASCII.",
            "It uses MD5 which is cryptographically broken and lacks a salt; it should use bcrypt with a secure auto-generated salt.",
            "The return value is not converted to bytes; it should return a binary stream.",
            "It runs asynchronously and should be wrapped in an event loop."
        ],
        "apply_correct": 1,
        "apply_explanation": "MD5 is fast and has known collisions, making it easy to crack. Password hashing must use slow KDFs (like bcrypt, Argon2) and random salts."
    },
    "cn_sessions": {
        "name": "Sessions",
        "full_name": "Stateful Sessions",
        "categories": ["security", "auth"],
        "difficulty": "intermediate",
        "prerequisites": ["cn_http_methods"],
        "unlocks": ["cn_jwt"],
        "learn_next": ["cn_jwt"],
        "one_liner": "A stateful session mechanism that associates requests with a specific user via a session identifier stored on the server.",
        "why_used_here": "Used to maintain login state and track client sessions across HTTP queries.",
        "keywords": ["session", "cookie", "sessionid", "express-session"],
        "expected_recall": ["stateful", "cookie", "session id", "server-side"],
        "sample_sol": "Stateful sessions store user credentials on the server and send a unique session ID cookie to the client. The client returns this cookie on subsequent requests.",
        "mcqs": [
            {
                "prompt": "How do stateful sessions track user identity across multiple requests?",
                "options": [
                    "The client sends its MAC address in the headers.",
                    "The server stores session data in memory/DB and issues a unique Session ID cookie to the client's browser.",
                    "The database automatically creates a temporary table for each client IP.",
                    "The router maintains an active TCP connection socket indefinitely."
                ],
                "correct": 1
            },
            {
                "prompt": "Where is user-specific session data stored in a traditional session model?",
                "options": [
                    "Only inside the client's local memory.",
                    "In a CDN cache server close to the client.",
                    "On the server side (in memory, files, or a Redis store).",
                    "Inside the query string parameters of the URL."
                ],
                "correct": 2
            },
            {
                "prompt": "What is a scalability drawback of server-side stateful sessions?",
                "options": [
                    "Clients cannot support cookie headers on mobile devices.",
                    "It increases database read overhead and requires session replication/sticky routing across multiple server instances.",
                    "It requires encrypting the entire database on every request.",
                    "It blocks asynchronous events on the frontend client."
                ],
                "correct": 1
            }
        ],
        "apply_code": "app.use(session({\n  secret: 'weak-secret',\n  resave: false,\n  saveUninitialized: true,\n  cookie: { secure: false } // Running over HTTP\n}));",
        "apply_question": "What is the key vulnerability in this session configuration block?",
        "apply_options": [
            "resave should be set to true to force session updates.",
            "The secret is hardcoded/weak, and the cookie is not secured (secure: false), meaning session cookies can be intercepted over plaintext HTTP.",
            "saveUninitialized should be false to prevent session generation.",
            "It lacks database ORM bindings."
        ],
        "apply_correct": 1,
        "apply_explanation": "Cookies without the 'secure' flag will be sent over unencrypted HTTP connections, exposing the session ID to eavesdroppers."
    },
    "cn_jwt": {
        "name": "JWT",
        "full_name": "JSON Web Tokens",
        "categories": ["security", "auth", "api"],
        "difficulty": "intermediate",
        "prerequisites": ["cn_hashing", "cn_sessions"],
        "unlocks": ["cn_oauth", "cn_refresh_tokens"],
        "learn_next": ["cn_oauth"],
        "one_liner": "A compact, self-contained token format for securely transmitting claims between parties.",
        "why_used_here": "Used for stateless user authentication sessions between the frontend client and backend API.",
        "keywords": ["jwt", "jsonwebtoken", "pyjwt", "encode", "decode", "bearer"],
        "expected_recall": ["stateless", "signature", "claims", "payload"],
        "sample_sol": "A JWT stores claims in a base64 payload signed by a server secret. This allows stateless auth as the server can verify the token signature without querying a database.",
        "mcqs": [
            {
                "prompt": "What makes JWTs particularly suitable for stateless authentication?",
                "options": [
                    "They encrypt the entire database payload.",
                    "They store user details and expiration directly in a signed token, allowing the server to trust it without a database lookup.",
                    "They open a persistent WebSocket connection to the server.",
                    "They automatically clear browser cookies."
                ],
                "correct": 1
            },
            {
                "prompt": "What are the three parts of a JSON Web Token?",
                "options": [
                    "Username, Password, Salt",
                    "Header, Payload, Signature",
                    "Protocol, Domain, Path",
                    "Method, Endpoint, Body"
                ],
                "correct": 1
            },
            {
                "prompt": "Which of these is a major limitation of JWT-based authentication?",
                "options": [
                    "JWTs cannot be stored in cookies.",
                    "They are difficult to revoke before their natural expiration date because the verification is stateless.",
                    "They only support symmetric cryptography.",
                    "They are slow to parse on the client."
                ],
                "correct": 1
            }
        ],
        "apply_code": "def verify_token(token):\n    # VULNERABLE: decodes without verifying signature!\n    payload = jwt.decode(token, options={'verify_signature': False})\n    return payload",
        "apply_question": "What is wrong with this token verification routine?",
        "apply_options": [
            "It does not check the token's algorithm header.",
            "It turns off signature verification, allowing anyone to modify the payload (e.g. admin=true) and hijack identity.",
            "It does not use asymmetric cryptography keys.",
            "It returns a dict payload instead of a string."
        ],
        "apply_correct": 1,
        "apply_explanation": "Skipping signature verification makes the token untrustworthy. Users can spoof administrative privileges by changing base64 claims."
    },
    "cn_oauth": {
        "name": "OAuth",
        "full_name": "OAuth 2.0 Access Delegation",
        "categories": ["security", "auth"],
        "difficulty": "advanced",
        "prerequisites": ["cn_jwt"],
        "unlocks": [],
        "learn_next": [],
        "one_liner": "An open standard authorization framework that enables applications to obtain limited access to user accounts.",
        "why_used_here": "Allows integrating third-party login providers (like Google, GitHub) without storing raw credentials.",
        "keywords": ["oauth", "passport", "oauth2", "client_secret", "client_id", "authorization_code"],
        "expected_recall": ["delegation", "access token", "authorization code", "provider"],
        "sample_sol": "OAuth allows users to delegate access to their profile from an identity provider to a client application using short-lived access tokens, avoiding password sharing.",
        "mcqs": [
            {
                "prompt": "What is the primary objective of OAuth 2.0?",
                "options": [
                    "To create relational tables in SQL database instances.",
                    "To enable third-party access delegation without requiring users to share their raw password credentials.",
                    "To compress static asset files inside client bundles.",
                    "To prevent cross-site request forgery attacks using token signatures."
                ],
                "correct": 1
            },
            {
                "prompt": "In an Authorization Code grant, why is the code exchanged for a token on the backend?",
                "options": [
                    "To encrypt client-side cookies before browser loads them.",
                    "To ensure client secrets are never exposed to the frontend browser context during key exchange.",
                    "To speed up the network packets transit speed.",
                    "To validate the user's email address."
                ],
                "correct": 1
            },
            {
                "prompt": "Which of these is a potential vulnerability in OAuth configurations?",
                "options": [
                    "Using HTTPS to transmit authorization codes.",
                    "Permitting wildcards in the redirect URI callback configuration, letting attackers redirect codes to their own domains.",
                    "Encrypting the authorization tokens.",
                    "Forcing users to sign in again after token expiration."
                ],
                "correct": 1
            }
        ],
        "apply_code": "# Redirect callback URL from OAuth provider\n@app.get('/oauth/callback')\ndef oauth_callback(code, state):\n    # VULNERABLE: does not validate state parameter!\n    token = exchange_code_for_token(code)\n    return {'token': token}",
        "apply_question": "What security flaw exists in this OAuth redirect callback handler?",
        "apply_options": [
            "It does not require an email validation before exchange.",
            "It ignores the 'state' parameter, making the handler vulnerable to Cross-Site Request Forgery (CSRF) login injection attacks.",
            "It returns raw JSON instead of redirecting to a profile page.",
            "It performs the exchange on the backend instead of the browser."
        ],
        "apply_correct": 1,
        "apply_explanation": "Validating the 'state' parameter protects OAuth flow from CSRF attacks, ensuring the authentication flow was initiated by the same user agent."
    },
    "cn_refresh_tokens": {
        "name": "Refresh Tokens",
        "full_name": "Refresh Tokens",
        "categories": ["security", "auth"],
        "difficulty": "intermediate",
        "prerequisites": ["cn_jwt"],
        "unlocks": [],
        "learn_next": [],
        "one_liner": "A credential used to obtain new access tokens when the current access token expires.",
        "why_used_here": "Maintains secure sessions without requiring the user to re-enter credentials frequently.",
        "keywords": ["refresh_token", "rotation", "refresh-token"],
        "expected_recall": ["rotation", "access token", "refresh", "expiration"],
        "sample_sol": "Refresh tokens are long-lived tokens stored securely. They are exchanged on the backend for short-lived access tokens, limiting exposure of access keys.",
        "mcqs": [
            {
                "prompt": "Why do security architectures separate access tokens from refresh tokens?",
                "options": [
                    "Access tokens are stored on disk, refresh tokens are stored in database logs.",
                    "Access tokens are short-lived to minimize damage if compromised, whereas refresh tokens are long-lived and kept secure to request new access tokens.",
                    "Refresh tokens are larger and cannot fit in HTTP headers.",
                    "Access tokens can only be decoded by client browsers."
                ],
                "correct": 1
            },
            {
                "prompt": "What is Refresh Token Rotation?",
                "options": [
                    "Changing the hashing algorithm every 24 hours.",
                    "Generating a new refresh token every time the access token is renewed, invalidating old ones to detect theft.",
                    "Saving refresh tokens in different table shards.",
                    "Alternating between symmetric and asymmetric keys."
                ],
                "correct": 1
            },
            {
                "prompt": "What happens if a leaked refresh token is reused in a rotating system?",
                "options": [
                    "The backend automatically converts it to a standard session.",
                    "The backend detects the reuse anomaly, invalidates the entire token family, and forces the user to sign in again.",
                    "The browser displays a CORS origin error.",
                    "The access token expiration is extended."
                ],
                "correct": 1
            }
        ],
        "apply_code": "def refresh_access_token(ref_token):\n    # VULNERABLE: does not rotate or invalidate used refresh tokens!\n    if is_valid(ref_token):\n        return generate_access_token()\n    return None",
        "apply_question": "What security issue could arise from this basic refresh token handler?",
        "apply_options": [
            "It does not return the refresh token's expiration timestamp.",
            "It allows infinite access token regeneration without refresh token rotation, increasing the vulnerability window if the refresh token is stolen.",
            "It fails to check the database for seed records.",
            "It uses symmetric verification."
        ],
        "apply_correct": 1,
        "apply_explanation": "Without refresh token rotation (replacing the refresh token on use), a stolen refresh token can be used indefinitely to obtain new access keys."
    },
    "cn_callbacks": {
        "name": "Callbacks",
        "full_name": "Asynchronous Callbacks",
        "categories": ["async"],
        "difficulty": "beginner",
        "prerequisites": [],
        "unlocks": ["cn_promises"],
        "learn_next": ["cn_promises"],
        "one_liner": "A function passed as an argument to another function, intended to be executed after an operation completes.",
        "why_used_here": "Used to handle asynchronous completions in older JavaScript files or standard callback patterns.",
        "keywords": ["callback", "cb", "err, result", "fs.readFile"],
        "expected_recall": ["argument", "execution", "higher-order", "asynchronous"],
        "sample_sol": "A callback is a function passed into another function as an argument, executed when an asynchronous operation finishes.",
        "mcqs": [
            {
                "prompt": "What is a callback in programming?",
                "options": [
                    "A route endpoint that returns a user profile.",
                    "A function passed as an argument to another function, designed to be executed later when an operation finishes.",
                    "A database table trigger constraint.",
                    "A method to rollback aborted transactions."
                ],
                "correct": 1
            },
            {
                "prompt": "What is 'Callback Hell'?",
                "options": [
                    "An infinite loop crash inside async event listeners.",
                    "Deeply nested callback functions making code hard to read and handle errors.",
                    "Running out of thread pool workers in Uvicorn.",
                    "Forcing the CPU to run at 100% capacity."
                ],
                "correct": 1
            },
            {
                "prompt": "How does error handling usually work in Node.js callback style?",
                "options": [
                    "Errors are raised as exceptions that require try/catch blocks.",
                    "The first argument of the callback is reserved for the error object (error-first callbacks).",
                    "Errors are logged in HTTP status codes.",
                    "The database rollback handles the exceptions automatically."
                ],
                "correct": 1
            }
        ],
        "apply_code": "fs.readFile('data.txt', (err, data) => {\n  // VULNERABLE: ignores error argument!\n  console.log(data.toString());\n});",
        "apply_question": "What is wrong with this callback function?",
        "apply_options": [
            "It should use try/catch blocks directly around fs.readFile.",
            "It ignores the 'err' parameter; if file read fails, 'data' will be undefined, causing a runtime crash on data.toString().",
            "It does not use the async modifier.",
            "It parses the file as binary instead of string."
        ],
        "apply_correct": 1,
        "apply_explanation": "Ignoring errors in callback parameters leaves applications vulnerable to unhandled exceptions and silent failures."
    },
    "cn_promises": {
        "name": "Promises",
        "full_name": "Promises",
        "categories": ["async"],
        "difficulty": "beginner",
        "prerequisites": ["cn_callbacks"],
        "unlocks": ["cn_async_await"],
        "learn_next": ["cn_async_await"],
        "one_liner": "An object representing the eventual completion or failure of an asynchronous operation.",
        "why_used_here": "Enables chainable and robust asynchronous operations inside the client code.",
        "keywords": ["new Promise", "resolve", "reject", ".then", ".catch"],
        "expected_recall": ["resolve", "reject", "then", "eventual"],
        "sample_sol": "A Promise represents an asynchronous operation's state (pending, fulfilled, rejected) and provides then/catch chains for callback management.",
        "mcqs": [
            {
                "prompt": "What are the three possible states of a JavaScript Promise?",
                "options": [
                    "Active, Idle, Closed",
                    "Pending, Fulfilled, Rejected",
                    "Read, Write, Execute",
                    "Get, Post, Delete"
                ],
                "correct": 1
            },
            {
                "prompt": "What is the primary advantage of Promises over raw Callbacks?",
                "options": [
                    "They execute code inside database triggers.",
                    "They allow chaining asynchronous operations and centralizing error handling via .catch().",
                    "They run code on multiple threads simultaneously.",
                    "They prevent CORS security issues."
                ],
                "correct": 1
            },
            {
                "prompt": "What happens if a promise in a chain rejects but has no .catch() attached?",
                "options": [
                    "The compiler automatically adds a fallback return.",
                    "It results in an 'Unhandled Promise Rejection', which can crash the application process in modern runtimes.",
                    "It defaults to a successful resolve.",
                    "It rolls back the SQL database."
                ],
                "correct": 1
            }
        ],
        "apply_code": "function fetchUser(id) {\n  return fetch(`/api/user/${id}`)\n    .then(res => res.json());\n    // VULNERABLE: missing .catch()!\n}",
        "apply_question": "What is the primary error handling problem in this Promise chain function?",
        "apply_options": [
            "It returns a Promise instead of a raw user object.",
            "It lacks error capture (.catch()); any network failure during fetch or parse will result in an unhandled rejection.",
            "It uses base fetch instead of axios.",
            "The then statement is not indented."
        ],
        "apply_correct": 1,
        "apply_explanation": "Asynchronous operations can fail due to network drops or payload issues. Every Promise chain must handle rejections."
    },
    "cn_async_await": {
        "name": "async/await",
        "full_name": "async/await",
        "categories": ["async"],
        "difficulty": "beginner",
        "prerequisites": ["cn_promises"],
        "unlocks": [],
        "learn_next": [],
        "one_liner": "Syntactic sugar built on top of Promises to write asynchronous code that reads like synchronous code.",
        "why_used_here": "Simplifies parsing flows and API response handling in backend and webview files.",
        "keywords": ["async ", "await ", "asyncio"],
        "expected_recall": ["promises", "non-blocking", "syntactic sugar", "asynchronous"],
        "sample_sol": "async/await allows developers to write asynchronous, Promise-based code using a clean, sequential structure with try/catch blocks.",
        "mcqs": [
            {
                "prompt": "What does the 'async' keyword do when placed before a function declaration?",
                "options": [
                    "It compiles the function into native C assembly.",
                    "It guarantees that the function always returns a Promise.",
                    "It runs the function on a separate worker thread.",
                    "It prevents database writes inside the function body."
                ],
                "correct": 1
            },
            {
                "prompt": "What does the 'await' keyword accomplish when placed before an expression?",
                "options": [
                    "It halts CPU execution completely.",
                    "It pauses execution of the async function until the Promise resolves, yielding the resolved value.",
                    "It forces the browser to reload.",
                    "It locks the database connection."
                ],
                "correct": 1
            },
            {
                "prompt": "How is error handling structured when using async/await?",
                "options": [
                    "Using error-first callback arguments.",
                    "Using standard try/catch blocks around the awaited expressions.",
                    "By configuring global middleware.",
                    "Through automatic compiler assertions."
                ],
                "correct": 1
            }
        ],
        "apply_code": "async function loadData() {\n  // VULNERABLE: await inside a sequential loop!\n  let items = [];\n  for (let id of [1, 2, 3]) {\n    let val = await fetchItem(id);\n    items.push(val);\n  }\n  return items;\n}",
        "apply_question": "What performance issue is present in this async/await loop and how can it be optimized?",
        "apply_options": [
            "It uses a let declaration; it should use const.",
            "It awaits each request sequentially, creating a bottleneck. It should trigger requests in parallel and await them using Promise.all().",
            "It should not return items from an async function.",
            "The array should be initialized as a Map."
        ],
        "apply_correct": 1,
        "apply_explanation": "Awaiting inside a loop blocks the next iteration until the current request completes, turning parallelizable tasks into slow sequential executions."
    },
    "cn_event_loop": {
        "name": "Event Loop",
        "full_name": "Event Loop",
        "categories": ["async"],
        "difficulty": "intermediate",
        "prerequisites": ["cn_callbacks"],
        "unlocks": [],
        "learn_next": [],
        "one_liner": "The runtime engine mechanism that coordinates callbacks, asynchronous tasks, and execution contexts.",
        "why_used_here": "Allows managing high volumes of non-blocking I/O connections.",
        "keywords": ["setTimeout", "setInterval", "process.nextTick", "setImmediate", "macroTask", "microTask"],
        "expected_recall": ["non-blocking", "call stack", "queue", "runtime"],
        "sample_sol": "The Event Loop monitors the call stack and task queues. When the stack is empty, it processes pending microtasks and macrotasks.",
        "mcqs": [
            {
                "prompt": "What is the single-threaded Event Loop's core task?",
                "options": [
                    "To allocate CPU registers to active code modules.",
                    "To monitor the call stack and execute queued callbacks once the stack becomes empty.",
                    "To map virtual memory allocations to disk pages.",
                    "To partition database requests among cluster nodes."
                ],
                "correct": 1
            },
            {
                "prompt": "What is the difference in execution order between Microtasks and Macrotasks?",
                "options": [
                    "Macrotasks always execute first.",
                    "Microtasks (like Promise resolutions) are processed fully before the next Macrotask (like setTimeout) is run.",
                    "They run in parallel on different CPU cores.",
                    "Microtasks only execute on browser window focus."
                ],
                "correct": 1
            },
            {
                "prompt": "What happens to an application if code runs a heavy, synchronous calculation on the main thread?",
                "options": [
                    "The Event Loop immediately delegates it to a background worker.",
                    "The thread blocks (freezes), preventing the Event Loop from processing any I/O events, user interactions, or callbacks.",
                    "The database transaction rolls back.",
                    "The program is converted to parallel threads."
                ],
                "correct": 1
            }
        ],
        "apply_code": "app.get('/compute', (req, res) => {\n  # VULNERABLE: blocks the single-threaded loop!\n  let result = 0;\n  for (let i = 0; i < 1e10; i++) result += i;\n  res.send({result});\n});",
        "apply_question": "What will happen to the server when a user hits this compute route?",
        "apply_options": [
            "It will raise a memory leak warning.",
            "The heavy synchronous loop will block the entire server thread, preventing other users from loading pages or making requests until it finishes.",
            "It will automatically distribute calculations across multiple cores.",
            "The database connection will timeout."
        ],
        "apply_correct": 1,
        "apply_explanation": "CPU-bound synchronous tasks block the single-threaded event loop, locking the server process and making it unresponsive to other requests."
    },
    "cn_sql": {
        "name": "SQL",
        "full_name": "Relational SQL",
        "categories": ["database"],
        "difficulty": "beginner",
        "prerequisites": [],
        "unlocks": ["cn_normalization", "cn_transactions", "cn_orm"],
        "learn_next": ["cn_normalization"],
        "one_liner": "A structured domain-specific language for querying and managing relational databases.",
        "why_used_here": "Allows querying persistent records, table indexes, and entities.",
        "keywords": ["select", "insert", "update", "delete", "create table", "join", "foreign key"],
        "expected_recall": ["query", "relational", "select", "tables"],
        "sample_sol": "SQL provides DDL and DML commands to create schemas, join tables, and manage relational database constraints.",
        "mcqs": [
            {
                "prompt": "What does a SQL INNER JOIN do?",
                "options": [
                    "It appends two tables vertically.",
                    "It returns rows when there is a match in both joined tables based on the join condition.",
                    "It creates a copy of the database schema.",
                    "It limits database writes to unique records."
                ],
                "correct": 1
            },
            {
                "prompt": "Why are SQL prepared statements used?",
                "options": [
                    "To speed up CSS styling processing.",
                    "To prevent SQL Injection vulnerabilities by separating SQL query structure from user input data.",
                    "To automatically scale databases to multiple servers.",
                    "To enforce unique constraints on table columns."
                ],
                "correct": 1
            },
            {
                "prompt": "What is the difference between DDL and DML in SQL?",
                "options": [
                    "DDL handles database connections, DML handles data encryption.",
                    "DDL defines schema structures (CREATE, ALTER), while DML handles data modification (INSERT, UPDATE, SELECT).",
                    "DML only runs on SQLite databases.",
                    "DDL executes faster than DML queries."
                ],
                "correct": 1
            }
        ],
        "apply_code": "def get_user(username):\n    # VULNERABLE: raw query concatenation!\n    query = f\"SELECT * FROM users WHERE username = '{username}'\"\n    return db.execute(query)",
        "apply_question": "What critical security flaw is present in this SQL function and how is it resolved?",
        "apply_options": [
            "It does not close the database connection.",
            "It is vulnerable to SQL Injection; it should be parameterized (using placeholders like %s or ?) to sanitize the username input.",
            "It returns all columns (*) instead of username.",
            "It executes synchronously instead of using async/await."
        ],
        "apply_correct": 1,
        "apply_explanation": "Concatenating user inputs into raw SQL statements lets attackers input escape characters and run arbitrary database commands."
    },
    "cn_normalization": {
        "name": "Normalization",
        "full_name": "Database Normalization",
        "categories": ["database"],
        "difficulty": "intermediate",
        "prerequisites": ["cn_sql"],
        "unlocks": [],
        "learn_next": [],
        "one_liner": "Organizing fields and tables of a database to minimize redundancy and dependency anomalies.",
        "why_used_here": "Ensures database integrity and prevents update/delete anomalies.",
        "keywords": ["1nf", "2nf", "3nf", "foreign key", "dependency", "redundancy"],
        "expected_recall": ["redundancy", "keys", "normal form", "integrity"],
        "sample_sol": "Normalization splits data across related tables using keys to reduce redundancy and protect data integrity.",
        "mcqs": [
            {
                "prompt": "What is the primary goal of database normalization?",
                "options": [
                    "To combine all data into a single, flat Excel-like spreadsheet table.",
                    "To minimize data redundancy and prevent anomalies during database updates or deletions.",
                    "To encrypt column values on disk.",
                    "To partition database servers into shards."
                ],
                "correct": 1
            },
            {
                "prompt": "What does Third Normal Form (3NF) require?",
                "options": [
                    "That all attributes depend only on the primary key, the whole key, and nothing but the key (no transitive dependencies).",
                    "That a table has exactly three columns.",
                    "That all database tables are indexed.",
                    "That foreign keys are disabled."
                ],
                "correct": 0
            },
            {
                "prompt": "What is a common trade-off of highly normalized databases?",
                "options": [
                    "They cannot support relational schemas.",
                    "Queries can become slower and require complex multi-table JOINs, which might lead to denormalization for read performance.",
                    "They require twice the storage space.",
                    "They limit connection pool numbers."
                ],
                "correct": 1
            }
        ],
        "apply_code": "CREATE TABLE orders (\n  id INTEGER PRIMARY KEY,\n  customer_name TEXT,\n  customer_address TEXT,\n  item_name TEXT,\n  item_price REAL\n);",
        "apply_question": "What is the primary normalization defect in this 'orders' table?",
        "apply_options": [
            "It does not define a composite index on item_price.",
            "It mixes customer profile and item details with the order record, creating redundancy and anomalies if a customer changes their address.",
            "It uses INTEGER keys instead of UUIDs.",
            "It is missing a trigger constraint."
        ],
        "apply_correct": 1,
        "apply_explanation": "Storing customer details directly in the order table replicates info for every order, leading to inconsistent updates if an address changes."
    },
    "cn_transactions": {
        "name": "Transactions",
        "full_name": "ACID Transactions",
        "categories": ["database"],
        "difficulty": "intermediate",
        "prerequisites": ["cn_sql"],
        "unlocks": [],
        "learn_next": [],
        "one_liner": "A sequence of database operations executed as a single logical unit of work under ACID guarantees.",
        "why_used_here": "Protects operations from partial write failures during multi-table actions.",
        "keywords": ["begin", "commit", "rollback", "transaction", "acid", "isolation"],
        "expected_recall": ["acid", "atomic", "commit", "rollback"],
        "sample_sol": "Transactions group SQL statements, guaranteeing atomic completion (commit) or complete rollback in case of error.",
        "mcqs": [
            {
                "prompt": "What does Atomicity mean in ACID properties?",
                "options": [
                    "The database is secure against atomic particles.",
                    "All operations in a transaction succeed together, or the entire transaction is rolled back as if nothing happened.",
                    "Only one transaction can run at a time.",
                    "Records are hashed to ensure secure transfers."
                ],
                "correct": 1
            },
            {
                "prompt": "What is the role of a ROLLBACK command?",
                "options": [
                    "To restore database configurations from cloud backups.",
                    "To cancel all modifications made during the current transaction due to an error.",
                    "To convert tables to non-relational formats.",
                    "To delete the entire database schema."
                ],
                "correct": 1
            },
            {
                "prompt": "What does database Isolation level affect?",
                "options": [
                    "The network segment where database nodes reside.",
                    "How visible changes made by one transaction are to other concurrent transactions (e.g., dirty reads, phantom reads).",
                    "The number of read-only replica servers.",
                    "The encryption level of database columns."
                ],
                "correct": 1
            }
        ],
        "apply_code": "def transfer_funds(sender, receiver, amount):\n    db.execute(f'UPDATE account SET bal = bal - {amount} WHERE user={sender}')\n    # VULNERABLE: if server crashes here, funds are lost!\n    db.execute(f'UPDATE account SET bal = bal + {amount} WHERE user={receiver}')",
        "apply_question": "What database integrity bug exists in this fund transfer function?",
        "apply_options": [
            "It does not check if sender and receiver are equal.",
            "It executes statements separately without a transaction; a crash between updates leaves the database inconsistent (money deducted but not added).",
            "It uses SQL variables instead of Python variables.",
            "It executes updates in the wrong order."
        ],
        "apply_correct": 1,
        "apply_explanation": "Multi-step write operations that depend on each other must run inside an atomic database transaction block to prevent partial execution."
    },
    "cn_orm": {
        "name": "ORM",
        "full_name": "Object-Relational Mapping",
        "categories": ["database"],
        "difficulty": "intermediate",
        "prerequisites": ["cn_sql"],
        "unlocks": ["cn_migrations"],
        "learn_next": ["cn_migrations"],
        "one_liner": "An abstraction layer that maps database tables to application classes and objects.",
        "why_used_here": "Simplifies database access and models parsing (e.g. via SQLAlchemy or Prisma).",
        "keywords": ["sqlalchemy", "prisma", "sequelize", "mongoose", "declarative_base", "sessionmaker"],
        "expected_recall": ["mapping", "object-oriented", "schema", "abstraction"],
        "sample_sol": "ORMs map database rows to object instances, enabling developers to write queries in standard object-oriented syntax rather than raw SQL.",
        "mcqs": [
            {
                "prompt": "What is the primary role of an Object-Relational Mapper (ORM)?",
                "options": [
                    "To execute fast styling pre-processing.",
                    "To translate database relational tables into application classes, letting you query data using object structures.",
                    "To establish load balancers in API configurations.",
                    "To back up table records to cloud drives."
                ],
                "correct": 1
            },
            {
                "prompt": "What is the N+1 query problem commonly caused by ORMs?",
                "options": [
                    "Running a query that takes exactly N+1 seconds to run.",
                    "Fetching a list of parent records, then executing a separate query for each child record in a loop, causing significant performance lag.",
                    "Connecting to N+1 distinct database instances simultaneously.",
                    "Writing N+1 duplicate rows."
                ],
                "correct": 1
            },
            {
                "prompt": "Which of these is a drawback of ORMs?",
                "options": [
                    "They do not support transaction controls.",
                    "They add execution overhead and abstract away the underlying SQL queries, occasionally generating inefficient database calls.",
                    "They only connect to SQLite database files.",
                    "They cannot run inside asynchronous event loops."
                ],
                "correct": 1
            }
        ],
        "apply_code": "users = session.query(User).all()\nfor user in users:\n    # VULNERABLE: triggers N+1 query by loading orders separately!\n    print(user.name, [o.id for o in user.orders])",
        "apply_question": "What performance problem is triggered in this ORM lookup block?",
        "apply_options": [
            "It queries User objects instead of Order objects.",
            "It triggers the N+1 query problem because child 'orders' are loaded lazily inside a loop. It should use eager loading (e.g., joinedload).",
            "It prints attributes instead of returning a JSON body.",
            "It runs inside a transaction block."
        ],
        "apply_correct": 1,
        "apply_explanation": "Lazy loading of child properties inside a loop triggers a new query for each parent row, creating network overhead. Eager loading combines this into a single query."
    },
    "cn_migrations": {
        "name": "Migrations",
        "full_name": "Database Schema Migrations",
        "categories": ["database"],
        "difficulty": "intermediate",
        "prerequisites": ["cn_orm"],
        "unlocks": [],
        "learn_next": [],
        "one_liner": "Version-controlled scripts that define database schema transformations over time.",
        "why_used_here": "Safely updates tables structures across development, staging, and production.",
        "keywords": ["alembic", "knex migrate", "prisma migrate", "migration", "upgrade", "downgrade"],
        "expected_recall": ["schema", "version control", "ddl", "upgrade"],
        "sample_sol": "Database migrations record schema alterations (like adding columns or tables) in version-controlled scripts that can be upgraded or downgraded.",
        "mcqs": [
            {
                "prompt": "Why are migration scripts stored in version control?",
                "options": [
                    "To backup user passwords.",
                    "To track and safely apply schema updates (e.g., adding columns or tables) across all development and production environments.",
                    "To configure CORS middleware origins.",
                    "To scale read-only database replicas."
                ],
                "correct": 1
            },
            {
                "prompt": "What are the standard 'upgrade' and 'downgrade' operations in migrations?",
                "options": [
                    "Upgrade encrypts data; Downgrade decrypts it.",
                    "Upgrade applies new schema changes; Downgrade reverts them to a previous state.",
                    "Upgrade runs on Postgres; Downgrade runs on SQLite.",
                    "Upgrade increases database buffer pool sizes."
                ],
                "correct": 1
            },
            {
                "prompt": "What is a critical consideration when writing database migrations in production?",
                "options": [
                    "They must only run on development machines.",
                    "They should avoid blocking operations (like adding a column with a default value to a huge table) that can lock the database and crash the service.",
                    "They cannot alter table keys.",
                    "They must be written in raw binary code."
                ],
                "correct": 1
            }
        ],
        "apply_code": "def upgrade():\n    # VULNERABLE: drops table without backing up!\n    op.drop_table('users')\n    op.create_table('new_users')",
        "apply_question": "What is the operational risk in this database migration script?",
        "apply_options": [
            "It drops the 'users' table, resulting in permanent data loss for existing users. It should rename or migrate data instead.",
            "It does not define a downgrade method.",
            "It compiles dynamically.",
            "It changes column names."
        ],
        "apply_correct": 0,
        "apply_explanation": "Dropping active tables in migrations causes irreversible data loss. Alterations must safely move data or add columns without dropping existing data."
    },
    "cn_http_methods": {
        "name": "HTTP Methods",
        "full_name": "HTTP Request Verbs",
        "categories": ["api"],
        "difficulty": "beginner",
        "prerequisites": [],
        "unlocks": ["cn_sessions", "cn_rest", "cn_status_codes", "cn_middleware"],
        "learn_next": ["cn_rest"],
        "one_liner": "Standard HTTP verbs indicating the desired action to be performed on a resource.",
        "why_used_here": "Directs incoming API requests to the corresponding routing handler.",
        "keywords": ["get", "post", "put", "delete", "request", "verb"],
        "expected_recall": ["verbs", "request", "get", "post"],
        "sample_sol": "HTTP methods (GET, POST, PUT, DELETE) define semantic actions for resource management in REST architectures.",
        "mcqs": [
            {
                "prompt": "Which HTTP method is semantically used to fetch records without mutating state?",
                "options": [
                    "POST",
                    "GET",
                    "DELETE",
                    "PATCH"
                ],
                "correct": 1
            },
            {
                "prompt": "What does it mean for an HTTP method to be 'idempotent'?",
                "options": [
                    "It runs on multiple backend threads.",
                    "Multiple identical requests will produce the exact same database state as a single request (e.g. GET, PUT).",
                    "It can only transmit text format data.",
                    "It requires API key credentials."
                ],
                "correct": 1
            },
            {
                "prompt": "Which method is appropriate for creating a new resource, and is NOT idempotent?",
                "options": [
                    "GET",
                    "POST",
                    "PUT",
                    "OPTIONS"
                ],
                "correct": 1
            }
        ],
        "apply_code": "@app.get('/users/create')\ndef create_user(username):\n    # VULNERABLE: mutates state using GET verb!\n    db.save(User(username))\n    return {'status': 'saved'}",
        "apply_question": "What HTTP protocol violation is present in this user creation route handler?",
        "apply_options": [
            "It does not query the request parameters.",
            "It uses the GET verb to modify server/database state, violating HTTP semantics and risking accidental trigger by search crawlers or browser pre-fetching.",
            "It lacks a JSON return type.",
            "It is missing CORS headers."
        ],
        "apply_correct": 1,
        "apply_explanation": "GET requests must be safe and idempotent, meaning they should only retrieve data and never modify state on the server."
    },
    "cn_rest": {
        "name": "REST",
        "full_name": "REST API Architecture",
        "categories": ["api"],
        "difficulty": "beginner",
        "prerequisites": ["cn_http_methods"],
        "unlocks": [],
        "learn_next": [],
        "one_liner": "An architectural style for designing APIs based on stateless resource manipulation.",
        "why_used_here": "Exposes structured endpoint paths for extension client fetch calls.",
        "keywords": ["api/v1", "endpoints", "restful", "json response"],
        "expected_recall": ["http", "stateless", "resource", "endpoints"],
        "sample_sol": "REST APIs represent server entities as stateless resources accessible via logical URI paths and standard HTTP verbs.",
        "mcqs": [
            {
                "prompt": "What does representational state transfer (REST) rely on for resource representation?",
                "options": [
                    "Binary database structures.",
                    "Unique URL paths representing resources, and standard HTTP methods to manipulate their state.",
                    "Persistent TCP websocket sockets.",
                    "Local localCache file structures."
                ],
                "correct": 1
            },
            {
                "prompt": "What does the 'Stateless' constraint in REST mean?",
                "options": [
                    "The database does not save tables.",
                    "Each request from a client must contain all context needed to process it, and the server retains no client state between requests.",
                    "The client cannot read the server responses.",
                    "The server must not return status codes."
                ],
                "correct": 1
            },
            {
                "prompt": "Which URI structure best represents REST best practices for fetching user orders?",
                "options": [
                    "GET /getUserOrders?id=123",
                    "GET /users/123/orders",
                    "POST /actions/fetchOrders",
                    "GET /orders/fetch/123"
                ],
                "correct": 1
            }
        ],
        "apply_code": "# REST API Endpoint routing definition\n@app.post('/api/delete_user')\ndef delete_user(user_id):\n    # VULNERABLE: uses POST verb and verb-based path!\n    db.delete(user_id)\n    return {'ok': True}",
        "apply_question": "How should this endpoint be refactored to align with RESTful resource standards?",
        "apply_options": [
            "It should use PUT to update the delete flag.",
            "It should use the DELETE method and route path '/api/users/{user_id}', separating the semantic operation from the resource identifier path.",
            "It should use query string filters rather than route parameters.",
            "It should return plaintext instead of JSON."
        ],
        "apply_correct": 1,
        "apply_explanation": "REST architecture dictates using nouns for URI paths (resources) and HTTP verbs (DELETE) to specify actions, rather than encoding actions in path names."
    },
    "cn_status_codes": {
        "name": "Status Codes",
        "full_name": "HTTP Response Status Codes",
        "categories": ["api"],
        "difficulty": "beginner",
        "prerequisites": ["cn_http_methods"],
        "unlocks": [],
        "learn_next": [],
        "one_liner": "Standard three-digit response codes returned by servers to indicate request outcomes.",
        "why_used_here": "Informs the webview client interface of routing execution results.",
        "keywords": ["status_code", "404", "401", "403", "500", "200"],
        "expected_recall": ["response", "success", "client error", "server error"],
        "sample_sol": "HTTP Status Codes indicate success (2xx), redirection (3xx), client errors (4xx), or server errors (5xx).",
        "mcqs": [
            {
                "prompt": "What category of status codes represents client-side errors?",
                "options": [
                    "2xx Success",
                    "3xx Redirection",
                    "4xx Client Error (e.g. 400 Bad Request, 404 Not Found)",
                    "5xx Server Error"
                ],
                "correct": 2
            },
            {
                "prompt": "What is the difference between a 401 Unauthorized and a 403 Forbidden status code?",
                "options": [
                    "401 means the database is offline; 403 means the page is deleted.",
                    "401 means the client is unauthenticated (credentials missing or invalid); 403 means client is authenticated but lacks permission to view the resource.",
                    "401 is for GET requests; 403 is for POST requests.",
                    "There is no semantic difference."
                ],
                "correct": 1
            },
            {
                "prompt": "What does a 500 Internal Server Error status code indicate?",
                "options": [
                    "The client's network is offline.",
                    "An unhandled exception or error occurred inside the server-side application logic.",
                    "The browser URL was misspelled.",
                    "The database unique constraint failed."
                ],
                "correct": 1
            }
        ],
        "apply_code": "@app.get('/admin')\ndef get_admin_panel(user):\n    if not user.is_admin:\n        # VULNERABLE: returns generic 200 OK with error text!\n        return {'error': 'Forbidden access', 'code': 200}\n    return {'data': 'admin'}",
        "apply_question": "What is the issue with this authentication error handling?",
        "apply_options": [
            "It returns JSON instead of an admin page.",
            "It returns a success status (200 OK) while describing a authorization failure, preventing clients from diagnosing access issues at the HTTP protocol layer. It should return a 403 Forbidden.",
            "It should throw an unhandled database exception.",
            "It lacks encryption headers."
        ],
        "apply_correct": 1,
        "apply_explanation": "Servers should utilize standard HTTP status codes (e.g., 403 Forbidden) to communicate request errors, rather than wrapping failures inside 200 OK responses."
    },
    "cn_middleware": {
        "name": "Middleware",
        "full_name": "Route Middleware Interceptors",
        "categories": ["api"],
        "difficulty": "intermediate",
        "prerequisites": ["cn_http_methods"],
        "unlocks": ["cn_cors", "cn_rate_limiting"],
        "learn_next": ["cn_cors"],
        "one_liner": "A function pipeline that intercepts and processes HTTP requests before they reach core controllers.",
        "why_used_here": "Applies auth audits, logs HTTP triggers, and modifies response scopes.",
        "keywords": ["middleware", "add_middleware", "request, call_next", "process_request"],
        "expected_recall": ["interception", "request lifecycle", "handler", "hooks"],
        "sample_sol": "Middleware acts as a series of filter handlers, checking tokens or logging calls prior to executing specific route controllers.",
        "mcqs": [
            {
                "prompt": "What is the primary purpose of route middleware?",
                "options": [
                    "To generate CSS styles dynamically.",
                    "To execute pre-processing or validation logic on requests (such as auth token checking or logging) before they hit endpoints.",
                    "To write relational tables directly to disk.",
                    "To store user data in browser memory."
                ],
                "correct": 1
            },
            {
                "prompt": "How does middleware pass execution to the next handler in the pipeline?",
                "options": [
                    "By calling a special callback parameter (e.g. next() or call_next(request)).",
                    "By executing a SQL commit.",
                    "By raising a 200 OK exception.",
                    "By terminating the process."
                ],
                "correct": 0
            },
            {
                "prompt": "Which of these is a typical use case for middleware?",
                "options": [
                    "Running static file compilation.",
                    "Injecting common headers, verifying authentication tokens, and checking rate limits across all routes.",
                    "Configuring database tables schemas.",
                    "Storing cached state inside React components."
                ],
                "correct": 1
            }
        ],
        "apply_code": "# Middleware routing handler definition\n@app.middleware('http')\nasync def auth_middleware(request, call_next):\n    # VULNERABLE: returns None if check fails, locking the thread!\n    if not is_authorized(request):\n        raise Exception('Auth failed')\n    return await call_next(request)",
        "apply_question": "What is the problem with raising an unhandled exception inside a middleware route filter?",
        "apply_options": [
            "It does not log the error message.",
            "An unhandled exception in middleware triggers a generic 500 error and can crash connections. It should return a structured HTTP response with a 401 status code.",
            "It should redirect to index.html using JavaScript.",
            "It runs asynchronously."
        ],
        "apply_correct": 1,
        "apply_explanation": "Middleware filters sit at the request envelope level. They must handle exceptions gracefully to return proper protocol status codes to clients."
    },
    "cn_cors": {
        "name": "CORS",
        "full_name": "Cross-Origin Resource Sharing",
        "categories": ["api"],
        "difficulty": "intermediate",
        "prerequisites": ["cn_middleware"],
        "unlocks": [],
        "learn_next": [],
        "one_liner": "A browser security mechanism that restricts cross-origin HTTP requests initiated from scripts.",
        "why_used_here": "Allows the VS Code extension webview to securely fetch backend APIs hosted on localhost.",
        "keywords": ["cors", "CORSMiddleware", "allow_origins", "origin", "allow_headers"],
        "expected_recall": ["origin", "headers", "security", "browser restriction"],
        "sample_sol": "CORS headers instruct the browser whether to permit scripts running on origin A to read responses from API origin B.",
        "mcqs": [
            {
                "prompt": "What security control does CORS enforce?",
                "options": [
                    "It prevents database access keys leaks.",
                    "It is a browser security mechanism that restricts cross-origin request scripts from reading resources on another origin.",
                    "It encrypts payload files before upload.",
                    "It validates auth cookies on routers."
                ],
                "correct": 1
            },
            {
                "prompt": "Which header is returned by the server to permit cross-origin access?",
                "options": [
                    "Content-Type",
                    "Access-Control-Allow-Origin",
                    "User-Agent",
                    "Authorization"
                ],
                "correct": 1
            },
            {
                "prompt": "What is a preflight OPTIONS request in CORS?",
                "options": [
                    "A request that deletes server cookies.",
                    "A preliminary request sent by the browser before the actual request to verify that the server allows the cross-origin operation.",
                    "A method that compiles route paths.",
                    "A tool to check database load."
                ],
                "correct": 1
            }
        ],
        "apply_code": "app.add_middleware(\n    CORSMiddleware,\n    # VULNERABLE: wildcard origins with credentials!\n    allow_origins=['*'],\n    allow_credentials=True,\n    allow_methods=['*'],\n    allow_headers=['*'],\n)",
        "apply_question": "What is the security hazard in this CORS configuration block?",
        "apply_options": [
            "It allows the DELETE method.",
            "It enables wildcard origins ('*') alongside allow_credentials=True, which is rejected by modern browsers and can expose user data if bypassed.",
            "It lacks a port specification.",
            "It runs on the HTTP pipeline."
        ],
        "apply_correct": 1,
        "apply_explanation": "Wildcards cannot be paired with credentials. This is insecure as any malicious site visited by a user could make credentialed requests to your API."
    },
    "cn_react_state": {
        "name": "React State",
        "full_name": "React State Management",
        "categories": ["frontend"],
        "difficulty": "beginner",
        "prerequisites": [],
        "unlocks": ["cn_react_hooks", "cn_react_props"],
        "learn_next": ["cn_react_hooks"],
        "one_liner": "An internal data store that determines a component's rendering and behavior.",
        "why_used_here": "Maintains UI state, such as active views, completed status, and submission logs.",
        "keywords": ["state", "useState", "this.state", "setState"],
        "expected_recall": ["state variables", "re-render", "mutations", "component"],
        "sample_sol": "React state stores component-specific dynamic data. Mutating state using setter hooks triggers a DOM re-render to reflect changes.",
        "mcqs": [
            {
                "prompt": "What happens when a React component's state is mutated?",
                "options": [
                    "The page immediately refreshes.",
                    "The component and its children are re-rendered to align the DOM with the new state values.",
                    "The database is automatically updated.",
                    "CORS headers are cleared."
                ],
                "correct": 1
            },
            {
                "prompt": "Why should you never mutate React state variables directly (e.g. state.value = x)?",
                "options": [
                    "It causes compiler errors in CSS files.",
                    "Direct mutation does not trigger React's reconciliation engine, leaving the UI out of sync with data.",
                    "It deletes the component properties.",
                    "It causes memory leaks on database connections."
                ],
                "correct": 1
            },
            {
                "prompt": "How is state declared in modern functional React components?",
                "options": [
                    "By declaring standard local variables.",
                    "Using the useState hook, which returns the current state and a setter function.",
                    "By modifying the DOM directly.",
                    "Using route query parameter mappings."
                ],
                "correct": 1
            }
        ],
        "apply_code": "const [count, setCount] = useState(0);\n\nconst increment = () => {\n  // VULNERABLE: direct increment attempt!\n  count = count + 1;\n};",
        "apply_question": "Why will the increment function fail to update the count display on the screen?",
        "apply_options": [
            "It does not convert the count to string format.",
            "It assigns a value directly to 'count' instead of calling the updater hook 'setCount(count + 1)', meaning React will not detect the change or trigger a re-render.",
            "It is missing an async modifier.",
            "The count variable is a constant."
        ],
        "apply_correct": 1,
        "apply_explanation": "State variables must only be modified using their setter functions. Direct modification bypasses React's render loop."
    },
    "cn_react_props": {
        "name": "React Props",
        "full_name": "React Component Props",
        "categories": ["frontend"],
        "difficulty": "beginner",
        "prerequisites": ["cn_react_state"],
        "unlocks": [],
        "learn_next": [],
        "one_liner": "Read-only arguments passed into React components to customize their behavior and rendering.",
        "why_used_here": "Relays user details and score parameters from top components to dashboard widgets.",
        "keywords": ["props", "properties", "interface Props", "children"],
        "expected_recall": ["properties", "read-only", "downward data flow", "arguments"],
        "sample_sol": "React props act as input parameters to components, enabling downward data flow. They are read-only and immutable within the child.",
        "mcqs": [
            {
                "prompt": "What is the primary role of Props in React?",
                "options": [
                    "To query external database tables.",
                    "To pass data and callback handlers from a parent component down to a child component.",
                    "To compile TypeScript files into JavaScript.",
                    "To intercept HTTP requests."
                ],
                "correct": 1
            },
            {
                "prompt": "Are Props mutable within the child component that receives them?",
                "options": [
                    "Yes, they can be changed at any time.",
                    "No, props are read-only (immutable) parameters; only the parent component can alter the values it passes down.",
                    "Yes, but only if they are numbers.",
                    "They are only mutable inside async functions."
                ],
                "correct": 1
            },
            {
                "prompt": "How does data flow in React using Props?",
                "options": [
                    "Upward, from child to parent components.",
                    "Downward, from parent to child components (unidirectional data flow).",
                    "Bi-directionally, between sibling components.",
                    "Randomly among rendering nodes."
                ],
                "correct": 1
            }
        ],
        "apply_code": "function UserCard(props) {\n  // VULNERABLE: attempts to mutate props directly!\n  props.username = 'Admin';\n  return <div>{props.username}</div>;\n}",
        "apply_question": "What standard React constraint does this UserCard component violate?",
        "apply_options": [
            "It does not use functional hooks.",
            "It attempts to modify incoming props directly, violating the principle of immutability. Data modifications must be handled by state in the parent.",
            "It returns HTML elements instead of JSON data.",
            "It lacks route configurations."
        ],
        "apply_correct": 1,
        "apply_explanation": "Props are immutable. A component must never modify its own props; it should notify parents of changes using callback functions."
    },
    "cn_react_hooks": {
        "name": "React Hooks",
        "full_name": "React Hooks & Effects",
        "categories": ["frontend"],
        "difficulty": "intermediate",
        "prerequisites": ["cn_react_state"],
        "unlocks": [],
        "learn_next": [],
        "one_liner": "Functions that allow functional components to manage state and execute side effects.",
        "why_used_here": "Manages initial file scans, parses data streams, and registers event listeners.",
        "keywords": ["useState", "useEffect", "useMemo", "useCallback", "useRef"],
        "expected_recall": ["useState", "useEffect", "functional", "state hook"],
        "sample_sol": "React hooks (like useState and useEffect) allow functional components to maintain state and handle asynchronous operations/effects.",
        "mcqs": [
            {
                "prompt": "What is the primary role of the useEffect hook in React?",
                "options": [
                    "To styles the browser layout.",
                    "To execute side-effects in functional components, such as API fetching, subscribing to sockets, or manually modifying the DOM.",
                    "To define routes in FastAPI.",
                    "To handle database tables migrations."
                ],
                "correct": 1
            },
            {
                "prompt": "What does the dependency array in useEffect control?",
                "options": [
                    "The number of threads allocated to Uvicorn.",
                    "When the effect runs; the effect re-runs only if variables inside the dependency array change between renders.",
                    "The styling rules of child components.",
                    "The execution sequence of SQL database queries."
                ],
                "correct": 1
            },
            {
                "prompt": "What is a key rule of using React Hooks?",
                "options": [
                    "They must only be called inside loops or conditions.",
                    "They must only be called at the top level of functional components (not inside loops, conditions, or nested functions).",
                    "They must always be declared as asynchronous.",
                    "They require database connection pools."
                ],
                "correct": 1
            }
        ],
        "apply_code": "useEffect(() => {\n  // VULNERABLE: missing dependency array triggers infinite fetch loop!\n  fetchData().then(data => setData(data));\n});",
        "apply_question": "What issue is present in this useEffect statement?",
        "apply_options": [
            "It does not use the async modifier.",
            "It lacks a dependency array, meaning it runs on every single render. Since setData triggers a re-render, it will trigger an infinite loop of network requests.",
            "It should return a Promise object.",
            "It does not handle the error payload."
        ],
        "apply_correct": 1,
        "apply_explanation": "Without a dependency array, useEffect executes after every render. Triggering state updates inside it leads to rapid, infinite loops of calls."
    },
    "cn_rate_limiting": {
        "name": "Rate Limiting",
        "full_name": "API Rate Limiting",
        "categories": ["security", "performance"],
        "difficulty": "intermediate",
        "prerequisites": ["cn_middleware"],
        "unlocks": [],
        "learn_next": [],
        "one_liner": "A strategy to limit network request frequencies from specific clients to prevent abuse.",
        "why_used_here": "Protects backend parsers and API endpoints from token starvation and exhaustion.",
        "keywords": ["rateLimit", "limiter", "slowDown", "max_requests"],
        "expected_recall": ["throttle", "requests limit", "sliding window", "redis"],
        "sample_sol": "Rate limiting restricts client call rates over time windows to protect backend services from abuse and resource depletion.",
        "mcqs": [
            {
                "prompt": "What problem does API Rate Limiting mitigate?",
                "options": [
                    "Slow file uploads inside client views.",
                    "Denial of Service (DoS) attacks, brute force logins, and API resource starvation by restricting client request rates.",
                    "Cross-site scripting attacks.",
                    "Unindexed table lookups."
                ],
                "correct": 1
            },
            {
                "prompt": "What HTTP status code is returned when a client exceeds their rate limit?",
                "options": [
                    "400 Bad Request",
                    "429 Too Many Requests",
                    "403 Forbidden",
                    "502 Bad Gateway"
                ],
                "correct": 1
            },
            {
                "prompt": "Which algorithm is commonly used for rate limiting?",
                "options": [
                    "B-Tree Indexing",
                    "Token Bucket / Leaky Bucket",
                    "Quick Sort",
                    "ACID Transaction Isolation"
                ],
                "correct": 1
            }
        ],
        "apply_code": "# Simple in-memory rate limiter\nlimit = {}\n\n@app.get('/login')\ndef login(client_ip):\n    # VULNERABLE: memory leakage across IPs!\n    limit[client_ip] = limit.get(client_ip, 0) + 1\n    if limit[client_ip] > 5:\n        return {'error': 'Too many requests'}",
        "apply_question": "What is the primary architectural vulnerability of this local rate limiter?",
        "apply_options": [
            "It does not encrypt the client IP.",
            "It stores limit counters in a global in-memory dictionary without expiration or cleanup, leading to infinite memory growth (memory leak) and failing in multi-process server environments.",
            "It allows more than 5 attempts.",
            "It returns JSON instead of throwing an error."
        ],
        "apply_correct": 1,
        "apply_explanation": "Local in-memory limiters fail in distributed setups and leak memory over time. Standard implementations use TTL-backed stores like Redis."
    },
    "cn_caching": {
        "name": "Caching",
        "full_name": "Data Caching",
        "categories": ["performance"],
        "difficulty": "intermediate",
        "prerequisites": [],
        "unlocks": [],
        "learn_next": [],
        "one_liner": "Storing copies of data in temporary storage locations to speed up retrieval.",
        "why_used_here": "Caches parsed codebase structures to prevent repeating expensive full scans.",
        "keywords": ["cache", "redis", "localStorage", "in-memory", "ttl"],
        "expected_recall": ["speedup", "redis", "in-memory", "ttl"],
        "sample_sol": "Caching preserves expensive calculation outcomes in fast, in-memory stores, reducing server calculations and database load.",
        "mcqs": [
            {
                "prompt": "What is the primary objective of Caching?",
                "options": [
                    "To ensure ACID compliance on database transactions.",
                    "To store data in fast, temporary memory to accelerate subsequent read requests and reduce backend load.",
                    "To secure passwords using hashing algorithms.",
                    "To validate client browser origins."
                ],
                "correct": 1
            },
            {
                "prompt": "What does Cache Invalidation mean?",
                "options": [
                    "Deleting all backup records on server start.",
                    "The process of clearing or updating cached data when the source data changes to prevent serving stale info.",
                    "Failing to read data from the memory cache.",
                    "Restricting API requests via rate limits."
                ],
                "correct": 1
            },
            {
                "prompt": "What is a Time-to-Live (TTL) configuration in cache records?",
                "options": [
                    "The number of connection pools available.",
                    "A setting that determines how long a cached record remains valid before it is automatically expired and deleted.",
                    "The execution limit of SQL statements.",
                    "The delay before rendering UI components."
                ],
                "correct": 1
            }
        ],
        "apply_code": "cache = {}\n\ndef get_stats(user_id):\n    # VULNERABLE: infinite caching with stale data!\n    if user_id not in cache:\n        cache[user_id] = fetch_from_db(user_id)\n    return cache[user_id]",
        "apply_question": "What is the operational flaw in this caching helper?",
        "apply_options": [
            "It does not serialize the statistics to XML.",
            "It caches results indefinitely without invalidation or expiration (TTL), meaning updates in the database will never be reflected in the cached output (stale data).",
            "It uses a dict instead of a list.",
            "It executes database queries."
        ],
        "apply_correct": 1,
        "apply_explanation": "Without expiration limits or explicit invalidation triggers on database writes, caches return outdated data indefinitely."
    }
}

# Generic Prerequisite Edges in the knowledge graph
DAG_EDGES = [
    {"from": "cn_http_methods", "to": "cn_sessions", "type": "prerequisite"},
    {"from": "cn_http_methods", "to": "cn_rest", "type": "prerequisite"},
    {"from": "cn_http_methods", "to": "cn_status_codes", "type": "prerequisite"},
    {"from": "cn_http_methods", "to": "cn_middleware", "type": "prerequisite"},
    {"from": "cn_sessions", "to": "cn_jwt", "type": "prerequisite"},
    {"from": "cn_hashing", "to": "cn_jwt", "type": "prerequisite"},
    {"from": "cn_jwt", "to": "cn_oauth", "type": "prerequisite"},
    {"from": "cn_jwt", "to": "cn_refresh_tokens", "type": "prerequisite"},
    {"from": "cn_callbacks", "to": "cn_promises", "type": "prerequisite"},
    {"from": "cn_promises", "to": "cn_async_await", "type": "prerequisite"},
    {"from": "cn_callbacks", "to": "cn_event_loop", "type": "prerequisite"},
    {"from": "cn_sql", "to": "cn_normalization", "type": "prerequisite"},
    {"from": "cn_sql", "to": "cn_transactions", "type": "prerequisite"},
    {"from": "cn_sql", "to": "cn_orm", "type": "prerequisite"},
    {"from": "cn_orm", "to": "cn_migrations", "type": "prerequisite"},
    {"from": "cn_middleware", "to": "cn_cors", "type": "prerequisite"},
    {"from": "cn_middleware", "to": "cn_rate_limiting", "type": "prerequisite"},
    {"from": "cn_react_state", "to": "cn_react_hooks", "type": "prerequisite"},
    {"from": "cn_react_state", "to": "cn_react_props", "type": "prerequisite"}
]

class ConceptAnalyzer:
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key
        if self.api_key:
            genai.configure(api_key=self.api_key)

    def analyze(self, workspace_path: str) -> ConceptGraph:
        if self.api_key:
            try:
                return self._analyze_gemini(workspace_path)
            except Exception as e:
                print(f"[ConceptAnalyzer] Gemini analysis failed: {str(e)}. Falling back to Local.")
                return self._analyze_local(workspace_path)
        else:
            return self._analyze_local(workspace_path)

    def _analyze_local(self, workspace_path: str) -> ConceptGraph:
        print("[ConceptAnalyzer] Running local rule-based analysis...")
        
        # 1. Walk workspace and collect relevant files
        all_files: List[str] = []
        ignored_dirs = {
            'node_modules', '.git', '__pycache__', 'dist', 'build', 
            'out', '.gemini', 'artifacts', '.vscode', 'venv', 'env'
        }
        
        for root, dirs, files in os.walk(workspace_path):
            dirs[:] = [d for d in dirs if d not in ignored_dirs]
            for file in files:
                rel_path = os.path.relpath(os.path.join(root, file), workspace_path)
                all_files.append(rel_path.replace("\\", "/"))

        # Fallback if empty workspace
        if not all_files:
            all_files = [
                "src/auth/authService.ts",
                "src/middleware/requireAuth.ts",
                "src/utils/hashPassword.ts",
                "backend/app.py",
                "backend/database.sql"
            ]

        # Scan files for concept fingerprints
        file_contents = {}
        for f in all_files[:40]: # limit scan depth for responsiveness
            full_path = os.path.join(workspace_path, f)
            if os.path.exists(full_path):
                try:
                    with open(full_path, 'r', encoding='utf-8', errors='ignore') as f_obj:
                        file_contents[f] = f_obj.read()
                except Exception:
                    pass

        # Detect which concepts are present and compile their file mappings
        detected_concepts: Dict[str, List[str]] = {}
        for cid, t in CONCEPT_TEMPLATES.items():
            detected_files = []
            # Scan each file content for keywords
            for path, content in file_contents.items():
                content_lower = content.lower()
                for kw in t["keywords"]:
                    if kw in content_lower:
                        detected_files.append(path)
                        break
            
            # If no files found via keywords, default to 1 generic file path or demo files to keep the graph populated
            if not detected_files:
                # Mock presence for demo consistency unless directory is entirely empty
                detected_files = [all_files[0]]
            
            detected_concepts[cid] = detected_files

        # Build Graph Nodes
        nodes = []
        for cid, t in CONCEPT_TEMPLATES.items():
            files_used = detected_concepts.get(cid, [])
            
            # Setup Concept Tasks
            tasks = []
            
            # Task 1: Discovery Task
            distractors = [f for f in all_files if f not in files_used]
            if len(distractors) < 3:
                distractors += ["src/main.js", "src/styles.css", "package.json"]
            disc_options = [files_used[0]] + distractors[:3]
            # Shuffle or just make them unique
            disc_options = list(set(disc_options))
            correct_disc_idx = disc_options.index(files_used[0])

            t1 = MissionTask(
                id=f"{cid}-discovery",
                type="concept-discovery",
                prompt=f"Trace the codebase and locate the component that implements the concept of '{t['name']}'.",
                isCompleted=False,
                content=MissionTaskContent(
                    targetConcept=t["name"],
                    options=disc_options,
                    correctOptionIndex=correct_disc_idx,
                    explanation=f"Correct! '{t['name']}' is used in '{files_used[0]}'."
                )
            )
            tasks.append(t1)

            # Task 2: Comprehension MCQ (3-stages)
            t2_questions = []
            for i, q in enumerate(t["mcqs"]):
                t2_questions.append({
                    "id": f"q{i+1}",
                    "type": "mcq",
                    "prompt": q["prompt"],
                    "options": q["options"],
                    "correct": q["correct"]
                })
            
            t2 = MissionTask(
                id=f"{cid}-mcq",
                type="concept-mcq",
                prompt=f"Complete the 3-stage comprehension audit for the '{t['name']}' concept.",
                isCompleted=False,
                content=MissionTaskContent(
                    targetConcept=t["name"],
                    one_liner=t["one_liner"],
                    why_used_here=t["why_used_here"],
                    questionsList=t2_questions
                )
            )
            tasks.append(t2)

            # Task 3: Prerequisite Map Challenge
            # Collect real prereq names
            real_prereqs = [CONCEPT_TEMPLATES[p]["name"] for p in t["prerequisites"]]
            unrelated = ["Virtual DOM", "CSS Grid", "Webpack Bundling", "Unit Testing", "Docker Container"]
            map_options = real_prereqs + unrelated[:(5 - len(real_prereqs))]
            map_options = list(set(map_options))
            
            t3 = MissionTask(
                id=f"{cid}-prereq-map",
                type="concept-prereq-map",
                prompt=f"Select and order all true prerequisite concepts required before learning '{t['name']}'.",
                isCompleted=False,
                content=MissionTaskContent(
                    targetConcept=t["name"],
                    conceptsList=map_options,
                    correctSelection=real_prereqs,
                    correctOrder=real_prereqs,
                    explanation=f"Prerequisites for {t['name']} are: {', '.join(real_prereqs) or 'None'}."
                )
            )
            tasks.append(t3)

            # Task 4: Code Application Challenge
            t4 = MissionTask(
                id=f"{cid}-apply",
                type="concept-apply",
                prompt=f"Inspect this implementation block using '{t['name']}' and diagnose the structural vulnerability.",
                isCompleted=False,
                content=MissionTaskContent(
                    codeSnippet=t["apply_code"],
                    question=t["apply_question"],
                    options=t["apply_options"],
                    correctOptionIndex=t["apply_correct"],
                    explanation=t["apply_explanation"]
                )
            )
            tasks.append(t4)

            # Task 5: Reconstruction Challenge (Free text)
            t5 = MissionTask(
                id=f"{cid}-reconstruction",
                type="concept-reconstruction",
                prompt=f"Explain in your own words: How does '{t['name']}' operate, and why was it applied in this codebase?",
                isCompleted=False,
                content=MissionTaskContent(
                    targetConcept=t["name"],
                    expectedConcepts=t["expected_recall"],
                    sampleSolution=t["sample_sol"]
                )
            )
            tasks.append(t5)

            # Check if root node (available on start)
            initial_status = "available" if not t["prerequisites"] else "locked"

            node = ConceptNode(
                id=cid,
                name=t["name"],
                full_name=t["full_name"],
                categories=t["categories"],
                difficulty=t["difficulty"],
                present_in_codebase=True,
                files_where_used=files_used,
                one_liner=t["one_liner"],
                why_used_here=t["why_used_here"],
                prerequisites=t["prerequisites"],
                unlocks=t["unlocks"],
                learn_next=t["learn_next"],
                status=initial_status,
                mastery_score=0.0,
                tasks=tasks
            )
            nodes.append(node)

        # Build Graph Edges
        edges = []
        for edge_dict in DAG_EDGES:
            edges.append(ConceptEdge(
                from_node=edge_dict["from"],
                to=edge_dict["to"],
                type=edge_dict["type"]
            ))

        categories = ["security", "async", "database", "api", "frontend", "performance"]
        
        # Calculate totals
        total_concepts = len(nodes)
        available_on_start = len([n for n in nodes if not n.prerequisites])

        return ConceptGraph(
            nodes=nodes,
            edges=edges,
            categories=categories,
            total_concepts=total_concepts,
            available_on_start=available_on_start
        )

    def _analyze_gemini(self, workspace_path: str) -> ConceptGraph:
        # For Gemini mode: we fetch the local structures and customize their descriptions and application bugs based on the code!
        # To maintain stability and prevent LLM hallucinations from returning invalid node formats,
        # we load the base offline graph, feed parts of the codebase to Gemini, and ask it to refine the "why_used_here",
        # the "apply_code" (extracting real snippets if possible), and customize the bug MCQs.
        print("[ConceptAnalyzer] Running online Gemini-powered graph optimization...")
        
        base_graph = self._analyze_local(workspace_path)
        
        # Let's select 3 key files from the codebase and ask Gemini to review and return custom explanation text
        file_samples = []
        for node in base_graph.nodes:
            for f in node.files_where_used[:2]:
                full_path = os.path.join(workspace_path, f)
                if os.path.exists(full_path) and f not in [fs["path"] for fs in file_samples]:
                    try:
                        with open(full_path, 'r', encoding='utf-8', errors='ignore') as f_obj:
                            file_samples.append({
                                "path": f,
                                "content": f_obj.read()[:1000]
                            })
                    except Exception:
                        pass
        
        if not file_samples:
            return base_graph

        try:
            model = genai.GenerativeModel(
                'gemini-1.5-flash',
                generation_config={"response_mime_type": "application/json"}
            )
            
            prompt = f"""
You are a Software Engineering Tutor. Review the following files from a user's workspace:
{json.dumps(file_samples, indent=2)}

We have built a knowledge graph with these concepts: Hashing, Sessions, JWT, OAuth, Refresh Tokens, async/await, Promises, Callbacks, Event Loop, SQL, Normalization, Transactions, ORM, Migrations, REST, HTTP Methods, Status Codes, Middleware, CORS, React Hooks, React State, React Props, Rate Limiting, Caching.

Choose the top 3 concepts that are most prominently implemented in the provided code snippets.
For each of these 3 concepts, provide:
1. "concept_id" (e.g. "cn_jwt")
2. "why_used_here": A highly specific explanation linking to the actual file and function names in the snippets.
3. "apply_code": A real snippet from the files that represents the concept, modified to contain a subtle bug (like missing await, missing checks, or insecure configurations).
4. "apply_question": A question asking how to fix this bug.
5. "apply_options": 4 multiple-choice options.
6. "apply_correct": The 0-based index of the correct option.
7. "apply_explanation": Explanation of the fix.

Output ONLY a JSON block structured like this:
{{
  "optimizations": [
    {{
      "concept_id": "cn_jwt",
      "why_used_here": "Custom description...",
      "apply_code": "code block...",
      "apply_question": "What is wrong with...",
      "apply_options": ["Option A", "Option B", "Option C", "Option D"],
      "apply_correct": 1,
      "apply_explanation": "Explanation..."
    }}
  ]
}}
"""
            response = model.generate_content(prompt)
            data = json.loads(response.text)
            
            optimizations = data.get("optimizations", [])
            for opt in optimizations:
                cid = opt.get("concept_id")
                # Locate node in base graph
                node = next((n for n in base_graph.nodes if n.id == cid), None)
                if node:
                    if opt.get("why_used_here"):
                        node.why_used_here = opt["why_used_here"]
                    
                    # Update the application task (Task 4)
                    apply_task = next((t for t in node.tasks if t.type == "concept-apply"), None)
                    if apply_task:
                        apply_task.content.codeSnippet = opt.get("apply_code", apply_task.content.codeSnippet)
                        apply_task.content.question = opt.get("apply_question", apply_task.content.question)
                        apply_task.content.options = opt.get("apply_options", apply_task.content.options)
                        apply_task.content.correctOptionIndex = opt.get("apply_correct", apply_task.content.correctOptionIndex)
                        apply_task.content.explanation = opt.get("apply_explanation", apply_task.content.explanation)
                        
            return base_graph
            
        except Exception as e:
            print(f"[ConceptAnalyzer] Gemini optimization failed: {str(e)}. Using base graph.")
            return base_graph
