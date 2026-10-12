import { OTPInput, OTPInputContext } from 'input-otp';
import { useContext } from 'react';
export function InputOTP(/** @type {import("input-otp").OTPInputProps} */ { className = '', containerClassName = '', ...props }) { return <OTPInput containerClassName={`flex gap-2 ${containerClassName}`} className={className} {...props} />; }
export function InputOTPGroup({ className = '', ...props }) { return <div className={`flex gap-2 ${className}`} {...props} />; }
export function InputOTPSlot({ index, className = '' }) { const context = useContext(OTPInputContext); const slot = context?.slots[index]; return <div className={`h-10 w-10 flex items-center justify-center border rounded-lg ${slot?.isActive ? 'ring-2 ring-brand' : ''} ${className}`}>{slot?.char || (slot?.hasFakeCaret ? '|' : '')}</div>; }
