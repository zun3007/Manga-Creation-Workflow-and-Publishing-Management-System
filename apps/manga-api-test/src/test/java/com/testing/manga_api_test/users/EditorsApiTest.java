package com.testing.manga_api_test.users;

import com.testing.manga_api_test.config.AuthTestConfig;
import com.testing.manga_api_test.config.UsersTestConfig;
import io.restassured.RestAssured;
import io.restassured.response.Response;
import org.junit.jupiter.api.Test;

import static org.hamcrest.Matchers.*;

public class EditorsApiTest {

    // TC-Editor-001: Get editors should return success
    @Test
    void getEditorsShouldReturnSuccess() {
        // Login and verify to get access token
        String accessToken = AuthTestConfig.loginMangakaAccountAndVerifyToReturnAccessToken();

        // Generating HTTP Request
        Response response = getEditorsRequest(accessToken);

        // Starting to check result
        response.then()
                .statusCode(200)
                .body("size()", greaterThan(0))
                .body("name", hasItems(
                        "Hiroshi Tanaka"
                ));
    }

    // TC-Editor-002: Get editors should fail when missing access token
    @Test
    void getEditorsShouldFailWhenMissingAccessToken() {
        // Login and verify to get access token
        String accessToken = AuthTestConfig.loginMangakaAccountAndVerifyToReturnAccessToken();

        // Generating HTTP Request
        Response response = RestAssured.given()
                .when()
                .get(UsersTestConfig.USERS_URL + "/editors");

        // Starting to check result
        response.then()
                .statusCode(401)
                .body("message", equalTo("Unauthorized"))
                .body("statusCode", equalTo(401));
    }

    // TC-Editor-003: Get editors should fail when access token is invalid
    @Test
    void getEditorsShouldFailWhenInvalidAccessToken() {
        // Login and verify to get access token
        String accessToken = AuthTestConfig.loginMangakaAccountAndVerifyToReturnAccessToken();

        // Generating HTTP Request
        Response response = getEditorsRequest("InvalidAccessToken");

        // Starting to check result
        response.then()
                .statusCode(401)
                .body("message", equalTo("Unauthorized"))
                .body("statusCode", equalTo(401));
    }

    // ================================== HELPER METHODS ==================================
    private Response getEditorsRequest(String accessToken) {

        return RestAssured.given()
                .header( "Authorization",
                        "Bearer " + accessToken)
                .when()
                .get(UsersTestConfig.USERS_URL + "/editors");

    }
}
