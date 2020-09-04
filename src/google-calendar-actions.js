import {
  insertEvent,
  updateEvent,
  removeEvent,
  getCalendar,
} from "./google-calendar-client.js";
import { HttpClientError } from "./http-client.js";

export async function getPrimaryCalendar(accessToken) {
  return await getCalendar("primary", accessToken);
}

export async function upsert(calendarId, eventId, eventBody, accessToken) {
  try {
    return await updateEvent(calendarId, eventId, eventBody, accessToken);
  } catch (err) {
    if (
      err instanceof HttpClientError &&
      [404, 410].includes(err.response.statusCode)
    ) {
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
    if (
      err instanceof HttpClientError &&
      [404, 410].includes(err.response.statusCode)
    ) {
      return err;
    } else {
      throw err;
    }
  }
}
