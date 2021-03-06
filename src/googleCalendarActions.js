import {
  insertEvent,
  updateEvent,
  removeEvent,
  getCalendar,
} from "./googleCalendarClient.js";

export async function getPrimaryCalendar(accessToken) {
  return await getCalendar("primary", accessToken);
}

export async function upsert(calendarId, eventId, eventBody, accessToken) {
  try {
    return await updateEvent(calendarId, eventId, eventBody, accessToken);
  } catch (err) {
    if ([404, 410].includes(err.statusCode)) {
      return await insertEvent(
        calendarId,
        { id: eventId, ...eventBody },
        accessToken
      );
    } else {
      throw err;
    }
  }
}

export async function removeIfExists(calendarId, eventId, accessToken) {
  try {
    return await removeEvent(calendarId, eventId, accessToken);
  } catch (err) {
    if ([404, 410].includes(err.statusCode)) {
      return err;
    } else {
      throw err;
    }
  }
}
