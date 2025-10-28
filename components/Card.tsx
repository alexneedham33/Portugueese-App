
import React, { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = '' }) => {
  return (
    <div className={`bg-white rounded-xl shadow-md overflow-hidden ${className}`}>
      {children}
    </div>
  );
};

interface CardHeaderProps {
    children: ReactNode;
    className?: string;
}

export const CardHeader: React.FC<CardHeaderProps> = ({ children, className = '' }) => {
    return (
        <div className={`p-4 md:p-5 border-b border-slate-200 ${className}`}>
            {children}
        </div>
    )
}

interface CardContentProps {
    children: ReactNode;
    className?: string;
}

export const CardContent: React.FC<CardContentProps> = ({ children, className = '' }) => {
    return (
        <div className={`p-4 md:p-5 ${className}`}>
            {children}
        </div>
    )
}
