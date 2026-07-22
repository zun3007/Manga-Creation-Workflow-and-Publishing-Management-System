package com.testing.manga_api_test.users;

import com.testing.manga_api_test.config.AuthTestConfig;
import com.testing.manga_api_test.config.UsersTestConfig;
import io.restassured.RestAssured;
import io.restassured.response.Response;
import org.junit.jupiter.api.Test;

import static org.hamcrest.Matchers.*;

/**
 * Test Case Amount: 3
 * Test Case Success: 3
 * Test Case Failed: 0
 * UPDATED DATE: 20/06/2026
 */
public class CurrentUserDetailsApiTest {
    // TC-USR-ME-001: Get current user details should return success
    @Test
    void getCurrentUserDetailsShouldReturnSuccess() {
        // Login and verify to get access token
        String accessToken = AuthTestConfig.loginMangakaAccountAndVerifyToReturnAccessToken();

        // Generating HTTP Request
        Response response = getCurrentUserDetailsRequest(accessToken);

        // Starting to check result
        response.then()
                .statusCode(200)
                .body("id", equalTo(AuthTestConfig.MANGAKA_ID))
                .body("email", equalTo(AuthTestConfig.MANGAKA_EMAIL))
                .body("fullName", equalTo(AuthTestConfig.MANGAKA_FULL_NAME))
                .body("$", hasKey("avatarUrl"))
                .body("role", equalTo("MANGAKA"));
    }

    // TC-USR-ME-002: Get current user details should fail when missing access token
    @Test
    void getCurrentUserDetailsShouldReturnFailWhenMissingAccessToken() {
        // Login and verify to get access token
        String accessToken = AuthTestConfig.loginMangakaAccountAndVerifyToReturnAccessToken();;

        // Generating HTTP Request
        Response response = RestAssured.given()
                .when()
                .get(UsersTestConfig.USERS_URL + "/me");

        // Starting to check result
        response.then()
                .statusCode(401)
                .body("message", equalTo("Unauthorized"))
                .body("statusCode", equalTo(401));
    }

    // TC-USR-ME-003: Get current user details should fail when access token invalid
    @Test
    void getCurrentUserDetailsShouldFailWhenInvalidAccessToken() {
        // Login and verify to get access token
        String accessToken = AuthTestConfig.loginMangakaAccountAndVerifyToReturnAccessToken();

        // Generating HTTP Request
        Response response = getCurrentUserDetailsRequest("InvalidAccessToken");

        // Starting to check result
        response.then()
                .statusCode(401)
                .body("message", equalTo("Unauthorized"))
                .body("statusCode", equalTo(401));
    }

    // ================================== HELPER METHODS ==================================
    private Response getCurrentUserDetailsRequest(String accessToken) {

        return RestAssured.given()
                .header( "Authorization",
                        "Bearer " + accessToken)
                .when()
                .get(UsersTestConfig.USERS_URL + "/me");

    }
}
