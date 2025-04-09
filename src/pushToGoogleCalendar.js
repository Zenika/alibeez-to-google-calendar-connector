import { removeIfExists, upsert } from "./googleCalendarActions.js";
import { fetchUserInfo } from "./persistence.js";
import {
  mapAlibeezLeaveToGoogleCalendarEventBody,
  mapAlibeezLeaveToGoogleCalendarEventId,
} from "./mapAlibeezLeaveToGoogleCalendarEvent.js";

/**
 * @param body {string} error response body
 * @return boolean
 **/
function isEventTypeChangeError(body) {
  try {
    const parsed = JSON.parse(body);
    return (
      parsed.error?.errors.findIndex(
        (err) => err.reason === "eventTypeRestriction"
      ) > -1
    );
  } catch (err) {
    throw new Error(`Event error response has no json body "${body}"
    Caused By: ${err.message}`);
  }
}

async function ignoreOldEventTypeErrors(err) {
  if (err.statusCode === 400 && isEventTypeChangeError(err.body)) {
    console.info(
      `Event ignored due to previous definition as a "common" event`
    );
  } else {
    throw err;
  }
}

export async function pushToGoogleCalendar(leave, accessToken) {
  const userInfo = await fetchUserInfo(leave.userUuid);
  const calendarId = "primary";
  if (
    leave.status === "CANCEL_PENDING" ||
    leave.status === "CANCELED" ||
    leave.status === "REJECTED"
  ) {
    const eventId = mapAlibeezLeaveToGoogleCalendarEventId(leave);
    console.log(`Removing event '${eventId}'`, { leave });
    await removeIfExists(calendarId, eventId, accessToken);
  } else if (leave.status === "APPROVED" || leave.status === "PENDING") {
    const eventId = mapAlibeezLeaveToGoogleCalendarEventId(leave);
    const eventBody = mapAlibeezLeaveToGoogleCalendarEventBody(leave, userInfo);
    console.log(`Upserting event '${eventId}'`, {
      leave,
      event: eventBody,
    });
    try {
      await upsert(calendarId, eventId, eventBody, accessToken);
    } catch (err) {
      await ignoreOldEventTypeErrors(err);
    }
  } else {
    console.error("ERROR: couldn't update leave, status unknown", leave.status);
  }
}
