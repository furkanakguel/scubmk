import { dateLabel } from '../data';
export function ticketDate(date: string) {
  const day = dateLabel(date);
  if (!date.includes('T')) return day;
  return (
    day +
    ' · ' +
    new Date(date).toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Istanbul',
    })
  );
}
