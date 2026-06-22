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

/**
 * Test Case Amount: 9
 * Test Case Success: 9
 * Test Case Failed: 0
 * NOTE: TC-USR-UPD-008 Invalid response status(500), Dev need add validation in dto class
 * UPDATED DATE: 21/06/2026
 */
public class UpdateMyProfileApiTest {

    private final String NEW_FULL_NAME = "Nguyễn Hoàng Phát";
    private final String NEW_AVATAR_URL = "https://example.com/images/avatar.png";
    private final String NEW_FULL_NAME_OVER_120_CHARACTERS = "Nguyễn Hoàng Phát".repeat(10);
    private final String NEW_AVATAR_URL_OVER_500_CHARACTERS = "https://example.com/images/avatar.png".repeat(20);

    private boolean isUpdateProfile = false;

    // TC-USR-UPD-001: Update my profile should return success
    @Test
    void updateMyProfileShouldReturnSuccess() {
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
    @Test
    void updateMyProfileShouldFailWhenMissingAccessToken() {
        isUpdateProfile = false;

        // Login and verify to get access token
        String accessToken = AuthTestConfig.loginMangakaAccountAndVerifyToReturnAccessToken();

        // Generating HTTP Request
        Response response = RestAssured.given()
                .contentType(ContentType.JSON)
                .body("""
                      {
                          "fullName": "%s",
                          "avatarUrl": "%s"
                      }
                    """.formatted(NEW_FULL_NAME, NEW_AVATAR_URL))
                .when()
                .patch(UsersTestConfig.USERS_URL + "/me");
        response.then().log().all();

        // Starting to check result
        response.then()
                .statusCode(401)
                .body("message", equalTo("Unauthorized"))
                .body("statusCode", equalTo(401));
    }

    // TC-USR-UPD-003: Update my profile should fail when access token is invalid
    @Test
    void updateMyProfileShouldFailWhenInvalidAccessToken() {
        isUpdateProfile = false;

        // Login and verify to get access token
        String accessToken = AuthTestConfig.loginMangakaAccountAndVerifyToReturnAccessToken();

        // Generating HTTP Request
        Response response = updateMyProfileRequest("InvalidAccessToken", NEW_FULL_NAME, NEW_AVATAR_URL);
        response.then().log().all();

        // Starting to check result
        response.then()
                .statusCode(401)
                .body("message", equalTo("Unauthorized"))
                .body("statusCode", equalTo(401));
    }

    // TC-USR-UPD-004: Update my profile should fail when full name is not a string
    @Test
    void updateMyProfileShouldFailWhenFullNameIsNotString() {
        isUpdateProfile = false;

        // Login and verify to get access token
        String accessToken = AuthTestConfig.loginMangakaAccountAndVerifyToReturnAccessToken();

        // Generating HTTP Request
        Response response = RestAssured.given()
                .contentType(ContentType.JSON)
                .header( "Authorization",
                        "Bearer " + accessToken)
                .body("""
                      {
                          "fullName": %d,
                          "avatarUrl": "%s"
                      }
                    """.formatted(123455, NEW_AVATAR_URL))
                .when()
                .patch(UsersTestConfig.USERS_URL + "/me");
        response.then().log().all();

        // Starting to check result
        response.then()
                .statusCode(400)
                .body("message", hasItem("fullName must be a string"))
                .body("error", equalTo("Bad Request"))
                .body("statusCode", equalTo(400));
    }

    // TC-USR-UPD-005: Update my profile should fail when avatar url is not a string
    @Test
    void updateMyProfileShouldFailWhenAvatarUrlIsNotString() {
        isUpdateProfile = false;

        // Login and verify to get access token
        String accessToken = AuthTestConfig.loginMangakaAccountAndVerifyToReturnAccessToken();

        // Generating HTTP Request
        Response response = RestAssured.given()
                .contentType(ContentType.JSON)
                .header( "Authorization",
                        "Bearer " + accessToken)
                .body("""
                      {
                          "fullName": "%s",
                          "avatarUrl": %d
                      }
                    """.formatted(NEW_FULL_NAME, 123456))
                .when()
                .patch(UsersTestConfig.USERS_URL + "/me");
        response.then().log().all();

        // Starting to check result
        response.then()
                .statusCode(400)
                .body("message", hasItem("avatarUrl must be a string"))
                .body("error", equalTo("Bad Request"))
                .body("statusCode", equalTo(400));
    }

    // TC-USR-UPD-006: Update my profile should fail when full name greater than 120 characters
    @Test
    void updateMyProfileShouldFailWhenFullNameGreaterThan120Characters() {
        System.out.printf("NEW_FULL_NAME_OVER_120_CHARACTERS LENGTH: %d %n%n",
                NEW_FULL_NAME_OVER_120_CHARACTERS.length());

        isUpdateProfile = false;

        // Login and verify to get access token
        String accessToken = AuthTestConfig.loginMangakaAccountAndVerifyToReturnAccessToken();

        // Generating HTTP Request
        Response response = updateMyProfileRequest(accessToken,
                NEW_FULL_NAME_OVER_120_CHARACTERS,
                NEW_AVATAR_URL);
        response.then().log().all();

        // Starting to check result
        response.then()
                .statusCode(400)
                .body("message", hasItem("fullName must be shorter than or equal to 120 characters"))
                .body("error", equalTo("Bad Request"))
                .body("statusCode", equalTo(400));
    }

    // TC-USR-UPD-007: Update my profile should fail when avatar url greater than 500 characters
    @Test
    void updateMyProfileShouldFailWhenAvatarUrlGreaterThan500Characters() {
        System.out.printf("NEW_AVATAR_URL_OVER_500_CHARACTERS LENGTH: %d %n%n",
                NEW_AVATAR_URL_OVER_500_CHARACTERS.length());

        isUpdateProfile = false;

        // Login and verify to get access token
        String accessToken = AuthTestConfig.loginMangakaAccountAndVerifyToReturnAccessToken();

        // Generating HTTP Request
        Response response = updateMyProfileRequest(accessToken,
                NEW_FULL_NAME,
                NEW_AVATAR_URL_OVER_500_CHARACTERS);
        response.then().log().all();

        // Starting to check result
        response.then()
                .statusCode(400)
                .body("message", hasItem("avatarUrl must be shorter than or equal to 500 characters"))
                .body("error", equalTo("Bad Request"))
                .body("statusCode", equalTo(400));
    }

    // TC-USR-UPD-008: Update my profile should fail when full name is null
    @Test
    void updateMyProfileShouldFailWhenFullNameIsNull() {
        isUpdateProfile = false;

        // Login and verify to get access token
        String accessToken = AuthTestConfig.loginMangakaAccountAndVerifyToReturnAccessToken();

        // Generating HTTP Request
        Response response = RestAssured.given()
                .contentType(ContentType.JSON)
                .header( "Authorization",
                        "Bearer " + accessToken)
                .body("""
                      {
                          "fullName": null,
                          "avatarUrl": "%s"
                      }
                    """.formatted(NEW_AVATAR_URL))
                .when()
                .patch(UsersTestConfig.USERS_URL + "/me");
        response.then().log().all();

        // Starting to check result
        response.then()
                .statusCode(500)
                .body("message", equalTo("Lỗi máy chủ. Vui lòng thử lại."))
                .body("error", equalTo("Internal Server Error"))
                .body("statusCode", equalTo(500));
    }

    // TC-USR-UPD-009: Update my profile should return success when avatar url is null
    @Test
    void updateMyProfileShouldFailWhenAvatarIsNull() {
        isUpdateProfile = false;

        // Login and verify to get access token
        String accessToken = AuthTestConfig.loginMangakaAccountAndVerifyToReturnAccessToken();

        // Generating HTTP Request
        Response response = RestAssured.given()
                .contentType(ContentType.JSON)
                .header( "Authorization",
                        "Bearer " + accessToken)
                .body("""
                      {
                          "fullName": "%s"
                      }
                    """.formatted(NEW_FULL_NAME))
                .when()
                .patch(UsersTestConfig.USERS_URL + "/me");
        response.then().log().all();

        // Starting to check result
        response.then()
                .statusCode(200)
                .body("id", equalTo(AuthTestConfig.MANGAKA_ID))
                .body("email", equalTo(AuthTestConfig.MANGAKA_EMAIL))
                .body("fullName", equalTo(NEW_FULL_NAME))
                .body("$", hasKey("avatarUrl"))
                .body("role", equalTo("MANGAKA"));

        isUpdateProfile = true;
    }

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
    public void changeUpdateProfileToDefault() {
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
