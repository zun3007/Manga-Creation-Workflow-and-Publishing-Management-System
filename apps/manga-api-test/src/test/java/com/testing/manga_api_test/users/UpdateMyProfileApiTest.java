package com.testing.manga_api_test.users;

import com.testing.manga_api_test.config.AuthTestConfig;
import com.testing.manga_api_test.config.UsersTestConfig;
import io.restassured.RestAssured;
import io.restassured.http.ContentType;
import io.restassured.response.Response;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import static org.hamcrest.Matchers.*;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasKey;

public class UpdateMyProfileApiTest {

    private final String NEW_FULL_NAME = "Nguyễn Hoàng Phát";
    private final String NEW_AVATAR_URL = "https://example.com/images/avatar.png";
    private boolean isUpdateProfile = false;

    // TC-USR-UPD-001: Update my profile should return success
    @Test
    void getAssistantsShouldReturnSuccess() {
        isUpdateProfile = false;

        // Login and verify to get access token
        String accessToken = AuthTestConfig.loginMangakaAccountAndVerifyToReturnAccessToken();

        // Generating HTTP Request
        Response response = updateMyProfileRequest(accessToken, NEW_FULL_NAME, NEW_AVATAR_URL);

        // Starting to check result
        response.then()
                .statusCode(200)
                .body("id", equalTo(AuthTestConfig.MANGAKA_ID))
                .body("email", equalTo(AuthTestConfig.MANGAKA_EMAIL))
                .body("fullName", equalTo(NEW_FULL_NAME))
                .body("avatarUrl", equalTo(NEW_AVATAR_URL))
                .body("role", equalTo("MANGAKA"));

        isUpdateProfile = true;
    }

    // TC-USR-UPD-002: Update my profile should fail when missing access token
    // TC-USR-UPD-003: Update my profile should fail when access token is invalid
    // TC-USR-UPD-004: Update my profile should fail when full name is not a string
    // TC-USR-UPD-005: Update my profile should fail when avatar url is not a string
    // TC-USR-UPD-006: Update my profile should fail when full name greater than 120 characters
    // TC-USR-UPD-007: Update my profile should fail when avatar url greater than 500 characters
    // TC-USR-UPD-008: Update my profile should fail when full name is null
    // TC-USR-UPD-009: Update my profile should return success when avatar url is null

    // ================================== HELPER METHODS ==================================
    private Response updateMyProfileRequest(String accessToken, String fullName, String avatarUrl) {
        return RestAssured.given()
                .contentType(ContentType.JSON)
                .header( "Authorization",
                        "Bearer " + accessToken)
                .body("""
                      {
                          "fullName": "%s",
                          "avatarUrl": "%s"
                      }
                    """.formatted(fullName, avatarUrl))
                .when()
                .patch(UsersTestConfig.USERS_URL + "/me");
    }

    // Helper method: Changle full name and avatar url to default
    @AfterEach
    public void changePasswordToDefault() {
        if (!isUpdateProfile) {
            return;
        }

        // Login and verify to get access token
        String accessToken = AuthTestConfig.loginMangakaAccountAndVerifyToReturnAccessToken();

        // Generating HTTP Request
        updateMyProfileRequest(
                accessToken,
                AuthTestConfig.MANGAKA_FULL_NAME,
                AuthTestConfig.MANGAKA_AVATAR_URL
        );
    }
}
