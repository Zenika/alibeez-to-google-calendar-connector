import { removeIfExists, upsert } from "./googleCalendarActions.js";
import { fetchUserInfo } from "./persistence.js";
import {
  mapAlibeezLeaveToGoogleCalendarEventId,
  mapAlibeezLeaveToGoogleCalendarEventBody,
} from "./mapAlibeezLeaveToGoogleCalendarEvent.js";

export async function pushToGoogleCalendar(leave, accessToken) {
  const { timeZone } = await fetchUserInfo(leave.userUuid);
  if (
    leave.status === "CANCEL_PENDING" ||
    leave.status === "CANCELED" ||
    leave.status === "REJECTED"
  ) {
    const eventId = mapAlibeezLeaveToGoogleCalendarEventId(leave);
    console.log(`Removing event '${eventId}'`, { leave });
    await removeIfExists("primary", eventId, accessToken);
  } else if (leave.status === "APPROVED" || leave.status === "PENDING") {
    const eventId = mapAlibeezLeaveToGoogleCalendarEventId(leave);
    const eventBody = mapAlibeezLeaveToGoogleCalendarEventBody(leave, timeZone);
    console.log(`Upserting event '${eventId}'`, { leave, event: eventBody });
    await upsert("primary", eventId, eventBody, accessToken);
  } else {
    console.error("ERROR: couldn't update leave, status uknown", leave.status);
  }
}
