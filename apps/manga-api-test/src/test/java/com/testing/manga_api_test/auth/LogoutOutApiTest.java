package com.testing.manga_api_test.auth;

import io.restassured.RestAssured;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.Test;

import static org.hamcrest.Matchers.equalTo;

/**
 * Test Case Amount: 1
 * Test Case Success: 1
 * Test Case Failed: 0
 * UPDATED DATE: 19/06/2026
 */
public class LogoutOutApiTest {

    // TC-LOGOUT-001: Logout success
    @Test
    void logoutShouldReturnOk() {

        RestAssured.given()
                .contentType(ContentType.JSON)
                .when()
                .post("http://localhost:3000/api/auth/logout")
                .then()
                .statusCode(201)
                .body("ok", equalTo(true));

    }


}
