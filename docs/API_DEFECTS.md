# API defect report: JSONPlaceholder `POST /posts`

|              |                                                                                       |
| ------------ | ------------------------------------------------------------------------------------- |
| **Endpoint** | `POST https://jsonplaceholder.typicode.com/posts`                                     |
| **Tested**   | 5 October 2026                                                                        |
| **Tests**    | [`tests/features/api/create-post.feature`](../tests/features/api/create-post.feature) |
| **Run**      | `npm run test:api`                                                                    |

## Summary

The brief's expected outcome is that invalid input gets **an appropriate HTTP error code or error message**,
**without server-side failures**. JSONPlaceholder does not meet this:

- It **accepts every request whose body is valid JSON** with `201 Created`, however invalid the data is.
- Bodies that are **not valid JSON cause a `500` server error**, and the error **leaks a stack trace**.

> **Context:** JSONPlaceholder is a public _fake_ API for demos and prototyping. It intentionally does not
> validate or store anything, so these results are not a surprise. They are reported as defects
> **against the behaviour the brief expects**, exactly as they would be raised with an API owner in a real
> project.

## How the tests report this

Each category has two kinds of scenario, so that one problem can never hide another:

| Scenario kind                                         | Result today                  | Why                                                                                                                             |
| ----------------------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| "… does not cause a server error"                     | ✅ Pass                       | Must pass: no 5xx for any valid JSON body.                                                                                      |
| "… stored unchanged" / control case                   | ✅ Pass                       | If data is accepted, it must not be corrupted.                                                                                  |
| "… is rejected with a client error" (`@known-defect`) | ⚠️ Expected failure (`@fail`) | The brief's expectation. The test runs every time; if the API is ever fixed, Playwright reports "expected to fail, but passed". |

In the **Playwright HTML report**, expected failures count as passed and carry a `known defect` annotation.
In the **Cucumber report**, which has no "expected failure" status, they show as failed, with a
"KNOWN DEFECT: this failure is expected" attachment and the `@known-defect` / `@defect:<ID>` tags.

## Defects

| ID                  | Severity | Summary                                                            |
| ------------------- | -------- | ------------------------------------------------------------------ |
| [API-001](#api-001) | High     | Posts with missing required fields are accepted                    |
| [API-002](#api-002) | Medium   | No maximum title length: a 1,000,000-character title is accepted   |
| [API-003](#api-003) | Medium   | Unsupported special characters in the title are accepted           |
| [API-004](#api-004) | Medium   | Fields with the wrong data type are accepted _(extra)_             |
| [API-005](#api-005) | High     | Malformed JSON causes a 500 server error instead of 400 _(extra)_  |
| [API-006](#api-006) | High     | Error responses leak a stack trace and server file paths _(extra)_ |

### API-001

**Posts with missing required fields are accepted** (High)

| Sent                            | Expected                    | Actual        |
| ------------------------------- | --------------------------- | ------------- |
| `{ title, body }` (no `userId`) | `400`/`422` + error message | `201 Created` |
| `{ body, userId }` (no `title`) | `400`/`422` + error message | `201 Created` |
| `{ title, userId }` (no `body`) | `400`/`422` + error message | `201 Created` |
| `{}`                            | `400`/`422` + error message | `201 Created` |

**Impact:** posts can be created that belong to no user or have no content.
Scenario: _A missing required field is rejected with a client error_.

### API-002

**No maximum title length** (Medium)

The brief does not define a limit, so the tests assume a typical limit of **255 characters** and test just
above it (256), then far above it (10,000 / 100,000 / 1,000,000).

| Title length    | Expected                          | Actual                                    |
| --------------- | --------------------------------- | ----------------------------------------- |
| 256 – 1,000,000 | `400`/`413`/`422` + error message | `201 Created`, the full title echoed back |

A manual probe with a **5,000,000-character** title (about 5 MB) was also accepted (`201`, about 4.4 s).
**Impact:** storage abuse and slow responses (denial-of-service risk).
Scenario: _An excessively long title is rejected with a client error_.

### API-003

**Unsupported special characters are accepted** (Medium)

| Title contains                                    | Risk                                                                           | Actual        |
| ------------------------------------------------- | ------------------------------------------------------------------------------ | ------------- |
| A null byte (`\u0000`)                            | String truncation in C-based/native code                                       | `201 Created` |
| Control characters (bell, ANSI escape, backspace) | Terminal/log injection                                                         | `201 Created` |
| A lone UTF-16 surrogate (`\ud800`)                | Not valid Unicode; breaks encoders                                             | `201 Created` |
| A right-to-left override (`\u202E`)               | Filename/text spoofing (`Invoice \u202Efdp.exe` displays as "Invoice exe.pdf") | `201 Created` |
| A `<script>` tag                                  | Stored XSS if rendered unescaped                                               | `201 Created` |

**Not defects:** emoji, non-Latin scripts, quotes, ampersands, backslashes and SQL-like text are legitimate
title content. The tests check that these **are accepted and stored unchanged**, and they pass.
Scenario: _Unsupported special characters are rejected with a client error_.

### API-004

**Fields with the wrong data type are accepted** (Medium, _extra: beyond the brief's list_)

`userId: "abc"`, `userId: -1`, `title: 12345` and `title: null` all return `201 Created`.
Scenario: _A field with the wrong data type is rejected with a client error_.

### API-005

**Malformed JSON causes a server-side failure** (High, _extra_)

| Body                                         | Expected          | Actual                      |
| -------------------------------------------- | ----------------- | --------------------------- |
| `{"title": "Home loan", "userId":` (cut off) | `400 Bad Request` | `500 Internal Server Error` |
| `null`                                       | `400 Bad Request` | `500 Internal Server Error` |

This is exactly the "server-side failure" the brief says must not happen: the error is the client's, so
the answer should be `400`. Scenario: _A malformed JSON body is rejected with 400, not a server error_.

### API-006

**Error responses leak internal details** (High, security, _extra_)

The `500` response body is a raw Node.js stack trace (excerpt):

```text
SyntaxError: Unexpected end of JSON input
    at JSON.parse (<anonymous>)
    at parse (/app/node_modules/body-parser/lib/types/json.js:89:19)
    at /app/node_modules/body-parser/lib/read.js:121:18
```

**Impact:** reveals the runtime, framework, library versions and server file layout (information
disclosure, OWASP A05: Security Misconfiguration).
Scenario: _An error response does not reveal internal details_.

## Other observations (not test-enforced)

- A body sent **without** a `Content-Type` header is parsed as form data: `{"title":"t"}` is stored as a
  key named `{"title":"t"}` with an empty value.
- A JSON **array** body (`[1, 2, 3]`) is accepted and stored as `{"0": 1, "1": 2, "2": 3}`.
- Every create returns `id: 101` (the API does not persist posts), so ids cannot be used to tell posts apart.
