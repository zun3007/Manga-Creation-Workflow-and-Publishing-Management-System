package com.testing.manga_api_test.notifications;

import com.testing.manga_api_test.config.AuthTestConfig;
import com.testing.manga_api_test.config.DashboardConfig;
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
public class ReadAllApiTest {

    // Following the SQL-seed, we have 5 Notifications data and :
    //      Notification with id 1, 2, 3 hav isRead = 0
    //      Notification with id 4, 5 hav isRead = 1

    private boolean isMarkReadChanged;

    // TC-NTF-MA-001: Notifications mark all should return success
    @Test
    void markAllNotificationsAsReadShouldReturnSuccess() {
        isMarkReadChanged = false;

        // Login and verify to get access token
        String accessToken = AuthTestConfig.loginMangakaAccountAndVerifyToReturnAccessToken();

        // Generating HTTP Request
        Response response = markReadAllNotificationsRequest(accessToken);

        response.then()
                .statusCode(200)
                .body("ok", equalTo(true));

        isMarkReadChanged = true;
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
             WHERE notification_id IN (1, 2, 3);
        """);

        preparedStatement.executeUpdate();
    }
}
