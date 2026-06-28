import React from 'react';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';

interface LogoProps {
  size?: number;
}

export default function Logo({ size = 130 }: LogoProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <Defs>
        {/* Gradient Premium: Transisi dari Cyan Cerah ke Steel Blue Elegan */}
        <LinearGradient id="kyysFluidGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#5ea3f5" />
          <Stop offset="40%" stopColor="#416383" />
          <Stop offset="100%" stopColor="#1e2e3d" />
        </LinearGradient>
      </Defs>

      {/* 🎯 RAHASIA NYAMBUNG TANPA PUTUS:
        Satu baris tag <Path> dengan koordinat yang mengalir dari sayap atas, 
        menuju pusat, turun ke akar, melesat membentuk tiang utama, lalu menutup ke kaki bawah.
        Ditambah strokeWidth tebal dan round join agar melebur sempurna!
      */}
      <Path
        d="M70 24 L41 50 L32 80 L42 20 L41 50 L68 76"
        stroke="url(#kyysFluidGrad)"
        strokeWidth="13"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}