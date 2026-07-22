package com.testing.manga_api_test.dashboard;

import com.testing.manga_api_test.config.AuthTestConfig;
import com.testing.manga_api_test.config.DashboardConfig;
import io.restassured.RestAssured;
import io.restassured.response.Response;
import org.junit.jupiter.api.Test;

import static org.hamcrest.Matchers.equalTo;

/**
 * Test Case Amount: 3
 * Test Case Success: 3
 * Test Case Failed: 0
 * UPDATED DATE: 21/06/2026
 */
public class SeriesResponseApiTest {

    // TC-DB-SRS-001: Dashboard series should return success
    @Test
    void dashboardSeriesShouldReturnSuccess() {
        // Login and verify to get access token
        String accessToken = AuthTestConfig.loginMangakaAccountAndVerifyToReturnAccessToken();

        // Generating HTTP Request
        Response response = getDashboardSeriesResponse(accessToken);

        // Starting to check result
        response.then()
                .statusCode(200)
                .body("size()", equalTo(10))
                .body("[0].title", equalTo("Asterism Academy"))
                .body("[0].riskLevel", equalTo(null))
                .body("[1].title", equalTo("Crimson Inkfall"))
                .body("[1].riskLevel", equalTo(null))
                .body("[2].title", equalTo("Last Train to Yomi"))
                .body("[2].riskLevel", equalTo(null));
    }

    // TC-DB-SRS-002: Dashboard series should fail when missing access token
    @Test
    void dashboardSeriesShouldFailWhenMissingAccessToken() {
        // Login and verify to get access token
        String accessToken = AuthTestConfig.loginMangakaAccountAndVerifyToReturnAccessToken();

        // Generating HTTP Request
        Response response = RestAssured.given()
                .when()
                .get(DashboardConfig.DASHBOARD_URL + "/series");

        // Starting to check result
        response.then()
                .statusCode(401)
                .body("message", equalTo("Unauthorized"))
                .body("statusCode", equalTo(401));
    }

    // TC-DB-SRS-003: Dashboard series should fail when access token is invalid
    @Test
    void dashboardSeriesShouldFailWhenInvalidAccessToken() {
        // Login and verify to get access token
        String accessToken = AuthTestConfig.loginMangakaAccountAndVerifyToReturnAccessToken();

        // Generating HTTP Request
        Response response = getDashboardSeriesResponse("InvalidAccessToken");
        response.then().log().all();

        // Starting to check result
        response.then()
                .statusCode(401)
                .body("message", equalTo("Unauthorized"))
                .body("statusCode", equalTo(401));
    }

    // ================================== HELPER METHODS ==================================
    private Response getDashboardSeriesResponse(String accessToken) {
        return RestAssured.given()
                .header( "Authorization",
                        "Bearer " + accessToken)
                .when()
                .get(DashboardConfig.DASHBOARD_URL + "/series");
    }
}
