import type { ComponentType } from 'react';
import type { ColorValue, StyleProp, ViewStyle } from 'react-native';
import type { SvgProps } from 'react-native-svg';

import Add from '../../assets/icons/add.svg';
import ArrowLeft from '../../assets/icons/arrow-left.svg';
import ArrowRight from '../../assets/icons/arrow-right.svg';
import Bible from '../../assets/icons/bible.svg';
import Bookmark from '../../assets/icons/bookmark.svg';
import Calendar from '../../assets/icons/calendar.svg';
import Chart from '../../assets/icons/chart.svg';
import Check from '../../assets/icons/check.svg';
import ChevronDown from '../../assets/icons/chevron-down.svg';
import ChevronLeft from '../../assets/icons/chevron-left.svg';
import ChevronRight from '../../assets/icons/chevron-right.svg';
import ChevronUp from '../../assets/icons/chevron-up.svg';
import Close from '../../assets/icons/close.svg';
import Community from '../../assets/icons/community.svg';
import Delete from '../../assets/icons/delete.svg';
import Dictionary from '../../assets/icons/dictionary.svg';
import Download from '../../assets/icons/download.svg';
import Edit from '../../assets/icons/edit.svg';
import ErrorIcon from '../../assets/icons/error.svg';
import Flame from '../../assets/icons/flame.svg';
import Folder from '../../assets/icons/folder.svg';
import Groups from '../../assets/icons/groups.svg';
import Heart from '../../assets/icons/heart.svg';
import Highlighter from '../../assets/icons/highlighter.svg';
import Home from '../../assets/icons/home.svg';
import Image from '../../assets/icons/image.svg';
import Info from '../../assets/icons/info.svg';
import Library from '../../assets/icons/library.svg';
import Link from '../../assets/icons/link.svg';
import Lock from '../../assets/icons/lock.svg';
import More from '../../assets/icons/more.svg';
import Notes from '../../assets/icons/notes.svg';
import Notifications from '../../assets/icons/notifications.svg';
import Offline from '../../assets/icons/offline.svg';
import Profile from '../../assets/icons/profile.svg';
import ReadingPlan from '../../assets/icons/reading-plan.svg';
import Search from '../../assets/icons/search.svg';
import Settings from '../../assets/icons/settings.svg';
import Share from '../../assets/icons/share.svg';
import Star from '../../assets/icons/star.svg';
import Sun from '../../assets/icons/sun.svg';
import Sync from '../../assets/icons/sync.svg';
import TextSize from '../../assets/icons/text-size.svg';
import Trophy from '../../assets/icons/trophy.svg';
import Upload from '../../assets/icons/upload.svg';
import Visibility from '../../assets/icons/visibility.svg';
import VisibilityOff from '../../assets/icons/visibility-off.svg';

type IconComponent = ComponentType<SvgProps>;

const ICONS = {
  add: Add,
  'arrow-left': ArrowLeft,
  'arrow-right': ArrowRight,
  bible: Bible,
  bookmark: Bookmark,
  calendar: Calendar,
  chart: Chart,
  check: Check,
  'chevron-down': ChevronDown,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  'chevron-up': ChevronUp,
  close: Close,
  community: Community,
  delete: Delete,
  dictionary: Dictionary,
  download: Download,
  edit: Edit,
  error: ErrorIcon,
  flame: Flame,
  folder: Folder,
  groups: Groups,
  heart: Heart,
  highlighter: Highlighter,
  home: Home,
  image: Image,
  info: Info,
  library: Library,
  link: Link,
  lock: Lock,
  more: More,
  notes: Notes,
  notifications: Notifications,
  offline: Offline,
  profile: Profile,
  'reading-plan': ReadingPlan,
  search: Search,
  settings: Settings,
  share: Share,
  star: Star,
  sun: Sun,
  sync: Sync,
  'text-size': TextSize,
  trophy: Trophy,
  upload: Upload,
  visibility: Visibility,
  'visibility-off': VisibilityOff,
} satisfies Record<string, IconComponent>;

export type AppIconName = keyof typeof ICONS;

interface AppIconProps {
  name: AppIconName;
  size?: number;
  color: ColorValue;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

/** SVG compartido: misma silueta en iOS, Android y web. */
export function AppIcon({ name, size = 20, color, style, accessibilityLabel }: AppIconProps) {
  const Icon = ICONS[name];
  return (
    <Icon
      width={size}
      height={size}
      color={color}
      stroke={color}
      style={style}
      accessible={Boolean(accessibilityLabel)}
      accessibilityLabel={accessibilityLabel}
    />
  );
}
