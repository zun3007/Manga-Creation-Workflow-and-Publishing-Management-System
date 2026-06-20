package com.testing.manga_api_test.auth;

import com.testing.manga_api_test.config.AuthTestConfig;
import io.restassured.RestAssured;
import io.restassured.http.ContentType;
import io.restassured.response.Response;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import static org.hamcrest.Matchers.*;

public class ChangePasswordApiTest {

    private boolean isPasswordChanged;

    // TC-PASSWORD-001: Change password should return ok
    @Test
    void changePasswordShouldReturnSuccess() {
        isPasswordChanged = false;

        // Login and verify to get access token
        String accessToken = AuthTestConfig.loginMangakaAccountAndVerifyToReturnAccessToken();

        // Generating HTTP Request
        Response response = changePassword(
                accessToken,
                AuthTestConfig.MANGAKA_PASSWORD,
                AuthTestConfig.NEW_PASSWORD);

        // Starting to check result
        response.then()
                .statusCode(200)
                .body("ok", equalTo(true));

        isPasswordChanged = true;
    }

    // TC-PASSWORD-002: Change password should fail when current password incorrect
    @Test
    void changePasswordShouldFailWhenCurrentPasswordIncorrect() {
        isPasswordChanged = false;

        // Login and verify to get access token
        String accessToken = AuthTestConfig.loginMangakaAccountAndVerifyToReturnAccessToken();

        // Generating HTTP Request
        Response response = changePassword(
                accessToken,
                "InvalidPassword1232",
                AuthTestConfig.NEW_PASSWORD);

        // Starting to check result
        response.then()
                .statusCode(400)
                .body("message", equalTo("Mật khẩu hiện tại không đúng"))
                .body("error", equalTo("Bad Request"))
                .body("statusCode", equalTo(400));
    }

    // TC-PASSWORD-003: Change password should fail when current password is same with new password
    @Test
    void changePasswordShouldFailWhenCurrentPasswordSameWithNewPassword() {
        isPasswordChanged = false;

        // Login and verify to get access token
        String accessToken = AuthTestConfig.loginMangakaAccountAndVerifyToReturnAccessToken();

        // Generating HTTP Request
        Response response = changePassword(
                accessToken,
                AuthTestConfig.MANGAKA_PASSWORD,
                AuthTestConfig.MANGAKA_PASSWORD);

        // Starting to check result
        response.then()
                .statusCode(400)
                .body("message", equalTo("Mật khẩu mới phải khác mật khẩu hiện tại"))
                .body("error", equalTo("Bad Request"))
                .body("statusCode", equalTo(400));
    }

    // TC-PASSWORD-004: Change password should fail when missing access token
    @Test
    void changePasswordShouldFailWhenMissingAccessToken() {
        isPasswordChanged = false;

        // Login and verify to get access token
        String accessToken = AuthTestConfig.loginMangakaAccountAndVerifyToReturnAccessToken();

        // Generating HTTP Request
        Response response = RestAssured.given()
                .contentType(ContentType.JSON)
                .body("""
                          {
                              "currentPassword": "%s",
                              "newPassword": "%s"
                          }
                        """.formatted(AuthTestConfig.MANGAKA_PASSWORD, AuthTestConfig.NEW_PASSWORD))
                .when()
                .patch(AuthTestConfig.AUTH_URL + "/password");

        // Starting to check result
        response.then()
                .statusCode(401)
                .body("message", equalTo("Unauthorized"));
    }

    // TC-PASSWORD-005: Change password should fail when access token is invalid
    @Test
    void changePasswordShouldFailWhenInvalidAccessToken() {
        isPasswordChanged = false;

        // Login and verify to get access token
        String accessToken = AuthTestConfig.loginMangakaAccountAndVerifyToReturnAccessToken();

        // Generating HTTP Request
        Response response = changePassword(
                "InvalidAccessToken",
                AuthTestConfig.MANGAKA_PASSWORD,
                AuthTestConfig.MANGAKA_PASSWORD);

        // Starting to check result
        response.then()
                .statusCode(401)
                .body("message", equalTo("Unauthorized"));
    }

    // TC-PASSWORD-006: Change password should fail when new password less than 8 characters
    @Test
    void changePasswordShouldFailWhenNewPasswordLessThan8Characters() {
        isPasswordChanged = false;

        // Login and verify to get access token
        String accessToken = AuthTestConfig.loginMangakaAccountAndVerifyToReturnAccessToken();

        // Generating HTTP Request
        Response response = changePassword(
                accessToken,
                AuthTestConfig.MANGAKA_PASSWORD,
                "test123");

        // Starting to check result
        response.then()
                .statusCode(400)
                .body("message", contains("Mật khẩu mới tối thiểu 8 ký tự"))
                .body("error", equalTo("Bad Request"))
                .body("statusCode", equalTo(400));
    }

    // TC-PASSWORD-007: Change password should fail when new password more than 72 characters
    @Test
    void changePasswordShouldFailWhenNewPasswordMoreThan72Characters() {
        isPasswordChanged = false;
        String passwordOver72Characters = "Dung123456@Dung123456@Dung123456@Dung123456@Dung123456@Dung123456@Dung123456@123";

        // Login and verify to get access token
        String accessToken = AuthTestConfig.loginMangakaAccountAndVerifyToReturnAccessToken();

        // Generating HTTP Request
        Response response = changePassword(
                accessToken,
                AuthTestConfig.MANGAKA_PASSWORD,
                passwordOver72Characters);

        // Starting to check result
        response.then()
                .statusCode(400)
                .body("message", contains("Mật khẩu tối đa 72 ký tự"))
                .body("error", equalTo("Bad Request"))
                .body("statusCode", equalTo(400));
    }

    // ================================== HELPER METHODS ==================================
    private Response changePassword(String accessToken, String currentPassword, String newPassword){
        return RestAssured.given()
                .contentType(ContentType.JSON)
                .header( "Authorization",
                        "Bearer " + accessToken)
                .body("""
                      {
                          "currentPassword": "%s",
                          "newPassword": "%s"
                      }
                    """.formatted(currentPassword, newPassword))
                .when()
                .patch(AuthTestConfig.AUTH_URL + "/password");
    }

    // Helper method: Changle New Password to Default Password
    @AfterEach
    public void changePasswordToDefault() {
        if (!isPasswordChanged) {
            return;
        }

        // Login and get Challenge Token
        String challengeToken = AuthTestConfig.loginAndGetChallengeToken(
                AuthTestConfig.MANGAKA_EMAIL,
                AuthTestConfig.NEW_PASSWORD
        );

        // Verify and get Access Token
        String accessToken = AuthTestConfig.verify2faAndGetAccessToken(challengeToken, AuthTestConfig.FIXED_OTP_FOR_VERIFY);

        // Generating HTTP Request
        changePassword(
                accessToken,
                AuthTestConfig.NEW_PASSWORD,
                AuthTestConfig.MANGAKA_PASSWORD
        );
    }
}
