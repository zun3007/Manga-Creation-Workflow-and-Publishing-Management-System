package com.testing.manga_api_test.proposals;

import com.testing.manga_api_test.config.AuthTestConfig;
import com.testing.manga_api_test.config.DatabaseConnectionConfig;
import com.testing.manga_api_test.config.GenresTestConfig;
import com.testing.manga_api_test.config.ProposalsTestConfig;
import io.restassured.RestAssured;
import io.restassured.http.ContentType;
import io.restassured.response.Response;
import org.junit.jupiter.api.*;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.util.List;

import static org.hamcrest.Matchers.equalTo;

/**
 * Test Case Amount: 10
 * Test Case Success: 10
 * Test Case Failed: 0
 * UPDATED DATE: 23/06/2026
 */
public class UpdateProposalApiTest {

    // TC-UP-001: Update proposal should return success when updating all fields
    @Test
    void updateProposalShouldReturnSuccessWhenUpdatingAllFields() {
        String accessToken = AuthTestConfig.loginMangakaAccountAndVerifyToReturnAccessToken();

        // Use proposalId = 4 because it's status is "DRAFT"
        Long proposalId = 4L;

        Response response = updateProposal(
                proposalId,
                accessToken,
                """
                {
                    "title":"TC-UP-001 New Title",
                    "synopsis":"TC-UP-001 New Synopsis",
                    "proposedFrequency":"MONTHLY",
                    "genreIds":[1,2],
                    "sampleManuscriptUrl":"https://example.com/sample.pdf"
                }
                """
        );

        response.then().log().all();

        response.then()
                .statusCode(200)
                .body("title", equalTo("TC-UP-001 New Title"))
                .body("synopsis", equalTo("TC-UP-001 New Synopsis"))
                .body("proposedFrequency", equalTo("MONTHLY"));
    }

    // TC-UP-002: Update proposal should return success when updating title only
    @Test
    void updateProposalShouldReturnSuccessWhenUpdatingTitleOnly() {
        String accessToken =
                AuthTestConfig.loginMangakaAccountAndVerifyToReturnAccessToken();

        Long proposalId = 4L;

        Response response = updateProposal(
                proposalId,
                accessToken,
                """
                {
                    "title":"TC-UP-002 New Title"
                }
                """
        );

        response.then()
                .statusCode(200)
                .body("title", equalTo("TC-UP-002 New Title"));
    }

    // TC-UP-003: Update proposal should return success when updating synopsis only
    @Test
    void updateProposalShouldReturnSuccessWhenUpdatingSynopsisOnly() {
        String accessToken =
                AuthTestConfig.loginMangakaAccountAndVerifyToReturnAccessToken();

        Long proposalId = 4L;

        Response response = updateProposal(
                proposalId,
                accessToken,
                """
                {
                    "synopsis":"TC-UP-003 Updated Synopsis"
                }
                """
        );

        response.then()
                .statusCode(200)
                .body("synopsis", equalTo("TC-UP-003 Updated Synopsis"));
    }

    // TC-UP-004: Update proposal should return success when updating proposed frequency only
    @Test
    void updateProposalShouldReturnSuccessWhenUpdatingFrequencyOnly() {
        String accessToken =
                AuthTestConfig.loginMangakaAccountAndVerifyToReturnAccessToken();

        Long proposalId = 4L;

        Response response = updateProposal(
                proposalId,
                accessToken,
                """
                {
                    "proposedFrequency":"MONTHLY"
                }
                """
        );

        response.then()
                .statusCode(200)
                .body("proposedFrequency", equalTo("MONTHLY"));
    }

    // TC-UP-005: Update proposal should return success when updating genreIds only
    @Test
    void updateProposalShouldReturnSuccessWhenUpdatingGenreIdsOnly() {
        String accessToken =
                AuthTestConfig.loginMangakaAccountAndVerifyToReturnAccessToken();

        Long proposalId = 4L;

        Response response = updateProposal(
                proposalId,
                accessToken,
                """
                {
                    "genreIds":[1,2]
                }
                """
        );

        response.then()
                .statusCode(200);
    }

    // TC-UP-006: Update proposal should return success when updating sample manuscript URL only
    @Test
    void updateProposalShouldReturnSuccessWhenUpdatingSampleManuscriptUrlOnly() {
        String accessToken =
                AuthTestConfig.loginMangakaAccountAndVerifyToReturnAccessToken();

        Long proposalId = 4L;

        Response response = updateProposal(
                proposalId,
                accessToken,
                """
                {
                    "sampleManuscriptUrl":"https://example.com/sample.pdf"
                }
                """
        );

        response.then()
                .statusCode(200)
                .body("sampleManuscriptUrl",
                        equalTo("https://example.com/sample.pdf"));
    }

    // TC-UP-007: Update proposal should return success when request body is empty
    @Test
    void updateProposalShouldReturnSuccessWhenRequestBodyIsEmpty() {
        String accessToken =
                AuthTestConfig.loginMangakaAccountAndVerifyToReturnAccessToken();

        Long proposalId = 4L;

        Response response = updateProposal(
                proposalId,
                accessToken,
                "{}"
        );

        response.then().log().all();

        response.then()
                .statusCode(200);
    }

    // TC-UP-008: Update proposal should fail when missing access token
    @Test
    void updateProposalShouldFailWhenMissingAccessToken() {

        Long proposalId = 4L;

        Response response = RestAssured.given()
                .contentType(ContentType.JSON)
                .body("""
                {
                    "title":"Updated Title"
                }
                """)
                .when()
                .patch(ProposalsTestConfig.PROPOSALS_URL + "/" + proposalId);

        response.then().log().all();

        response.then()
                .statusCode(401)
                .body("message", equalTo("Unauthorized"))
                .body("statusCode", equalTo(401));
    }

    // TC-UP-009: Update proposal should fail when invalid access token
    @Test
    void updateProposalShouldFailWhenInvalidAccessToken() {

        Long proposalId = 1L;

        Response response = updateProposal(
                proposalId,
                "InvalidAccessToken",
                """
                {
                    "title":"Updated Title"
                }
                """
        );

        response.then().log().all();

        response.then()
                .statusCode(401)
                .body("message", equalTo("Unauthorized"))
                .body("statusCode", equalTo(401));
    }

    // TC-UP-010: Update proposal should fail when status is not DRAFT
    @Test
    void updateProposalShouldFailWhenStatusIsNotDraft() {


        String accessToken =
                AuthTestConfig.loginMangakaAccountAndVerifyToReturnAccessToken();

        Long submittedProposalId = ProposalsTestConfig.SUBMITTED_PROPOSAL_ID;

        Response response = updateProposal(
                submittedProposalId,
                accessToken,
                """
                {
                    "title":"Updated Title"
                }
                """
        );

        response.then().log().all();

        response.then()
                .statusCode(400);
    }

    // ================================== HELPER METHODS ==================================
    private Response updateProposal(
            Long proposalId,
            String accessToken,
            String body) {

        return RestAssured.given()
                .contentType(ContentType.JSON)
                .header("Authorization", "Bearer " + accessToken)
                .body(body)
                .when()
                .patch(ProposalsTestConfig.PROPOSALS_URL + "/" + proposalId);
    }

    @BeforeEach
    public void createNewProposalForDraftStatus() throws SQLException {
        // Get connection
        Connection connection = DriverManager.getConnection(
                DatabaseConnectionConfig.URL,
                DatabaseConnectionConfig.USER,
                DatabaseConnectionConfig.PASSWORD
        );

        // Create query
        // Delete proposal that created
        PreparedStatement preparedStatement = connection.prepareStatement("""
             INSERT INTO `Series_Proposal` (proposal_id, mangaka_user_id, title, synopsis, proposal_status, proposed_frequency)
                VALUES
                     (4, 1, 'Shadow Requiem',
                        'Một sát thủ mang lời nguyền bóng tối tìm cách chuộc lại quá khứ.',
                        'DRAFT',
                        'WEEKLY'
                     );
        """);

        preparedStatement.executeUpdate();
        preparedStatement.close();
        connection.close();
    }

    @AfterEach
    public void resetProposalTableToDefault() throws SQLException {
        // Get connection
        Connection connection = DriverManager.getConnection(
                DatabaseConnectionConfig.URL,
                DatabaseConnectionConfig.USER,
                DatabaseConnectionConfig.PASSWORD
        );

        // Create query
        // Delete proposal that created
        PreparedStatement preparedStatement = connection.prepareStatement("""
             DELETE FROM `Series_Proposal`
             WHERE proposal_id = 4
        """);

        preparedStatement.executeUpdate();
        preparedStatement.close();
        connection.close();
    }
}
