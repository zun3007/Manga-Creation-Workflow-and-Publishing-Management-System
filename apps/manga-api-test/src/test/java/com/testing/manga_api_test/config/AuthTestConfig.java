package com.testing.manga_api_test.config;

import io.restassured.RestAssured;
import io.restassured.http.ContentType;

public class AuthTestConfig {
    public static final String AUTH_URL = "http://localhost:3000/api/auth";

    public static final Integer MANGAKA_ID = 1;
    public static final String MANGAKA_EMAIL = "dungminer69@gmail.com";
    public static final String MANGAKA_PASSWORD = "Dung123456@";
    public static final String MANGAKA_FULL_NAME = "Nguyễn Tiến Dũng";
    public static final String MANGAKA_AVATAR_URL = null;


    public static final String FIXED_OTP_FOR_VERIFY = "123456";
    public static final String NEW_PASSWORD = "NewPassword123@";

    // Helper method: Login and get Challenge Token
    public static String loginAndGetChallengeToken(String email, String password) {
        return RestAssured.given()
                .contentType(ContentType.JSON)
                .body("""
                      {
                          "email": "%s",
                          "password": "%s"
                      }
                    """.formatted(email, password))
                .when()
                .post(AUTH_URL + "/login")
                .then()
                .statusCode(201)
                .extract()
                .path("challengeToken");
    }

    // Helper method: Verify and get Access Token
    public static String verify2faAndGetAccessToken(String challengeToken, String code) {
        return RestAssured.given()
                .contentType(ContentType.JSON)
                .body("""
                    {
                      "challengeToken": "%s",
                      "code": "%s"
                    }
                """.formatted(challengeToken, code))
                .when()
                .post(AuthTestConfig.AUTH_URL + "/2fa/verify")
                .then()
                .statusCode(201)
                .extract()
                .path("accessToken");
    }

    // Helper method loginUserAccountAndVerifyToReturnAccessToken
    public static String loginMangakaAccountAndVerifyToReturnAccessToken() {
        // Login and get Challenge Token
        String challengeToken = loginAndGetChallengeToken(
                MANGAKA_EMAIL,
                MANGAKA_PASSWORD);

        // Verify and get Access Token
        return verify2faAndGetAccessToken(challengeToken, AuthTestConfig.FIXED_OTP_FOR_VERIFY);
    }
}