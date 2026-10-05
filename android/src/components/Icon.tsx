import Svg, { Path } from 'react-native-svg';
import type { ColorValue } from 'react-native';
import { colors } from '../theme/styles';

const paths = {
  spark: 'M12 3l2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3z',
  home: 'M3 10l9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V10z',
  inbox: 'M4 4h16l2 12v4H2v-4L4 4z M2 16h6l2 3h4l2-3h6',
  phone: 'M6 3h3l2 5-3 2a15 15 0 0 0 6 6l2-3 5 2v3c0 2-2 3-4 3C9 20 4 15 3 7c0-2 1-4 3-4z',
  settings: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M10 2h4l1 3 3 2 3-.2 2 3-2 2v3l2 2-2 3-3-.2-3 2-1 3h-4l-1-3-3-2-3 .2-2-3 2-2v-3l-2-2 2-3 3 .2 3-2 1-3z',
  arrow: 'M5 12h14 M13 6l6 6-6 6',
  chevron: 'M9 6l6 6-6 6',
  headphones: 'M4 14v-2a8 8 0 0 1 16 0v2 M4 13H2v7h4v-7H4 M20 13h2v7h-4v-7h2',
  calendar: 'M5 5h14a2 2 0 0 1 2 2v13H3V7a2 2 0 0 1 2-2z M7 3v4 M17 3v4 M3 11h18 M7 15h2 M13 15h2',
  moon: 'M20 14a8 8 0 0 1-10-10A9 9 0 1 0 20 14z',
  shield: 'M12 3l8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3z M8 12l3 3 5-6',
  cloud: 'M6 18a5 5 0 0 1-.5-10A7 7 0 0 1 19 9a4.5 4.5 0 0 1 0 9H6z',
  mail: 'M3 5h18v14H3V5z M3 5l9 8 9-8',
  message: 'M4 4h16v13H9l-5 4V4z M8 8h8 M8 12h5',
  plus: 'M12 5v14 M5 12h14',
  star: 'M12 3l3 6 6.5 1-4.8 4.7 1.1 6.6L12 18l-5.8 3.3 1.1-6.6L2.5 10 9 9l3-6z',
  trash: 'M3 6h18 M9 6V3h6v3 M6 6l1 15h10l1-15 M10 10v7 M14 10v7',
  check: 'M5 12l4 4L19 6',
  info: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M12 11v6 M12 7v.1',
  language: 'M3 5h12 M9 3v2 M5 8c1 4 4 6 7 7 M13 5c-1 5-4 8-10 10 M13 21l4-10 4 10 M15 17h4',
  download: 'M12 3v12 M7 10l5 5 5-5 M4 16v5h16v-5',
  logout: 'M10 3H3v18h7 M8 12h13 M16 7l5 5-5 5',
};
export type IconName = keyof typeof paths;
export function Icon({ name, size = 20, color = colors.green }: { name: IconName; size?: number; color?: ColorValue }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"><Path d={paths[name]} /></Svg>;
}
