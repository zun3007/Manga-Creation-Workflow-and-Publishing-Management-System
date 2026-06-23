package com.testing.manga_api_test.genres;

import com.testing.manga_api_test.config.AuthTestConfig;
import com.testing.manga_api_test.config.GenresTestConfig;
import com.testing.manga_api_test.config.NotificationsTestConfig;
import com.testing.manga_api_test.config.ProposalsTestConfig;
import io.restassured.RestAssured;
import io.restassured.response.Response;
import org.junit.jupiter.api.Test;

import static org.hamcrest.Matchers.equalTo;

public class GenresApiTest {
    // TC-GR-001: Get all genres should return success
    @Test
    void getAllGenresShouldReturnSuccess() {
        // Login and verify to get access token
        String accessToken = AuthTestConfig.loginMangakaAccountAndVerifyToReturnAccessToken();

        // Generating HTTP Request
        Response response = getAllGenresRequest(accessToken);
        response.then().log().all();

        // Starting to check result
        response.then()
                .statusCode(200)
                .body("size()", equalTo(6))

                .body("[0].id", equalTo(1))
                .body("[0].name", equalTo("Action"))

                .body("[1].id", equalTo(2))
                .body("[1].name", equalTo("Fantasy"))

                .body("[2].id", equalTo(5))
                .body("[2].name", equalTo("Mystery"))

                .body("[3].id", equalTo(3))
                .body("[3].name", equalTo("Romance"))

                .body("[4].id", equalTo(4))
                .body("[4].name", equalTo("Shonen"))

                .body("[5].id", equalTo(6))
                .body("[5].name", equalTo("Slice of Life"));
    }

    // TC-GR-002: Get all genres should fail when missing access token
    @Test
    void getAllGenresShouldFailWhenMissingAccessToken() {
        // Login and verify to get access token
        String accessToken = AuthTestConfig.loginMangakaAccountAndVerifyToReturnAccessToken();

        // Generating HTTP Request
        Response response = RestAssured.given()
                .when()
                .get(GenresTestConfig.GENRES_URL);

        // Starting to check result
        response.then()
                .statusCode(401)
                .body("message", equalTo("Unauthorized"))
                .body("statusCode", equalTo(401));
    }

    // TC-GR-003: Get all genres should fail when invalid access token
    @Test
    void getAllGenresShouldFailWhenInvalidAccessToken() {
        // Login and verify to get access token
        String accessToken = AuthTestConfig.loginMangakaAccountAndVerifyToReturnAccessToken();

        // Generating HTTP Request
        Response response = getAllGenresRequest("InvalidAccessToken");
        response.then().log().all();

        // Starting to check result
        response.then()
                .statusCode(401)
                .body("message", equalTo("Unauthorized"))
                .body("statusCode", equalTo(401));
    }

    // ================================== HELPER METHODS ==================================
    private Response getAllGenresRequest(String accessToken) {

        return RestAssured.given()
                .header( "Authorization",
                        "Bearer " + accessToken)
                .when()
                .get(GenresTestConfig.GENRES_URL);

    }
}
