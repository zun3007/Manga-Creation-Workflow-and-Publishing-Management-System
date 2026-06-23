package com.testing.manga_api_test.notifications;

import com.testing.manga_api_test.config.AuthTestConfig;
import com.testing.manga_api_test.config.DatabaseConnectionConfig;
import com.testing.manga_api_test.config.NotificationsTestConfig;
import io.restassured.RestAssured;
import io.restassured.response.Response;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.SQLException;

import static org.hamcrest.Matchers.equalTo;

/**
 * Test Case Amount: 3
 * Test Case Success: 3
 * Test Case Failed: 0
 * UPDATED DATE: 23/06/2026
 */
public class ReadByIdApiTest {

    private final int NOTIFICATION_ID = 1;

    private boolean isMarkReadChanged;

    // TC-NTF-MID-001: Notifications mark by id should return success
    @Test
    void markReadNotificationsByIDShouldReturnSuccess() {
        isMarkReadChanged = false;

        // Login and verify to get access token
        String accessToken = AuthTestConfig.loginMangakaAccountAndVerifyToReturnAccessToken();

        // Generating HTTP Request
        Response response = markReadNotificationsByIdRequest(accessToken, NOTIFICATION_ID);

        response.then()
                .statusCode(200)
                .body("ok", equalTo(true));

        isMarkReadChanged = true;
    }

    // TC-NTF-MID-002: Notifications mark by id should fail when missing access token
    @Test
    void markReadNotificationsByIDShouldFailWhenMissingAccessToken() {
        // Login and verify to get access token
        String accessToken = AuthTestConfig.loginMangakaAccountAndVerifyToReturnAccessToken();

        // Generating HTTP Request
        Response response = RestAssured.given()
                .when()
                .patch(NotificationsTestConfig.NOTIFICATION_URL + "/" + NOTIFICATION_ID +"/read");

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
        Response response = markReadNotificationsByIdRequest("InvalidAccessToken", NOTIFICATION_ID);
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

    @AfterEach
    public void resetNotificationStatusToDefault() throws SQLException {
        if (!isMarkReadChanged) {
            return;
        }

        // Get connection
        Connection connection = DriverManager.getConnection(
                DatabaseConnectionConfig.URL,
                DatabaseConnectionConfig.USER,
                DatabaseConnectionConfig.PASSWORD
        );

        // Create query
        // Update notification status
        // Following the SQL-seed, we have 5 Notifications data and :
        //      Notification with id 1, 2, 3 hav isRead = 0
        //      Notification with id 4, 5 hav isRead = 1
        PreparedStatement preparedStatement = connection.prepareStatement("""
             UPDATE Notification
             SET is_read = 0
             WHERE notification_id = 1;
        """);

        preparedStatement.executeUpdate();
    }
}
