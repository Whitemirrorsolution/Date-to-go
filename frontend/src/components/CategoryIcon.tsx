import React from 'react';
import {
  Coffee,
  Film,
  Ticket,
  Footprints,
  Utensils,
  HeartHandshake,
  ShoppingBag,
  MapPin,
  Compass,
  Sparkles,
  Dumbbell,
  Music,
  Camera,
  BookOpen,
  PartyPopper,
  Tag,
  Smile,
  Activity,
  Tv,
  Gamepad2,
  Bike
} from 'lucide-react';

export interface CategoryIconProps {
  icon?: string | undefined;
  slug?: string | undefined;
  name?: string | undefined;
  size?: number | undefined;
  className?: string | undefined;
  color?: string | undefined;
  strokeWidth?: number | undefined;
}

// Map Lucide icons by canonical key / slug
const ICON_COMPONENTS: Record<string, React.FC<any>> = {
  coffee: Coffee,
  film: Film,
  movie: Film,
  ticket: Ticket,
  event: Ticket,
  footprints: Footprints,
  walking: Footprints,
  utensils: Utensils,
  dinner: Utensils,
  dining: Utensils,
  'heart-handshake': HeartHandshake,
  'senior-support': HeartHandshake,
  'shopping-bag': ShoppingBag,
  errands: ShoppingBag,
  map: Compass,
  'city-tour': Compass,
  tour: Compass,
  compass: Compass,
  pin: MapPin,
  fitness: Dumbbell,
  gym: Dumbbell,
  music: Music,
  camera: Camera,
  book: BookOpen,
  party: PartyPopper,
  sparkles: Sparkles,
  gaming: Gamepad2,
  cycling: Bike,
  activity: Activity,
  smile: Smile,
  tv: Tv,
  tag: Tag,
};

// Check if string contains emoji characters
const isEmojiString = (str: string): boolean => {
  if (!str) return false;
  const trimmed = str.trim();
  // Typical Unicode emoji ranges or short symbol string with non-ASCII code
  const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1FA00}-\u{1FAFF}]/u;
  return emojiRegex.test(trimmed) || (trimmed.length <= 4 && (trimmed.codePointAt(0) ?? 0) > 255);
};

export const CategoryIcon: React.FC<CategoryIconProps> = ({
  icon,
  slug,
  name,
  size = 24,
  className = '',
  color,
  strokeWidth = 2.2,
}) => {
  const iconStr = (icon || '').trim();

  // 1. If it's a real emoji (e.g. ☕, 🍽️, 🏙️), render as emoji text
  if (iconStr && isEmojiString(iconStr)) {
    return (
      <span 
        className={`inline-flex items-center justify-center leading-none select-none ${className}`}
        style={{ fontSize: `${size}px` }}
      >
        {iconStr}
      </span>
    );
  }

  // 2. Identify the matching icon component from icon string, slug, or name
  const normalizedIcon = iconStr.toLowerCase().replace(/[^a-z0-9-]/g, '');
  const normalizedSlug = (slug || '').toLowerCase().replace(/[^a-z0-9-]/g, '');
  const normalizedName = (name || '').toLowerCase();

  let IconComponent = ICON_COMPONENTS[normalizedIcon] || ICON_COMPONENTS[normalizedSlug];

  // 3. Fallback matching based on keyword in name if not found yet
  if (!IconComponent && normalizedName) {
    if (normalizedName.includes('coffee') || normalizedName.includes('cafe')) IconComponent = Coffee;
    else if (normalizedName.includes('dinner') || normalizedName.includes('dining') || normalizedName.includes('food')) IconComponent = Utensils;
    else if (normalizedName.includes('tour') || normalizedName.includes('city') || normalizedName.includes('travel')) IconComponent = Compass;
    else if (normalizedName.includes('movie') || normalizedName.includes('cinema') || normalizedName.includes('film')) IconComponent = Film;
    else if (normalizedName.includes('event') || normalizedName.includes('ticket')) IconComponent = Ticket;
    else if (normalizedName.includes('walk') || normalizedName.includes('stroll')) IconComponent = Footprints;
    else if (normalizedName.includes('senior') || normalizedName.includes('support') || normalizedName.includes('companion')) IconComponent = HeartHandshake;
    else if (normalizedName.includes('errand') || normalizedName.includes('shop')) IconComponent = ShoppingBag;
    else if (normalizedName.includes('fit') || normalizedName.includes('gym') || normalizedName.includes('sport')) IconComponent = Dumbbell;
    else if (normalizedName.includes('party')) IconComponent = PartyPopper;
  }

  // 4. Ultimate fallback to Sparkles
  if (!IconComponent) {
    IconComponent = Sparkles;
  }

  return (
    <IconComponent 
      size={size} 
      className={className} 
      strokeWidth={strokeWidth} 
      style={color ? { color } : undefined} 
    />
  );
};
