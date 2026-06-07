import { createHash } from "node:crypto";
import { query } from "../lib/db";

// ── Types ─────────────────────────────────────────────────────

export type RegistrationErrorCode =
  | "EMAIL_TAKEN"
  | "LOGIN_TAKEN"
  | "REGISTRATION_DISABLED"
  | "UNKNOWN";

type RegisterResult =
  | { ok: true }
  | { ok: false; code: RegistrationErrorCode };

// ── Password hashing ──────────────────────────────────────────

/**
 * Produces a password hash compatible with MySQL's PASSWORD() function
 * (MySQL 4.1+ format: '*' + uppercase hex of SHA1(SHA1(plaintext))).
 *
 * This format is required by the Metin2 game server for authentication.
 * See plan.md Complexity Tracking for the documented security exception.
 */
export function mysqlNativePassword(plain: string): string {
  const first = createHash("sha1").update(plain, "utf8").digest();
  const second = createHash("sha1").update(first).digest("hex").toUpperCase();
  return "*" + second;
}

// ── Stored procedure call ─────────────────────────────────────

/**
 * Calls account.sp_create_player_account via parameterized stored procedure.
 * The procedure must emit SIGNAL SQLSTATE '45000' with MESSAGE_TEXT set to
 * one of: EMAIL_TAKEN | LOGIN_TAKEN | REGISTRATION_DISABLED
 * for business error conditions.
 */
export async function callRegisterSP(
  email: string,
  login: string,
  passwordHash: string,
): Promise<RegisterResult> {
  try {
    await query("CALL account.sp_create_player_account(?, ?, ?)", [
      email,
      login,
      passwordHash,
    ]);
    return { ok: true };
  } catch (err: unknown) {
    console.error("[SP ERROR]", err);
    if (err && typeof err === "object" && "sqlMessage" in err) {
      const msg = (err as { sqlMessage: string }).sqlMessage;
      if (msg === "EMAIL_TAKEN") return { ok: false, code: "EMAIL_TAKEN" };
      if (msg === "LOGIN_TAKEN") return { ok: false, code: "LOGIN_TAKEN" };
      if (msg === "REGISTRATION_DISABLED")
        return { ok: false, code: "REGISTRATION_DISABLED" };
    }
    return { ok: false, code: "UNKNOWN" };
  }
}

// ── Error code → locale key mapping ──────────────────────────

const ERROR_LOCALE_MAP: Record<RegistrationErrorCode, string> = {
  EMAIL_TAKEN: "register.error.emailTaken",
  LOGIN_TAKEN: "register.error.loginTaken",
  REGISTRATION_DISABLED: "register.error.registrationDisabled",
  UNKNOWN: "register.error.unknown",
};

export function errorCodeToLocaleKey(code: RegistrationErrorCode): string {
  return ERROR_LOCALE_MAP[code];
}
