const escapeText = value => String(value || '').replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,');
export function buildScheduleIcs(events, now = new Date()) {
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//DLU//Teaching Schedule//VI', 'CALSCALE:GREGORIAN'];
  for (const event of events) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(event.date)) continue;
    const day = event.date.replace(/-/g, '');
    lines.push('BEGIN:VEVENT', `UID:${escapeText(event.type)}-${escapeText(event.id || `${day}-${event.title}`)}@dlu-lms`, `DTSTAMP:${stamp}`);
    if (/^\d{2}:\d{2}/.test(event.time || '')) {
      lines.push(`DTSTART;TZID=Asia/Bangkok:${day}T${event.time.slice(0, 5).replace(':', '')}00`);
      if (/^\d{2}:\d{2}$/.test(event.endTime || '')) lines.push(`DTEND;TZID=Asia/Bangkok:${day}T${event.endTime.replace(':', '')}00`);
    } else lines.push(`DTSTART;VALUE=DATE:${day}`);
    lines.push(`SUMMARY:${escapeText(event.title)}`, `DESCRIPTION:${escapeText([event.description, event.meetingUrl].filter(Boolean).join('\n'))}`);
    if (event.location) lines.push(`LOCATION:${escapeText(event.location)}`);
    if (/^https?:\/\//i.test(event.meetingUrl || '')) lines.push(`URL:${escapeText(event.meetingUrl)}`);
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  // RFC 5545: fold physical lines at 75 UTF-8 octets without splitting a character.
  return lines.map(line => {
    let output = '', bytes = 0;
    for (const character of line) {
      const size = new TextEncoder().encode(character).length;
      if (bytes + size > 75) { output += '\r\n '; bytes = 1; }
      output += character; bytes += size;
    }
    return output;
  }).join('\r\n') + '\r\n';
}
