package com.testing.manga_api_test.notifications;

import com.testing.manga_api_test.config.AuthTestConfig;
import com.testing.manga_api_test.config.NotificationsTestConfig;
import com.testing.manga_api_test.config.UploadTestConfig;
import io.restassured.RestAssured;
import io.restassured.response.Response;
import org.junit.jupiter.api.Test;

import static org.hamcrest.Matchers.equalTo;

/**
 * Test Case Amount: 3
 * Test Case Success: 3
 * Test Case Failed: 0
 * UPDATED DATE: 23/06/2026
 */
public class NotificationsApiTest {

    // TC-NTF-001: Notifications should return success
    @Test
    void notificationsShouldReturnSuccess() {
        // Login and verify to get access token
        String accessToken = AuthTestConfig.loginMangakaAccountAndVerifyToReturnAccessToken();

        // Generating HTTP Request
        Response response = getNotificationsResponse(accessToken);
        response.then().log().all();

        // Starting to check result
        response.then()
                .statusCode(200)
                .body("size()", equalTo(5))
                .body("[0].id", equalTo(1))
                .body("[0].type", equalTo("RISK_ALERT"))
                .body("[0].title",
                        equalTo("Series \"The Tenth Panel\" đang ở mức rủi ro CAO"))
                .body("[0].content",
                        equalTo("Xếp hạng tuần này #8, điểm 55. Cân nhắc cải thiện nhịp truyện."));
    }

    // TC-NTF-002: Notifications should fail when missing access token
    @Test
    void notificationsShouldFailWhenMissingAccessToken() {
        // Login and verify to get access token
        String accessToken = AuthTestConfig.loginMangakaAccountAndVerifyToReturnAccessToken();

        // Generating HTTP Request
        Response response = RestAssured.given()
                .when()
                .get(NotificationsTestConfig.NOTIFICATION_URL);

        // Starting to check result
        response.then()
                .statusCode(401)
                .body("message", equalTo("Unauthorized"))
                .body("statusCode", equalTo(401));
    }

    // TC-NTF-003: Notifications should fail when invalid access token
    @Test
    void notificationsShouldFailWhenInvalidAccessToken() {
        // Login and verify to get access token
        String accessToken = AuthTestConfig.loginMangakaAccountAndVerifyToReturnAccessToken();

        // Generating HTTP Request
        Response response = getNotificationsResponse("InvalidAccessToken");
        response.then().log().all();

        // Starting to check result
        response.then()
                .statusCode(401)
                .body("message", equalTo("Unauthorized"))
                .body("statusCode", equalTo(401));
    }

    // ================================== HELPER METHODS ==================================
    private Response getNotificationsResponse(String accessToken) {

        return RestAssured.given()
                .header( "Authorization",
                        "Bearer " + accessToken)
                .when()
                .get(NotificationsTestConfig.NOTIFICATION_URL);

    }
}
