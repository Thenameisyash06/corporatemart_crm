import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';

export const COUNTRY_CODES = [
  { code: '+91', name: 'India', flag: '🇮🇳', iso: 'IN', placeholder: '98765 43210', maxDigits: 10 },
  { code: '+1', name: 'United States', flag: '🇺🇸', iso: 'US', placeholder: '202 555 0123', maxDigits: 10 },
  { code: '+44', name: 'United Kingdom', flag: '🇬🇧', iso: 'GB', placeholder: '7911 123456', maxDigits: 11 },
  { code: '+971', name: 'United Arab Emirates', flag: '🇦🇪', iso: 'AE', placeholder: '50 123 4567', maxDigits: 9 },
  { code: '+65', name: 'Singapore', flag: '🇸🇬', iso: 'SG', placeholder: '8123 4567', maxDigits: 8 },
  { code: '+1', name: 'Canada', flag: '🇨🇦', iso: 'CA', placeholder: '416 555 0123', maxDigits: 10 },
  { code: '+61', name: 'Australia', flag: '🇦🇺', iso: 'AU', placeholder: '412 345 678', maxDigits: 9 },
  { code: '+966', name: 'Saudi Arabia', flag: '🇸🇦', iso: 'SA', placeholder: '50 123 4567', maxDigits: 9 },
  { code: '+974', name: 'Qatar', flag: '🇶🇦', iso: 'QA', placeholder: '3312 3456', maxDigits: 8 },
  { code: '+968', name: 'Oman', flag: '🇴🇲', iso: 'OM', placeholder: '9123 4567', maxDigits: 8 },
  { code: '+965', name: 'Kuwait', flag: '🇰🇼', iso: 'KW', placeholder: '9123 4567', maxDigits: 8 },
  { code: '+973', name: 'Bahrain', flag: '🇧🇭', iso: 'BH', placeholder: '3600 1234', maxDigits: 8 },
  { code: '+49', name: 'Germany', flag: '🇩🇪', iso: 'DE', placeholder: '151 23456789', maxDigits: 11 },
  { code: '+33', name: 'France', flag: '🇫🇷', iso: 'FR', placeholder: '6 12 34 56 78', maxDigits: 9 },
  { code: '+31', name: 'Netherlands', flag: '🇳🇱', iso: 'NL', placeholder: '6 12345678', maxDigits: 9 },
  { code: '+60', name: 'Malaysia', flag: '🇲🇾', iso: 'MY', placeholder: '12 345 6789', maxDigits: 10 },
  { code: '+852', name: 'Hong Kong', flag: '🇭🇰', iso: 'HK', placeholder: '9123 4567', maxDigits: 8 },
  { code: '+81', name: 'Japan', flag: '🇯🇵', iso: 'JP', placeholder: '90 1234 5678', maxDigits: 10 },
  { code: '+86', name: 'China', flag: '🇨🇳', iso: 'CN', placeholder: '138 0013 8000', maxDigits: 11 },
  { code: '+27', name: 'South Africa', flag: '🇿🇦', iso: 'ZA', placeholder: '71 123 4567', maxDigits: 9 },
  { code: '+64', name: 'New Zealand', flag: '🇳🇿', iso: 'NZ', placeholder: '21 123 4567', maxDigits: 10 },
  { code: '+62', name: 'Indonesia', flag: '🇮🇩', iso: 'ID', placeholder: '812 3456 7890', maxDigits: 12 },
  { code: '+63', name: 'Philippines', flag: '🇵🇭', iso: 'PH', placeholder: '917 123 4567', maxDigits: 10 },
  { code: '+880', name: 'Bangladesh', flag: '🇧🇩', iso: 'BD', placeholder: '1712 345678', maxDigits: 10 },
  { code: '+977', name: 'Nepal', flag: '🇳🇵', iso: 'NP', placeholder: '984 1234567', maxDigits: 10 },
  { code: '+94', name: 'Sri Lanka', flag: '🇱🇰', iso: 'LK', placeholder: '71 234 5678', maxDigits: 9 },
  { code: '+34', name: 'Spain', flag: '🇪🇸', iso: 'ES', placeholder: '612 34 56 78', maxDigits: 9 },
  { code: '+39', name: 'Italy', flag: '🇮🇹', iso: 'IT', placeholder: '312 345 6789', maxDigits: 10 },
  { code: '+41', name: 'Switzerland', flag: '🇨🇭', iso: 'CH', placeholder: '78 123 45 67', maxDigits: 9 },
  { code: '+353', name: 'Ireland', flag: '🇮🇪', iso: 'IE', placeholder: '85 123 4567', maxDigits: 9 },
  { code: '+55', name: 'Brazil', flag: '🇧🇷', iso: 'BR', placeholder: '11 91234 5678', maxDigits: 11 },
  { code: '+52', name: 'Mexico', flag: '🇲🇽', iso: 'MX', placeholder: '55 1234 5678', maxDigits: 10 },
  { code: '+7', name: 'Russia', flag: '🇷🇺', iso: 'RU', placeholder: '912 345 6789', maxDigits: 10 },
  { code: '+90', name: 'Turkey', flag: '🇹🇷', iso: 'TR', placeholder: '512 345 6789', maxDigits: 10 },
  { code: '+20', name: 'Egypt', flag: '🇪🇬', iso: 'EG', placeholder: '10 1234 5678', maxDigits: 10 },
  { code: '+234', name: 'Nigeria', flag: '🇳🇬', iso: 'NG', placeholder: '802 123 4567', maxDigits: 10 },
  { code: '+254', name: 'Kenya', flag: '🇰🇪', iso: 'KE', placeholder: '712 345678', maxDigits: 9 },
  { code: '+82', name: 'South Korea', flag: '🇰🇷', iso: 'KR', placeholder: '10 1234 5678', maxDigits: 10 },
  { code: '+84', name: 'Vietnam', flag: '🇻🇳', iso: 'VN', placeholder: '91 234 5678', maxDigits: 10 },
  { code: '+66', name: 'Thailand', flag: '🇹🇭', iso: 'TH', placeholder: '81 234 5678', maxDigits: 9 },
  { code: '+46', name: 'Sweden', flag: '🇸🇪', iso: 'SE', placeholder: '70 123 45 67', maxDigits: 9 },
  { code: '+47', name: 'Norway', flag: '🇳🇴', iso: 'NO', placeholder: '412 34 567', maxDigits: 8 },
  { code: '+45', name: 'Denmark', flag: '🇩🇰', iso: 'DK', placeholder: '20 12 34 56', maxDigits: 8 },
  { code: '+358', name: 'Finland', flag: '🇫🇮', iso: 'FI', placeholder: '41 2345678', maxDigits: 10 },
  { code: '+48', name: 'Poland', flag: '🇵🇱', iso: 'PL', placeholder: '512 345 678', maxDigits: 9 },
  { code: '+351', name: 'Portugal', flag: '🇵🇹', iso: 'PT', placeholder: '912 345 678', maxDigits: 9 },
  { code: '+30', name: 'Greece', flag: '🇬🇷', iso: 'GR', placeholder: '691 234 5678', maxDigits: 10 },
  { code: '+43', name: 'Austria', flag: '🇦🇹', iso: 'AT', placeholder: '664 1234567', maxDigits: 11 },
  { code: '+32', name: 'Belgium', flag: '🇧🇪', iso: 'BE', placeholder: '470 12 34 56', maxDigits: 9 },
  { code: '+972', name: 'Israel', flag: '🇮🇱', iso: 'IL', placeholder: '50 123 4567', maxDigits: 9 },
  { code: '+230', name: 'Mauritius', flag: '🇲🇺', iso: 'MU', placeholder: '5123 4567', maxDigits: 8 },
  { code: '+960', name: 'Maldives', flag: '🇲🇻', iso: 'MV', placeholder: '712 3456', maxDigits: 7 },
  { code: '+975', name: 'Bhutan', flag: '🇧🇹', iso: 'BT', placeholder: '1712 3456', maxDigits: 8 },
];

/**
 * Parses raw input string into { countryCode, nationalNumber }
 */
export function parsePhoneNumber(rawPhone, defaultCode = '+91') {
  if (!rawPhone || typeof rawPhone !== 'string') {
    const defaultCountry = COUNTRY_CODES.find((c) => c.code === defaultCode) || COUNTRY_CODES[0];
    return { country: defaultCountry, countryCode: defaultCountry.code, nationalNumber: '' };
  }

  const trimmed = rawPhone.trim();
  if (trimmed.startsWith('+')) {
    // Sort descending by dial code length so +971 is matched before +9
    const sorted = [...COUNTRY_CODES].sort((a, b) => b.code.length - a.code.length);
    for (const c of sorted) {
      if (trimmed.startsWith(c.code)) {
        const remaining = trimmed.slice(c.code.length).replace(/\D/g, '');
        return { country: c, countryCode: c.code, nationalNumber: remaining };
      }
    }
    // Generic fallback for any other country code
    const match = trimmed.match(/^(\+\d{1,4})\s*(.*)$/);
    if (match) {
      const code = match[1];
      const remaining = (match[2] || '').replace(/\D/g, '');
      const existing = COUNTRY_CODES.find((c) => c.code === code);
      return {
        country: existing || { code, name: code, flag: '🌐', iso: '', placeholder: 'Phone Number', maxDigits: 15 },
        countryCode: code,
        nationalNumber: remaining,
      };
    }
  }

  // Without +: check if starting with 91 and 12 digits
  const digitsOnly = trimmed.replace(/\D/g, '');
  if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
    const defaultCountry = COUNTRY_CODES.find((c) => c.code === '+91') || COUNTRY_CODES[0];
    return { country: defaultCountry, countryCode: '+91', nationalNumber: digitsOnly.slice(2) };
  }

  const defaultCountry = COUNTRY_CODES.find((c) => c.code === defaultCode) || COUNTRY_CODES[0];
  return { country: defaultCountry, countryCode: defaultCountry.code, nationalNumber: digitsOnly };
}

export default function CountryCodePhoneInput({
  value = '',
  onChange,
  placeholder,
  required = false,
  disabled = false,
  className = '',
  inputClassName = '',
  defaultCountryCode = '+91',
  id,
  name,
  maxLength,
  showFullOnBlur = false,
}) {
  const parsed = useMemo(() => parsePhoneNumber(value, defaultCountryCode), [value, defaultCountryCode]);
  const [selectedCountry, setSelectedCountry] = useState(parsed.country);
  const [nationalNumber, setNationalNumber] = useState(parsed.nationalNumber);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const dropdownRef = useRef(null);
  const inputRef = useRef(null);
  const searchInputRef = useRef(null);

  // Sync state if external value changes significantly
  useEffect(() => {
    setSelectedCountry(parsed.country);
    setNationalNumber(parsed.nationalNumber);
  }, [parsed]);

  // Handle click outside to close dropdown
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Focus search when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    } else {
      setSearch('');
    }
  }, [isOpen]);

  // Filtered countries
  const filteredCountries = useMemo(() => {
    if (!search.trim()) return COUNTRY_CODES;
    const q = search.toLowerCase().trim();
    return COUNTRY_CODES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.iso.toLowerCase().includes(q)
    );
  }, [search]);

  // Emit change to parent
  const emitChange = (country, number) => {
    const fullNumber = number ? `${country.code} ${number}` : '';
    if (onChange) {
      onChange(fullNumber, {
        countryCode: country.code,
        nationalNumber: number,
        country,
        fullNumber,
      });
    }
  };

  const handleSelectCountry = (country) => {
    setSelectedCountry(country);
    setIsOpen(false);
    emitChange(country, nationalNumber);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleNumberChange = (e) => {
    let raw = e.target.value;

    // If user pasted a full number with a plus sign, auto-switch country code
    if (raw.startsWith('+')) {
      const detected = parsePhoneNumber(raw, selectedCountry.code);
      setSelectedCountry(detected.country);
      setNationalNumber(detected.nationalNumber);
      emitChange(detected.country, detected.nationalNumber);
      return;
    }

    const cleaned = raw.replace(/\D/g, '');
    const maxLen = maxLength || selectedCountry.maxDigits || 15;
    const limited = maxLen ? cleaned.slice(0, maxLen) : cleaned;

    setNationalNumber(limited);
    emitChange(selectedCountry, limited);
  };

  return (
    <div className={`relative flex items-center ${className}`} ref={dropdownRef}>
      {/* Country Code Selector Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-1.5 px-2.5 h-full min-w-[76px] sm:min-w-[84px] bg-slate-100/90 hover:bg-slate-200/90 text-slate-800 rounded-l-xl border-r border-slate-300 transition-colors focus:outline-none flex-shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none"
        title={`Selected: ${selectedCountry.name} (${selectedCountry.code}). Click to switch country code.`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="text-base leading-none" role="img" aria-label={selectedCountry.name}>
          {selectedCountry.flag}
        </span>
        <span className="text-xs font-mono font-bold text-slate-700">
          {selectedCountry.code}
        </span>
        <ChevronDown className={`w-3 h-3 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* National Number Input */}
      <input
        ref={inputRef}
        id={id}
        name={name}
        type="tel"
        disabled={disabled}
        required={required}
        value={nationalNumber}
        onChange={handleNumberChange}
        placeholder={placeholder || selectedCountry.placeholder || 'Phone Number'}
        className={`flex-1 h-full bg-transparent px-3 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none font-mono tabular-nums ${inputClassName}`}
      />

      {/* Clear number button */}
      {nationalNumber && !disabled && (
        <button
          type="button"
          onClick={() => {
            setNationalNumber('');
            emitChange(selectedCountry, '');
            inputRef.current?.focus();
          }}
          className="p-1 mr-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200/60 transition-colors"
          title="Clear number"
        >
          <X className="w-3 h-3" />
        </button>
      )}

      {/* Country Code Dropdown */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 w-72 max-w-[90vw] bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden text-xs animate-in fade-in zoom-in-95 duration-100">
          {/* Search Header */}
          <div className="p-2 border-b border-slate-100 bg-slate-50/80">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search country or code..."
                className="w-full bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-slate-800"
              />
            </div>
          </div>

          {/* List of Countries with Flags */}
          <div className="max-h-60 overflow-y-auto py-1 divide-y divide-slate-50">
            {filteredCountries.length === 0 ? (
              <div className="p-3 text-center text-xs text-slate-400">
                No matching country found
              </div>
            ) : (
              filteredCountries.map((item, idx) => {
                const isSelected = selectedCountry.code === item.code && selectedCountry.name === item.name;
                return (
                  <button
                    key={`${item.code}-${item.name}-${idx}`}
                    type="button"
                    onClick={() => handleSelectCountry(item)}
                    className={`w-full text-left px-3 py-2 flex items-center justify-between gap-2 hover:bg-slate-100 transition-colors cursor-pointer ${
                      isSelected ? 'bg-slate-100/90 font-bold text-slate-900' : 'text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-lg leading-none flex-shrink-0" role="img" aria-label={item.name}>
                        {item.flag}
                      </span>
                      <span className="text-xs truncate">{item.name}</span>
                    </div>
                    <span className="text-xs font-mono font-semibold text-slate-500 flex-shrink-0">
                      {item.code}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
