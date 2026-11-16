import { expect, test } from "bun:test";
import { buildCredentialUpdate } from "./accountCredentials";

test("email can change without replacing the account or password", () => {
  expect(buildCredentialUpdate("novo@example.com", "atual@example.com", "", "")).toEqual({ email: "novo@example.com" });
});
test("signed-in password changes require the current password", () => {
  expect(() => buildCredentialUpdate("atual@example.com", "atual@example.com", "new-example", "")).toThrow();
  expect(buildCredentialUpdate("atual@example.com", "atual@example.com", "new-example", "old-example")).toEqual({ password: "new-example", current_password: "old-example" });
});