import { pushToGoogleCalendar } from "./push.js";
import { queryUserLeavesAfter } from "./proxybeez-client.js";

export async function syncInit(alibeezId, accessToken) {
  const today = new Date().toISOString().split("T")[0];
  const leaves = await queryUserLeavesAfter(alibeezId, today);
  for (const leave of leaves) {
    await pushToGoogleCalendar(leave, accessToken);
  }
}
