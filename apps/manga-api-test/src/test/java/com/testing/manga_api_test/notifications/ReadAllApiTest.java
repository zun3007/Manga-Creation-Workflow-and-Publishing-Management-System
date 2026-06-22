package com.testing.manga_api_test.notifications;

import com.testing.manga_api_test.config.AuthTestConfig;
import com.testing.manga_api_test.config.DashboardConfig;
import com.testing.manga_api_test.config.NotificationsTestConfig;
import io.restassured.RestAssured;
import io.restassured.response.Response;
import org.junit.jupiter.api.Test;

import static org.hamcrest.Matchers.equalTo;

public class ReadAllApiTest {

    // TC-NTF-MA-001: Notifications mark all should return success
    @Test
    void markAllNotificationsAsReadShouldReturnSuccess() {
        // Login and verify to get access token
        String accessToken = AuthTestConfig.loginMangakaAccountAndVerifyToReturnAccessToken();

        // Generating HTTP Request
        Response response = markReadAllNotificationsRequest(accessToken);

        response.then()
                .statusCode(200)
                .body("ok", equalTo(true));
    }

    // TC-NTF-MA-002: Notifications mark all should fail when missing access token
    @Test
    void markAllNotificationsAsReadShouldFailWhenMissingAccessToken() {
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

    // TC-NTF-MA-003: Notifications mark all should fail when invalid access token
    @Test
    void markAllNotificationsShouldFailWhenInvalidAccessToken() {
        // Login and verify to get access token
        String accessToken = AuthTestConfig.loginMangakaAccountAndVerifyToReturnAccessToken();

        // Generating HTTP Request
        Response response = markReadAllNotificationsRequest("InvalidAccessToken");
        response.then().log().all();

        // Starting to check result
        response.then()
                .statusCode(401)
                .body("message", equalTo("Unauthorized"))
                .body("statusCode", equalTo(401));
    }

    // ================================== HELPER METHODS ==================================
    private Response markReadAllNotificationsRequest(String accessToken) {

        return RestAssured.given()
                .header( "Authorization",
                        "Bearer " + accessToken)
                .when()
                .patch(NotificationsTestConfig.NOTIFICATION_URL + "/read-all");

    }
}
