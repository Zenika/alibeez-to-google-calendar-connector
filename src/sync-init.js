import { pushToGoogleCalendar } from "./push.js";
import { queryLeaves } from "./alibeez-actions.js";

export async function syncInit(alibeezId, accessToken) {
  const today = new Date().toISOString().split("T")[0];
  const filters = [`endDate>=${today}MORNING`, `userUuid==${alibeezId}`];
  const { result: leaves } = await queryLeaves(filters);
  for (const leave of leaves) {
    await pushToGoogleCalendar(leave, accessToken);
  }
}
