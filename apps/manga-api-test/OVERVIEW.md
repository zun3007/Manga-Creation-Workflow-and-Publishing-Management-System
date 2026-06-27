# INTEGRATION TESTING OVERVIEW

## Test Environment
- Backend Framework: NestJS
- Database: MySQL (Docker)
- API Testing Tool: RestAssured
- Authentication Method: JWT + Email OTP
- Operating System: Windows 11

## Recommendations for Effective Integration Testing
### Step 1: Configure Environment Variables
- Update the .env file and ensure the following settings are enabled:
```
NODE_ENV=test
DISABLE_THROTTLE=true
```

### Step 2: Reset Database Seed Data
- Remove the existing MySQL Docker volume to ensure a clean test environment:
```
docker volume rm db_manga-dev-db-data
```
- Recreate the database container:
```
docker compose up -d 
```

### Step 3: Execute Integration Tests
- Start the NestJS backend server
- Run the integration test suite located in:
```
apps/manga-api-test/src/test/java/com/testing/manga_api_test
```

### Useful Commands
- View MySQL Container Logs:
```
docker logs manga-dev-mysql
```
- Access MySQL via Terminal:
```
docker exec -it manga-dev-mysql mysql -uroot -pmanga_root
```
- Select the Database
```
USE manga_creation_workflow_and_publishing_management_system;
```



## Tested API Endpoints:
### Login API Test:
- TC-LOGIN-001: Login should require 2FA
- TC-LOGIN-002: Login fail with email empty
- TC-LOGIN-002: Login fail with email empty
- TC-LOGIN-004: Login fail when user is not activate
- TC-LOGIN-005: Account should be locked after five failed attempts

### Logout API Test:
- TC-LOGOUT-001: Logout success

### Resend API Test:
- TC-RESEND-001: Resend Otp Success
- TC-RESEND-002: Resend Otp Fail When Challenge Token Invalid
- TC-RESEND-003: Resend Otp Fail When Has Many Request

### Verify 2fa API Test:
- TC-VERIFY-001: Verify 2 fa return access token
- TC-VERIFY-002: Verify 2 fa fail when otp wrong
- TC-RESEND-003: Resend Otp Fail When Has Many Request