package com.testing.manga_api_test.dashboard;

import com.testing.manga_api_test.config.AuthTestConfig;
import com.testing.manga_api_test.config.DashboardConfig;
import io.restassured.RestAssured;
import io.restassured.response.Response;
import org.junit.jupiter.api.Test;

import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.nullValue;

/**
 * Test Case Amount: 3
 * Test Case Success: 3
 * Test Case Failed: 0
 * UPDATED DATE: 23/06/2026
 */
public class SubmissionsResponseApiTest {
    // TC-DB-SMS-001: Dashboard submissions should return success
    @Test
    void dashboardSubmissionsShouldReturnSuccess() {
        // Login and verify to get access token
        String accessToken = AuthTestConfig.loginMangakaAccountAndVerifyToReturnAccessToken();

        // Generating HTTP Request
        Response response = getSubmissionsSummaryResponse(accessToken);

        // Starting to check result
        response.then()
                .statusCode(200)
                .body("size()", equalTo(3))
                .body("[0].id", equalTo(2))
                .body("[0].status", equalTo("UNDER_REVIEW"))
                .body("[0].note", equalTo("nhân vật v1"))
                .body("[0].task", equalTo("Tô nhân vật chính"))
                .body("[0].assistant", equalTo("Kenji Sato"))
                .body("[0].assistantAvatar", nullValue());
    }

    // TC-DB-SMS-002: Dashboard submissions should fail when missing access token
    @Test
    void dashboardSubmissionsShouldFailWhenMissingAccessToken() {
        // Login and verify to get access token
        String accessToken = AuthTestConfig.loginMangakaAccountAndVerifyToReturnAccessToken();

        // Generating HTTP Request
        Response response = RestAssured.given()
                .when()
                .get(DashboardConfig.DASHBOARD_URL + "/submissions");

        // Starting to check result
        response.then()
                .statusCode(401)
                .body("message", equalTo("Unauthorized"))
                .body("statusCode", equalTo(401));
    }

    // TC-DB-SMS-003: Dashboard submissions should fail when access token is invalid
    @Test
    void dashboardSubmissionsShouldFailWhenInvalidAccessToken() {
        // Login and verify to get access token
        String accessToken = AuthTestConfig.loginMangakaAccountAndVerifyToReturnAccessToken();

        // Generating HTTP Request
        Response response = getSubmissionsSummaryResponse("InvalidAccessToken");
        response.then().log().all();

        // Starting to check result
        response.then()
                .statusCode(401)
                .body("message", equalTo("Unauthorized"))
                .body("statusCode", equalTo(401));
    }

    // ================================== HELPER METHODS ==================================
    private Response getSubmissionsSummaryResponse(String accessToken) {
        return RestAssured.given()
                .header( "Authorization",
                        "Bearer " + accessToken)
                .when()
                .get(DashboardConfig.DASHBOARD_URL + "/submissions");
    }
}
