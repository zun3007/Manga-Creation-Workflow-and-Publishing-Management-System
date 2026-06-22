package com.testing.manga_api_test.notifications;

import com.testing.manga_api_test.config.AuthTestConfig;
import com.testing.manga_api_test.config.NotificationsTestConfig;
import io.restassured.RestAssured;
import io.restassured.response.Response;
import org.junit.jupiter.api.Test;

import static org.hamcrest.Matchers.equalTo;

public class ReadByIdApiTest {
    // TC-NTF-MID-001: Notifications mark by id should return success
    @Test
    void markReadNotificationsByIDShouldReturnSuccess() {
        // Login and verify to get access token
        String accessToken = AuthTestConfig.loginMangakaAccountAndVerifyToReturnAccessToken();

        // Generating HTTP Request
        Response response = markReadNotificationsByIdRequest(accessToken, 1);

        response.then()
                .statusCode(200)
                .body("ok", equalTo(true));
    }

    // TC-NTF-MID-002: Notifications mark by id should fail when missing access token
    @Test
    void markReadNotificationsByIDShouldFailWhenMissingAccessToken() {
        // Login and verify to get access token
        String accessToken = AuthTestConfig.loginMangakaAccountAndVerifyToReturnAccessToken();

        // Generating HTTP Request
        Response response = RestAssured.given()
                .when()
                .patch(NotificationsTestConfig.NOTIFICATION_URL + "/" + 1 +"/read");

        response.then()
                .statusCode(401)
                .body("message", equalTo("Unauthorized"))
                .body("statusCode", equalTo(401));
    }

    // TC-NTF-MID-003: Notifications mark by id should fail when invalid access token
    @Test
    void markReadNotificationsByIDShouldFailWhenInvalidAccessToken() {
        // Login and verify to get access token
        String accessToken = AuthTestConfig.loginMangakaAccountAndVerifyToReturnAccessToken();

        // Generating HTTP Request
        Response response = markReadNotificationsByIdRequest("InvalidAccessToken", 1);
        response.then().log().all();

        // Starting to check result
        response.then()
                .statusCode(401)
                .body("message", equalTo("Unauthorized"))
                .body("statusCode", equalTo(401));
    }

    // ================================== HELPER METHODS ==================================
    private Response markReadNotificationsByIdRequest(String accessToken, int notificationId) {

        return RestAssured.given()
                .header( "Authorization",
                        "Bearer " + accessToken)
                .when()
                .patch(NotificationsTestConfig.NOTIFICATION_URL + "/" + notificationId +"/read");

    }
}
