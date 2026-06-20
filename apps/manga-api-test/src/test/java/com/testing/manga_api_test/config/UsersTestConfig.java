package com.testing.manga_api_test.config;

public class UsersTestConfig {
    public static final String USERS_URL = "http://localhost:3000/api/users";
    public static final String ADMIN_EMAIL = "admin@inkframe.studio";
    public static final String ADMIN_PASSWORD = "Dung123456@";

    // Helper method loginAdminAccountAndVerifyToReturnAccessToken
    public static String loginAdminAccountAndVerifyToReturnAccessToken() {
        // Login and get Challenge Token
        String challengeToken = AuthTestConfig.loginAndGetChallengeToken(
                ADMIN_EMAIL,
                ADMIN_PASSWORD);

        // Verify and get Access Token
        return AuthTestConfig.verify2faAndGetAccessToken(challengeToken, AuthTestConfig.FIXED_OTP_FOR_VERIFY);
    }
}
