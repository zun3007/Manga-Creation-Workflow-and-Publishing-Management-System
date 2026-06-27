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
public class TasksResponseApiTest {

    // TC-DB-TAS-001: Dashboard tasks should return success
    @Test
    void dashboardTasksShouldReturnSuccess() {
        // Login and verify to get access token
        String accessToken = AuthTestConfig.loginMangakaAccountAndVerifyToReturnAccessToken();

        // Generating HTTP Request
        Response response = getDashboardTasksResponse(accessToken);

        // Starting to check result
        response.then()
                .statusCode(200)
                .body("size()", equalTo(5))

                .body("[0].id", equalTo(1))
                .body("[0].description", equalTo("Vẽ nền dốc núi tuyết"))
                .body("[0].status", equalTo("APPROVED"))
                .body("[0].deadline", equalTo("2026-05-29T11:00:00.000Z"))
                .body("[0].payment", equalTo("20.00"))
                .body("[0].assignee", equalTo("Mai Nguyễn"))
                .body("[0].assigneeAvatar", nullValue())
                .body("[0].chapter", equalTo("The Inkfall"))
                .body("[0].series", equalTo("Crimson Inkfall"))
                .body("[0].page", equalTo(3));
    }

    // TC-DB-TAS-002: Dashboard tasks should fail when missing access token
    @Test
    void dashboardTasksShouldFailWhenMissingAccessToken() {
        // Login and verify to get access token
        String accessToken = AuthTestConfig.loginMangakaAccountAndVerifyToReturnAccessToken();

        // Generating HTTP Request
        Response response = RestAssured.given()
                .when()
                .get(DashboardConfig.DASHBOARD_URL + "/tasks");

        // Starting to check result
        response.then()
                .statusCode(401)
                .body("message", equalTo("Unauthorized"))
                .body("statusCode", equalTo(401));
    }

    // TC-DB-TAS-003: Dashboard tasks should fail when access token is invalid
    @Test
    void dashboardSummaryShouldFailWhenInvalidAccessToken() {
        // Login and verify to get access token
        String accessToken = AuthTestConfig.loginMangakaAccountAndVerifyToReturnAccessToken();

        // Generating HTTP Request
        Response response = getDashboardTasksResponse("InvalidAccessToken");
        response.then().log().all();

        // Starting to check result
        response.then()
                .statusCode(401)
                .body("message", equalTo("Unauthorized"))
                .body("statusCode", equalTo(401));
    }

    // ================================== HELPER METHODS ==================================
    private Response getDashboardTasksResponse(String accessToken) {
        return RestAssured.given()
                .header( "Authorization",
                        "Bearer " + accessToken)
                .when()
                .get(DashboardConfig.DASHBOARD_URL + "/tasks");
    }
}
