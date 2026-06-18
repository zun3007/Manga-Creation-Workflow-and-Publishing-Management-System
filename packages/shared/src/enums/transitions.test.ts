import { describe, it, expect } from "vitest";
import { PROPOSAL_TRANSITIONS, TASK_TRANSITIONS, SUBMISSION_TRANSITIONS, canTransition } from "./transitions";
import { ProposalStatus } from "./proposal";
import { TaskStatus } from "./task";
import { SubmissionStatus } from "./submission";

describe("transitions", () => {
  it("allows valid proposal transitions", () => {
    expect(canTransition(PROPOSAL_TRANSITIONS, ProposalStatus.DRAFT, ProposalStatus.SUBMITTED)).toBe(true);
    expect(canTransition(PROPOSAL_TRANSITIONS, ProposalStatus.SUBMITTED, ProposalStatus.APPROVED)).toBe(true);
  });
  it("rejects invalid proposal transitions", () => {
    expect(canTransition(PROPOSAL_TRANSITIONS, ProposalStatus.APPROVED, ProposalStatus.DRAFT)).toBe(false);
    expect(canTransition(PROPOSAL_TRANSITIONS, ProposalStatus.DRAFT, ProposalStatus.APPROVED)).toBe(false);
  });
  it("guards task + submission flows", () => {
    expect(canTransition(TASK_TRANSITIONS, TaskStatus.SUBMITTED, TaskStatus.APPROVED)).toBe(true);
    expect(canTransition(TASK_TRANSITIONS, TaskStatus.ASSIGNED, TaskStatus.APPROVED)).toBe(false);
    expect(canTransition(SUBMISSION_TRANSITIONS, SubmissionStatus.PENDING, SubmissionStatus.APPROVED)).toBe(true);
    expect(canTransition(SUBMISSION_TRANSITIONS, SubmissionStatus.APPROVED, SubmissionStatus.PENDING)).toBe(false);
  });
});
