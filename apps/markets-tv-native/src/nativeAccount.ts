// This public destination is independent of the TV pairing token and device.
export const NATIVE_PROFILE_URL = 'https://www.the-sfm.com/profile';
// The bundled PNG is generated with the repository's existing qrcode package.
export const NATIVE_PROFILE_QR_OPTIONS = { errorCorrectionLevel: 'M' as const, margin: 4, scale: 12 };
