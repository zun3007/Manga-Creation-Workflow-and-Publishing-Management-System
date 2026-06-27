package com.testing.manga_api_test.config;

import io.restassured.RestAssured;
import io.restassured.http.ContentType;

public class AuthTestConfig {
    public static final String AUTH_URL = "http://localhost:3000/api/auth";

    public static final Long TEST_USER_ID = 1L;

    public static final String TEST_USER_EMAIL = "dungminer69@gmail.com";

    public static final String TEST_USER_PASSWORD = "Dung123456@";

    public static final String FIXED_OTP_FOR_VERIFY = "123456";

    // Helper method: Login and get Challenge Token
    public static String loginAndGetChallengeToken() {
        return RestAssured.given()
                .contentType(ContentType.JSON)
                .body("""
                      {
                          "email": "%s",
                          "password": "%s"
                      }
                    """.formatted(TEST_USER_EMAIL, TEST_USER_PASSWORD))
                .when()
                .post(AUTH_URL + "/login")
                .then()
                .statusCode(201)
                .extract()
                .path("challengeToken");
    }
}