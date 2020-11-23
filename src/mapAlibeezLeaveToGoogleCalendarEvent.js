export function mapAlibeezLeaveToGoogleCalendarEventId(leave) {
  return `alibeev${leave.uuid}`;
}

/**
 *
 * @param {*} leave
 * @param {string} timeZone
 */
export function mapAlibeezLeaveToGoogleCalendarEventBody(leave, timeZone) {
  return {
    start: {
      dateTime: alibeezTimeToRealTime(leave.startDay, leave.startDayTime),
      timeZone,
    },
    end: {
      dateTime: alibeezTimeToRealTime(leave.endDay, leave.endDayTime),
      timeZone,
    },
    summary: "Absence",
    description: `Imported from Alibeez on ${new Date().toISOString()}`,
    reminders: {
      useDefault: false,
    },
    extendedProperties: {
      shared: {
        source: "Alibeez",
        lastSynchronizedAt: new Date().toISOString(),
      },
    },
  };
}

function alibeezTimeToRealTime(alibeezDate, alibeezTime) {
  if (alibeezTime === "MORNING") {
    return `${alibeezDate}T09:00:00`;
  } else if (alibeezTime === "NOON") {
    return `${alibeezDate}T13:00:00`;
  } else if (alibeezTime === "EVENING") {
    return `${alibeezDate}T18:00:00`;
  }
  throw new Error(`invalid alibeez time: '${alibeezTime}'`);
}
