package com.testing.manga_api_test.proposals;

import com.testing.manga_api_test.config.AuthTestConfig;
import com.testing.manga_api_test.config.DatabaseConnectionConfig;
import com.testing.manga_api_test.config.ProposalsTestConfig;
import io.restassured.RestAssured;
import io.restassured.http.ContentType;
import io.restassured.response.Response;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.util.List;

import static org.hamcrest.Matchers.*;

/**
 * TODO Fix reset method
 */
public class CreateProposalApiTest {
    private final String NEW_PROPOSAL_TITLE = "Solo Leveling";
    private final String NEW_PROPOSAL_SYNOPSIS = "A hunter becomes stronger";
    private final String NEW_PROPOSAL_FREQUENCY = "WEEKLY";
    private final List<Long> NEW_PROPOSAL_GENRE_ID = List.of(1L, 2L, 3L);
    private final List<Long> INVALID_GENRE_IDS = List.of(99999L);
    private boolean isCreatedNewProposal;

    // TC-CP-001: Create proposal should return success
    @Test
    void createProposalShouldReturnSuccess() throws SQLException {
        isCreatedNewProposal = false;

        // Login and verify to get access token
        String accessToken = AuthTestConfig.loginMangakaAccountAndVerifyToReturnAccessToken();

        // Generating HTTP Request
        Response response = createProposal(
                accessToken,
                NEW_PROPOSAL_TITLE,
                NEW_PROPOSAL_FREQUENCY,
                NEW_PROPOSAL_GENRE_ID,
                NEW_PROPOSAL_SYNOPSIS
                );
        response.then().log().all();

        // Starting to check result
        response.then()
                .statusCode(201)
                .body("id", notNullValue())
                .body("mangakaUserId", equalTo(AuthTestConfig.MANGAKA_ID))
                .body("title", equalTo(NEW_PROPOSAL_TITLE))
                .body("synopsis", equalTo(NEW_PROPOSAL_SYNOPSIS))
                .body("status", equalTo("DRAFT"))
                .body("proposedFrequency", equalTo(NEW_PROPOSAL_FREQUENCY))
                .body("sampleManuscriptUrl", nullValue())
                .body("genres", equalTo("Action,Fantasy,Romance"));

        // Reset to default
        isCreatedNewProposal = true;
        Long proposalId = response.jsonPath().getLong("id");
        resetProposalTableToDefault(proposalId);
    }

    // TC-CP-002: Create proposal should fail when missing access token
    @Test
    void createProposalShouldFailWhenMissingAccessToken() {
        // Login and verify to get access token
        String accessToken = AuthTestConfig.loginMangakaAccountAndVerifyToReturnAccessToken();

        // Generating HTTP Request
        Response response = RestAssured.given()
                .contentType(ContentType.JSON)
                .body("""
                    {
                        "title": "%s",
                        "proposedFrequency": "%s",
                        "genreIds": %s,
                        "synopsis": "%s"
                    }
                    """.formatted(
                            NEW_PROPOSAL_TITLE,
                            NEW_PROPOSAL_FREQUENCY,
                            NEW_PROPOSAL_GENRE_ID,
                            NEW_PROPOSAL_SYNOPSIS
                        )
                )
                .when()
                .post(ProposalsTestConfig.PROPOSALS_URL);

        // Starting to check result
        response.then()
                .statusCode(401)
                .body("message", equalTo("Unauthorized"))
                .body("statusCode", equalTo(401));
    }

    // TC-CP-003: Create proposal should fail when invalid access token
    @Test
    void createProposalShouldFailWhenInvalidAccessToken() {
        // Login and verify to get access token
        String accessToken = AuthTestConfig.loginMangakaAccountAndVerifyToReturnAccessToken();

        // Generating HTTP Request
        Response response = createProposal("InvalidAccessToken",
                NEW_PROPOSAL_TITLE,
                NEW_PROPOSAL_FREQUENCY,
                NEW_PROPOSAL_GENRE_ID,
                NEW_PROPOSAL_SYNOPSIS
        );

        // Starting to check result
        response.then()
                .statusCode(401)
                .body("message", equalTo("Unauthorized"))
                .body("statusCode", equalTo(401));
    }

    // TC-CP-004: Create proposal should fail when genreId not exist
    @Test
    void createProposalShouldFailWhenGenreIdNotExist() {
        // Login and verify to get access token
        String accessToken = AuthTestConfig.loginMangakaAccountAndVerifyToReturnAccessToken();

        // Generating HTTP Request
        Response response = createProposal(
                accessToken,
                NEW_PROPOSAL_TITLE,
                NEW_PROPOSAL_FREQUENCY,
                INVALID_GENRE_IDS,
                NEW_PROPOSAL_SYNOPSIS
        );

        response.then().log().all();

        // Starting to check result
        response.then()
                .statusCode(500)
                .body("message", equalTo("Lỗi máy chủ. Vui lòng thử lại."))
                .body("statusCode", equalTo(500))
                .body("error", equalTo("Internal Server Error"));

    }

    // TC-CP-005: Create proposal should fail when title is missing
    @Test
    void createProposalShouldFailWhenTitleIsMissing() {
        String accessToken =
                AuthTestConfig.loginMangakaAccountAndVerifyToReturnAccessToken();

        Response response = RestAssured.given()
                .contentType(ContentType.JSON)
                .header("Authorization", "Bearer " + accessToken)
                .body("""
                {
                    "proposedFrequency": "WEEKLY",
                    "genreIds": [1,2,3],
                    "synopsis": "A hunter becomes stronger"
                }
                """)
                .when()
                .post(ProposalsTestConfig.PROPOSALS_URL);

        response.then().log().all();

        response.then()
                .statusCode(400)
                .body("message", hasItems(
                        "title must be shorter than or equal to 200 characters",
                        "title should not be empty",
                        "title must be a string"
                ))
                .body("error", equalTo("Bad Request"))
                .body("statusCode", equalTo(400));
    }

    // TC-CP-006: Create proposal should fail when title is empty
    @Test
    void createProposalShouldFailWhenTitleIsEmpty() {
        // Login and verify to get access token
        String accessToken =
                AuthTestConfig.loginMangakaAccountAndVerifyToReturnAccessToken();

        // Generating HTTP Request
        Response response = createProposal(
                accessToken,
                "",
                NEW_PROPOSAL_FREQUENCY,
                NEW_PROPOSAL_GENRE_ID,
                NEW_PROPOSAL_SYNOPSIS
        );

        response.then().log().all();

        // Starting to check result
        response.then()
                .statusCode(400)
                .body("message", hasItem("title should not be empty"))
                .body("error", equalTo("Bad Request"))
                .body("statusCode", equalTo(400));
    }

    // TC-CP-007: Create proposal should fail when title exceeds 200 characters
    @Test
    void createProposalShouldFailWhenTitleExceeds200Characters() {
        // Login and verify to get access token
        String accessToken =
                AuthTestConfig.loginMangakaAccountAndVerifyToReturnAccessToken();

        String longTitle = "A".repeat(201);

        // Generating HTTP Request
        Response response = createProposal(
                accessToken,
                longTitle,
                NEW_PROPOSAL_FREQUENCY,
                NEW_PROPOSAL_GENRE_ID,
                NEW_PROPOSAL_SYNOPSIS
        );

        response.then().log().all();

        // Starting to check result
        response.then()
                .statusCode(400)
                .body("message",
                        hasItem("title must be shorter than or equal to 200 characters"))
                .body("error", equalTo("Bad Request"))
                .body("statusCode", equalTo(400));
    }

    // TC-CP-008: Create proposal should fail when title is not a string
    @Test
    void createProposalShouldFailWhenTitleIsNotAString() {
        // Login and verify to get access token
        String accessToken =
                AuthTestConfig.loginMangakaAccountAndVerifyToReturnAccessToken();

        // Generating HTTP Request
        Response response = RestAssured.given()
                .contentType(ContentType.JSON)
                .header("Authorization", "Bearer " + accessToken)
                .body("""
                {
                    "title": 12345,
                    "proposedFrequency": "WEEKLY",
                    "genreIds": [1,2,3],
                    "synopsis": "A hunter becomes stronger"
                }
                """)
                .when()
                .post(ProposalsTestConfig.PROPOSALS_URL);

        response.then().log().all();

        // Starting to check result
        response.then()
                .statusCode(400)
                .body("message",
                        hasItem("title must be a string"))
                .body("error", equalTo("Bad Request"))
                .body("statusCode", equalTo(400));
    }

    // TC-CP-009: Create proposal should fail when synopsis exceeds 5000 characters
    @Test
    void createProposalShouldFailWhenSynopsisExceeds5000Characters() {
        // Login and verify to get access token
        String accessToken =
                AuthTestConfig.loginMangakaAccountAndVerifyToReturnAccessToken();

        String longSynopsis = "A".repeat(5001);

        // Generating HTTP Request
        Response response = createProposal(
                accessToken,
                NEW_PROPOSAL_TITLE,
                NEW_PROPOSAL_FREQUENCY,
                NEW_PROPOSAL_GENRE_ID,
                longSynopsis
        );

        response.then().log().all();

        // Starting to check result
        response.then()
                .statusCode(400)
                .body("message",
                        hasItem("synopsis must be shorter than or equal to 5000 characters"))
                .body("error", equalTo("Bad Request"))
                .body("statusCode", equalTo(400));
    }

    // TC-CP-010: Create proposal should fail when synopsis is not a string
    @Test
    void createProposalShouldFailWhenSynopsisIsNotAString() {
        // Login and verify to get access token
        String accessToken =
                AuthTestConfig.loginMangakaAccountAndVerifyToReturnAccessToken();

        // Generating HTTP Request
        Response response = RestAssured.given()
                .contentType(ContentType.JSON)
                .header("Authorization", "Bearer " + accessToken)
                .body("""
                {
                    "title": "Solo Leveling",
                    "proposedFrequency": "WEEKLY",
                    "genreIds": [1,2,3],
                    "synopsis": 12345
                }
                """)
                .when()
                .post(ProposalsTestConfig.PROPOSALS_URL);

        response.then().log().all();

        // Starting to check result
        response.then()
                .statusCode(400)
                .body("message",
                        hasItem("synopsis must be a string"))
                .body("error", equalTo("Bad Request"))
                .body("statusCode", equalTo(400));
    }

    // TC-CP-011: Create proposal should fail when proposed frequency is missing
    @Test
    void createProposalShouldFailWhenProposedFrequencyIsMissing() {
        // Login and verify to get access token
        String accessToken =
                AuthTestConfig.loginMangakaAccountAndVerifyToReturnAccessToken();

        // Generating HTTP Request
        Response response = RestAssured.given()
                .contentType(ContentType.JSON)
                .header("Authorization", "Bearer " + accessToken)
                .body("""
                {
                    "title": "Solo Leveling",
                    "genreIds": [1,2,3],
                    "synopsis": "A hunter becomes stronger"
                }
                """)
                .when()
                .post(ProposalsTestConfig.PROPOSALS_URL);

        response.then().log().all();

        // Starting to check result
        response.then()
                .statusCode(400)
                .body("message[0]",
                        containsString("proposedFrequency must be one of the following values"))
                .body("error", equalTo("Bad Request"))
                .body("statusCode", equalTo(400));
    }

    // TC-CP-012: Create proposal should fail when proposed frequency is invalid
    @Test
    void createProposalShouldFailWhenProposedFrequencyIsInvalid() {
        // Login and verify to get access token
        String accessToken =
                AuthTestConfig.loginMangakaAccountAndVerifyToReturnAccessToken();

        Response response = createProposal(
                accessToken,
                NEW_PROPOSAL_TITLE,
                "INVALID_FREQUENCY",
                NEW_PROPOSAL_GENRE_ID,
                NEW_PROPOSAL_SYNOPSIS
        );

        response.then().log().all();

        response.then()
                .statusCode(400)
                .body("message[0]",
                        containsString("proposedFrequency must be one of the following values"))
                .body("error", equalTo("Bad Request"))
                .body("statusCode", equalTo(400));
    }

    // TC-CP-013: Create proposal should fail when proposed frequency is not a valid value
    @Test
    void createProposalShouldFailWhenProposedFrequencyIsNotAValidValue() {
        // Login and verify to get access token
        String accessToken =
                AuthTestConfig.loginMangakaAccountAndVerifyToReturnAccessToken();

        // Generating HTTP Request
        Response response = RestAssured.given()
                .contentType(ContentType.JSON)
                .header("Authorization", "Bearer " + accessToken)
                .body("""
                {
                    "title": "Solo Leveling",
                    "proposedFrequency": 123,
                    "genreIds": [1,2,3],
                    "synopsis": "A hunter becomes stronger"
                }
                """)
                .when()
                .post(ProposalsTestConfig.PROPOSALS_URL);

        response.then().log().all();

        // Starting to check result
        response.then()
                .statusCode(400)
                .body("message[0]",
                        containsString("proposedFrequency must be one of the following values"))
                .body("error", equalTo("Bad Request"))
                .body("statusCode", equalTo(400));
    }

    // TC-CP-014: Create proposal should fail when genreIds is missing
    @Test
    void createProposalShouldFailWhenGenreIdsIsMissing() {
        String accessToken =
                AuthTestConfig.loginMangakaAccountAndVerifyToReturnAccessToken();

        Response response = RestAssured.given()
                .contentType(ContentType.JSON)
                .header("Authorization", "Bearer " + accessToken)
                .body("""
            {
                "title": "Solo Leveling",
                "proposedFrequency": "WEEKLY",
                "synopsis": "A hunter becomes stronger"
            }
            """)
                .when()
                .post(ProposalsTestConfig.PROPOSALS_URL);

        response.then().log().all();

        response.then()
                .statusCode(400)
                .body("message", hasItem("genreIds must be an array"))
                .body("error", equalTo("Bad Request"))
                .body("statusCode", equalTo(400));
    }

//- TC-CP-015: Create proposal should fail when genreIds is empty
//- TC-CP-016: Create proposal should fail when genreIds is not an array
//- TC-CP-017: Create proposal should fail when genreIds contains null values
//- TC-CP-018: Create proposal should fail when genreIds contains string values
//- TC-CP-019: Create proposal should fail when genreIds contains decimal values
//
//- TC-CP-020: Create proposal should fail when sample manuscript url > 500 characters


    // ================================== HELPER METHODS ==================================
    private Response createProposal(String accessToken,
                                    String title,
                                    String frequency,
                                    List<Long> genreIds,
                                    String synopsis) {

        return RestAssured.given()
                .contentType(ContentType.JSON)
                .header("Authorization", "Bearer " + accessToken)
                .body("""
                    {
                        "title": "%s",
                        "proposedFrequency": "%s",
                        "genreIds": %s,
                        "synopsis": "%s"
                    }
                    """.formatted(title, frequency, genreIds, synopsis))
                .when()
                .post(ProposalsTestConfig.PROPOSALS_URL);

    }

    public void resetProposalTableToDefault(Long proposalId) throws SQLException {
        if (!isCreatedNewProposal) {
            return;
        }

        // Get connection
        Connection connection = DriverManager.getConnection(
                DatabaseConnectionConfig.URL,
                DatabaseConnectionConfig.USER,
                DatabaseConnectionConfig.PASSWORD
        );

        // Create query
        // Delete proposal that created
        PreparedStatement preparedStatement = connection.prepareStatement("""
             DELETE FROM Series_Proposal
             WHERE proposal_id = ?
        """);

        preparedStatement.setLong(1, proposalId);
        preparedStatement.executeUpdate();
        preparedStatement.close();
        connection.close();
    }
}
