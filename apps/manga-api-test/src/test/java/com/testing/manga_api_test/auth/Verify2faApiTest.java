package com.testing.manga_api_test.auth;

import io.restassured.RestAssured;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.Test;

import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.notNullValue;

/**
 * Test Case Amount: 3
 * Test Case Success: 3
 * Test Case Failed: 0
 * UPDATED DATE: 19/06/2026
 */
public class Verify2faApiTest {

    // TC-VERIFY-001: Verify 2 fa return access token
    @Test
    void verify2faShouldReturnAccessToken() {
        // Login and get challenge token
        String challengeToken = getChallengeTokenWhenLogin();

        RestAssured.given()
                .contentType(ContentType.JSON)
                .body("""
                {
                  "challengeToken": "%s",
                  "code": "123456"
                }
                """.formatted(challengeToken))
                .when()
                .post("http://localhost:3000/api/auth/2fa/verify")
                .then()
                .statusCode(201)
                .body("accessToken", notNullValue());

    }

    // TC-VERIFY-002: Verify 2 fa fail when otp wrong
    @Test
    void verify2faShouldFailWhenOtpWrong() {
        // Login and get challenge token
        String challengeToken = getChallengeTokenWhenLogin();

        RestAssured.given()
                .contentType(ContentType.JSON)
                .body("""
                {
                  "challengeToken": "%s",
                  "code": "000000"
                }
                """.formatted(challengeToken))
                .when()
                .post("http://localhost:3000/api/auth/2fa/verify")
                .then()
                .statusCode(401)
                .body("message", notNullValue())
                .body("error", equalTo("Unauthorized"))
                .body("statusCode", equalTo(401));
    }

    // TC-VERIFY-003: Verify 2 fa should fail when challenge token invalid
    @Test
    void verify2faShouldFailWhenChallengeTokenInvalid() {
        // Login and get challenge token
        String challengeToken = getChallengeTokenWhenLogin();

        RestAssured.given()
                .contentType(ContentType.JSON)
                .body("""
                {
                  "challengeToken": "InvalidChallengeToken",
                  "code": "123456"
                }
                """)
                .when()
                .post("http://localhost:3000/api/auth/2fa/verify")
                .then()
                .statusCode(401)
                .body("message", notNullValue())
                .body("error", equalTo("Unauthorized"))
                .body("statusCode", equalTo(401));
    }

    // Helper method: Login and get Challenge Token
    private String getChallengeTokenWhenLogin() {
        return RestAssured.given()
                .contentType(ContentType.JSON)
                .body("""
                      {
                          "email": "dungminer69@gmail.com",
                          "password": "Dung123456@"
                      }
                    """)
                .when()
                .post("http://localhost:3000/api/auth/login")
                .then()
                .statusCode(201)
                .extract()
                .path("challengeToken");
    }
}
