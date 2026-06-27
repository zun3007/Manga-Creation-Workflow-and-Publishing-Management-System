package com.testing.manga_api_test.proposals;

import com.testing.manga_api_test.config.AuthTestConfig;
import com.testing.manga_api_test.config.NotificationsTestConfig;
import com.testing.manga_api_test.config.ProposalsTestConfig;
import io.restassured.RestAssured;
import io.restassured.response.Response;
import org.junit.jupiter.api.Test;

import static org.hamcrest.Matchers.*;

/**
 * Test Case Amount: 3
 * Test Case Success: 3
 * Test Case Failed: 0
 * UPDATED DATE: 23/06/2026
 */
public class MyProposalsApiTest {

    // TC-MP-001: Get my proposals should return success
    @Test
    void getMyProposalsShouldReturnSuccess() {
        // Login and verify to get access token
        String accessToken = AuthTestConfig.loginMangakaAccountAndVerifyToReturnAccessToken();

        // Generating HTTP Request
        Response response = getMyProposalsRequest(accessToken);
        response.then().log().all();

        // Starting to check result
        response.then()
                .statusCode(200)
                .body("size()", notNullValue())

                .body("[0].id", equalTo(1))
                .body("[0].mangakaUserId", equalTo(1))
                .body("[0].title", equalTo("Crimson Inkfall"))
                .body("[0].synopsis",
                        equalTo("Một kiếm khách trẻ truy tìm thanh kiếm mực huyền thoại."))
                .body("[0].status", equalTo("APPROVED"))
                .body("[0].proposedFrequency", equalTo("WEEKLY"))
                .body("[0].genres", equalTo("Action,Shonen"))
                .body("[0].sampleManuscriptUrl", nullValue());
    }

    // TC-MP-002: Get my proposals should fail when missing access token
    @Test
    void getMyProposalsShouldFailWhenMissingAccessToken() {
        // Login and verify to get access token
        String accessToken = AuthTestConfig.loginMangakaAccountAndVerifyToReturnAccessToken();

        // Generating HTTP Request
        Response response = RestAssured.given()
                .when()
                .get(ProposalsTestConfig.PROPOSALS_URL + "/mine");

        // Starting to check result
        response.then()
                .statusCode(401)
                .body("message", equalTo("Unauthorized"))
                .body("statusCode", equalTo(401));
    }

    // TC-MP-003: Get my proposals should fail when invalid access token
    @Test
    void getMyProposalsShouldFailWhenInvalidAccessToken() {
        // Login and verify to get access token
        String accessToken = AuthTestConfig.loginMangakaAccountAndVerifyToReturnAccessToken();

        // Generating HTTP Request
        Response response = getMyProposalsRequest("InvalidAccessToken");

        // Starting to check result
        response.then()
                .statusCode(401)
                .body("message", equalTo("Unauthorized"))
                .body("statusCode", equalTo(401));
    }

    // ================================== HELPER METHODS ==================================
    private Response getMyProposalsRequest(String accessToken) {

        return RestAssured.given()
                .header( "Authorization",
                        "Bearer " + accessToken)
                .when()
                .get(ProposalsTestConfig.PROPOSALS_URL + "/mine");

    }
}
