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
- TC-LOGIN-005: Login fail with wrong password

### Logout API Test:
- TC-LOGOUT-001: Logout success

### Resend API Test:
- TC-RESEND-001: Resend Otp Success
- TC-RESEND-002: Resend Otp Fail When Challenge Token Invalid
- TC-RESEND-003: Resend Otp Fail When Has Many Request

### Verify 2fa API Test:
- TC-VERIFY-001: Verify 2 fa return access token
- TC-VERIFY-002: Verify 2 fa fail when wrong otp 
- TC-VERIFY-003: Verify 2 fa should fail when challenge token invalid
- TC-VERIFY-004: Verify 2 fa fail when otp less than 6 digits

### Get Me API Test:
- TC-ME-001: Get me should return success
- TC-ME-002: Get me should fail when access token invalid
- TC-ME-003: Get me should fail when missing access token

### Change Password API Test:
- TC-PASSWORD-001: Change password should return ok
- TC-PASSWORD-002: Change password should fail when current password incorrect
- TC-PASSWORD-003: Change password should fail when current password is same with new password
- TC-PASSWORD-004: Change password should fail when missing access token
- TC-PASSWORD-005: Change password should fail when access token is invalid
- TC-PASSWORD-006: Change password should fail when new password less than 8 characters
- TC-PASSWORD-007: Change password should fail when new password more than 72 characters

### Get All Assistants API Test:
- TC-ASSISTANT-001: Get assistants should return success
- TC-ASSISTANT-002: Get assistant should fail when missing access token
- TC-ASSISTANT-003: Get assistant should fail when access token is invalid

### Get All Editors API Test:
- TC-Editor-001: Get editors should return success
- TC-Editor-002: Get editors should fail when missing access token
- TC-Editor-003: Get editors should fail when access token is invalid

### Get Current User Details Test
- TC-USR-ME-001: Get current user details should return success
- TC-USR-ME-002: Get current user details should fail when missing access token
- TC-USR-ME-003: Get current user details should fail when access token invalid

### Update My Profile Test
- TC-USR-UPD-001: Update my profile should return success
- TC-USR-UPD-002: Update my profile should fail when missing access token
- TC-USR-UPD-003: Update my profile should fail when access token is invalid
- TC-USR-UPD-004: Update my profile should fail when full name is not a string
- TC-USR-UPD-005: Update my profile should fail when avatar url is not a string
- TC-USR-UPD-006: Update my profile should fail when full name greater than 120 characters
- TC-USR-UPD-007: Update my profile should fail when avatar url greater than 500 characters
- TC-USR-UPD-008: Update my profile should fail when full name is null (Invalid response status(500), Dev need add validation in dto class)
- TC-USR-UPD-009: Update my profile should return success when avatar url is null

### Dashboard Summary API Test
- TC-DB-SMR-001: Dashboard summary should return success
- TC-DB-SMR-002: Dashboard summary should fail when missing access token
- TC-DB-SMR-003: Dashboard summary should fail when access token is invalid

### Dashboard Series API Test
- TC-DB-SRS-001: Dashboard series should return success
- TC-DB-SRS-002: Dashboard series should fail when missing access token
- TC-DB-SRS-003: Dashboard series should fail when access token is invalid

### Dashboard Tasks API Test
- TC-DB-TAS-001: Dashboard tasks should return success
- TC-DB-TAS-002: Dashboard tasks should fail when missing access token
- TC-DB-TAS-003: Dashboard tasks should fail when access token is invalid

### Dashboard Submissions API Test
- TC-DB-SMS-001: Dashboard submissions should return success
- TC-DB-SMS-002: Dashboard submissions should fail when missing access token
- TC-DB-SMS-003: Dashboard submissions should fail when access token is invalid

### Dashboard Notifications API Test
- TC-DB-NOTI-001: Dashboard notifications should return success
- TC-DB-NOTI-002: Dashboard notifications should fail when missing access token
- TC-DB-NOTI-003: Dashboard notifications should fail when access token is invalid

### Upload File API Test
- TC-UPF-001: Upload file should return success
- TC-UPF-002: Upload file should fail when no have file to send
- TC-UPF-003: Upload file should fail when missing access token
- TC-UPF-004: Upload file should fail when invalid access token

### Notifications API Test
- TC-NTF-001: Notifications should return success
- TC-NTF-002: Notifications should fail when missing access token
- TC-NTF-003: Notifications should fail when invalid access token

### Notification Mark Read All API Test
- TC-NTF-MA-001: Notifications mark all should return success
- TC-NTF-MA-002: Notifications mark all should fail when missing access token
- TC-NTF-MA-003: Notifications mark all should fail when invalid access token

### Notification Mark By ID API Test
- TC-NTF-MID-001: Notifications mark by id should return success
- TC-NTF-MID-002: Notifications mark by id should fail when missing access token
- TC-NTF-MID-003: Notifications mark by id should fail when invalid access token





















