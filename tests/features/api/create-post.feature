@api
Feature: Creating posts with boundary and invalid data
  Target: POST /posts on JSONPlaceholder.
  Expected outcome (from the brief): invalid input gets an appropriate HTTP error code
  or error message, and never causes a server-side failure.

  How results are reported:
  - "does not fail on the server side" and "stored unchanged" checks must PASS.
  - "rejects it with a client error" checks describe the brief's expected behaviour.
    JSONPlaceholder is a fake API that accepts everything, so these scenarios are
    tagged as known defects and expected failures: they still run every time and are
    reported as "expected to fail". If the API starts validating, Playwright flags them as
    "expected to fail, but passed". Details: docs/API_DEFECTS.md

  @smoke
  Scenario: A valid post is created (control case)
    When I send a valid post
    Then the response status is 201
    And the response is JSON
    And the created post contains everything I sent
    And the created post has a new numeric id

  # ---------------------------------------------------------------- long titles

  Scenario Outline: An excessively long title does not cause a server error: <case>
    When I send a post with "<case>"
    Then the API does not fail on the server side
    And the response is JSON
    And the title is stored unchanged

    Examples:
      | case                        |
      | a 256-character title       |
      | a 10,000-character title    |
      | a 100,000-character title   |
      | a 1,000,000-character title |

  @known-defect @defect:API-002 @fail
  Scenario Outline: An excessively long title is rejected with a client error: <case>
    When I send a post with "<case>"
    Then the API rejects it with a client error

    Examples:
      | case                        |
      | a 256-character title       |
      | a 10,000-character title    |
      | a 100,000-character title   |
      | a 1,000,000-character title |

  # ---------------------------------------------------------- special characters

  Scenario Outline: Unsupported special characters do not cause a server error: <case>
    When I send a post with "<case>"
    Then the API does not fail on the server side
    And the response is JSON

    Examples:
      | case                                         |
      | a title containing a null byte               |
      | a title containing control characters        |
      | a title containing an invalid lone surrogate |
      | a title containing a right-to-left override  |
      | a title containing a script tag              |

  @known-defect @defect:API-003 @fail
  Scenario Outline: Unsupported special characters are rejected with a client error: <case>
    When I send a post with "<case>"
    Then the API rejects it with a client error

    Examples:
      | case                                         |
      | a title containing a null byte               |
      | a title containing control characters        |
      | a title containing an invalid lone surrogate |
      | a title containing a right-to-left override  |
      | a title containing a script tag              |

  Scenario Outline: Legitimate special characters are accepted and stored unchanged: <case>
    Not every special character is invalid: real titles contain emoji, other
    scripts and punctuation, and these must not be rejected or corrupted.

    When I send a post with "<case>"
    Then the response status is 201
    And the title is stored unchanged

    Examples:
      | case                                            |
      | a title with emoji and non-Latin scripts        |
      | a title with quotes, ampersands and backslashes |
      | a title that looks like SQL injection           |

  # ------------------------------------------------------ missing required fields

  Scenario Outline: A missing required field does not cause a server error: <case>
    When I send a post with "<case>"
    Then the API does not fail on the server side
    And the response is JSON

    Examples:
      | case            |
      | no userId       |
      | no title        |
      | no body         |
      | an empty object |

  @known-defect @defect:API-001 @fail
  Scenario Outline: A missing required field is rejected with a client error: <case>
    When I send a post with "<case>"
    Then the API rejects it with a client error

    Examples:
      | case            |
      | no userId       |
      | no title        |
      | no body         |
      | an empty object |

  # ------------------------------------------------- extra: wrong data types

  @extra
  Scenario Outline: A field with the wrong data type does not cause a server error: <case>
    When I send a post with "<case>"
    Then the API does not fail on the server side

    Examples:
      | case                     |
      | a userId that is text    |
      | a negative userId        |
      | a title that is a number |
      | a title that is null     |

  @extra @known-defect @defect:API-004 @fail
  Scenario Outline: A field with the wrong data type is rejected with a client error: <case>
    When I send a post with "<case>"
    Then the API rejects it with a client error

    Examples:
      | case                     |
      | a userId that is text    |
      | a negative userId        |
      | a title that is a number |
      | a title that is null     |

  # ------------------------------------------- extra: body is not a JSON object

  @extra
  Scenario: A JSON array body does not cause a server error
    When I send a post with "a JSON array body"
    Then the API does not fail on the server side

  @extra @known-defect @defect:API-005 @fail
  Scenario Outline: A malformed JSON body is rejected with 400, not a server error: <case>
    When I send a post with "<case>"
    Then the API does not fail on the server side
    And the response status is 400

    Examples:
      | case                  |
      | a truncated JSON body |
      | a JSON null body      |

  @extra @known-defect @defect:API-006 @fail
  Scenario Outline: An error response does not reveal internal details: <case>
    When I send a post with "<case>"
    Then the response does not reveal internal server details

    Examples:
      | case                  |
      | a truncated JSON body |
      | a JSON null body      |
