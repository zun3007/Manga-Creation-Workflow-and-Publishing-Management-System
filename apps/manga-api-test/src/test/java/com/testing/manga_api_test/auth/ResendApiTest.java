package com.testing.manga_api_test.auth;

import com.testing.manga_api_test.config.AuthTestConfig;
import com.testing.manga_api_test.config.DatabaseConnectionConfig;
import io.restassured.RestAssured;
import io.restassured.http.ContentType;
import io.restassured.response.Response;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.SQLException;

import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.notNullValue;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Test Case Amount: 3
 * Test Case Success: 3
 * Test Case Failed: 0
 * UPDATED DATE: 19/06/2026
 */
public class ResendApiTest {

    // TC-RESEND-001: Resend Otp Success
    @Test
    void resendOtpShouldSendNewOtpSuccess() throws SQLException {
        // Login and get Challenge Token
        String challengeToken = AuthTestConfig.loginAndGetChallengeToken();

        // Skip 60 seconds
        makeOtpOlderThan60Seconds();

        // Generating HTTP Request
        Response response = resendOtp(challengeToken);

        // Starting to check result
        response.then()
                .body("ok", equalTo(true))
                .body("cooldownSeconds", equalTo(60));
    }

    // TC-RESEND-002: Resend Otp Fail When Challenge Token Invalid
    @Test
    void resendOtpShouldFailWhenChallengeTokenInvalid() throws SQLException {
        // Login
        AuthTestConfig.loginAndGetChallengeToken();

        // Skip 60 seconds
        makeOtpOlderThan60Seconds();

        // Generating HTTP Request
        Response response = resendOtp("InvalidChallengeToken");

        // Starting to check result
        response.then()
                .statusCode(401)
                .body("message", equalTo("Phiên xác thực đã hết hạn. Vui lòng đăng nhập lại."))
                .body("error", equalTo("Unauthorized"))
                .body("statusCode", equalTo(401));
    }

    // TC-RESEND-003: Resend Otp Fail When Has Many Request
    @Test
    void resendOtpShouldFailWhenHasManyRequest() {
        // Login and get Challenge Token
        String challengeToken = AuthTestConfig.loginAndGetChallengeToken();

        // Generating HTTP Request
        Response response = resendOtp(challengeToken);

        // Starting to check result
        response.then()
                .statusCode(429)
                .body("message", notNullValue())
                .body("error", equalTo("Too Many Requests"))
                .body("statusCode", equalTo(429));
    }

    // ================================== HELPER METHODS ==================================

    /**
     * @BeforeEach: Run this method in the first time for each test
     * @BeforeAll: Run once time before class test
     * @AfterEach: Run this method in the last time for each test
     * @AfterAll: Run once time after class test
     *
     */
    // Helper Method: Clean Email_Otp before run each tests
    @BeforeEach
    void cleanOtpTable() throws SQLException{
        // Get connection
        Connection connection = DriverManager.getConnection(
                DatabaseConnectionConfig.URL,
                DatabaseConnectionConfig.USER,
                DatabaseConnectionConfig.PASSWORD
        );

        // Create query
        // TRUNCATE is clear all table's data
        // Reset AUTO_INCREMENT
        PreparedStatement preparedStatement = connection.prepareStatement("""
             TRUNCATE TABLE Email_Otp
        """);

        preparedStatement.executeUpdate();
    }

    // Helper method: Skip 60 seconds
    public void makeOtpOlderThan60Seconds() throws SQLException {
        // Get connection
        Connection connection = DriverManager.getConnection(
                DatabaseConnectionConfig.URL,
                DatabaseConnectionConfig.USER,
                DatabaseConnectionConfig.PASSWORD
        );

        // Create query
        PreparedStatement preparedStatement = connection.prepareStatement("""
            UPDATE Email_Otp
            SET created_at = DATE_SUB(NOW(), INTERVAL 61 SECOND)
            WHERE user_id = ?
              AND consumed_at IS NULL;
        """);

        // Execute query
        preparedStatement.setLong(1, AuthTestConfig.TEST_USER_ID);
        preparedStatement.executeUpdate();
    }

    // Helper method: Resend
    private Response resendOtp(String challengeToken) {
        return RestAssured.given()
                .contentType(ContentType.JSON)
                .body("""
                    {
                      "challengeToken": "%s"
                    }
                    """.formatted(challengeToken))
                .when()
                .post(AuthTestConfig.AUTH_URL + "/2fa/resend");
    }

}
