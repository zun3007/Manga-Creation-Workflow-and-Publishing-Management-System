package com.testing.manga_api_test.auth;

import com.testing.manga_api_test.config.AuthTestConfig;
import io.restassured.RestAssured;
import io.restassured.http.ContentType;
import io.restassured.response.Response;
import org.junit.jupiter.api.Test;

import static org.hamcrest.Matchers.*;

/**
 * Test Case Amount: 5
 * Test Case Success: 3
 * Test Case Failed: 2 (TC-LOGIN-004, TC-LOGIN-005)
 * UPDATED DATE: 19/06/2026
 */
public class LoginApiTest {

    // TC-LOGIN-001: Login should require 2FA
    @Test
    void loginShouldRequire2FA() {

        // Generating HTTP Request
        Response response = login(AuthTestConfig.TEST_USER_EMAIL, AuthTestConfig.TEST_USER_PASSWORD);

        // Starting to check result
        response.then()
            .statusCode(201)
            .body("twoFactorRequired", equalTo(true))
            .body("challengeToken", notNullValue())
            .body("expiresIn", equalTo(600));
    }

    // TC-LOGIN-002: Login fail with email empty
    @Test
    void loginShouldFailWhenEmailEmpty() {

        // Generating HTTP Request
        Response response = login("", AuthTestConfig.TEST_USER_PASSWORD);

        // Starting to check result
        response.then()
                .statusCode(400)
                .body("message", contains("Email không hợp lệ"))
                .body("error", equalTo("Bad Request"))
                .body("statusCode", equalTo(400));
    }

    // TC-LOGIN-003: Login fail with invalid email format
    @Test
    void loginShouldFailWhenEmailFormatInvalid() {

        // Generating HTTP Request
        Response response = login("ngoThaiAnhHao123", AuthTestConfig.TEST_USER_PASSWORD);

        // Starting to check result
        response.then()
                .statusCode(400)
                .body("message", contains("Email không hợp lệ"))
                .body("error", equalTo("Bad Request"))
                .body("statusCode", equalTo(400));
    }

    // TC-LOGIN-004: Login fail when user is not activate
//    @Test
//    void loginShouldFailWhenUserNotActivated() {
//
//        RestAssured.given()
//                .contentType(ContentType.JSON)
//                .body("""
//                  {
//                      "email": "inactive@gmail.com",
//                      "password": "test123"
//                  }
//                """)
//                .when()
//                .post("http://localhost:3000/api/auth/login")
//                .then()
//                .statusCode(400)
//                .body("message", contains("Email không hợp lệ"))
//                .body("error", equalTo("Bad Request"))
//                .body("statusCode", equalTo(400));
//    }

    // TC-LOGIN-005: Account should be locked after five failed attempts
    @Test
    void accountShouldBeLockedAfterFiveFailedAttempts() {

        // Repeat login 4 times
        for (int i = 1; i <= 4; i++) {
            login(AuthTestConfig.TEST_USER_EMAIL, "WrongPassword123");
        }

        // Testing
        Response response = login(AuthTestConfig.TEST_USER_EMAIL, "WrongPassword123");

        // Constraint
        response.then()
                .statusCode(423)
                .body("message", equalTo("Tài khoản bị khóa"))
                .body("error", equalTo("Locked"))
                .body("statusCode", equalTo(423));
    }

    // ================================== HELPER METHODS ==================================
    private Response login(String email, String password) {
        return RestAssured.given()
                .contentType(ContentType.JSON)
                .body("""
                      {
                          "email": "%s",
                          "password": "%s"
                      }
                    """.formatted(email, password))
                .when()
                .post(AuthTestConfig.AUTH_URL + "/login");
    }


}
