/** National significant number length (no country prefix). */
export const NATIONAL_LENGTH: Record<string, number> = {
  "+91": 10,
  "+1": 10,
  "+44": 10,
  "+61": 9,
  "+49": 10,
  "+33": 9,
  "+81": 10,
  "+86": 11,
  "+55": 11,
  "+234": 10,
};

export const COUNTRY_CODES = [
  { code: "+91", label: "India (+91)" },
  { code: "+1", label: "US (+1)" },
  { code: "+44", label: "UK (+44)" },
  { code: "+61", label: "AU (+61)" },
  { code: "+49", label: "DE (+49)" },
  { code: "+33", label: "FR (+33)" },
  { code: "+81", label: "JP (+81)" },
  { code: "+86", label: "CN (+86)" },
  { code: "+55", label: "BR (+55)" },
  { code: "+234", label: "NG (+234)" },
] as const;

export function digitsOnly(input: string): string {
  return input.replace(/\D/g, "");
}

function countryDigits(countryCode: string): string {
  return countryCode.replace(/\D/g, "");
}

function nationalLengthFor(countryCode: string): number {
  return NATIONAL_LENGTH[countryCode] ?? 10;
}

/**
 * Strip a leading country prefix only when digit count exceeds national length.
 * If digits already fit national length, keep as-is (e.g. 10-digit IN number starting with 91).
 */
function stripCountryPrefixIfExcess(
  digits: string,
  countryCode: string,
  nationalLen: number,
): string {
  if (digits.length <= nationalLen) return digits;

  const cc = countryDigits(countryCode);
  if (cc && digits.startsWith(cc)) {
    const rest = digits.slice(cc.length);
    if (rest.length >= 7 && rest.length <= nationalLen + 2) {
      return rest.slice(0, nationalLen);
    }
  }

  for (const { code } of COUNTRY_CODES) {
    const cd = countryDigits(code);
    if (cd && digits.startsWith(cd) && digits.length > nationalLen) {
      const rest = digits.slice(cd.length);
      const len = nationalLengthFor(code);
      if (rest.length >= 7 && rest.length <= len + 2) {
        return rest.slice(0, len);
      }
    }
  }

  return digits.slice(0, nationalLen);
}

/**
 * Normalize pasted or typed phone input for the national field (without country code).
 */
export function normalizePhoneInput(
  raw: string,
  selectedCountryCode: string,
  previousNational = "",
): string {
  let digits = digitsOnly(raw);
  if (!digits) return "";

  const nationalLen = nationalLengthFor(selectedCountryCode);
  const isLikelyPaste = raw.length - previousNational.length > 1 || digits.length > nationalLen + 2;

  if (isLikelyPaste || digits.length > nationalLen) {
    digits = stripCountryPrefixIfExcess(digits, selectedCountryCode, nationalLen);
  }

  return digits.slice(0, nationalLen + 2);
}

export function buildFullPhone(countryCode: string, nationalDigits: string): string {
  const national = digitsOnly(nationalDigits);
  const cc = countryDigits(countryCode);
  return `+${cc}${national}`;
}

export function isValidNationalNumber(
  nationalDigits: string,
  countryCode: string,
): boolean {
  const d = digitsOnly(nationalDigits);
  const len = nationalLengthFor(countryCode);
  return d.length >= Math.min(7, len) && d.length <= len + 1;
}
