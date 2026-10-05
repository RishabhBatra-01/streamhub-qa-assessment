@api
Feature: JSONPlaceholder availability
  Before testing post creation, confirm the API under test is reachable.

  @smoke
  Scenario: An existing post can be fetched
    When I fetch post 1
    Then the response status is 200
    And the response is JSON
    And the post has id 1
