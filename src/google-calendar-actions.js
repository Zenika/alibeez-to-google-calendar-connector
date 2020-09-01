import * as http from "http";
import {
  insertEvent,
  updateEvent,
  removeEvent,
  getCalendar,
} from "./google-calendar-client.js";

export async function getPrimaryCalendar(accessToken) {
  return await getCalendar("primary", accessToken);
}

export async function upsert(calendarId, eventId, eventBody, accessToken) {
  try {
    return await updateEvent(calendarId, eventId, eventBody, accessToken);
  } catch (err) {
    if (err instanceof http.IncomingMessage && err.statusCode === 404) {
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
    if (err instanceof http.IncomingMessage && err.statusCode === 404) {
      return err;
    } else {
      throw err;
    }
  }
}
