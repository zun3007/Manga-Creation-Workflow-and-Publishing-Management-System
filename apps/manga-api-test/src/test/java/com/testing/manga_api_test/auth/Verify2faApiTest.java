package com.testing.manga_api_test.auth;

import com.testing.manga_api_test.config.AuthTestConfig;
import io.restassured.RestAssured;
import io.restassured.http.ContentType;
import io.restassured.response.Response;
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
        String challengeToken = AuthTestConfig.loginAndGetChallengeToken();

        // Generating HTTP Request
        Response response = verify2fa(challengeToken, AuthTestConfig.FIXED_OTP_FOR_VERIFY);

        // Starting to check result
        response.then()
                .statusCode(201)
                .body("accessToken", notNullValue());

    }

    // TC-VERIFY-002: Verify 2 fa fail when otp wrong
    @Test
    void verify2faShouldFailWhenOtpWrong() {
        // Login and get challenge token
        String challengeToken = AuthTestConfig.loginAndGetChallengeToken();

        // Generating HTTP Request
        Response response = verify2fa(challengeToken, "000000");

        // Starting to check result
        response.then()
                .statusCode(401)
                .body("message", notNullValue())
                .body("error", equalTo("Unauthorized"))
                .body("statusCode", equalTo(401));
    }

    // TC-VERIFY-003: Verify 2 fa should fail when challenge token invalid
    @Test
    void verify2faShouldFailWhenChallengeTokenInvalid() {
        // Login and get challenge token
        String challengeToken = AuthTestConfig.loginAndGetChallengeToken();

        // Generating HTTP Request
        Response response = verify2fa("Invalid Challenge Token", AuthTestConfig.FIXED_OTP_FOR_VERIFY);

        // Starting to check result
        response.then()
                .statusCode(401)
                .body("message", notNullValue())
                .body("error", equalTo("Unauthorized"))
                .body("statusCode", equalTo(401));
    }

    // ================================== HELPER METHODS ==================================
    private Response verify2fa(String challengeToken, String code) {
        return RestAssured.given()
                .contentType(ContentType.JSON)
                .body("""
                    {
                      "challengeToken": "%s",
                      "code": "%s"
                    }
                """.formatted(challengeToken, code))
                .when()
                .post(AuthTestConfig.AUTH_URL + "/2fa/verify");
    }
}
