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
public class AssistantsApiTest {

    // TC-ASSISTANT-001: Get Assistants should return success
    @Test
    void getAssistantsShouldReturnSuccess() {
        // Login and verify to get access token
        String accessToken = UsersTestConfig.loginAdminAccountAndVerifyToReturnAccessToken();

        // Generating HTTP Request
        Response response = getAssistantsRequest(accessToken);

        // Starting to check result
        response.then()
                .statusCode(200)
                .body("size()", greaterThan(0))
                .body("name", hasItems(
                        "Kenji Sato",
                        "Lan Trần",
                        "Mai Nguyễn"
                ));
    }

    // TC-ASSISTANT-002: Get assistant should fail when missing access token
    @Test
    void getAssistantsShouldReturnFailWhenMissingAccessToken() {
        // Login and verify to get access token
        String accessToken = AuthTestConfig.loginMangakaAccountAndVerifyToReturnAccessToken();;

        // Generating HTTP Request
        Response response = RestAssured.given()
                .when()
                .get(UsersTestConfig.USERS_URL + "/assistants");

        // Starting to check result
        response.then()
                .statusCode(401)
                .body("message", equalTo("Unauthorized"))
                .body("statusCode", equalTo(401));
    }

    // TC-ASSISTANT-003: Get assistant should fail when access token is invalid
    @Test
    void getAssistantsShouldReturnFailWhenInvalidAccessToken() {
        // Login and verify to get access token
        String accessToken = AuthTestConfig.loginMangakaAccountAndVerifyToReturnAccessToken();

        // Generating HTTP Request
        Response response = getAssistantsRequest("InvalidAccessToken");

        // Starting to check result
        response.then()
                .statusCode(401)
                .body("message", equalTo("Unauthorized"))
                .body("statusCode", equalTo(401));
    }

    // ================================== HELPER METHODS ==================================
    private Response getAssistantsRequest(String accessToken) {

        return RestAssured.given()
                .header( "Authorization",
                        "Bearer " + accessToken)
                .when()
                .get(UsersTestConfig.USERS_URL + "/assistants");

    }
}
