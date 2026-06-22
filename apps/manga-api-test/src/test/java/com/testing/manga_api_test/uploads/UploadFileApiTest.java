package com.testing.manga_api_test.uploads;

import com.testing.manga_api_test.config.UploadTestConfig;
import com.testing.manga_api_test.config.UsersTestConfig;
import io.restassured.RestAssured;
import io.restassured.response.Response;
import org.junit.jupiter.api.Test;

import java.io.File;

import static org.hamcrest.Matchers.*;

public class UploadFileApiTest {

    private final String filePath = "src/test/resources/files/test-upload-file.jpg";
    private final String originalName = "test-upload-file.jpg";

    // TC-UPF-001: Upload file should return success
    @Test
    void uploadFileShouldReturnSuccess() {
        // Login and verify to get access token
        String accessToken = UsersTestConfig.loginAdminAccountAndVerifyToReturnAccessToken();

        // Generating HTTP Request
        Response response = uploadsFileRequest(accessToken, filePath);
        response.then().log().all();

        // Starting to check result
        response.then()
                .statusCode(201)
                .body("url", startsWith("/uploads/"))
                .body("originalName", equalTo(originalName));
    }

    // TC-UPF-002: Upload file should fail when no have file to send
    @Test
    void uploadFileShouldFailWhenNoHaveFileToSend() {
        // Login and verify to get access token
        String accessToken = UsersTestConfig.loginAdminAccountAndVerifyToReturnAccessToken();

        // Generating HTTP Request
        Response response = RestAssured.given()
                .header( "Authorization",
                        "Bearer " + accessToken)
                .when()
                .post(UploadTestConfig.UPLOAD_URL);

        // Starting to check result
        response.then()
                .statusCode(400)
                .body("message", equalTo("Thiếu file để tải lên."))
                .body("error", equalTo("Bad Request"))
                .body("statusCode", equalTo(400));
    }

    // TC-UPF-003: Upload file should fail when missing access token
    @Test
    void uploadFileShouldFailWhenMissingAccessToken() {
        // Login and verify to get access token
        String accessToken = UsersTestConfig.loginAdminAccountAndVerifyToReturnAccessToken();

        // Generating HTTP Request
        File file = new File(filePath);
        Response response = RestAssured.given()
                .multiPart("file", file)
                .when()
                .post(UploadTestConfig.UPLOAD_URL);
        response.then().log().all();

        // Starting to check result
        response.then()
                .statusCode(401)
                .body("message", equalTo("Unauthorized"))
                .body("statusCode", equalTo(401));
    }

    // TC-UPF-004: Upload file should fail when invalid access token
    @Test
    void uploadFileShouldInvalidAccessToken() {
        // Login and verify to get access token
        String accessToken = UsersTestConfig.loginAdminAccountAndVerifyToReturnAccessToken();

        // Generating HTTP Request
        Response response = uploadsFileRequest("InvalidAccessToken", filePath);
        response.then().log().all();

        // Starting to check result
        response.then()
                .statusCode(401)
                .body("message", equalTo("Unauthorized"))
                .body("statusCode", equalTo(401));
    }

    // ================================== HELPER METHODS ==================================
    private Response uploadsFileRequest(String accessToken, String path) {
        File file = new File(path);

        return RestAssured.given()
                .header( "Authorization",
                        "Bearer " + accessToken)
                .multiPart("file", file)
                .when()
                .post(UploadTestConfig.UPLOAD_URL);

    }
}
