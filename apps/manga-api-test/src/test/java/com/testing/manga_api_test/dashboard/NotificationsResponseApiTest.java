package com.testing.manga_api_test.dashboard;

import com.testing.manga_api_test.config.AuthTestConfig;
import com.testing.manga_api_test.config.DashboardConfig;
import io.restassured.RestAssured;
import io.restassured.response.Response;
import org.junit.jupiter.api.Test;

import static org.hamcrest.Matchers.equalTo;

public class NotificationsResponseApiTest {
    // TC-DB-NOTI-001: Dashboard notifications should return success
    @Test
    void dashboardNotificationsShouldReturnSuccess() {
        // Login and verify to get access token
        String accessToken = AuthTestConfig.loginMangakaAccountAndVerifyToReturnAccessToken();

        // Generating HTTP Request
        Response response = getDashboardNotificationsResponse(accessToken);

        // Starting to check result
        response.then()
                .statusCode(200)
                .body("size()", equalTo(5))
                .body("[0].id", equalTo(1))
                .body("[0].type", equalTo("RISK_ALERT"))
                .body("[0].title", equalTo("Series \"The Tenth Panel\" đang ở mức rủi ro CAO"))
                .body("[0].content", equalTo("Xếp hạng tuần này #8, điểm 55. Cân nhắc cải thiện nhịp truyện."))
                .body("[0].isRead", equalTo(0));
    }

    // TC-DB-NOTI-002: Dashboard notifications should fail when missing access token
    @Test
    void dashboardNotificationsShouldFailWhenMissingAccessToken() {
        // Login and verify to get access token
        String accessToken = AuthTestConfig.loginMangakaAccountAndVerifyToReturnAccessToken();

        // Generating HTTP Request
        Response response = RestAssured.given()
                .when()
                .get(DashboardConfig.DASHBOARD_URL + "/notifications");

        // Starting to check result
        response.then()
                .statusCode(401)
                .body("message", equalTo("Unauthorized"))
                .body("statusCode", equalTo(401));
    }

    // TC-DB-NOTI-003: Dashboard notifications should fail when access token is invalid
    @Test
    void dashboardNotificationsShouldFailWhenInvalidAccessToken() {
        // Login and verify to get access token
        String accessToken = AuthTestConfig.loginMangakaAccountAndVerifyToReturnAccessToken();

        // Generating HTTP Request
        Response response = getDashboardNotificationsResponse("InvalidAccessToken");
        response.then().log().all();

        // Starting to check result
        response.then()
                .statusCode(401)
                .body("message", equalTo("Unauthorized"))
                .body("statusCode", equalTo(401));
    }

    // ================================== HELPER METHODS ==================================
    private Response getDashboardNotificationsResponse(String accessToken) {
        return RestAssured.given()
                .header( "Authorization",
                        "Bearer " + accessToken)
                .when()
                .get(DashboardConfig.DASHBOARD_URL + "/notifications");
    }
}
