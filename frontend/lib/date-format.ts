import dayjs from 'dayjs';
import buddhistEra from 'dayjs/plugin/buddhistEra';
import 'dayjs/locale/th';
import 'dayjs/locale/zh-cn';

dayjs.extend(buddhistEra);

export function formatDate(date: string | Date, locale: string): string {
  const d = dayjs(date);
  switch (locale) {
    case 'th':
      return d.locale('th').format('D MMMM BBBB');
    case 'zh':
    case 'zh-TW':
      return d.locale('zh-cn').format('YYYY年M月D日');
    case 'en':
    default:
      return d.format('MMM D, YYYY');
  }
}

export function formatMonthYear(date: string | Date, locale: string): string {
  const d = dayjs(date);
  switch (locale) {
    case 'th':
      return d.locale('th').format('MMMM BBBB');
    case 'zh':
    case 'zh-TW':
      return d.locale('zh-cn').format('YYYY年M月');
    case 'en':
    default:
      return d.format('MMM YYYY');
  }
}
