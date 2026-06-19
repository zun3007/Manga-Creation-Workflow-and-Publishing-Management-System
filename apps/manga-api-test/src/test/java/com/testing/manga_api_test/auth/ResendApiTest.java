package com.testing.manga_api_test.auth;

import io.restassured.RestAssured;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.Test;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.SQLException;

import static org.hamcrest.Matchers.equalTo;

public class ResendApiTest {

    @Test
    void resendOtpShouldSendNewOtpSuccess() throws SQLException {
        // Login and get Challenge Token
        String challengeToken = getChallengeTokenWhenLogin();

        // Skip 60 seconds
        makeOtpOlderThan60Seconds();

        // Testing
        RestAssured.given()
                .contentType(ContentType.JSON)
                .body("""
                {
                  "challengeToken": "%s"
                }
                """.formatted(challengeToken))
                .when()
                .post("http://localhost:3000/api/auth/2fa/resend")
                .then()
                .statusCode(201)
                .body("ok", equalTo(true))
                .body("cooldownSeconds", equalTo(60));

    }

    // Helper method: Skip 60 seconds
    private void makeOtpOlderThan60Seconds() throws SQLException {
        Connection connection = DriverManager.getConnection(
                "jdbc:mysql://localhost:3308/manga_creation_workflow_and_publishing_management_system",
                "root",
                "manga_root");

        PreparedStatement preparedStatement = connection.prepareStatement("""
            UPDATE Email_Otp
            SET created_at = DATE_SUB(NOW(), INTERVAL 61 SECOND)
            WHERE user_id = 1
              AND consumed_at IS NULL;
        """);

        preparedStatement.executeUpdate();
    }

    // Helper method: Login and get Challenge Token
    private String getChallengeTokenWhenLogin() {
        return RestAssured.given()
                .contentType(ContentType.JSON)
                .body("""
                      {
                          "email": "dungminer69@gmail.com",
                          "password": "Dung123456@"
                      }
                    """)
                .when()
                .post("http://localhost:3000/api/auth/login")
                .then()
                .statusCode(201)
                .extract()
                .path("challengeToken");
    }
}
