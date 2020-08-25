import { queryLeaves as queryLeavesWithFields } from "./alibeez-client.js";

export async function queryLeaves(filters) {
  return queryLeavesWithFields(
    [
      "uuid",
      "userUuid",
      "updateDate",
      "status",
      "startDay",
      "startDayTime",
      "endDay",
      "endDayTime",
    ],
    filters
  );
}
