package com.testing.manga_api_test.auth;

import com.testing.manga_api_test.config.AuthTestConfig;
import io.restassured.RestAssured;
import io.restassured.response.Response;
import org.junit.jupiter.api.Test;

import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.notNullValue;

/**
 * Test Case Amount: 3
 * Test Case Success: 3
 * Test Case Failed: 0
 * UPDATED DATE: 20/06/2026
 */
public class GetMeApiTest {

    // TC-ME-001: Get me should return success
    @Test
    void getMeShouldReturnSuccess() {
        // Login and verify to get access token
        String accessToken = AuthTestConfig.loginMangakaAccountAndVerifyToReturnAccessToken();

        // Generating HTTP Request
        Response response = getMe(accessToken);

        // Starting to check result
        response.then()
            .statusCode(200)
            .body("id", equalTo(AuthTestConfig.MANGAKA_ID))
            .body("email", equalTo(AuthTestConfig.MANGAKA_EMAIL))
            .body("role", equalTo("MANGAKA"))
            .body("name", equalTo(AuthTestConfig.MANGAKA_FULL_NAME));
    }

    // TC-ME-002: Get me should fail when access token invalid
    @Test
    void getMeShouldFailWhenAccessTokenInvalid() {
        // Login and verify
        AuthTestConfig.loginMangakaAccountAndVerifyToReturnAccessToken();

        // Generating HTTP Request
        Response response = getMe("InvalidAccessToken");

        // Starting to check result
        response.then()
                .statusCode(401)
                .body("message", equalTo("Unauthorized"))
                .body("statusCode", equalTo(401));
    }

    // TC-ME-003: Get me should fail when missing access token
    @Test
    void getMeShouldFailWhenMissingAccessToken() {
        // Login and verify
        AuthTestConfig.loginMangakaAccountAndVerifyToReturnAccessToken();

        // Generating HTTP Request
        Response response = RestAssured.given()
                .when()
                .get(AuthTestConfig.AUTH_URL + "/me");

        // Starting to check result
        response.then()
                .statusCode(401)
                .body("message", equalTo("Unauthorized"))
                .body("statusCode", equalTo(401));
    }

    // ================================== HELPER METHODS ==================================
    private Response getMe(String accessToken){
        return RestAssured.given()
                .header( "Authorization",
                        "Bearer " + accessToken)
                .when()
                .get(AuthTestConfig.AUTH_URL + "/me");
    }
}
