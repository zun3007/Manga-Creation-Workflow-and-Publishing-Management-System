package com.testing.manga_api_test.dashboard;

import com.testing.manga_api_test.config.AuthTestConfig;
import com.testing.manga_api_test.config.DashboardConfig;
import com.testing.manga_api_test.config.UsersTestConfig;
import io.restassured.RestAssured;
import io.restassured.http.ContentType;
import io.restassured.response.Response;
import org.junit.jupiter.api.Test;

import static org.hamcrest.Matchers.equalTo;

/**
 * Test Case Amount: 3
 * Test Case Success: 3
 * Test Case Failed: 0
 * UPDATED DATE: 21/06/2026
 */
public class SummaryResponseApiTest {

    // TC-DB-SMR-001: Dashboard summary should return success
    @Test
    void dashboardSummaryShouldReturnSuccess() {
        // Login and verify to get access token
        String accessToken = AuthTestConfig.loginMangakaAccountAndVerifyToReturnAccessToken();

        // Generating HTTP Request
        Response response = getDashboardSummaryResponse(accessToken);

        // Starting to check result
        response.then()
                .statusCode(200)
                .body("totalSeries", equalTo(3))
                .body("activeSeries", equalTo(2))
                .body("atRiskSeries", equalTo(1))
                .body("chaptersInProgress", equalTo(2))
                .body("openTasks", equalTo(4))
                .body("pendingReview", equalTo(1))
                .body("unreadNotifications", equalTo(3));
    }

    // TC-DB-SMR-002: Dashboard summary should fail when missing access token
    @Test
    void dashboardSummaryShouldFailWhenMissingAccessToken() {
        // Login and verify to get access token
        String accessToken = AuthTestConfig.loginMangakaAccountAndVerifyToReturnAccessToken();

        // Generating HTTP Request
        Response response = RestAssured.given()
                .when()
                .get(DashboardConfig.DASHBOARD_URL + "/summary");

        // Starting to check result
        response.then()
                .statusCode(401)
                .body("message", equalTo("Unauthorized"))
                .body("statusCode", equalTo(401));
    }

    // TC-DB-SMR-003: Dashboard summary should fail when access token is invalid
    @Test
    void dashboardSummaryShouldFailWhenInvalidAccessToken() {
        // Login and verify to get access token
        String accessToken = AuthTestConfig.loginMangakaAccountAndVerifyToReturnAccessToken();

        // Generating HTTP Request
        Response response = getDashboardSummaryResponse("InvalidAccessToken");
        response.then().log().all();

        // Starting to check result
        response.then()
                .statusCode(401)
                .body("message", equalTo("Unauthorized"))
                .body("statusCode", equalTo(401));
    }

    // ================================== HELPER METHODS ==================================
    private Response getDashboardSummaryResponse(String accessToken) {
        return RestAssured.given()
                .header( "Authorization",
                        "Bearer " + accessToken)
                .when()
                .get(DashboardConfig.DASHBOARD_URL + "/summary");
    }
}
