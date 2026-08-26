export const requestStatuses = ["queued", "claimed", "in_progress", "completed", "completed_with_warnings", "failed"] as const;
export type RequestStatus = (typeof requestStatuses)[number];

const allowedTransitions: Record<RequestStatus, ReadonlyArray<RequestStatus>> = {
  queued: ["claimed", "failed"],
  claimed: ["in_progress", "completed", "completed_with_warnings", "failed"],
  in_progress: ["completed", "completed_with_warnings", "failed"],
  completed: [],
  completed_with_warnings: [],
  failed: [],
};

export function canTransitionRequest(current: RequestStatus, next: RequestStatus) {
  return allowedTransitions[current].includes(next);
}

export function assertRequestTransition(current: RequestStatus, next: RequestStatus) {
  if (!canTransitionRequest(current, next)) {
    throw new Error(`Request status cannot transition from ${current} to ${next}.`);
  }
}

