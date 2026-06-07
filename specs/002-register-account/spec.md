# Feature Specification: Account Registration

**Feature Branch**: `002-register-account`
**Created**: 2026-03-05
**Status**: Draft
**Input**: User description: "Let's add feature to register new account. Add a form which will gather required parameters from the user, and then call stored procedure. Password needs to be compatible with password() method from mysql. Add input validation for email, also provide some way to add errors to the procedure that can be used to display error to user e.g email already taken, login already taken, new account registration disabled. Access to database needs to be secured. After registration display message encouraging player to download and run patcher, link to the patcher is configurable."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Successful Account Registration (Priority: P1)

A new player visits the website and wants to create a game account. They fill in their email address, desired login name, and password, then submit the registration form. The system creates their account in the game database and shows a success message with a link to download the game client patcher.

**Why this priority**: This is the primary use case and the entire reason for the feature. Without a successful registration path, the feature has no value.

**Independent Test**: Can be fully tested end-to-end by submitting valid registration data and verifying the success message with patcher download link appears, and the account exists in the game database.

**Acceptance Scenarios**:

1. **Given** a visitor on the registration page with a unique email and login, **When** they fill in all fields with valid data and submit, **Then** the account is created and a success message is displayed with a link to download the patcher.
2. **Given** a successful registration, **When** the success message is shown, **Then** it includes a prominent, clickable link to the patcher download URL configured in the environment settings.

---

### User Story 2 - Registration Validation Errors (Priority: P2)

A player attempts to register but provides invalid or conflicting data. The system detects the problem and shows a clear, specific error message without losing the data they already entered (where applicable).

**Why this priority**: Without clear error feedback, players cannot self-correct and will abandon registration, directly impacting player acquisition.

**Independent Test**: Can be fully tested by submitting forms with various invalid inputs (invalid email format, duplicate email, duplicate login, disabled registration) and verifying specific error messages are shown for each case.

**Acceptance Scenarios**:

1. **Given** a visitor submitting a registration form with an email that does not conform to standard email format, **When** they submit, **Then** an error message is shown indicating the email is invalid, and no account is created.
2. **Given** a visitor submitting with an email already in use, **When** they submit, **Then** an error message is shown indicating the email is already taken.
3. **Given** a visitor submitting with a login name already in use, **When** they submit, **Then** an error message is shown indicating the login is already taken.
4. **Given** that new account registration has been disabled by the server administrator, **When** any visitor attempts to register, **Then** an error message is shown indicating that registration is currently unavailable.

---

### User Story 3 - Registration Form Field Constraints (Priority: P3)

A player attempts to register but enters data that exceeds allowed lengths or violates field constraints. The system prevents submission and guides the player to correct their input.

**Why this priority**: Field length constraints protect database integrity. This is secondary to core registration and error feedback flows.

**Independent Test**: Can be fully tested by submitting values exceeding maximum lengths for each field and verifying the system rejects them with appropriate feedback.

**Acceptance Scenarios**:

1. **Given** a visitor entering an email longer than 64 characters, **When** they attempt to submit, **Then** the system prevents submission and indicates the email is too long.
2. **Given** a visitor entering a login name longer than 30 characters, **When** they attempt to submit, **Then** the system prevents submission and indicates the login is too long.
3. **Given** a visitor entering a password longer than 45 characters (after hashing preparation), **When** they attempt to submit, **Then** the system prevents submission and indicates the password is too long.

---

### Edge Cases

- What happens when the registration form is submitted with all fields empty?
- How does the system handle the same form being submitted twice in quick succession (double-submit)?
- What happens if the database is temporarily unreachable during registration?
- How does the system handle a patcher URL that has not been configured in the environment?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST present a registration form collecting email address, login name, and password from the visitor.
- **FR-002**: System MUST validate that the submitted email address conforms to standard email address format before attempting account creation.
- **FR-003**: System MUST enforce maximum field lengths: email up to 64 characters, login up to 30 characters, password input up to a length that produces a valid hashed value of up to 45 characters.
- **FR-004**: System MUST hash the submitted password in a format compatible with the MySQL `PASSWORD()` function (SHA1 applied twice, producing a `*`-prefixed uppercase hex string) before passing it to the account creation procedure.
- **FR-005**: System MUST invoke the game database stored procedure `account.sp_create_player_account` with the validated email, login, and hashed password to create the account.
- **FR-006**: The stored procedure MUST be able to communicate specific failure reasons back to the web layer, covering at minimum: email already registered, login name already taken, and new registration currently disabled by the administrator.
- **FR-007**: System MUST display specific, human-readable error messages to the visitor for each failure reason returned by the stored procedure.
- **FR-008**: System MUST display a success message after a successful registration, including a link to download the game patcher.
- **FR-009**: The patcher download URL MUST be configurable via an environment configuration file (e.g., `.env`) so it can be updated without modifying application code.
- **FR-010**: Database access for the registration feature MUST use a dedicated database account that is granted only the minimum permissions required to execute the account creation stored procedure, and nothing more.
- **FR-011**: All required form fields (email, login, password) MUST be validated as non-empty before submission is processed.

### Key Entities

- **Player Account**: Represents a game account created in the game database. Key attributes: email address (unique identifier for login), login name (unique in-game identity), hashed password (stored in MySQL PASSWORD() format), creation timestamp.
- **Registration Error**: A structured signal from the account creation procedure indicating why registration failed (e.g., duplicate email, duplicate login, registration disabled). Used to display targeted feedback to the visitor.
- **Patcher Link**: The download URL for the game client patcher, sourced from environment configuration. Presented to the player on successful registration.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A new player can complete the full registration process (form fill, submit, see success message with patcher link) in under 2 minutes under normal conditions.
- **SC-002**: 100% of accounts created through the registration form are immediately usable in the game server (password hash is compatible with the game's authentication system).
- **SC-003**: All three specific error conditions (email taken, login taken, registration disabled) produce distinct, actionable error messages that inform the player of exactly what went wrong.
- **SC-004**: Invalid email format is rejected client-side before any server request is made, resulting in zero server-side processing of malformed email addresses.
- **SC-005**: The database account used by the web application has no permissions beyond executing the designated stored procedure, verifiable by database permission inspection.
- **SC-006**: The patcher download URL can be updated by changing a single environment variable value, with no code changes or application restart required to reflect the new URL on the success page.

## Assumptions

- The game database stored procedure `account.sp_create_player_account` already exists and accepts (email VARCHAR(64), login VARCHAR(30), password VARCHAR(45)) parameters. The procedure will be extended by the developer to emit structured error signals for the three defined failure cases.
- MySQL's `PASSWORD()` function equivalent is SHA1(SHA1(input)), producing a result in the format `*` + uppercase hex string. This is the MySQL 4.1+ native password format used by the Metin2 game server.
- A password strength policy (minimum length, character requirements) is not required in this iteration; that is deferred to a future feature.
- The registration form will be accessible to all visitors without prior authentication.
- The success message and patcher download link are the final step; no email verification or additional confirmation flow is required.
- The `.env` file pattern is consistent with the existing project environment configuration approach.
