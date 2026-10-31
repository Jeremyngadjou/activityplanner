import React from 'react';
import {
  Utensils,
  Flame,
  Compass,
  Soup,
  KeyRound,
  Trees,
  Palette,
  Wine,
  Sparkles,
  Coffee,
  Film,
  Music,
  Bike,
  Gamepad2,
  Heart,
  Luggage,
} from 'lucide-react';

interface ActivityIconProps {
  name: string;
  className?: string;
}

export const ActivityIcon: React.FC<ActivityIconProps> = ({ name, className = 'w-5 h-5' }) => {
  switch (name?.toLowerCase()) {
    case 'utensils':
    case 'gastronomie':
      return <Utensils className={className} />;
    case 'flame':
    case 'sport':
      return <Flame className={className} />;
    case 'compass':
    case 'culture':
      return <Compass className={className} />;
    case 'soup':
      return <Soup className={className} />;
    case 'keyround':
    case 'jeux':
      return <KeyRound className={className} />;
    case 'trees':
    case 'plein air':
      return <Trees className={className} />;
    case 'palette':
    case 'atelier':
      return <Palette className={className} />;
    case 'wine':
    case 'soirée':
      return <Wine className={className} />;
    case 'coffee':
    case 'détente':
      return <Coffee className={className} />;
    case 'film':
      return <Film className={className} />;
    case 'music':
      return <Music className={className} />;
    case 'bike':
      return <Bike className={className} />;
    case 'gamepad2':
      return <Gamepad2 className={className} />;
    case 'luggage':
    case 'insolite':
      return <Luggage className={className} />;
    case 'heart':
      return <Heart className={className} />;
    default:
      return <Sparkles className={className} />;
  }
};
