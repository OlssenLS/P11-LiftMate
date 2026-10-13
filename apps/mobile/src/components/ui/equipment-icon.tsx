import React from 'react';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import { Dumbbell } from 'lucide-react-native';

export type EquipmentType =
  | 'barbell'
  | 'dumbbell'
  | 'cable_machine'
  | 'smith_machine'
  | 'leg_press'
  | 'hack_squat'
  | 'pulldown_machine'
  | 'chest_press'
  | 'machines'
  | 'pull_up_bar'
  | 'resistance_bands'
  | 'bodyweight'
  | 'kettlebell'
  | 'other';

export interface EquipmentIconProps {
  equipment: EquipmentType | string;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function EquipmentIcon({
  equipment,
  size = 24,
  color = '#000000',
  strokeWidth = 2,
}: EquipmentIconProps) {
  const norm = (equipment || '').toLowerCase().trim().replace(/[\s-]+/g, '_');

  switch (norm) {
    case 'dumbbell':
    case 'db':
      return <Dumbbell size={size} color={color} strokeWidth={strokeWidth} />;

    case 'barbell':
    case 'bb':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          {/* Main bar */}
          <Line
            x1="2"
            y1="12"
            x2="22"
            y2="12"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          {/* Left plates */}
          <Rect
            x="5"
            y="7"
            width="2.5"
            height="10"
            rx="1"
            stroke={color}
            strokeWidth={strokeWidth}
            fill={color}
          />
          <Rect
            x="8.5"
            y="5"
            width="2"
            height="14"
            rx="1"
            stroke={color}
            strokeWidth={strokeWidth}
            fill={color}
          />
          {/* Right plates */}
          <Rect
            x="13.5"
            y="5"
            width="2"
            height="14"
            rx="1"
            stroke={color}
            strokeWidth={strokeWidth}
            fill={color}
          />
          <Rect
            x="16.5"
            y="7"
            width="2.5"
            height="10"
            rx="1"
            stroke={color}
            strokeWidth={strokeWidth}
            fill={color}
          />
        </Svg>
      );

    case 'kettlebell':
    case 'kb':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          {/* Top handle loop */}
          <Path
            d="M8.5 7.5V4a3.5 3.5 0 0 1 7 0v3.5"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          {/* Body bell */}
          <Circle
            cx="12"
            cy="14"
            r="6.5"
            stroke={color}
            strokeWidth={strokeWidth}
          />
          {/* Base line */}
          <Line
            x1="9"
            y1="20"
            x2="15"
            y2="20"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        </Svg>
      );

    case 'cable_machine':
    case 'cm':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          {/* Vertical tower frame */}
          <Line
            x1="5"
            y1="3"
            x2="5"
            y2="21"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          <Line
            x1="5"
            y1="3"
            x2="18"
            y2="3"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          {/* Weight stack on tower */}
          <Rect
            x="3"
            y="9"
            width="4"
            height="10"
            rx="1"
            stroke={color}
            strokeWidth={strokeWidth}
          />
          {/* Pulley wheel */}
          <Circle
            cx="17"
            cy="6"
            r="2"
            stroke={color}
            strokeWidth={strokeWidth}
          />
          {/* Cable dropping */}
          <Line
            x1="17"
            y1="8"
            x2="17"
            y2="15"
            stroke={color}
            strokeWidth={strokeWidth}
          />
          {/* Triangle D-handle */}
          <Path
            d="M14 15h6l-3 4z"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
        </Svg>
      );

    case 'smith_machine':
    case 'sm':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          {/* Left and right guide vertical rails */}
          <Line
            x1="5"
            y1="3"
            x2="5"
            y2="21"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          <Line
            x1="19"
            y1="3"
            x2="19"
            y2="21"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          {/* Top and bottom frames */}
          <Line
            x1="3"
            y1="3"
            x2="21"
            y2="3"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          <Line
            x1="3"
            y1="21"
            x2="21"
            y2="21"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          {/* Fixed barbell on track */}
          <Line
            x1="2"
            y1="11"
            x2="22"
            y2="11"
            stroke={color}
            strokeWidth={strokeWidth + 0.5}
            strokeLinecap="round"
          />
          {/* Slide collars */}
          <Rect
            x="3.5"
            y="9.5"
            width="3"
            height="3"
            rx="0.5"
            fill={color}
          />
          <Rect
            x="17.5"
            y="9.5"
            width="3"
            height="3"
            rx="0.5"
            fill={color}
          />
        </Svg>
      );

    case 'leg_press':
    case 'lp':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          {/* Angled track rail */}
          <Line
            x1="4"
            y1="20"
            x2="20"
            y2="4"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          {/* Footplate sled on upper angle */}
          <Line
            x1="14"
            y1="5"
            x2="20"
            y2="11"
            stroke={color}
            strokeWidth={strokeWidth + 1}
            strokeLinecap="round"
          />
          {/* Reclined seat base */}
          <Path
            d="M5 20h8l-3-7H5z"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
        </Svg>
      );

    case 'hack_squat':
    case 'hs':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          {/* Angled rail */}
          <Line
            x1="5"
            y1="20"
            x2="19"
            y2="4"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          {/* Footplate */}
          <Line
            x1="3"
            y1="21"
            x2="10"
            y2="21"
            stroke={color}
            strokeWidth={strokeWidth + 1}
            strokeLinecap="round"
          />
          {/* Shoulder pads / sled */}
          <Path
            d="M12 7l4 4m-2-5l3-3"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );

    case 'pulldown_machine':
    case 'pd':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          {/* Top horizontal beam */}
          <Line
            x1="5"
            y1="3"
            x2="19"
            y2="3"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          {/* Top pulley stem */}
          <Line
            x1="12"
            y1="3"
            x2="12"
            y2="7"
            stroke={color}
            strokeWidth={strokeWidth}
          />
          {/* Wide lat pulldown bar */}
          <Path
            d="M4 10l8-3 8 3"
            stroke={color}
            strokeWidth={strokeWidth + 0.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Seat frame below */}
          <Path
            d="M9 17h6m-3 0v4m-4 0h8"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );

    case 'chest_press':
    case 'cp':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          {/* Seat & backrest */}
          <Path
            d="M7 5v11h10"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Press arm */}
          <Path
            d="M17 8l-4 3m0-6v6"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          {/* Handle */}
          <Circle cx="18" cy="8" r="1.5" fill={color} />
          {/* Floor base */}
          <Line
            x1="5"
            y1="20"
            x2="19"
            y2="20"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        </Svg>
      );

    case 'machines':
    case 'mc':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          {/* Stack tower */}
          <Rect
            x="4"
            y="4"
            width="7"
            height="16"
            rx="1.5"
            stroke={color}
            strokeWidth={strokeWidth}
          />
          {/* Weight plates */}
          <Line x1="6" y1="8" x2="9" y2="8" stroke={color} strokeWidth={strokeWidth} />
          <Line x1="6" y1="12" x2="9" y2="12" stroke={color} strokeWidth={strokeWidth} />
          <Line x1="6" y1="16" x2="9" y2="16" stroke={color} strokeWidth={strokeWidth} />
          {/* Overhead cable & seat */}
          <Path
            d="M11 5h5v9"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M14 17h6m-3 0v3"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );

    case 'pull_up_bar':
    case 'pb':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          {/* Main horizontal bar */}
          <Line
            x1="3"
            y1="9"
            x2="21"
            y2="9"
            stroke={color}
            strokeWidth={strokeWidth + 0.5}
            strokeLinecap="round"
          />
          {/* Left wall/ceiling mount */}
          <Path
            d="M6 9V4m-2 0h4"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Right wall/ceiling mount */}
          <Path
            d="M18 9V4m-2 0h4"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Grip highlights */}
          <Line x1="8" y1="9" x2="10" y2="9" stroke={color} strokeWidth={strokeWidth + 2} strokeLinecap="round" />
          <Line x1="14" y1="9" x2="16" y2="9" stroke={color} strokeWidth={strokeWidth + 2} strokeLinecap="round" />
        </Svg>
      );

    case 'resistance_bands':
    case 'rb':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          {/* Looped continuous band */}
          <Path
            d="M6 12c0-5 2.7-8 6-8s6 3 6 8-2.7 8-6 8-6-3-6-8z"
            stroke={color}
            strokeWidth={strokeWidth}
          />
          {/* Side handles / grips */}
          <Circle cx="5" cy="12" r="2.5" stroke={color} strokeWidth={strokeWidth} />
          <Circle cx="19" cy="12" r="2.5" stroke={color} strokeWidth={strokeWidth} />
        </Svg>
      );

    case 'bodyweight':
    case 'bw':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          {/* Head */}
          <Circle cx="18" cy="7" r="2.5" stroke={color} strokeWidth={strokeWidth} />
          {/* Push-up / plank body */}
          <Path
            d="M3 17l9-4 4-3"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Supporting arm */}
          <Path
            d="M13 13l-2 5m-2 0h4"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Ground indicator */}
          <Line
            x1="2"
            y1="20"
            x2="22"
            y2="20"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        </Svg>
      );

    case 'other':
    case 'ot':
    default:
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          {/* Round Olympic weight plate */}
          <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={strokeWidth} />
          <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth={strokeWidth} />
          <Line x1="12" y1="3" x2="12" y2="5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
          <Line x1="12" y1="19" x2="12" y2="21" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
          <Line x1="3" y1="12" x2="5" y2="12" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
          <Line x1="19" y1="12" x2="21" y2="12" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
        </Svg>
      );
  }
}
