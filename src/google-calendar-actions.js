import http from "http";
import { insert, update, remove } from "./google-calendar-client";

export async function upsert(calendarId, eventId, eventBody, accessToken) {
  try {
    return await update(calendarId, eventId, eventBody, accessToken);
  } catch (err) {
    if (err instanceof http.IncomingMessage && err.statusCode === 404) {
      return await insert(calendarId, eventBody, accessToken);
    } else {
      throw err;
    }
  }
}

export async function removeIfExists(calendarId, eventId, accessToken) {
  try {
    return await remove(calendarId, eventId, accessToken);
  } catch (err) {
    if (err instanceof http.IncomingMessage && err.statusCode === 404) {
      return err;
    } else {
      throw err;
    }
  }
}
