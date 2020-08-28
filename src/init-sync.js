import { pushToGoogleCalendar } from "./push.js";
import { getUserIncomingVacations } from "./alibeez-client.js";

export async function sync(alibeezId, accessToken) {
  const { result: leaves } = await getUserIncomingVacations(alibeezId);
  for (const leave of leaves) {
    await pushToGoogleCalendar(leave, accessToken);
  }
}
